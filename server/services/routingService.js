/**
 * ROUTING SERVICE v2 (OPTIMIZED)
 * This module provides predictive pathfinding capabilities for the venue.
 * Refactored for modularity, predictability, and "Smart AI" demonstration.
 */

const { services } = require("../simulation/queueSimulator");
const { getWorstService } = require("./queueService");

/**
 * 🧠 PREDICTIVE AI LAYER
 * Predicts congestion 2 steps ahead based on inflow/outflow trends.
 */
function predictCongestion(zone) {
  // Density + (Net change) * Prediction Horizon (2 ticks)
  const predictedDensity = zone.density + (zone.inflow - zone.outflow) * 2;
  return Math.max(0, predictedDensity);
}

/**
 * 🛡️ ADVANCED FALLBACK LOGIC
 * Distance-aware fallback selection to find the nearest and safest refuge.
 */
function findBestFallback(zones, source) {
  let best = null;
  let bestScore = Infinity;

  for (let z in zones) {
    if (z === source || z === "EXIT") continue;

    const futureDensity = predictCongestion(zones[z]);
    const congestion = futureDensity / zones[z].capacity;
    
    // Distance heuristic: neighbor = 1, others = 3
    const dist = (zones[source].neighbors || []).includes(z) ? 1 : 3;
    
    // Weight congestion more heavily than distance
    const score = (congestion * 10) + dist;

    if (score < bestScore) {
      bestScore = score;
      best = z;
    }
  }

  return best;
}

/**
 * 🛠️ UTILITIES
 */
function getQueuePenalty(zone) {
  let penalty = 0;
  for (let s in services) {
    if (services[s].zone === zone) {
      let wait = (services[s].queue / services[s].rate) || 0;
      penalty += wait; 
    }
  }
  return penalty;
}

/**
 * 1️⃣ COMPUTE PATH (Pure Algorithm)
 * Refined weighting model: Predictable and Stable.
 */
function computePath(zones, source, destination, allowSourceCritical = false) {
  const dist = {};
  const parent = {};
  const visited = {};
  const blockedZones = [];

  Object.keys(zones).forEach(id => {
    dist[id] = Infinity;
    parent[id] = null;
  });

  dist[source] = 0;

  while (true) {
    let u = null;
    for (let id in dist) {
      if (!visited[id] && (u === null || dist[id] < dist[u])) u = id;
    }

    if (u === null || dist[u] === Infinity) break;
    visited[u] = true;
    if (u === destination) break;

    for (let neighbor of zones[u].neighbors) {
      if (visited[neighbor]) continue;

      const futureDensity = predictCongestion(zones[neighbor]);
      const congestion = futureDensity / zones[neighbor].capacity;

      // CLEAN WEIGHT MODEL
      let weight = 1;

      // Congestion influence (Primary)
      weight += congestion * 10;

      // Queue influence (Secondary - capped)
      weight += Math.min(getQueuePenalty(neighbor), 20);

      // Hard safety thresholds
      if (congestion >= 0.85) {
        weight += 1000; // Impassable
        if (!blockedZones.includes(neighbor)) blockedZones.push(neighbor);
      } else if (congestion >= 0.7) {
        weight += 50;   // High avoidance
      }

      if (dist[u] + weight < dist[neighbor]) {
        dist[neighbor] = dist[u] + weight;
        parent[neighbor] = u;
      }
    }
  }

  if (dist[destination] === Infinity) return { path: [], cost: Infinity, blockedZones };

  const path = [];
  let curr = destination;
  while (curr) {
    path.push(curr);
    curr = parent[curr];
    if (curr === source) {
      path.push(source);
      break;
    }
  }
  return { path: path.reverse(), cost: dist[destination], blockedZones };
}

/**
 * 1.5️⃣ COMPUTE NAIVE PATH (Shortest Physical Distance)
 * Simple Dijkstra where all weights = 1. Shows where the user WOULD go without AI.
 */
function computeNaivePath(zones, source, destination) {
  const dist = {};
  const parent = {};
  const visited = {};

  Object.keys(zones).forEach(id => {
    dist[id] = Infinity;
    parent[id] = null;
  });

  dist[source] = 0;

  while (true) {
    let u = null;
    for (let id in dist) {
      if (!visited[id] && (u === null || dist[id] < dist[u])) u = id;
    }

    if (u === null || dist[u] === Infinity || u === destination) break;
    visited[u] = true;

    for (let neighbor of zones[u].neighbors) {
      if (visited[neighbor]) continue;
      if (dist[u] + 1 < dist[neighbor]) { // Unweighted
        dist[neighbor] = dist[u] + 1;
        parent[neighbor] = u;
      }
    }
  }

  const path = [];
  let curr = destination;
  while (curr) {
    path.push(curr);
    curr = parent[curr];
    if (curr === source) {
      path.push(source);
      break;
    }
  }
  return path.reverse();
}


