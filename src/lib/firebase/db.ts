
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; // Make sure this points to your initialized firebase config
import type { UserProfile } from './types';

/**
 * Creates or updates a user's profile in Firestore.
 * @param uid - The user's unique ID from Firebase Auth.
 * @param userData - The user data to set.
 */
export const updateUserProfile = async (uid: string, userData: Partial<UserProfile>): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { 
    ...userData,
    createdAt: serverTimestamp(), // Set the creation time on the initial write
    updatedAt: serverTimestamp()  // Always update the last modified time
  }, { merge: true });
};
