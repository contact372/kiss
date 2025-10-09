import * as admin from 'firebase-admin';

const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET;

if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: BUCKET_NAME,
  });
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

/**
 * Activates a user subscription, grants credits, and sets the access expiration date.
 * This is called when a 'membership.created' or renewal webhook is received.
 */
export async function activateUser(whopId: string): Promise<void> {
    const usersRef = db.collection('users');
    const q = usersRef.where('whopId', '==', whopId).limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) {
        console.log(`[activateUser] No user found with whopId: ${whopId}`);
        return;
    }

    // Calculate the date 15 days from now
    const accessUntil = new Date();
    accessUntil.setDate(accessUntil.getDate() + 15);

    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({
        hasPaid: true,
        credits: 15, // Corrected to 15 credits as requested
        accessUntil: admin.firestore.Timestamp.fromDate(accessUntil), // Set the access expiration date
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[activateUser] Activated user ${userDoc.id}. Access is valid until ${accessUntil.toISOString()}`);
}

/**
 * Deactivates a user subscription. This is called when a 'membership.cancelled' webhook is received.
 * It marks the subscription as not to be renewed, but preserves credits and access until the expiration date.
 */
export async function deactivateUser(whopId: string): Promise<void> {
    const usersRef = db.collection('users');
    const q = usersRef.where('whopId', '==', whopId).limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) {
        console.log(`[deactivateUser] No user found with whopId: ${whopId}`);
        return;
    }

    const userDoc = snapshot.docs[0];
    // Only mark the user as not paying anymore. 
    // The access period they already paid for remains valid until 'accessUntil'.
    await userDoc.ref.update({
        hasPaid: false, // The user has cancelled, so their subscription won't renew.
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[deactivateUser] Deactivated user ${userDoc.id}. They can still use credits until their access expires.`);
}

export { db, auth, storage };
