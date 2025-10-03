
import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from './types';

/**
 * Ensures a user profile exists using a Firestore transaction.
 * This is the only method that guarantees a non-destructive "create if not exists" operation.
 * @param uid The user's unique ID.
 * @param email The user's email.
 * @returns The user's profile, either the existing one or the newly created one.
 */
export const ensureUserProfile = async (uid: string, email: string | null): Promise<UserProfile> => {
    const userRef = doc(db, 'users', uid);

    try {
        const profile = await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(userRef);

            if (docSnap.exists()) {
                return docSnap.data() as UserProfile;
            }

            const newUserProfile: UserProfile = {
                uid: uid,
                email: email,
                hasPaid: false,
                credits: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            transaction.set(userRef, newUserProfile);
            return newUserProfile;
        });
        return profile;

    } catch (error) {
        console.error("Transaction to ensure user profile failed:", error);
        // Return a safe, non-null profile to prevent the app from crashing.
        return {
            uid: uid,
            email: email,
            hasPaid: false,
            credits: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
};

/**
 * Standard update function for modifying a user's profile.
 * @param uid - The user's unique ID.
 * @param userData - The data to merge into the user's profile.
 */
export const updateUserProfile = async (uid: string, userData: Partial<UserProfile>): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { 
        ...userData,
        updatedAt: serverTimestamp()
    }, { merge: true });
};
