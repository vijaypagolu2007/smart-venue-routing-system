/**
 * SOCKET.IO INTEGRATION TEST SCRIPT
 * This script connects to the SVOS Core Engine as a client to 
 * validate real-time event broadcasting and response handling.
 */
const { io } = require("socket.io-client");

const URL = "http://localhost:5000";
console.log(`[TEST] Connecting to SVOS Core at ${URL}...`);

const socket = io(URL, {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log(`[PASS] Connected to SVOS Hub (ID: ${socket.id})`);
  
  // 1. Listen for standard telemetry
  socket.on("crowd_update", (data) => {
    console.log(`[RECV] crowd_update: ${Object.keys(data.zones).length} zones received.`);
  });

  socket.on("congestion_alert", (data) => {
    console.log(`[RECV] congestion_alert: ${data.alerts.length} alerts.`);
    data.alerts.forEach(a => console.log(`   - [${a.level}] ${a.zone}: ${a.message}`));
  });

  // 2. Request a specific route
  console.log(`[SEND] request_route: ENTRANCE -> VIPLOUNGE`);
  socket.emit("request_route", { source: "ENTRANCE", destination: "VIPLOUNGE" });

  socket.on("route_update", (data) => {
    console.log(`[PASS] route_update received:`);
    console.log(`   - Path: ${data.path.join(" -> ")}`);
    console.log(`   - Quality: ${data.quality}`);
    console.log(`   - Reason: ${data.reason}`);
  });

  // 3. Trigger a manual spike (Evacuation Simulation)
  console.log(`[SEND] trigger_spike: Simulating Food Court overcapacity...`);
  socket.emit("trigger_spike");

  socket.on("auto_route_update", (data) => {
    console.log(`[PASS] auto_route_update received (Dynamic Reroute):`);
    console.log(`   - Reason: ${data.reason}`);
    console.log(`   - Path: ${data.path.join(" -> ")}`);
  });

});

socket.on("connect_error", (err) => {
  console.error(`[FAIL] Connection Error: ${err.message}`);
  process.exit(1);
});

// Timeout to prevent hanging
setTimeout(() => {
  console.log("\n[INFO] Test sequence complete. Closing connection.");
  socket.disconnect();
  process.exit(0);
}, 10000);
