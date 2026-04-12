const { updateDensities, getCrowdData } = require('./stadium');
const { updateQueues, getQueueData } = require('./queues');
const { initFirebase, storeCrowdData, storeQueueData } = require('../services/firebaseService');

let interval;

const startSimulation = (io) => {
  if (interval) return;
  
  initFirebase();

  interval = setInterval(async () => {
    updateDensities();
    updateQueues();
    
    const crowdData = getCrowdData();
    const queueData = getQueueData();
    
    // Broadcast updates to all clients
    if (io) {
      io.emit('CROWD_UPDATE', crowdData);
      io.emit('QUEUE_UPDATE', queueData);
    }

    // Store to Firebase (Fire-and-forget to avoid blocking the simulation)
    storeCrowdData(crowdData);
    storeQueueData(queueData);
    
    // Check for alerts
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
