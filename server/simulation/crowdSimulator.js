const { zones, updateDensities } = require("./stadium");
const { updateQueues } = require("./queues");
const pipeline = require("./DataPipeline");

const startCrowdSimulation = () => {
  return setInterval(async () => {
    // 1. Sync from pluggable data source (Simulation or Sensors)
    await pipeline.sync();
    
    // 2. Perform internal simulation logic
    updateDensities();
    updateQueues();
  }, 2000);
};

module.exports = { zones, startCrowdSimulation };
