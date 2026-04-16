const { expect } = require('chai');
const io = require('socket.io-client');
const { server, startSimulations, stopSimulations } = require('../server/index');
const { setDensity } = require('../server/simulation/stadium');

describe('Step 5: Real-Time Alert Engine', () => {
  let socket;
  let testPort;

  before((done) => {
    if (server && !server.listening) {
      server.listen(0, () => {
        testPort = server.address().port;
        startSimulations();
        done();
      });
    } else {
      testPort = server.address().port;
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

  it('Should emit congestion_alert when density > 80%', (done) => {
    socket = io.connect(`http://localhost:${testPort}`, {
      transports: ['websocket'],
      'force new connection': true
    });

    let lock;
    socket.on('connect', () => {
      lock = setInterval(() => {
        setDensity('Zone3', 550);
      }, 50);
    });

    socket.on('congestion_alert', (payload) => {
      const { alerts } = payload;
      const alert = alerts.find(a => a.zone === 'Zone3');
      if (alert) {
        clearInterval(lock);
        expect(alert.level).to.be.oneOf(['HIGH', 'CRITICAL']);
        expect(alert.zone).to.equal('Zone3');
        socket.disconnect();
        done();
      }
    });
  }).timeout(10000);
});
