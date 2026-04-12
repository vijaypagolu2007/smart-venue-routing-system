const fs = require('fs');
const path = require('path');

// LOAD DYNAMIC CONFIG
const configPath = path.join(__dirname, '../config/venue.json');
const venueConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const zones = {};

// Initialize zones from config
for (const id in venueConfig.zones) {
  zones[id] = {
    density: 10, // Initial nominal density
    capacity: venueConfig.zones[id].capacity,
    neighbors: venueConfig.zones[id].neighbors
  };
}

const getCrowdData = () => {
  return Object.keys(zones).map(id => ({
    id,
    density: zones[id].density,
    capacity: zones[id].capacity
  }));
};

const updateDensities = () => {
  for (const id in zones) {
    if (id === "Exit" || venueConfig.zones[id].type === "exit") {
      // Exit nodes show nominal flow-through density (5-15% of 1000 capacity)
      zones[id].density = 50 + Math.floor(Math.random() * 100);
      continue;
    }
    // Production Simulation: Add realistic drift vs pure random
    const drift = (Math.random() - 0.5) * 50;
    zones[id].density = Math.max(0, Math.min(zones[id].capacity, zones[id].density + Math.floor(drift)));
  }
};

const setDensity = (id, value) => {
  if (zones[id]) {
    zones[id].density = value;
  }
};

const resetZones = () => {
  for (const id in zones) {
    zones[id].density = 10;
  }
};

module.exports = { zones, getCrowdData, updateDensities, setDensity, resetZones };
