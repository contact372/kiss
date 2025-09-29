
import * as admin from 'firebase-admin';

// THIS IS THE CORRECT BUCKET. It belongs to the Firebase project gen-lang-client-0395827708.
const FIREBASE_STORAGE_BUCKET = 'gen-lang-client-0395827708.firebasestorage.app';

/**
 * This function initializes the Firebase Admin SDK if it hasn't been initialized yet.
 * It's designed to work in serverless environments like Vercel or Google Cloud Run,
 * where the same instance might be reused across multiple invocations.
 */
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    // When deployed to Google Cloud (e.g., Cloud Run), the SDK can auto-discover the project credentials
    // of the project it is running in. We explicitly tell it which bucket to use, even if it's
    // in a different project.
    admin.initializeApp({
      storageBucket: FIREBASE_STORAGE_BUCKET,
    });
    console.log(`Firebase Admin SDK Initialized. Using Storage Bucket: ${FIREBASE_STORAGE_BUCKET}`);
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
