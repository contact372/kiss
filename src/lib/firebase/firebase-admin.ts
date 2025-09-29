
import * as admin from 'firebase-admin';

// The default bucket name for your Firebase project.
// This is derived from your project ID: kiss-85782219182
const FIREBASE_STORAGE_BUCKET = 'kiss-85782219182.appspot.com';

/**
 * This function initializes the Firebase Admin SDK if it hasn't been initialized yet.
 * It's designed to work in serverless environments like Vercel or Google Cloud Run,
 * where the same instance might be reused across multiple invocations.
 */
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    // When deployed to Google Cloud (e.g., Cloud Run), the SDK can auto-discover the project credentials.
    // We add the storageBucket to the config to ensure Cloud Storage works correctly.
    admin.initializeApp({
      storageBucket: FIREBASE_STORAGE_BUCKET,
    });
    console.log('Firebase Admin SDK Initialized with Storage Bucket.');
  } else {
    // If already initialized, just return the default app instance.
    return admin.app();
  }
}

// Initialize on module load
initializeFirebaseAdmin();

/**
 * Decrements a user's credits in Firestore using a secure admin transaction.
 * 
 * @param {string} uid - The user's unique ID.
 * @param {number} [amount=1] - The number of credits to decrement.
 * @returns {Promise<{success: boolean, newCredits: number}>}
 */
export const decrementUserCreditsAdmin = async (uid: string, amount: number = 1) => {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);

  return db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error("User not found, cannot decrement credits.");
    }

    const currentCredits = userDoc.data()?.credits || 0;
    const newCredits = currentCredits - amount;
    
    if (newCredits < 0) {
      throw new Error("Insufficient credits for this action.");
    }

    transaction.update(userRef, { credits: newCredits });
    return { success: true, newCredits };
  });
};

