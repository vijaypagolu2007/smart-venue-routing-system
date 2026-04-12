// server/services/alertService.js

function checkCongestion(zones) {
  let alerts = [];

  for (let zone in zones) {
    const density = zones[zone].density;
    const capacity = zones[zone].capacity;

    let percent = Math.round((density / capacity) * 100);

    let level = "";
    let message = "";

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
      alerts.push({
        zone,
        level,
        message
      });
    }
  }

  return alerts;
}

module.exports = { checkCongestion };