/**
 * 2️⃣ HANDLE EDGE CASES (Emergency & Redirection)
 */
function handleEdgeCases(zones, source, destination) {
  const srcFuture = predictCongestion(zones[source]);
  const srcCongestion = srcFuture / zones[source].capacity;

  const OVERFLOW_TWINS = {
    "FOODCOURTA": "FOODCOURTB", "FOODCOURTB": "FOODCOURTA",
    "RESTROOMWEST": "RESTROOMEAST", "RESTROOMEAST": "RESTROOMWEST"
  };

  // Emergency: Source is unsafe
  if (srcCongestion >= 0.85) {
    const fallback = findBestFallback(zones, source);
    return {
      type: "EMERGENCY_SOURCE",
      source,
      destination: fallback,
      reason: `EMERGENCY: Source [${source}] unsafe. Rerouting to nearest refuge [${fallback}].`
    };
  }

  // Redirection: Destination is full
  if (OVERFLOW_TWINS[destination]) {
    const destFuture = predictCongestion(zones[destination]);
    if (destFuture / zones[destination].capacity >= 0.85) {
      const twin = OVERFLOW_TWINS[destination];
      if (predictCongestion(zones[twin]) / zones[twin].capacity < 0.85) {
        return {
          type: "REDIRECTION",
          source,
          destination: twin,
          reason: `NOTICE: [${destination}] at capacity. Redirecting to twin facility [${twin}].`
        };
      }
    }
  }

  // Destination is unsafe (no direct twin found or available)
  const finalDestFuture = predictCongestion(zones[destination]);
  if (finalDestFuture / zones[destination].capacity >= 0.85) {
    const fallback = findBestFallback(zones, source);
    return {
      type: "EMERGENCY_DEST",
      source,
      destination: fallback,
      reason: `NOTICE: [${destination}] unsafe. Diverting to safest zone [${fallback}].`
    };
  }

  return { type: "NORMAL", source, destination };
}

/**
 * 3️⃣ BUILD RESPONSE (UI Formatting)
 */
function buildResponse(zones, source, destination, result, redirectionNotice, naivePath = []) {
  const normalizedCost = Math.min(100, result.cost * 1.5);
  
  let quality = "GOOD";
  if (normalizedCost > 80) quality = "DANGEROUS";
  else if (normalizedCost > 50) quality = "RISKY";
  else if (normalizedCost > 30) quality = "MODERATE";

  let confidence = Math.max(5, 100 - Math.round(normalizedCost));
  if (result.blockedZones.length > 0) confidence -= 20;

  // Construct natural reasoning
  let reason = redirectionNotice || "Optimized path based on predicted flow and queue delays.";
  if (result.blockedZones.length > 0) {
    reason = `Bypassing high-pressure zones (${result.blockedZones.slice(0, 2).join(", ")}). ${reason}`;
  }

  return {
    path: result.path,
    naivePath,
    cost: normalizedCost,
    quality,
    confidence: `${Math.max(5, confidence)}%`,
    steps: Math.max(0, result.path.length - 1),
    reason
  };
}

/**
 * 🚀 SHORTEST PATH (Orchestrator)
 */
function shortestPath(zones, source, destination) {
  if (!zones[source] || !zones[destination]) {
    return { path: [], reason: "Invalid zone mapping", quality: "N/A", confidence: "0%" };
  }

  // 1. Check emergency and redirection
  const edgeCase = handleEdgeCases(zones, source, destination);
  
  // 2. Compute the path
  let result = computePath(zones, edgeCase.source, edgeCase.destination);

  // 3. Compute the "Naive" physical path for comparison
  const naivePath = computeNaivePath(zones, source, destination);

  // 4. Handle total path failure (deadlock)
  if (result.path.length === 0) {
     const fallback = findBestFallback(zones, source);
     result = computePath(zones, source, fallback);
     edgeCase.reason = `DEADLOCK: Path to [${destination}] blocked. Escape route to [${fallback}] active.`;
  }

  // 5. Format for UI
  return buildResponse(zones, source, edgeCase.destination, result, edgeCase.reason, naivePath);
}

module.exports = { shortestPath };
