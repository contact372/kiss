import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cors from "cors";

// Initialize the Firebase Admin SDK.
admin.initializeApp();
const db = admin.firestore();

// Create a CORS middleware handler.
// By default, this will allow requests from any origin.
// For production, you should restrict this to your app's domain.
const corsHandler = cors({ origin: true });

export const grantPaidAccess = functions.https.onRequest((req, res) => {
  // Wrap the main logic in the CORS handler.
  corsHandler(req, res, async () => {
    // We expect a POST request.
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Get the ID token from the Authorization header.
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("No Bearer token in authorization header.");
      res.status(401).send("Unauthorized");
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      // Verify the ID token.
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Update the user's document in Firestore.
      const userRef = db.collection("users").doc(uid);
      await userRef.update({
        hasPaid: true,
      });

      console.log(`Successfully granted paid access to user: ${uid}`);
      res.status(200).json({ success: true, message: "User status updated to paid." });

    } catch (error) {
      console.error("Error granting paid access:", error);
      // Check if the error is an auth error
      if (error.code?.startsWith('auth/')) {
        res.status(403).send("Forbidden: Invalid authentication token.");
      } else {
        res.status(500).send("Internal Server Error");
      }
    }
  });
});
