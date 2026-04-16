const request = require('supertest');
const { expect } = require('chai');
const { server, startSimulations, stopSimulations } = require('../server/index');
const { setDensity } = require('../server/simulation/stadium');

describe('Step 9: Final Integration Test', () => {
  const port = 0;

  before((done) => {
    if (server && !server.listening) {
      server.listen(port, () => {
        startSimulations();
        done();
      });
    } else {
      startSimulations();
      done();
    }
  });

  after((done) => {
    stopSimulations();
    if (server && server.listening) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('Path from Zone1 to Zone5 should avoid Zone3 when it is congested', async () => {
    // Layout: 1-2-3-4-5 (length 4) vs 1-6-5 (length 2)
    // Even if 1-6-5 is shorter, we want to ensure it picks the right one and specifically avoids 3
    
    // Setup: Zone3 and Zone2 are busy, Zone6 is empty
    setDensity('Zone1', 10);
    setDensity('Zone2', 500); // HIGH
    setDensity('Zone3', 580); // BLOCKED
    setDensity('Zone4', 10);
    setDensity('Zone5', 10);
    setDensity('Zone6', 0); // CLEAR PATH

    const res = await request(server)
      .post('/route')
      .send({ source: 'Zone1', destination: 'Zone5' });

    expect(res.status).to.equal(200);
    expect(res.body.path).to.be.an('array');
    expect(res.body.path).to.not.include('Zone3');
    expect(res.body.path).to.deep.equal(['Zone1', 'Zone6', 'Zone5']);
  });
});
