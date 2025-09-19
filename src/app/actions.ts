'use server';

import { admin, decrementUserCreditsAdmin } from '@/lib/firebase/firebase-admin';
import type { UserProfile } from '@/lib/firebase/types';
import { generateKissVideo } from '@/ai/flows/generate-kiss-video'; // Import the Genkit flow

/**
 * Defines the input for the user-facing server action.
 * This is a type, not an exported object, so it's safe.
 */
interface CreateKissVideoActionInput {
    userId: string;
    image1DataUri: string;
    image2_data_uri: string;
}

/**
 * A server action that orchestrates the entire video generation process.
 * It validates the user, calls the AI flow, and decrements credits.
 */
export async function createKissVideoAction(input: CreateKissVideoActionInput): Promise<{ videoDataUri?: string; sourceImageDataUri?: string; error?: string }> {
    console.log('[ACTION_START] createKissVideoAction invoked.');
    const { userId, image1DataUri, image2_data_uri } = input;

    if (!userId || !image1DataUri || !image2_data_uri) {
        console.error('[ACTION_FATAL] Missing one or more required inputs.');
        return { error: "Internal server error: Missing required data." };
    }

    try {
        // 1. Validate user and credits
        console.log(`[ACTION_LOG] Checking profile for user: ${userId}`);
        const userRef = admin.db.doc(`users/${userId}`);
        const docSnap = await userRef.get();

        if (!docSnap.exists) {
            console.error(`[ACTION_ERROR] User profile not found for UID: ${userId}`);
            return { error: "User profile not found." };
        }
        
        const userProfile = docSnap.data() as UserProfile;
        console.log(`[ACTION_LOG] User profile found. Subscribed: ${userProfile.isSubscribed}, Credits: ${userProfile.credits}`);
        
        if (!userProfile.isSubscribed && (userProfile.credits || 0) <= 0) {
            console.warn(`[ACTION_WARN] User ${userId} has insufficient credits.`);
            return { error: "You do not have enough credits to generate a video." };
        }

        // 2. Call the new, two-step AI flow
        console.log('[ACTION_LOG] Starting Genkit video generation flow...');
        const result = await generateKissVideo({
            image1Uri: image1DataUri,
            image2Uri: image2_data_uri,
        });
        
        if (result.error || !result.videoUri) {
            console.error('[ACTION_ERROR] Genkit flow failed:', result.error);
            return { error: result.error || "Failed to generate video from the AI flow." };
        }
        
        // 3. Decrement credits if the user is not subscribed
        console.log('[ACTION_LOG] AI flow successful. Decrementing credits if applicable...');
        if (!userProfile.isSubscribed) {
            await decrementUserCreditsAdmin(userId);
            console.log(`[ACTION_LOG] Credits decremented for user ${userId}.`);
        }

        // 4. Return the final data to the client
        console.log('[ACTION_SUCCESS] createKissVideoAction completed successfully.');
        return {
            videoDataUri: result.videoUri, 
            sourceImageDataUri: result.sourceImageUri, // The fused image
        };

    } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred during video creation.';
        console.error('[ACTION_FATAL] Unhandled exception in createKissVideoAction:', message, e);
        return { error: message };
    }
}

/**
 * A simple action to decrement credits, kept for potential other uses.
 */
export async function decrementCreditsAction(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await decrementUserCreditsAdmin(userId);
        return { success: true };
    } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred.';
        console.error('[ACTION_ERROR] Failed to decrement credits:', message);
        return { success: false, error: message };
    }
}
