const servicePoints = [
  { id: "FoodCourt_A", queue_length: 12, service_rate: 2 }, // 2 people/min
  { id: "Gate_1", queue_length: 50, service_rate: 10 },
  { id: "Restroom_B", queue_length: 5, service_rate: 1 },
  { id: "Merch_Shop", queue_length: 20, service_rate: 0 } // Edge case
];

const getQueueData = () => {
  return servicePoints.map(sp => {
    let wait_time = 0;
    if (sp.service_rate > 0) {
      wait_time = sp.queue_length / sp.service_rate;
    } else {
      wait_time = sp.queue_length > 0 ? Infinity : 0;
    }
    
    return {
      ...sp,
      wait_time
    };
  });
};

const updateQueues = () => {
  servicePoints.forEach(sp => {
    // Randomly change queue length
    let change = Math.floor(Math.random() * 5) - 2;
    sp.queue_length = Math.max(0, sp.queue_length + change);
  });
};

module.exports = { getQueueData, updateQueues };
