const services = {
  FoodCourtA: { queue: 30, rate: 5, zone: "FOODCOURTA" },
  FoodCourtB: { queue: 60, rate: 4, zone: "FOODCOURTB" },
  RestroomA:  { queue: 20, rate: 3, zone: "RESTROOMWEST" },
  RestroomB:  { queue: 15, rate: 3, zone: "RESTROOMEAST" },
  EntryGate:  { queue: 50, rate: 6, zone: "ENTRANCE" }
};

// Simulate dynamic queue weight shifts for the AI routing engine
const startQueueSimulation = () => {
  return setInterval(() => {
    for (let s in services) {
      // Random walk simulation for smoother queue data
      const delta = Math.floor(Math.random() * 11) - 5; // -5 to +5
      services[s].queue = Math.max(5, Math.min(100, (services[s].queue || 50) + delta));
    }
  }, 3000);
};

module.exports = { services, startQueueSimulation };
