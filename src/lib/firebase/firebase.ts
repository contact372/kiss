import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { firebaseConfig } from './config';

// Initialiser les services principaux de manière synchrone
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'europe-west1');

// --- LA VRAIE SOLUTION ---
// Initialiser Analytics de manière SYNCHRONE, mais uniquement côté client.
// Cela garantit que lorsque 'auth' est importé ailleurs, Analytics est déjà prêt.
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  // getAnalytics est idempotent (on peut l'appeler plusieurs fois sans risque)
  // et il s'assure que le service est bien initialisé sur l'instance 'app'.
  analytics = getAnalytics(app);
}
// --- FIN DE LA SOLUTION ---

// Exporter toutes les instances. 'analytics' sera soit l'instance valide, soit null (sur le serveur).
export { app, auth, db, functions, analytics };
