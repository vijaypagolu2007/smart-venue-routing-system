const { services } = require("../simulation/queueSimulator");
const { getWorstService } = require("./queueService");

function findSafeZone(zones, excludeSource) {
  let safest = null;
  let minCongestion = Infinity;

  for (let z in zones) {
    if (z === "Exit") continue; 
    if (z === excludeSource) continue; 
    
    let congestion = zones[z].density / zones[z].capacity;
    if (congestion < minCongestion) {
      minCongestion = congestion;
      safest = z;
    }
  }
  return safest;
}

function getSafeNeighbors(zones, current) {
  return (zones[current].neighbors || []).filter(n => {
    let congestion = zones[n].density / zones[n].capacity;
    return congestion < 0.85; // strict safety cutoff
  });
}

function getQueuePenalty(zone) {
  let penalty = 0;
  for (let s in services) {
    if (services[s].zone === zone) {
      let wait = services[s].queue / services[s].rate;
      penalty += wait * 2; // weight impact
    }
  }
  return penalty;
}

function computeRawPath(zones, source, destination, allowSourceCritical = false) {
  const dist = {};
  const parent = {};
  const visited = {};
  const blockedZones = [];

  if (!allowSourceCritical) {
    const srcCongestion = zones[source].density / zones[source].capacity;
    if (srcCongestion >= 0.85) return null;
  }

  Object.keys(zones).forEach(zone => {
    dist[zone] = Infinity;
    parent[zone] = null;
  });

  dist[source] = 0;

  while (true) {
    let u = null;
    for (let zone in dist) {
      if (!visited[zone] && (u === null || dist[zone] < dist[u])) {
        u = zone;
      }
    }

    if (u === null || dist[u] === Infinity) break;
    visited[u] = true;

    for (let neighbor of zones[u].neighbors) {
      if (visited[neighbor]) continue;

      let congestion = zones[neighbor].density / zones[neighbor].capacity;
      
      if (congestion >= 0.85) {
        if (!blockedZones.includes(neighbor)) blockedZones.push(neighbor);
        continue;
      }

      let penalty = 1; // base 1
      if (congestion >= 0.7) penalty += 200;
      else if (congestion >= 0.5) penalty += 50;

      let queuePenalty = getQueuePenalty(neighbor);
      let weight = 1 + penalty + (congestion * 30) + queuePenalty + 0.1;

      if (dist[u] + weight < dist[neighbor]) {
        dist[neighbor] = dist[u] + weight;
        parent[neighbor] = u;
      }
    }
  }

  if (dist[destination] === Infinity) return { blockedZones };

  let path = [];
  let curr = destination;
  while (curr) {
    path.push(curr);
    curr = parent[curr];
    if (curr === source) {
      path.push(source);
      break;
    }
  }

  return {
    path: path.reverse(),
    cost: dist[destination],
    blockedZones
  };
}

function getQuality(cost) {
  if (cost >= 85) return "DANGEROUS";
  if (cost >= 60) return "RISKY";
  if (cost >= 30) return "MODERATE";
  return "GOOD";
}

function calculateConfidence(normalizedCost, usedHighZonesCount, noSafePath, quality) {
  let confidence = Math.max(10, 100 - Math.round(normalizedCost));

  if (usedHighZonesCount > 0) confidence -= 20;
  if (noSafePath) confidence -= 30;

  if (quality === "MODERATE" && confidence < 45) {
    confidence = 45;
  } else if (quality === "RISKY" && confidence < 25) { 
    confidence = 25;
  }

  return Math.max(5, Math.min(100, confidence));
}

