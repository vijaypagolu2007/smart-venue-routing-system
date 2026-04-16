const request = require('supertest');
const { expect } = require('chai');
const { server, startSimulations, stopSimulations } = require('../server/index');
const { zones } = require('../server/simulation/stadium');

describe('Step 2: Crowd Simulation Engine', () => {
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

  it('GET /crowd should return all zones with density and capacity', async () => {
    const res = await request(server).get('/crowd');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.equal(Object.keys(zones).length);
    res.body.forEach(zone => {
      expect(zone).to.have.property('id');
      expect(zone).to.have.property('density');
      expect(zone).to.have.property('capacity');
    });
  });

  it('Crowd density should update over time and stay within bounds', async function() {
    this.timeout(5000);
    
    const res1 = await request(server).get('/crowd');
    const densities1 = res1.body.map(z => z.density);
    
    // Wait for 2.1 seconds for the next update
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    const res2 = await request(server).get('/crowd');
    const densities2 = res2.body.map(z => z.density);
    
    // Check if at least one density changed (randomly it might stay same, but likely not all)
    const changed = densities1.some((d, i) => d !== densities2[i]);
    expect(changed).to.be.true;
    
    // Check bounds
    res2.body.forEach(zone => {
      expect(zone.density).to.be.at.least(0);
      expect(zone.density).to.be.at.most(zone.capacity);
    });
  });
});
