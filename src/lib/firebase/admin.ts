/* ========================================
   CyneMora — Firebase Admin SDK
   Server-side only — NEVER import on client
   ======================================== */

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  let storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (process.env.FIREBASE_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_CONFIG);
      if (parsed.storageBucket) {
        storageBucket = parsed.storageBucket;
      }
    } catch (e) {
      console.error("Failed to parse FIREBASE_CONFIG in admin", e);
    }
  }

  // If service account env variables are present (e.g., local development), use cert.
  // Otherwise, fall back to Application Default Credentials (ADC) which Firebase App Hosting provides natively.
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    return initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      storageBucket,
    });
  }

  // Standard initialization for Google Cloud environment (App Hosting)
  return initializeApp({
    storageBucket,
  });
}

const adminApp = getAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);
const adminStorage = getStorage(adminApp);

export { adminApp, adminAuth, adminDb, adminStorage };
