
import * as admin from 'firebase-admin';

// When running on Google Cloud, the SDK automatically discovers the project configuration.
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

export { db, auth, storage };
