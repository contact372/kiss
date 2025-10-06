import * as admin from 'firebase-admin';

const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET;

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: BUCKET_NAME,
    });
  } else {
    console.warn('[FIREBASE_ADMIN] Service account key not found. Initializing without credentials for build process.');
    admin.initializeApp({
      storageBucket: BUCKET_NAME,
    });
  }
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

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
        credits: 10, 
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

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
