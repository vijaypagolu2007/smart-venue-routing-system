/**
 * SVOS CORE ENGINE - SERVER ENTRY POINT
 * This file initializes the Express server, Socket.io for real-time updates,
 * and manages the simulation loops for crowd and queue data.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { initFirebase } = require("./services/firebaseService");
const { shortestPath } = require("./services/routingService");
const { setDensity } = require("./simulation/venueState");
const { checkCongestion } = require("./services/alertService");
const { services, startQueueSimulation } = require("./simulation/queueSimulator");
const { estimateWait, getWorstService } = require("./services/queueService");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

/**
 * SOCKET.IO CONFIGURATION
 * Configured for maximum stability using WebSocket-only transport.
 */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket"]
});

// Middleware for CORS and JSON parsing
app.use(cors());
app.use(express.json());



const PORT = process.env.PORT || 5000;

/**
 * INITIALIZATION
 * Connect to Firebase for data persistence.
 */
initFirebase();

/**
 * API ROUTES
 * Internal routing for crowd data and navigation requests.
 */
const crowdRoutes = require("./routes/crowd");
const routeRoutes = require("./routes/route");

app.use("/crowd", crowdRoutes);
app.use("/route", routeRoutes);

// Health check endpoint for monitoring
app.get("/health", (req, res) => {
  res.json({ status: "UP", timestamp: Date.now() });
});



// Provides static venue configuration (layout, nodes, capacities)
app.get("/config", (req, res) => {
  const configPath = path.join(__dirname, './config/venue.json');
  const venueConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  res.json(venueConfig);
});

// Provides current queue lengths and wait estimations for all services
app.get("/queues", (req, res) => {
  let queueData = [];
  for (let s in services) {
    queueData.push({
      id: s,
      queue_length: services[s].queue,
      service_rate: services[s].rate,
      wait_time: estimateWait(services[s].queue, services[s].rate),
      wait: estimateWait(services[s].queue, services[s].rate) // duplicate for frontend compatibility
    });
  }
  res.json(queueData);
});

/**
 * REAL-TIME COMMUNICATION (SOCKET.IO)
 * Manages client connections, route requests, and demo triggers.
 */
const { zones, startCrowdSimulation } = require("./simulation/crowdSimulator");

// State tracking for efficient broadcasting and path stability
let lastAutoPath = [];
let lastAutoCost = Infinity;
let lastEmitTs = 0;
let lastAlerts = []; 
const COOLDOWN_MS = 5000;

// Utility functions for change detection
const isSamePath = (p1, p2) => JSON.stringify(p1) === JSON.stringify(p2);
const alertsChanged = (newAlerts) => JSON.stringify(newAlerts) !== JSON.stringify(lastAlerts);

io.on("connection", (socket) => {
  const origin = socket.handshake.headers.origin;
  console.log(`[SVOS] Node Connected: ${socket.id} (Origin: ${origin || "Unknown"})`);
  
  // Send immediate state update upon connection
  socket.emit("crowd_update", { zones, timestamp: Date.now() });

  // Handle manual navigation requests from the UI
  socket.on("request_route", ({ source, destination }) => {
    const result = shortestPath(zones, source, destination);
    socket.emit("route_update", {
      path: result.path,
      cost: result.cost,
      quality: result.quality,
      confidence: result.confidence,
      steps: result.steps,
      reason: result.reason,
      timestamp: Date.now()
    });
  });

  /**
   * DEMO SPIKE HANDLER
   * Simulates a sudden surge in density (e.g., at Food Court) to demonstrate
   * the system's ability to detect hazards and reroute traffic automatically.
   */
  socket.on("trigger_spike", () => {
    console.log(`[SVOS] 🔥 DEMO SPIKE triggered by ${socket.id}`);
    const zone = "FOODCOURTA";
    const capacity = 300; 
    setDensity(zone, Math.floor(capacity * 0.95));

    // Force immediate broadcast of spiked state
    io.emit("crowd_update", { zones, timestamp: Date.now() });

    // Reroute after a short delay to allow state propagation
    setTimeout(() => {
      const result = shortestPath(zones, zone, "EXIT");
      
      io.emit("auto_route_update", {
        path: result.path,
        cost: result.cost,
        quality: result.quality,
        confidence: result.confidence,
        steps: result.steps,
        reason: `EVACUATION ACTIVE: Routing ${zone} to Main Exit (Safety Priority).`,
        timestamp: Date.now()
      });

      lastAutoPath = result.path;
      lastAutoCost = result.cost;
      lastEmitTs = Date.now();
    }, 500);

    // Auto-restore original density after 8 seconds
    setTimeout(() => {
      setDensity(zone, Math.floor(capacity * 0.3));
      console.log(`[SVOS] FOODCOURTA density restored.`);
    }, 8000);
  });



  socket.on("disconnect", (reason) => {
    console.log(`[SVOS] Node Disconnected: ${socket.id} (Reason: ${reason})`);
  });
});

