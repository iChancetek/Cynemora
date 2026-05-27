/* ========================================
   CyneMora — Firebase Client SDK
   Client-side initialization
   ======================================== */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

let firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// If running in App Hosting, read from FIREBASE_WEBAPP_CONFIG
if (process.env.FIREBASE_WEBAPP_CONFIG) {
  try {
    const parsed = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    firebaseConfig = {
      ...firebaseConfig,
      ...parsed,
    };
  } catch (err) {
    console.error("Failed to parse FIREBASE_WEBAPP_CONFIG", err);
  }
}

// Initialize Firebase (singleton)
const app: FirebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
