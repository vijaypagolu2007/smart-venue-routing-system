/**
 * QUEUE SIMULATOR
 * Manages the state of stadium services (Food, Restrooms, Entrances).
 * Tracks how many people are in line and their estimated processing rates.
 */

// Initial service state definition
const services = {
  FoodCourtA: { queue: 30, rate: 5, zone: "FOODCOURTA" },
  FoodCourtB: { queue: 60, rate: 4, zone: "FOODCOURTB" },
  RestroomA:  { queue: 20, rate: 3, zone: "RESTROOMWEST" },
  RestroomB:  { queue: 15, rate: 3, zone: "RESTROOMEAST" },
  EntryGate:  { queue: 50, rate: 6, zone: "ENTRANCE" }
};

/**
 * startQueueSimulation
 * Runs a 3-second interval that simulates people joining and leaving lines.
 * This data directly impacts the pathfinding costs in the Routing Service.
 */
const startQueueSimulation = () => {
  return setInterval(() => {
    for (let s in services) {
      // Apply a "random walk" to fluctuate queue lengths realistically
      const delta = Math.floor(Math.random() * 11) - 5; // -5 to +5 change
      services[s].queue = Math.max(5, Math.min(100, (services[s].queue || 50) + delta));
    }
  }, 3000);
};

module.exports = { services, startQueueSimulation };

