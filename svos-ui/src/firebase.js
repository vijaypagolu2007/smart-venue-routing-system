import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// SVOS Firebase Configuration
// NOTE: These keys are public by design for Firebase Web Client, 
// though they may trigger automated warnings in Git scanners.
const rc = window.SVOS_RUNTIME_CONFIG || {};

const firebaseConfig = {
  apiKey: rc.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDwIbK9zWWqYnHpQkMgmnex-zm2uVzWSiY",
  authDomain: rc.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "svos-ai-venue-2026.firebaseapp.com",
  projectId: rc.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID || "svos-ai-venue-2026",
  storageBucket: rc.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "svos-ai-venue-2026.firebasestorage.app",
  messagingSenderId: rc.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "131590729249",
  appId: rc.VITE_FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID || "1:131590729249:web:11633b0363bfcea3e4bd60",
  measurementId: rc.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2YL7N1SZ4S"
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
