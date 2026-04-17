import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// SVOS Firebase Configuration
// Replace these with your actual Firebase project credentials from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDwIbK9zWWqYnHpQkMgmnex-zm2uVzWSiY",
  authDomain: "svos-ai-venue-2026.firebaseapp.com",
  projectId: "svos-ai-venue-2026",
  storageBucket: "svos-ai-venue-2026.firebasestorage.app",
  messagingSenderId: "131590729249",
  appId: "1:131590729249:web:11633b0363bfcea3e4bd60"
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase Initialization Failed (Possible invalid config):", e);
}

// Initialize Services with safety guards
export const analytics = app && typeof window !== "undefined"
  ? getAnalytics(app) 
  : { logEvent: (name, params) => console.log(`[MOCK ANALYTICS] ${name}`, params) };

export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();
export const db = app ? getFirestore(app) : null;

export default app;
