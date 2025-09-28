
import * as functions from 'firebase-functions';
import { adminDb } from './firebase-admin';

/**
 * A callable Cloud Function to grant a user paid access.
 * This function should be called from the client after a successful payment.
 * It uses the admin SDK to securely update the user's document.
 */
export const grantPaidAccess = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const uid = context.auth.uid;

  try {
    // Update the user's document in Firestore with admin privileges.
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.update({
      isSubscribed: true,
    });

    console.log(`Successfully granted paid access to user ${uid}`);
    return { success: true, message: `Access granted to ${uid}` };

  } catch (error) {
    console.error(`Error granting paid access to ${uid}:`, error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while updating the user document.'
    );
  }
});
