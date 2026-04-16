/**
 * SERVICE POINT METRICS
 * Simulates point-of-service locations within the stadium.
 * Tracks queue length and computes wait times dynamically.
 */

// Initial definitions for various stadium service points
const servicePoints = [
  { id: "FoodCourt_A", queue_length: 12, service_rate: 2 }, // 2 people processed per minute
  { id: "Gate_1", queue_length: 50, service_rate: 10 },
  { id: "Restroom_B", queue_length: 5, service_rate: 1 },
  { id: "Merch_Shop", queue_length: 20, service_rate: 0 } // Edge case for frozen service
];

/**
 * getQueueData
 * Aggregates all service points and computes current wait times.
 */
const getQueueData = () => {
  return servicePoints.map(sp => {
    let wait_time = 0;
    if (sp.service_rate > 0) {
      wait_time = sp.queue_length / sp.service_rate;
    } else {
      // Handle cases where service has stopped (infinite wait)
      wait_time = sp.queue_length > 0 ? Infinity : 0;
    }
    
    return {
      ...sp,
      wait_time
    };
  });
};

/**
 * updateQueues
 * Fluctuates the number of people in line to keep simulation data organic.
 */
const updateQueues = () => {
  servicePoints.forEach(sp => {
    // Random fluctuation of line length (-2 to +2 people)
    let change = Math.floor(Math.random() * 5) - 2;
    sp.queue_length = Math.max(0, sp.queue_length + change);
  });
};

module.exports = { getQueueData, updateQueues };

