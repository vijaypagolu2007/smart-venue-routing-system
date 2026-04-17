const request = require('supertest');
const { expect } = require('chai');
const { server } = require('../server/index');
const { setDensity } = require('../server/simulation/venueState');

describe('Step 6: Smart Routing API', () => {
  const port = 0;

  before((done) => {
    if (server && !server.listening) {
      server.listen(port, () => done());
    } else {
      done();
    }
  });

  after((done) => {
    if (server && server.listening) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('POST /route should return optimized path and avoid FOODCOURTA if congested', async () => {
    // Setup high density in Food Courts
    setDensity('FOODCOURTA', 295); 
    setDensity('FOODCOURTB', 295);
    setDensity('CONCOURSE', 10); // Low density alternative

    const res = await request(server)
      .post('/route')
      .send({ source: 'ENTRANCE', destination: 'VIPLOUNGE' });

    expect(res.status).to.equal(200);
    expect(res.body.path).to.be.an('array');
    expect(res.body.path).to.not.include('FOODCOURTA');
    expect(res.body.path).to.not.include('FOODCOURTB');
    expect(res.body.path).to.include('CONCOURSE');
  });

  it('POST /route should return 400 if missing parameters', async () => {
    const res = await request(server)
      .post('/route')
      .send({ source: 'ENTRANCE' });

    expect(res.status).to.equal(400);
  });
});
