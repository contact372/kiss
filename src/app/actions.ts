'use server';

import { decrementUserCreditsAdmin } from '@/lib/firebase/firebase-admin';
import { admin } from '@/lib/firebase/firebase-admin';
import type { UserProfile } from '@/lib/firebase/types';

// ==========================================================================
// LOGIQUE POLLO DIRECTEMENT INTÉGRÉE
// ==========================================================================

async function pollForVideo(taskId: string, apiKey: string): Promise<{ videoUrl?: string, error?: string }> {
    let attempts = 0;
    const maxAttempts = 90;
    const interval = 2000;
    console.log(`[POLLO_POLL_START] Starting polling for task ID: ${taskId}`);

    while (attempts < maxAttempts) {
        try {
            console.log(`[POLLO_POLL_ATTEMPT] Polling attempt ${attempts + 1}/${maxAttempts} for task: ${taskId}`);
            const statusResponse = await fetch(`https://pollo.ai/api/platform/task/${taskId}`, {
                method: 'GET',
                headers: { 'x-api-key': apiKey },
            });

            if (!statusResponse.ok) {
                const errorBody = await statusResponse.text();
                console.error(`[POLLO_POLL_ERROR] Polling failed with status ${statusResponse.status}:`, errorBody);
                return { error: `Polling failed with status: ${statusResponse.status}` };
            }

            const statusData = await statusResponse.json();
            
            if (statusData.status === 'completed') {
                console.log('[POLLO_POLL_SUCCESS] Task completed!', statusData);
                return { videoUrl: statusData.output.video_url };
            } else if (statusData.status === 'failed') {
                 console.error('[POLLO_POLL_ERROR] Video generation failed on Pollo.ai:', statusData);
                return { error: 'Video generation failed on the provider.' };
            }

             console.log(`[POLLO_POLL_STATUS] Task status is '${statusData.status}'. Continuing to poll.`);
        } catch (error) {
            console.error('[POLLO_POLL_ERROR] Unhandled exception during polling:', error);
            const message = error instanceof Error ? error.message : 'Unknown polling error';
            return { error: message };
        }

        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
    }

    console.warn(`[POLLO_POLL_WARN] Polling timed out for task ID: ${taskId}`);
    return { error: 'Video generation timed out.' };
}

async function generateVideoServerSide(combinedImageUri: string): Promise<{ videoUrl?: string, error?: string }> {
  console.log('[POLLO_ACTION_START] generateVideoServerSide invoked.');
  const apiKey = process.env.POLLO_API_KEY;
  if (!apiKey) {
    console.error('[POLLO_ACTION_FATAL] POLLO_API_KEY environment variable is not set or not accessible.');
    return { error: 'API key is not configured on the server.' };
  }
   console.log('[POLLO_ACTION_LOG] POLLO_API_KEY found.');

  try {
    console.log('[POLLO_ACTION_LOG] Sending task creation request to Pollo.ai...');
    const startResponse = await fetch('https://pollo.ai/api/platform/generation/kling-ai/kling-v2-1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        input: {
            prompt: 'make the two people in the image kiss passionately, 4k, cinematic, high quality',
            image: combinedImageUri,
            negativePrompt: 'ugly, disfigured, low quality, blurry',
            strength: 50,
            length: 5,
            mode: "std"
        }
      }),
    });

    if (!startResponse.ok) {
        const errorBody = await startResponse.text();
        console.error(`[POLLO_ACTION_ERROR] Failed to start task with status ${startResponse.status}:`, errorBody);
        return { error: `Failed to start video generation: ${startResponse.statusText}` };
    }
    
    const startData = await startResponse.json();
    const taskId = startData.taskId;

    if (!taskId) {
        console.error('[POLLO_ACTION_ERROR] Pollo.ai response did not include a task ID.', startData);
        return { error: "Video provider did not return a task ID." };
    }
    console.log(`[POLLO_ACTION_LOG] Task created successfully with ID: ${taskId}.`);

    return await pollForVideo(taskId, apiKey);

  } catch (error) {
    console.error('[POLLO_ACTION_FATAL] Unhandled exception in generateVideoServerSide:', error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { error: message };
  }
}

// ==========================================================================
// FIN DE LA LOGIQUE POLLO
// ==========================================================================

export interface CreateKissVideoActionInput {
    userId: string;
    image1DataUri: string;
    image2_data_uri: string;
}

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
        const userRef = admin.db.doc(`users/${userId}`);
        const docSnap = await userRef.get();

        if (!docSnap.exists) {
            console.error(`[ACTION_ERROR] User profile not found for UID: ${userId}`);
            return { error: "User profile not found." };
        }
        
        const userProfile = docSnap.data() as UserProfile;

        console.log(`[ACTION_LOG] User profile found. Subscribed: ${userProfile.isSubscribed}, Credits: ${userProfile.credits}`);
        if (!userProfile.isSubscribed && userProfile.credits <= 0) {
            console.warn(`[ACTION_WARN] User ${userId} has insufficient credits.`);
            return { error: "You do not have enough credits to generate a video." };
        }
        
        const sourceImage = await getSourceImage(image1DataUri, image2_data_uri);

        console.log('[ACTION_LOG] Starting video generation via integrated server-side action...');
        const result = await generateVideoServerSide(sourceImage);
        
        if (result.error || !result.videoUrl) {
            console.error('[ACTION_ERROR] Integrated action failed:', result.error);
            return { error: result.error || "Failed to generate video." };
        }
        
        console.log('[ACTION_LOG] Video generation successful. Decrementing credits if applicable...');
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
