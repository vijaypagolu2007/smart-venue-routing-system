const admin = require('firebase-admin');

let db;

const initFirebase = () => {
  const initializeMock = () => {
    console.warn('Using MOCK mode for Firestore.');
    db = {
      collection: (name) => ({
        doc: (id) => ({
          set: async (data) => ({ success: true })
        })
      })
    };
  };

  try {
    if (admin.apps.length > 0) {
      db = admin.firestore();
      return;
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_SERVICE_ACCOUNT.includes('YOUR_PROJECT_ID')) {
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (e) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, '\n'));
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      db = admin.firestore();
      console.log('Firebase initialized (Real Firestore)');
    } else {
      initializeMock();
    }
  } catch (error) {
    console.error('Firebase initialization error, falling back to MOCK:', error.message);
    initializeMock();
  }
};

const storeCrowdData = async (data) => {
  if (!db || typeof db.collection !== 'function') return;
  try {
    const docRef = db.collection('crowd_data').doc('current');
    await docRef.set({ zones: data, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Firestore Store Crowd Data Error:', error.message);
  }
};

const storeQueueData = async (data) => {
  if (!db || typeof db.collection !== 'function') return;
  try {
    const docRef = db.collection('queue_data').doc('current');
    await docRef.set({ queues: data, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Firestore Store Queue Data Error:', error.message);
  }
};

module.exports = { initFirebase, storeCrowdData, storeQueueData };
