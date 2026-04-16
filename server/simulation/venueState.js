/**
 * VENUE STATE ENGINE
 * Manages the "Digital Twin" state of the physical venue zones.
 * It tracks densities, capacities, and neighbors based on the static venue config.
 */

const fs = require('fs');
const path = require('path');

// LOAD DYNAMIC CONFIG
const configPath = path.join(__dirname, '../config/venue.json');
const venueConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Reactive state object containing all active stadium zones
const zones = {};

/**
 * INITIALIZATION
 * Constructs the zone objects using values from venue.json.
 */
for (const id in venueConfig.zones) {
  zones[id] = {
    density: 10, // Initial nominal density (low background noise)
    capacity: venueConfig.zones[id].capacity,
    neighbors: venueConfig.zones[id].neighbors,
    inflow: 5,   // Simulated incoming movement
    outflow: 5   // Simulated outgoing movement
  };
}

/**
 * getCrowdData
 * Returns an array representation of the current crowd state for API responses.
 */
const getCrowdData = () => {
  return Object.keys(zones).map(id => ({
    id,
    density: zones[id].density,
    capacity: zones[id].capacity,
    inflow: zones[id].inflow,
    outflow: zones[id].outflow
  }));
};

/**
 * updateDensities
 * The main mutation loop for the simulation. 
 * Simulates human movement using "random drift" to keep the UI dynamic.
 */
const updateDensities = () => {
  for (const id in zones) {
    // Special handling for Exit nodes to simulate people leaving the arena
    if (id === "EXIT" || venueConfig.zones[id].type === "exit") {
      zones[id].density = 50 + Math.floor(Math.random() * 100);
      continue;
    }

    // Apply realistic drift (fluctuation) to simulate group movement
    const drift = (Math.random() - 0.5) * 50;
    zones[id].density = Math.max(0, Math.min(zones[id].capacity, zones[id].density + Math.floor(drift)));

    // Dynamic inflow/outflow simulation
    zones[id].inflow = Math.max(0, 10 + Math.floor((Math.random() - 0.5) * 20));
    zones[id].outflow = Math.max(0, 10 + Math.floor((Math.random() - 0.5) * 20));
  }
};

/**
 * setDensity
 * Manual override for a zone's density (used by the trigger_spike event).
 */
const setDensity = (id, value) => {
  if (zones[id]) {
    zones[id].density = value;
  }
};

/**
 * resetZones
 * Restores all zones to a nominal baseline state.
 */
const resetZones = () => {
  for (const id in zones) {
    zones[id].density = 10;
  }
};

module.exports = { zones, getCrowdData, updateDensities, setDensity, resetZones };

