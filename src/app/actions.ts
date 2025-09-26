'use server';

import { getFirebaseAdmin, decrementUserCreditsAdmin } from '@/lib/firebase/firebase-admin';
import type { UserProfile } from '@/lib/firebase/types';
import { generateKissVideo } from '@/ai/flows/generate-kiss-video'; 

interface CreateKissVideoActionInput {
    userId: string;
    image1DataUri: string;
    image2_data_uri: string;
}

// FIX: The output property name is changed to match what the client (page.tsx) expects.
interface CreateKissVideoActionOutput {
    generationId?: string;
    sourceImageUrl?: string; // Changed from sourceImageDataUri
    error?: string;
}

export async function createKissVideoAction(input: CreateKissVideoActionInput): Promise<CreateKissVideoActionOutput> {
    console.log('[ACTION_START] createKissVideoAction invoked.');
    const admin = getFirebaseAdmin();
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

        // 2. Call the AI flow, passing the userId
        console.log('[ACTION_LOG] Starting main video generation flow...');
        const result = await generateKissVideo({
            userId: userId, 
            image1Uri: image1DataUri,
            image2Uri: image2_data_uri,
        });
        
        if (result.error || !result.generationId) {
            console.error('[ACTION_ERROR] Main flow failed:', result.error);
            return { error: result.error || "Failed to get a generation ID from the main flow." };
        }
        
        // 3. Decrement credits (if applicable)
        console.log('[ACTION_LOG] Main flow task started successfully. Decrementing credits if applicable...');
        if (!userProfile.isSubscribed) {
            await decrementUserCreditsAdmin(userId);
            console.log(`[ACTION_LOG] Credits decremented for user ${userId}.`);
        }

        // 4. Return the generationId and the correct property name to the client.
        console.log('[ACTION_SUCCESS] createKissVideoAction completed successfully. Task started.');
        return {
            generationId: result.generationId, 
            sourceImageUrl: result.sourceImageUri, // FIX: The property name is now sourceImageUrl
        };

    } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred during video creation.';
        console.error('[ACTION_FATAL] Unhandled exception in createKissVideoAction:', message, e);
        return { error: message };
    }
}

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
