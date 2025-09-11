
'use server';

import { decrementUserCreditsAdmin, checkUserSubscriptionAdmin } from '@/lib/firebase/firebase-admin';
import { generateVideoServerSide } from './actions-pollo'; // Renamed to avoid conflicts

export interface CreateKissVideoActionInput {
    userId: string;
    image1DataUri: string;
    image2_data_uri: string;
}

// This is a helper function to merge two images side-by-side.
// For now, it will just select the second image as the source for simplicity and to avoid adding new dependencies.
// A more robust solution would use a library like 'sharp' or 'canvas'.
async function combineImages(image1: string, image2: string): Promise<string> {
    // This is a simplified placeholder.
    // In a real scenario, you'd combine these images.
    // For Pollo.ai, sending one clear image of the target person (the crush) might be sufficient.
    console.log('[ACTION_LOG] Using second image as the source for video generation.');
    return image2;
}


export async function createKissVideoAction(input: CreateKissVideoActionInput): Promise<{ videoDataUri?: string; sourceImageDataUri?: string; error?: string }> {
    const { userId, image1DataUri, image2_data_uri } = input;

    try {
        const userProfile = await checkUserSubscriptionAdmin(userId);
        if (!userProfile) {
            return { error: "User profile not found." };
        }

        if (!userProfile.isSubscribed && userProfile.credits <= 0) {
            return { error: "You do not have enough credits to generate a video." };
        }
        
        // The source image for the teaser/result view
        const sourceImage = image2_data_uri || image1DataUri;

        // Using a placeholder for combined image logic for now.
        const combinedImageUri = await combineImages(image1DataUri, image2_data_uri);

        const result = await generateVideoServerSide(combinedImageUri);
        if (result.error || !result.videoUrl) {
            return { error: result.error || "Failed to generate video." };
        }
        
        // Decrement credits only after successful generation
        await decrementUserCreditsAdmin(userId);

        return { videoDataUri: result.videoUrl, sourceImageDataUri: sourceImage };

    } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred during video creation.';
        console.error('[ACTION_FATAL] Error in createKissVideoAction:', message);
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


    
