const { shortestPath } = require('../services/routingService');
const { zones } = require('../simulation/crowdSimulator');

const routeController = (req, res) => {
  const { source, destination } = req.body;
  
  if (!source || !destination) {
    return res.status(400).json({ error: 'Source and destination are required' });
  }

  try {
    const result = shortestPath(zones, source, destination);
    if (result.path.length === 0) {
      return res.status(404).json({ error: 'Path not found' });
    }
    res.json({ source, destination, path: result.path, cost: result.cost, reason: result.reason });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { routeController };
