const { expect } = require('chai');
const { shortestPath } = require('../server/services/routingService');
const { setDensity, resetZones } = require('../server/simulation/venueState');
const { zones } = require('../server/simulation/crowdSimulator');

describe('Step 3: Path Optimization', () => {
  
  it('Path should avoid FOODCOURTA when its density is extremely high', () => {
    // Set densities baseline
    resetZones();
    setDensity('ENTRANCE', 10);
    setDensity('FOODCOURTA', 290); // HIGH (Capacity 300)
    setDensity('FOODCOURTB', 10);
    setDensity('VIPLOUNGE', 10);
    setDensity('CONCOURSE', 10);
    setDensity('NORTHTERRACE', 10);

    const result = shortestPath(zones, 'ENTRANCE', 'VIPLOUNGE');
    const path = result.path;
    
    // Path should avoid FOODCOURTA
    expect(path).to.not.include('FOODCOURTA');
    expect(path[0]).to.equal('ENTRANCE');
    expect(path[path.length - 1]).to.equal('VIPLOUNGE');
  });
});
