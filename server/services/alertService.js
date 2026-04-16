/**
 * ALERT SERVICE
 * Analyzes current zone densities and generates real-time congestion alerts.
 * This data is used by the frontend to display warnings and by the 
 * routing engine to adjust path weights.
 */

/**
 * checkCongestion
 * Iterates through all stadium zones to find density levels above 
 * predefined thresholds (Medium: 50%, High: 70%, Critical: 90%).
 */
function checkCongestion(zones) {
  let alerts = [];

  for (let zone in zones) {
    const density = zones[zone].density;
    const capacity = zones[zone].capacity;
    let percent = Math.round((density / capacity) * 100);

    let level = "";
    let message = "";

    // Categorize congestion level based on capacity usage
    if (percent > 90) {
      level = "CRITICAL";
      message = `Avoid ${zone} - Extreme congestion (${percent}%)`;
    } else if (percent > 70) {
      level = "HIGH";
      message = `Avoid ${zone} - Heavy congestion (${percent}%)`;
    } else if (percent > 50) {
      level = "MEDIUM";
      message = `Avoid ${zone} - Moderate congestion (${percent}%)`;
    }

    if (level) {
      alerts.push({ zone, level, message });
    }
  }

  return alerts;
}

module.exports = { checkCongestion };

