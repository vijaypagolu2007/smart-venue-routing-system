const { zones, setDensity } = require("./stadium");

/**
 * DataPipeline: Abstraction for density data ingestion.
 * In a real production environment, 'SENSOR_MODE' would listen to MQTT/Webhooks
 * from WiFi controllers or Camera AI streams.
 */
class DataPipeline {
  constructor(mode = "SIMULATION") {
    this.mode = mode; // "SIMULATION" or "SENSOR_ENGINE"
  }

  /**
   * Sync data from external sources.
   * Currently mocks the transition to a real feed.
   */
  async sync() {
    if (this.mode === "SIMULATION") {
      // Logic for random simulation drift is handled in updateDensities()
      // for this demo, but could be moved here entirely.
      return;
    }

    if (this.mode === "SENSOR_ENGINE") {
      // EXAMPLE: Fetching from a real IoT endpoint
      // const data = await axios.get("https://api.venue-sensors.com/v1/live");
      // data.zones.forEach(z => setDensity(z.id, z.count));
      console.log("[PIPELINE] Reading from production sensor stream...");
    }
  }
}

module.exports = new DataPipeline(process.env.DATA_SOURCE || "SIMULATION");
