const request = require('supertest');
const { expect } = require('chai');
const { server, startSimulations, stopSimulations } = require('../server/index');
const { setDensity } = require('../server/simulation/venueState');

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

  it('Path from ENTRANCE to VIPLOUNGE should avoid FOODCOURTA when it is congested', async () => {
    // Setup: FOODCOURTA and FOODCOURTB are busy, CONCOURSE is empty
    setDensity('ENTRANCE', 10);
    setDensity('FOODCOURTA', 295); // BLOCKED
    setDensity('FOODCOURTB', 295); // BLOCKED
    setDensity('CONCOURSE', 1); // CLEAR PATH
    setDensity('NORTHTERRACE', 1);

    const res = await request(server)
      .post('/route')
      .send({ source: 'ENTRANCE', destination: 'VIPLOUNGE' });

    expect(res.status).to.equal(200);
    expect(res.body.path).to.be.an('array');
    expect(res.body.path).to.not.include('FOODCOURTA');
    expect(res.body.path).to.include('CONCOURSE');
  });
});
