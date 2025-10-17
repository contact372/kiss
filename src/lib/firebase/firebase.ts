import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics'; // 1. Importer les outils Analytics
import { firebaseConfig } from './config';

// Initialiser Firebase App, Auth, Firestore, Functions
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'europe-west1');

// --- SOLUTION DÉFINITIVE ---
// 2. Initialiser Analytics au plus tôt, côté client uniquement.
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("[Firebase Config] Analytics initialized.");
    }
  });
}
// --- FIN SOLUTION ---

// 3. Exporter l'instance d'Analytics avec les autres services.
export { app, auth, db, functions, analytics };
