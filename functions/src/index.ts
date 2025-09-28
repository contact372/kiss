import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize the Firebase Admin SDK.
admin.initializeApp();

export const grantPaidAccess = onRequest(
  // Options object: configure CORS to allow any origin
  { cors: true },
  // Handler function
  async (req, res) => {
    // We only expect POST requests for this function.
    if (req.method !== "POST") {
      logger.warn("Received non-POST request");
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

      // Update the user's document in Firestore.
      const userRef = admin.firestore().collection("users").doc(uid);
      await userRef.update({
        hasPaid: true,
      });

      logger.info(`Successfully granted paid access to user: ${uid}`);
      res.status(200).json({ success: true, message: "User status updated to paid." });

    } catch (error: any) { // <--- THIS IS THE FIX
      logger.error("Error granting paid access:", error);
      // Check if the error is an auth error from token verification
      // The error object from verifyIdToken has a 'code' property
      if (error.code && error.code.startsWith('auth/')) {
        res.status(403).send("Forbidden: Invalid authentication token.");
      } else {
        res.status(500).send("Internal Server Error");
      }
    }
  }
);
