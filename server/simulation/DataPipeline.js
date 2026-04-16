/**
 * DATA PIPELINE
 * Acts as an abstraction layer for crowd data ingestion.
 * This allows the system to easily switch between internally generated 
 * simulation data and real-world sensor data (IoT, WiFi, Camera AI).
 */

const { zones, setDensity } = require("./venueState");

class DataPipeline {
  constructor(mode = "SIMULATION") {
    this.mode = mode; // "SIMULATION" or "SENSOR_ENGINE"
  }

  /**
   * sync
   * Orchestrates the data update process.
   * In simulation mode, the logic is self-contained. 
   * In sensor mode, this would poll or receive events from physical hardware.
   */
  async sync() {
    if (this.mode === "SIMULATION") {
      // Logic for random simulation drift is primarily handled in venueState.js
      return;
    }

    if (this.mode === "SENSOR_ENGINE") {
      // PROD-TECH: Integration point for live facility IoT feeds.
      // Example: data.zones.forEach(z => setDensity(z.id, z.count));
      console.log("[PIPELINE] Reading from production sensor stream...");
    }
  }
}

// Export a single instance configured via environment variables
module.exports = new DataPipeline(process.env.DATA_SOURCE || "SIMULATION");

