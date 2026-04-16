const { expect } = require('chai');
const { shortestPath } = require('../server/services/routingService');
const { setDensity } = require('../server/simulation/stadium');
const { zones } = require('../server/simulation/crowdSimulator');

describe('Step 3: Path Optimization', () => {
  
  it('Path should avoid Zone3 when its density is extremely high', () => {
    // Set densities
    setDensity('Zone1', 10);
    setDensity('Zone2', 500); // HIGH
    setDensity('Zone3', 500); // HIGH
    setDensity('Zone4', 10);
    setDensity('Zone5', 10);
    setDensity('Zone6', 0);   // CLEAR

    const result = shortestPath(zones, 'Zone1', 'Zone5');
    const path = result.path;
    
    // Path should be [Zone1, Zone6, Zone5] 
    expect(path).to.not.include('Zone3');
    expect(path).to.not.include('Zone2');
    expect(path).to.deep.equal(['Zone1', 'Zone6', 'Zone5']);
  });
});
