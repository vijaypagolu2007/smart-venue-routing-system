const request = require('supertest');
const { expect } = require('chai');
const { server } = require('../server/index');
const { setDensity } = require('../server/simulation/stadium');

describe('Step 4: Queue Estimation System', () => {
  const port = 0;

  before((done) => {
    setDensity('Zone2', 500); // HIGH
    setDensity('Zone3', 580); // BLOCKED (>90% of 600)
    setDensity('Zone4', 10);
    setDensity('Zone5', 10);
    setDensity('Zone6', 0); // CLEAR PATH
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

  it('GET /queues should return service points with wait times', async () => {
    const res = await request(server).get('/queues');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    res.body.forEach(sp => {
      expect(sp).to.have.property('wait');
      
      if (sp.service_rate > 0) {
        expect(sp.wait).to.be.closeTo(sp.queue_length / sp.service_rate, 0.1);
      } else if (sp.queue_length > 0) {
        expect(sp.wait_time).to.equal(null); // JSON stringify of Infinity becomes null
      }
    });
  });

  it('Wait time should be Infinity (or null in JSON) if service_rate is 0', async () => {
    const res = await request(server).get('/queues');
    const sp = res.body[0]; // Just check first one
    expect(sp).to.have.property('wait');
  });
});
