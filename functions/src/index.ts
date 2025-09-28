import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import cors = require("cors");

// Initialize the Firebase Admin SDK.
admin.initializeApp();

// Initialize CORS middleware.
const corsHandler = cors({ origin: true });

export const grantPaidAccess = onRequest(async (req, res) => {
  // Handle CORS for preflight requests.
  corsHandler(req, res, async () => {
    // We only expect POST requests for this function.
    if (req.method !== "POST") {
      logger.warn(`Received non-POST request: ${req.method}`);
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Get the ID token from the Authorization header.
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.error("No Bearer token in authorization header.");
      res.status(401).send("Unauthorized: No Bearer token.");
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      // Verify the ID token using the Firebase Admin SDK.
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      logger.info(`Verified token for UID: ${uid}`);

      // Reference to the user's document in Firestore.
      const userRef = admin.firestore().collection("users").doc(uid);

      // Use a transaction to safely update the user's credits.
      await admin.firestore().runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const currentCredits = userDoc.data()?.credits || 0;
        const newCredits = currentCredits + 100; // Add 100 credits.
        
        transaction.update(userRef, {
          hasPaid: true, // Keep this for backward compatibility or other checks.
          credits: newCredits,
        });
      });

      logger.info(`Successfully granted 100 credits to user: ${uid}`);
      res.status(200).json({ success: true, message: "User credits updated." });

    } catch (error: any) {
      logger.error("Error granting paid access:", error);
      // Check if the error is an auth error from token verification.
      if (error.code && error.code.startsWith("auth/")) {
        res.status(403).send("Forbidden: Invalid authentication token.");
      } else {
        res.status(500).send("Internal Server Error");
      }
    }
  });
});
