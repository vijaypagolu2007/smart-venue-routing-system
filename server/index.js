const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { initFirebase } = require("./services/firebaseService");
const { shortestPath } = require("./services/routingService");
const { setDensity } = require("./simulation/stadium");
const { checkCongestion } = require("./services/alertService");
const { services, startQueueSimulation } = require("./simulation/queueSimulator");
const { estimateWait, getWorstService } = require("./services/queueService");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// FORCING WEBSOCKET ONLY FOR ULTRA-STABILITY
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket"]
});

app.use(cors());
app.use(express.json());

const PORT = 3001;

// INITIALIZE FIREBASE
initFirebase();

// IMPORT ROUTES
const crowdRoutes = require("./routes/crowd");
const routeRoutes = require("./routes/route");

app.use("/crowd", crowdRoutes);
app.use("/route", routeRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "UP", timestamp: Date.now() });
});

app.get("/config", (req, res) => {
  const configPath = path.join(__dirname, './config/venue.json');
  const venueConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  res.json(venueConfig);
});

app.get("/queues", (req, res) => {
  let queueData = [];
  for (let s in services) {
    queueData.push({
      id: s,
      queue_length: services[s].queue,
      service_rate: services[s].rate,
      wait_time: estimateWait(services[s].queue, services[s].rate),
      wait: estimateWait(services[s].queue, services[s].rate) // for dual support
    });
  }
  res.json(queueData);
});

// SOCKET LOGIC
const { zones, startCrowdSimulation } = require("./simulation/crowdSimulator");

// Stability State
let lastAutoPath = [];
let lastAutoCost = Infinity;
let lastEmitTs = 0;
let lastAlerts = []; 
const COOLDOWN_MS = 5000;

const isSamePath = (p1, p2) => JSON.stringify(p1) === JSON.stringify(p2);
const isBetter = (newCost, oldCost) => oldCost === Infinity || (oldCost - newCost) > 10;
const alertsChanged = (newAlerts) => JSON.stringify(newAlerts) !== JSON.stringify(lastAlerts);

io.on("connection", (socket) => {
  const origin = socket.handshake.headers.origin;
  console.log(`[SVOS] Node Connected: ${socket.id} (Origin: ${origin || "Unknown"})`);
  socket.emit("crowd_update", { zones, timestamp: Date.now() });

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

  // DEMO SPIKE — spike Zone5 (Food Court) to 95% capacity for judges
  socket.on("trigger_spike", () => {
    console.log(`[SVOS] 🔥 DEMO SPIKE triggered by ${socket.id}`);
    const zone = "FOODCOURTA";
    const capacity = 300; // Updated to match node capacity in venue.json
    setDensity(zone, Math.floor(capacity * 0.95));

    // Immediately broadcast the spike state
    const spikedZones = zones;
    io.emit("crowd_update", { zones: spikedZones, timestamp: Date.now() });

    // ⏱️ STABILIZATION DELAY: Ensure state propagates before recomputing route
    setTimeout(() => {
      // CONTEXT-AWARE REROUTE: Instead of showing Entry->Lounge, show Hazard->Exit
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

    // Auto-restore after 8 seconds
    setTimeout(() => {
      setDensity(zone, Math.floor(capacity * 0.3));
      console.log(`[SVOS] FOODCOURTA density restored.`);
    }, 8000);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[SVOS] Node Disconnected: ${socket.id} (Reason: ${reason})`);
  });
});

let crowdInterval, queueInterval, broadcastInterval, queueBroadcastInterval;

const { resetZones } = require("./simulation/stadium");

const startSimulations = () => {
  lastAlerts = []; 
  resetZones();
  if (crowdInterval) return; // already running

  crowdInterval = startCrowdSimulation();
  queueInterval = startQueueSimulation();

  broadcastInterval = setInterval(() => {
    io.emit("crowd_update", { zones, timestamp: Date.now() });
    let alerts = checkCongestion(zones);
    if (alerts.length === 0) {
      alerts = [{ level: "CLEAR", zone: "ALL", message: "No significant congestion detected" }];
    }
    if (alertsChanged(alerts)) {
      io.emit("congestion_alert", { alerts, timestamp: Date.now() });
      lastAlerts = alerts;
    }
    // 🧠 DYNAMIC ROUTING MODALITY: Navigation vs Evacuation
    const hazardZone = Object.keys(zones).find(z => (zones[z].density / zones[z].capacity) >= 0.85);
    let source = "ENTRANCE";
    
    // DEMO LOGIC: Alternate destination to show redirection notices
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
    
    // 🛡️ PATH INTEGRITY GUARD: Never emit a compromised path
    const hasCriticalZone = result.path.some(z => (zones[z].density / zones[z].capacity) >= 0.85);
    
    // During hazard, we allow the source to be critical (evac start)
    const isNavigationModality = !hazardZone;

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

const stopSimulations = () => {
  clearInterval(crowdInterval);
  clearInterval(queueInterval);
  clearInterval(broadcastInterval);
  clearInterval(queueBroadcastInterval);
  crowdInterval = null;
};

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SVOS] Core Engine listening on 0.0.0.0:${PORT}`);
    startSimulations();
  });
}

module.exports = { app, server, io, startSimulations, stopSimulations };
