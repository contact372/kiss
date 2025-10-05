
import * as admin from 'firebase-admin';

const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET;

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: BUCKET_NAME,
  });
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

/**
 * Activates a user's subscription by finding them via their Whop ID.
 * @param whopId - The user's ID from Whop.
 */
export async function activateUser(whopId: string): Promise<void> {
    const usersRef = db.collection('users');
    const q = usersRef.where('whopId', '==', whopId).limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) {
        console.log(`No user found with whopId: ${whopId}`);
        return;
    }

    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({
        hasPaid: true,
        credits: 10, // Grant 10 credits on activation
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Deactivates a user's subscription by finding them via their Whop ID.
 * @param whopId - The user's ID from Whop.
 */
export async function deactivateUser(whopId: string): Promise<void> {
    const usersRef = db.collection('users');
    const q = usersRef.where('whopId', '==', whopId).limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) {
        console.log(`No user found with whopId: ${whopId}`);
        return;
    }

    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({
        hasPaid: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

export { db, auth, storage };
