'use server';

import { decrementUserCreditsAdmin, checkUserSubscriptionAdmin } from '@/lib/firebase/firebase-admin';
import { generateVideoServerSide } from './actions-pollo';

export interface CreateKissVideoActionInput {
    userId: string;
    image1DataUri: string;
    image2_data_uri: string;
}

// Helper function to select the crush's image as the primary source for the video.
async function getSourceImage(image1: string, image2: string): Promise<string> {
    console.log('[ACTION_LOG] Using second image (crush) as the source for video generation.');
    return image2;
}


export async function createKissVideoAction(input: CreateKissVideoActionInput): Promise<{ videoUrl?: string; sourceImageDataUri?: string; error?: string }> {
    console.log('[ACTION_START] createKissVideoAction invoked.');
    const { userId, image1DataUri, image2_data_uri } = input;

    if (!userId || !image1DataUri || !image2_data_uri) {
        console.error('[ACTION_FATAL] Missing one or more required inputs.', { hasUserId: !!userId, hasImage1: !!image1DataUri, hasImage2: !!image2_data_uri });
        return { error: "Internal server error: Missing required data." };
    }

    try {
        console.log(`[ACTION_LOG] Checking profile for user: ${userId}`);
        const userProfile = await checkUserSubscriptionAdmin(userId);
        if (!userProfile) {
            console.error(`[ACTION_ERROR] User profile not found for UID: ${userId}`);
            return { error: "User profile not found." };
        }

        console.log(`[ACTION_LOG] User profile found. Subscribed: ${userProfile.isSubscribed}, Credits: ${userProfile.credits}`);
        if (!userProfile.isSubscribed && userProfile.credits <= 0) {
            console.warn(`[ACTION_WARN] User ${userId} has insufficient credits.`);
            return { error: "You do not have enough credits to generate a video." };
        }
        
        // The source image for the teaser/result view
        const sourceImage = await getSourceImage(image1DataUri, image2_data_uri);

        console.log('[ACTION_LOG] Starting video generation via Pollo.ai server-side action...');
        const result = await generateVideoServerSide(sourceImage);
        
        if (result.error || !result.videoUrl) {
            console.error('[ACTION_ERROR] Pollo.ai action failed:', result.error);
            return { error: result.error || "Failed to generate video." };
        }
        
        console.log('[ACTION_LOG] Video generation successful. Decrementing credits if applicable...');
        // Decrement credits only after successful generation
        if (!userProfile.isSubscribed) {
            await decrementUserCreditsAdmin(userId);
            console.log(`[ACTION_LOG] Credits decremented for user ${userId}.`);
        } else {
            console.log(`[ACTION_LOG] User ${userId} is subscribed, not decrementing credits.`);
        }
        
        console.log('[ACTION_SUCCESS] createKissVideoAction completed successfully.');
        return { videoUrl: result.videoUrl, sourceImageDataUri: sourceImage };

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