/**
 * SIMULATOR ORCHESTRATION
 * Sets up repeated intervals for state mutation and broadcasting.
 */
let crowdInterval, queueInterval, broadcastInterval, queueBroadcastInterval;
const { resetZones } = require("./simulation/venueState");

const startSimulations = () => {
  lastAlerts = []; 
  resetZones();
  if (crowdInterval) return;

  // Initialize data simulators
  crowdInterval = startCrowdSimulation();
  queueInterval = startQueueSimulation();

  /**
   * CROWD BROADCAST INTERVAL
   * Runs every 3 seconds to update density, check for congestion,
   * and compute optimal routes based on dynamic stadium state.
   */
  broadcastInterval = setInterval(() => {
    io.emit("crowd_update", { zones, timestamp: Date.now() });

    // Process alerts
    let alerts = checkCongestion(zones);
    if (alerts.length === 0) {
      alerts = [{ level: "CLEAR", zone: "ALL", message: "No significant congestion detected" }];
    }
    if (alertsChanged(alerts)) {
      io.emit("congestion_alert", { alerts, timestamp: Date.now() });
      lastAlerts = alerts;
    }

    // Dynamic Route Calculation (Navigation vs Evacuation)
    const hazardZone = Object.keys(zones).find(z => (zones[z].density / zones[z].capacity) >= 0.85);
    let source = "ENTRANCE";
    const cycle = Math.floor(Date.now() / 10000) % 2; 
    let dest = cycle === 0 ? "VIPLOUNGE" : "FOODCOURTA";
    let dynamicReason = null;

    if (hazardZone) {
      source = hazardZone;
      dest = "EXIT";
      dynamicReason = `EMERGENCY: Evacuating ${hazardZone} directly to stadium exit.`;
    }

    const result = shortestPath(zones, source, dest);
    const now = Date.now();
    
    // Safety check: Don't recommend paths that lead into critical zones
    const hasCriticalZone = result.path.some(z => (zones[z].density / zones[z].capacity) >= 0.85);
    const isNavigationModality = !hazardZone;

    // Emit only if path changed or cooldown expired
    if ((!isNavigationModality || !hasCriticalZone) && (!isSamePath(result.path, lastAutoPath) || (now - lastEmitTs) > COOLDOWN_MS)) {
      io.emit("auto_route_update", {
        path: result.path,
        cost: result.cost,
        quality: result.quality,
        confidence: result.confidence,
        steps: result.steps,
        reason: dynamicReason || result.reason,
        timestamp: Date.now()
      });
      lastAutoPath = result.path;
      lastAutoCost = result.cost;
      lastEmitTs = now;
    }
  }, 3000);

  /**
   * QUEUE BROADCAST INTERVAL
   * Runs every 4 seconds to update service wait times (Food Court, Merch, etc).
   */
  queueBroadcastInterval = setInterval(() => {
    let queueData = {};
    for (let s in services) {
      queueData[s] = {
        wait: estimateWait(services[s].queue, services[s].rate),
        zone: services[s].zone
      };
    }
    io.emit("queue_update", { data: queueData, timestamp: Date.now() });
  }, 4000);
};

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../svos-ui/dist")));

// The "catchall" handler: for any request that doesn't
// match a defined route, send back React's index.html file.
app.use((req, res, next) => {
  const filePath = path.join(__dirname, "../svos-ui/dist/index.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // If frontend hasn't been built yet, just show a message or move to next
    next();
  }
});

const stopSimulations = () => {
  clearInterval(crowdInterval);
  clearInterval(queueInterval);
  clearInterval(broadcastInterval);
  clearInterval(queueBroadcastInterval);
  crowdInterval = null;
};

// Start server and begin simulations
if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SVOS] Core Engine listening on 0.0.0.0:${PORT}`);
    startSimulations();
  });
}

module.exports = { app, server, io, startSimulations, stopSimulations };
