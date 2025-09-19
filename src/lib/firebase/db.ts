'use client';

import { doc, setDoc, getDoc, serverTimestamp, Timestamp, runTransaction } from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import type { UserProfile } from './types';

async function getClientDb() {
    return getFirestoreDb();
}

/**

Creates or updates a user profile from the client-side.
This function is designed to be "safe" and will NOT overwrite
sensitive, server-managed fields like isSubscribed, credits,
subscriptionEndDate, or creditsGranted unless explicitly intended,
like in the post-payment flow. */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
    const db = await getClientDb();
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        // Document does not exist: Create it with minimal, safe initial data.
        const initialProfileData: Partial<UserProfile> = {
            uid: uid,
            email: data.email || null,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            isSubscribed: false, // Default safe value
            credits: 0, // Default safe value
            creditsGranted: false, // Default safe value
            subscriptionEndDate: null, // Default safe value
        };
        await setDoc(userRef, initialProfileData);
    } else {
        // Document exists: Update only "safe" fields.
        const safeUpdateData: Partial<UserProfile> = {
            lastLogin: serverTimestamp(),
        };
        // Only update email if it's provided, otherwise keep the existing one.
        if (data.email) {
            safeUpdateData.email = data.email;
        }
        await setDoc(userRef, safeUpdateData, { merge: true });
    }
}

/**

Grants paid access to a user from the client.

This is called immediately after a successful payment to provide instant access

and avoid waiting for the webhook. */
export async function grantPaidAccessClient(uid: string) {
    const db = await getClientDb();
    const userRef = doc(db, 'users', uid);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) {
                // This case should be rare, as a profile is created on login.
                const newProfile: UserProfile = {
                    uid: uid,
                    email: null,
                    isSubscribed: true,
                    credits: 15,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    subscriptionEndDate: null,
                    creditsGranted: true,
                };
                transaction.set(userRef, newProfile);
                return;
            }

            const data = userDoc.data();
            const updateData: Partial<UserProfile> = {
                isSubscribed: true,
                subscriptionEndDate: null,
            };

            // Only grant credits if the flag is not set.
            if (!data.creditsGranted) {
                updateData.credits = (data.credits || 0) + 15;
                updateData.creditsGranted = true;
            }

            transaction.update(userRef, updateData);
        });
        console.log(`[CLIENT_DB] Successfully granted paid access to UID: ${uid}`);

    } catch (error) {
        console.error("[CLIENT_DB_ERROR] Failed to grant paid access for UID: ${uid}", error);
        throw new Error("Failed to update account. Please contact support.");
    }
}

/**

Reads the user profile from the database. This is a read-only operation from the client.
It calculates the subscription status based on the end date but does not write back to the DB. */
export async function checkUserSubscription(uid: string): Promise<UserProfile | null> {
    const db = await getClientDb();
    const userRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        const data = docSnap.data();

        let isSubscribed = data.isSubscribed || false;

        // Calculate subscription status based on end date, but do not write back.
        if (data.subscriptionEndDate) {
            const endDate = (data.subscriptionEndDate as Timestamp).toDate();
            if (new Date() > endDate) {
                isSubscribed = false;
            }
        }

        const profile: UserProfile = {
            uid: data.uid,
            email: data.email,
            credits: data.credits,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            lastLogin: data.lastLogin?.toDate ? data.lastLogin.toDate().toISOString() : new Date().toISOString(),
            subscriptionEndDate: data.subscriptionEndDate?.toDate ? data.subscriptionEndDate.toDate().toISOString() : null,
            isSubscribed: isSubscribed,
            creditsGranted: data.creditsGranted || false,
        };

        return profile;

    } else {
        // If user profile doesn't exist, create a basic one.
        await updateUserProfile(uid, { email: null });

        const newProfile: UserProfile = {
            uid: uid,
            email: null,
            isSubscribed: false,
            credits: 0,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            subscriptionEndDate: null,
            creditsGranted: false,
        }
        return newProfile;

    }
}
