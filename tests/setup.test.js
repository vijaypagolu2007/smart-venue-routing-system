const request = require('supertest');
const { expect } = require('chai');
const io = require('socket.io-client');
const { server } = require('../server/index');

describe('Step 1: Project Setup', () => {
  let socket;
  let testPort;

  before((done) => {
    if (server && !server.listening) {
      server.listen(0, () => {
        testPort = server.address().port;
        done();
      });
    } else {
      testPort = server.address().port;
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

  it('Server should start and respond to /health', async () => {
    const res = await request(server).get('/health');
    expect(res.status).to.equal(200);
    expect(res.body.status).to.equal('UP');
  });

  it('WebSocket should connect successfully', (done) => {
    socket = io.connect(`http://localhost:${testPort}`, {
      'reconnection delay': 0,
      'reopen delay': 0,
      'force new connection': true,
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      expect(socket.connected).to.be.true;
      socket.disconnect();
      done();
    });

    socket.on('connect_error', (err) => {
      done(err);
    });
  });
});
