
import * as admin from 'firebase-admin';
import { firebaseAdminConfig } from '@/lib/firebase/config';

let adminDb: admin.firestore.Firestore;
let firebaseAdmin: admin.app.App;

function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(firebaseAdminConfig),
    });
    adminDb = admin.firestore();
    console.log('Firebase Admin initialized.');
  } else {
    firebaseAdmin = admin.app();
    adminDb = admin.firestore();
  }
  return { firebaseAdmin, adminDb };
}

export function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    initializeFirebaseAdmin();
  }
  return { firebaseAdmin, adminDb };
}

// This function remains for server-side actions, but it's now SECURE.
export const decrementUserCreditsAdmin = async (uid: string, amount: number = 1) => {
  const { adminDb } = getFirebaseAdmin();
  const userRef = adminDb.collection('users').doc(uid);

  // Use a transaction to safely decrement the credits
  return adminDb.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const newCredits = (userDoc.data()?.credits || 0) - amount;
    if (newCredits < 0) {
      throw new Error("Insufficient credits");
    }

    transaction.update(userRef, { credits: newCredits });
    return { success: true, newCredits };
  });
};
