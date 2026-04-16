/**
 * SIMULATION ENGINE
 * The central heartbeat of the stadium simulation.
 * It coordinates the mutation of physical states (crowd, queues), 
 * triggers socket broadcasts to clients, and handles long-term data persistence.
 */

const { updateDensities, getCrowdData } = require('./venueState');
const { updateQueues, getQueueData } = require('./queues');
const { initFirebase, storeCrowdData, storeQueueData } = require('../services/firebaseService');

let interval;

/**
 * startSimulation
 * Begins the simulation heartbeat.
 * Runs every 2 seconds to ensure the UI remains fluid and responsive.
 */
const startSimulation = (io) => {
  if (interval) return;
  
  // Ensure the database connection is ready before simulation starts
  initFirebase();

  interval = setInterval(async () => {
    // 1. Advance the state of the digital twin
    updateDensities();
    updateQueues();
    
    const crowdData = getCrowdData();
    const queueData = getQueueData();
    
    // 2. Broadcast updates to all connected dashboard clients
    if (io) {
      io.emit('CROWD_UPDATE', crowdData);
      io.emit('QUEUE_UPDATE', queueData);
    }

    /**
     * PERSISTENCE LAYER
     * Fire-and-forget storage to Firestore.
     * Keeps execution fast while maintaining a historical audit trail.
     */
    storeCrowdData(crowdData);
    storeQueueData(queueData);
    
    /**
     * ALERT SYSTEM (Real-time triggers)
     * Basic threshold detection to notify the UI of immediate safety risks.
     */
    crowdData.forEach(zone => {
      if (zone.density > 80) {
        io.emit('ZONE_OVERLOAD', { zoneId: zone.id, density: zone.density });
      }
    });
  }, 2000);
};

const stopSimulation = () => {
  clearInterval(interval);
  interval = null;
};

module.exports = { startSimulation, stopSimulation };

