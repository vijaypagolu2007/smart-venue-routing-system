/**
 * SVOS SYSTEM VALIDATOR
 * Automated check for Core Engine integrity and API availability.
 */

const http = require('http');

const endpoints = [
  { path: '/health', name: 'Health Check' },
  { path: '/config', name: 'Venue Configuration' },
  { path: '/queues', name: 'Queue Simulation Data' },
  { path: '/crowd/zones', name: 'Crowd Distribution' }
];

const checkEndpoint = (endpoint) => {
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${endpoint.path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[PASS] ${endpoint.name} (Status: 200)`);
          resolve(true);
        } else {
          console.error(`[FAIL] ${endpoint.name} (Status: ${res.statusCode})`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error(`[ERROR] ${endpoint.name} connection failed: ${err.message}`);
      resolve(false);
    });
  });
};

async function runValidation() {
  console.log('--- SVOS INTEGRITY SCAN ---');
  let allPass = true;
  for (const ep of endpoints) {
    const passed = await checkEndpoint(ep);
    if (!passed) allPass = false;
  }
  
  if (allPass) {
    console.log('--- SCAN COMPLETE: SYSTEM OPERATIONAL ---');
  } else {
    console.error('--- SCAN COMPLETE: WARNINGS DETECTED ---');
  }
}

runValidation();
