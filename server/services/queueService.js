/**
 * QUEUE SERVICE
 * Simple utility calculation for queue metrics.
 */

/**
 * estimateWait
 * Calculates processing time based on current queue length and throughput rate.
 */
function estimateWait(queue, rate) {
  if (rate === 0) return Infinity;
  return +(queue / rate).toFixed(1);
}

/**
 * getWorstService
 * Identifies which stadium amenity has the longest wait time.
 */
function getWorstService(services) {
  let worst = null;
  let maxWait = -1;

  for (let s in services) {
    let wait = estimateWait(services[s].queue, services[s].rate);
    if (wait > maxWait) {
      maxWait = wait;
      worst = { name: s, wait };
    }
  }

  return worst;
}

module.exports = { estimateWait, getWorstService };

