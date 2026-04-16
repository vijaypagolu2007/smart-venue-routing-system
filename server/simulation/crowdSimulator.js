/**
 * CROWD SIMULATOR
 * Orchestrates the recurring simulation loop for the stadium.
 * It periodically syncs data from external pipelines and updates 
 * internal density and queue states.
 */

const { zones, updateDensities } = require("./venueState");
const { updateQueues } = require("./queues");
const pipeline = require("./DataPipeline");

/**
 * startCrowdSimulation
 * Initializes a 2-second interval that represents a single "tick" of 
 * the stadium's real-time state.
 */
const startCrowdSimulation = () => {
  return setInterval(async () => {
    // 1. Sync from pluggable data source (Simulation or Sensors)
    await pipeline.sync();
    
    // 2. Perform internal simulation logic to mutate density and queues
    updateDensities();
    updateQueues();
  }, 2000);
};

module.exports = { zones, startCrowdSimulation };