function shortestPath(zones, source, destination) {
  const uncertaintySuffix = " (limited safe options)";

  if (!zones[source] || !zones[destination]) {
    return { path: [], reason: "Invalid source or destination", cost: 0, quality: "N/A", confidence: "0%", steps: 0 };
  }

  const srcCongestion = zones[source].density / zones[source].capacity;

  // 🔄 FACILITY OVERFLOW LOGIC: Redirect to twin facility if primary is full
  const OVERFLOW_TWINS = {
    "FOODCOURTA":   "FOODCOURTB",
    "FOODCOURTB":   "FOODCOURTA",
    "RESTROOMWEST": "RESTROOMEAST",
    "RESTROOMEAST": "RESTROOMWEST"
  };

  let redirectionNotice = "";
  if (OVERFLOW_TWINS[destination]) {
    const destCongestion = zones[destination].density / zones[destination].capacity;
    if (destCongestion >= 0.85) {
      const twin = OVERFLOW_TWINS[destination];
      const twinCongestion = zones[twin].density / zones[twin].capacity;
      if (twinCongestion < 0.85) {
        redirectionNotice = `NOTICE: ${destination} is at critical capacity. Redirection to ${twin} recommended.`;
        destination = twin; // SWAP DESTINATION to the twin
      }
    }
  }

  const destCongestion = zones[destination].density / zones[destination].capacity;

  // 🆘 CASE: Source is Critical (EMERGENCY)
  if (srcCongestion >= 0.85) {
    const safeNeighbors = getSafeNeighbors(zones, source);

    if (safeNeighbors.length > 0) {
      let best = safeNeighbors.reduce((a, b) => {
        let ca = zones[a].density / zones[a].capacity;
        let cb = zones[b].density / zones[b].capacity;
        return ca < cb ? a : b;
      });

      return {
        path: [source, best],
        quality: "MODERATE",
        confidence: "60%",
        steps: 1,
        reason: `Emergency: ${source} unsafe. Redirecting to nearest viable zone: ${best}`
      };
    }

    return {
      path: [],
      quality: "DANGEROUS",
      confidence: "5%",
      steps: 0,
      reason: `Emergency: ${source} unsafe and no safe adjacent zones available. Stay in place${uncertaintySuffix}`
    };
  }

  // 🚦 CASE: Destination is Unsafe (Critical)
  if (destCongestion >= 0.85) {
    const safeZone = findSafeZone(zones, source);
    if (!safeZone) {
      return {
        path: [],
        reason: `Destination ${destination} unsafe. No safe fallback available. Stay in place${uncertaintySuffix}.`,
        cost: 100,
        quality: "DANGEROUS",
        confidence: "5%",
        steps: 0
      };
    }

    const redirectResult = computeRawPath(zones, source, safeZone, false);
    const path = (redirectResult && redirectResult.path) ? redirectResult.path : [safeZone];
    
    return {
      path: path,
      reason: `Destination ${destination} unsafe. Redirecting to safest available zone: ${safeZone}${uncertaintySuffix}.`,
      cost: 100,
      quality: "RISKY",
      confidence: "25%",
      steps: path.length - 1
    };
  }

  let result = computeRawPath(zones, source, destination, false);

  if (!result || !result.path) {
    const safeZone = findSafeZone(zones, source);
    if (!safeZone) {
       return {
        path: [],
        reason: `Critical stadium deadlock. No safe movement possible${uncertaintySuffix}.`,
        cost: 100,
        quality: "DANGEROUS",
        confidence: "5%",
        steps: 0
      };
    }

    const escape = computeRawPath(zones, source, safeZone, true);
    const path = (escape && escape.path) ? escape.path : [safeZone];
    
    return {
      path: path,
      reason: `No safe route to ${destination}. Redirecting to safest available zone: ${safeZone}${uncertaintySuffix}.`,
      cost: 100,
      quality: "RISKY",
      confidence: "25%",
      steps: path.length - 1
    };
  }

  const normalizedCost = Math.min(100, (result.cost / 1.5));
  const quality = getQuality(normalizedCost);
  const confidenceValue = calculateConfidence(normalizedCost, result.path.filter(z => z !== source && (zones[z].density / zones[z].capacity) > 0.7).length, false, quality);

  // 🧠 CLEANER LOGIC REASONING
  let details = [];

  // 1. Congested/Blocked Zones
  if (result.blockedZones && result.blockedZones.length > 0) {
    details.push(...result.blockedZones);
  }
  
  // 2. Used Risky Zones
  let usedHighZones = result.path.filter(z => z !== source && (zones[z].density / zones[z].capacity) > 0.7);
  if (usedHighZones.length > 0) {
    details.push(...usedHighZones);
  }

  // 3. Worst Queue Service
  const worst = getWorstService(services);
  if (worst && worst.wait > 10) {
    details.push(worst.name);
  }

  // Limit to top 2 for clean demo
  const summaryDetails = details.slice(0, 2);
  let reason = "";

  if (summaryDetails.length > 0) {
    reason = `Avoiding high congestion zones and long-wait services (${summaryDetails.join(", ")})`;
  } else {
    reason = "Selected least congested path based on real-time analysis";
  }

  if (redirectionNotice) {
    reason = `${redirectionNotice} ${reason}`;
  }

  if (confidenceValue < 30) {
    reason += uncertaintySuffix;
  }

  return {
    path: result.path,
    cost: normalizedCost,
    quality,
    confidence: `${confidenceValue}%`,
    steps: result.path.length - 1,
    blockedZones: result.blockedZones,
    reason
  };
}

module.exports = { shortestPath };
