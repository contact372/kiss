// src/lib/firebase/firebase-admin.ts
import { initializeApp as initializeAdminApp, getApps as getAdminApps, type App as AdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue, Timestamp, type Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth, type Auth as AdminAuth } from 'firebase-admin/auth';
import type { UserProfile } from './types';
import { firebaseConfig } from './config';


let adminApp: AdminApp;
let adminAuth: AdminAuth;
let adminDb: AdminFirestore;

console.log('[FIREBASE_ADMIN_LOG] Attempting to initialize Firebase Admin SDK...');
try {
    if (getAdminApps().length === 0) {
        adminApp = initializeAdminApp({
            projectId: firebaseConfig.projectId,
        });
        console.log(`[FIREBASE_ADMIN_LOG] Firebase Admin SDK initialized for project: ${firebaseConfig.projectId}`);
    } else {
        adminApp = getAdminApps()[0];
        console.log('[FIREBASE_ADMIN_LOG] Reusing existing Firebase Admin SDK instance.');
    }

    adminAuth = getAdminAuth(adminApp);
    adminDb = getAdminFirestore(adminApp);
    console.log('[FIREBASE_ADMIN_LOG] Firebase Admin services (Auth, Firestore) obtained successfully.');

} catch (e) {
    console.error('[FIREBASE_ADMIN_FATAL] CRITICAL: Failed to initialize Firebase Admin SDK. This will cause all server-side Firebase operations to fail.', e);
    // We don't throw here to allow the server to start, but errors will occur.
}


export const admin = {
  auth: adminAuth,
  db: adminDb,
  app: adminApp,
};

// Server-side database functions using Admin SDK

export async function activateUserSubscriptionAdmin(uid: string) {
    if (!uid) {
        console.error("[FIREBASE_ADMIN_ERROR] activateUserSubscriptionAdmin was called without a UID.");
        throw new Error("UID is required to activate a subscription.");
    }
    console.log(`[FIREBASE_ADMIN] Attempting to activate subscription for UID: ${uid}`);
    const userRef = adminDb.doc(`users/${uid}`);
    
    try {
        await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            
            // It's safer to get user email from the client or another trusted source if needed.
            // For now, we assume the user profile might be new.
            
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
                subscriptionEndDate: null, // Clear any previous cancellation date
            };

            // CRITICAL: This is the definitive check to prevent double-crediting.
            if (!data.creditsGranted) {
                updateData.credits = (data.credits || 0) + 15;
                updateData.creditsGranted = true; // Set the flag to true
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
    const userRef = adminDb.doc(`users/${uid}`);
    
    const updateData: { subscriptionEndDate: any, isSubscribed?: boolean, creditsGranted?: boolean } = {
        subscriptionEndDate: Timestamp.fromDate(new Date(endsAt)),
    };

    // When the subscription officially ends (not just cancelled), reset their status and ability to get new credits.
    if (ended) {
        updateData.isSubscribed = false;
        updateData.creditsGranted = false; // Reset the flag so they can get credits if they re-subscribe.
    }
    
    console.log(`[FIREBASE_ADMIN] Updating subscription cancellation for UID: ${uid}`, updateData);
    await userRef.set(updateData, { merge: true });
}

export async function decrementUserCreditsAdmin(uid: string) {
    if (!uid) {
        console.error("[FIREBASE_ADMIN_ERROR] decrementUserCreditsAdmin called without UID.");
        throw new Error("User ID is required to decrement credits.");
    }
    const userRef = admin.db.doc(`users/${uid}`);
    
    try {
        await admin.db.runTransaction(async (transaction) => {
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
        throw error; // Re-throw the error to be caught by the calling action.
    }
}
