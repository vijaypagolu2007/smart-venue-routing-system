const request = require('supertest');
const { expect } = require('chai');
const { server } = require('../server/index');
const { setDensity } = require('../server/simulation/stadium');

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

  it('POST /route should return optimized path and avoid Zone3 if congested', async () => {
    // Setup high density in Zone3 and Zone2
    setDensity('Zone2', 500); 
    setDensity('Zone3', 580);
    setDensity('Zone6', 0); // Low density alternative

    const res = await request(server)
      .post('/route')
      .send({ source: 'Zone1', destination: 'Zone5' });

    expect(res.status).to.equal(200);
    expect(res.body.path).to.be.an('array');
    expect(res.body.path).to.not.include('Zone3');
    expect(res.body.path).to.include('Zone6');
  });

  it('POST /route should return 400 if missing parameters', async () => {
    const res = await request(server)
      .post('/route')
      .send({ source: 'Zone1' });

    expect(res.status).to.equal(400);
  });
});
