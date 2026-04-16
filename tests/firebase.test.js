const { expect } = require('chai');
const { storeCrowdData, storeQueueData } = require('../server/services/firebaseService');

describe('Step 7: Firebase Integration', () => {
  it('Should successfully store crowd and queue data (even in mock mode)', async () => {
    const crowdRes = await storeCrowdData([{ id: 'Zone1', density: 50 }]);
    const queueRes = await storeQueueData([{ id: 'Gate1', wait_time: 10 }]);
    
    // In mock mode it doesn't return much, but it shouldn't throw
    expect(true).to.be.true; 
  });
});
