function estimateWait(queue, rate) {
  if (rate === 0) return Infinity;
  return +(queue / rate).toFixed(1);
}

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
