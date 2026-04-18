import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// SVOS Firebase Configuration
// SECURITY FIX: Credentials are retrieved from runtime injection (prefered) 
// or build-time environment variables.
const rc = window.SVOS_RUNTIME_CONFIG || {};

const firebaseConfig = {
  apiKey: rc.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: rc.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: rc.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: rc.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: rc.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: rc.VITE_FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: rc.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase with singleton pattern
let app;
if (firebaseConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (e) {
    console.error("Firebase Initialization Failed (Possible invalid config):", e);
  }
} else {
  console.warn("Firebase API Key missing - running in mock mode");
}

// Initialize Services with safety guards
export const analytics = app && typeof window !== "undefined"
  ? getAnalytics(app) 
  : { logEvent: (name, params) => console.log(`[MOCK ANALYTICS] ${name}`, params) };
export const auth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;
export const db = app ? getFirestore(app) : null;

// Safe Authentication Wrappers
import { onAuthStateChanged as firebaseOnAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";

export const onAuthStateChanged = (authObj, cb) => {
  if (authObj && typeof firebaseOnAuthStateChanged === "function") {
    return firebaseOnAuthStateChanged(authObj, cb);
  }
  cb(null);
  return () => {};
};

export const signOut = async (authObj) => {
  if (authObj && typeof firebaseSignOut === "function") {
    return firebaseSignOut(authObj);
  }
};

export default app;
