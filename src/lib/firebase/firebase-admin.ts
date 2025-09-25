import { initializeApp as initializeAdminApp, getApps as getAdminApps, type App as AdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue, Timestamp, type Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth, type Auth as AdminAuth } from 'firebase-admin/auth';
import { getStorage as getAdminStorage, type Storage as AdminStorage } from 'firebase-admin/storage';
import type { UserProfile } from './types';
import { firebaseConfig } from './config';

// A singleton instance to ensure we don't re-initialize multiple times.
let adminInstance: {
  app: AdminApp;
  auth: AdminAuth;
  db: AdminFirestore;
  storage: AdminStorage;
} | null = null;

/**
 * Initializes and returns the Firebase Admin SDK instance, ensuring it's a singleton.
 */
export function getFirebaseAdmin() {
  if (adminInstance) {
    return adminInstance;
  }

  console.log('[FIREBASE_ADMIN_LOG] Attempting to initialize Firebase Admin SDK...');
  try {
    let app: AdminApp;
    if (getAdminApps().length === 0) {
      app = initializeAdminApp({
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      });
      console.log(`[FIREBASE_ADMIN_LOG] Firebase Admin SDK initialized for project: ${firebaseConfig.projectId}`);
    } else {
      app = getAdminApps()[0];
      console.log('[FIREBASE_ADMIN_LOG] Reusing existing Firebase Admin SDK instance.');
    }

    const auth = getAdminAuth(app);
    const db = getAdminFirestore(app);
    const storage = getAdminStorage(app);

    adminInstance = { app, auth, db, storage };
    console.log('[FIREBASE_ADMIN_LOG] Firebase Admin services (Auth, Firestore, Storage) obtained successfully.');

    return adminInstance;

  } catch (e) {
    console.error('[FIREBASE_ADMIN_FATAL] CRITICAL: Failed to initialize Firebase Admin SDK.', e);
    // Re-throw the error to ensure the calling function knows about the failure.
    throw e; 
  }
}

// Keep the existing helper functions, but make them use the getter to ensure initialization.

export async function activateUserSubscriptionAdmin(uid: string) {
    if (!uid) {
        console.error("[FIREBASE_ADMIN_ERROR] activateUserSubscriptionAdmin was called without a UID.");
        throw new Error("UID is required to activate a subscription.");
    }
    console.log(`[FIREBASE_ADMIN] Attempting to activate subscription for UID: ${uid}`);
    const { db } = getFirebaseAdmin();
    const userRef = db.doc(`users/${uid}`);
    
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            
            if (!userDoc.exists) {
                console.log(`[FIREBASE_ADMIN] User document for UID ${uid} does not exist. Creating new profile.`);
                const newProfileData: Partial<UserProfile> = {
                    uid: uid,
                    createdAt: FieldValue.serverTimestamp(),
                    lastLogin: FieldValue.serverTimestamp(),
                    isSubscribed: true,
                    subscriptionEndDate: null,
                    credits: 15,
                    creditsGranted: true,
                };
                transaction.set(userRef, newProfileData);
                console.log(`[FIREBASE_ADMIN_SUCCESS] Created new profile and activated subscription for UID: ${uid}`);
                return;
            }

            const data = userDoc.data() as UserProfile;
            const updateData: Partial<UserProfile> = {
                isSubscribed: true,
                subscriptionEndDate: null, 
            };

            if (!data.creditsGranted) {
                updateData.credits = (data.credits || 0) + 15;
                updateData.creditsGranted = true; 
                console.log(`[FIREBASE_ADMIN] Granting 15 credits to UID: ${uid}.`);
            } else {
                console.log(`[FIREBASE_ADMIN] Credits already granted for UID: ${uid}. Only updating subscription status.`);
            }

            transaction.update(userRef, updateData);
        });

        console.log(`[FIREBASE_ADMIN_SUCCESS] Successfully processed subscription activation for UID: ${uid}`);
    } catch (error) {
        console.error(`[FIREBASE_ADMIN_FATAL] Failed to activate subscription for UID: ${uid}`, error);
        throw error;
    }
}

export async function cancelUserSubscriptionAdmin(uid: string, endsAt: string, ended: boolean) {
    if (!uid) {
        console.error("[FIREBASE_ADMIN_ERROR] cancelUserSubscriptionAdmin was called without a UID.");
        throw new Error("UID is required to cancel a subscription.");
    }
    const { db } = getFirebaseAdmin();
    const userRef = db.doc(`users/${uid}`);
    
    const updateData: { subscriptionEndDate: any, isSubscribed?: boolean, creditsGranted?: boolean } = {
        subscriptionEndDate: Timestamp.fromDate(new Date(endsAt)),
    };

    if (ended) {
        updateData.isSubscribed = false;
        updateData.creditsGranted = false; 
    }
    
    console.log(`[FIREBASE_ADMIN] Updating subscription cancellation for UID: ${uid}`, updateData);
    await userRef.set(updateData, { merge: true });
}

export async function decrementUserCreditsAdmin(uid: string) {
    if (!uid) {
        console.error("[FIREBASE_ADMIN_ERROR] decrementUserCreditsAdmin called without UID.");
        throw new Error("User ID is required to decrement credits.");
    }
    const { db } = getFirebaseAdmin();
    const userRef = db.doc(`users/${uid}`);
    
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error(`User profile not found for UID: ${uid}`);
            }
            const userProfile = userDoc.data() as UserProfile;

            if (userProfile.isSubscribed) {
                console.log(`[FIREBASE_ADMIN] Pro user ${uid} generating. No credits decremented.`);
                return;
            }

            if (userProfile.credits <= 0) {
                throw new Error("User has no credits to decrement.");
            }

            transaction.update(userRef, {
                credits: FieldValue.increment(-1),
            });
             console.log(`[FIREBASE_ADMIN] Decremented credits for user ${uid}.`);
        });
    } catch (error) {
        console.error(`[FIREBASE_ADMIN_FATAL] Transaction failed for decrementing credits for UID ${uid}:`, error);
        throw error;
    }
}
