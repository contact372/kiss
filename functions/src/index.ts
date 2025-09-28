import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// Define the callable function
export const grantPaidAccess = onCall({ cors: true }, async (request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  const uid = request.auth.uid;
  const userRef = db.collection("users").doc(uid);

  logger.info(`Granting paid access to user: ${uid}`);

  try {
    // Update the user's document in Firestore
    await userRef.set(
      {
        isSubscribed: true,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    logger.info(`Successfully granted paid access to user: ${uid}`);
    return { success: true };
  } catch (error) {
    logger.error(`Failed to grant paid access to user: ${uid}`, error);
    throw new HttpsError(
      "internal",
      "An error occurred while granting paid access.",
    );
  }
});
