'use server';
/**
 * @fileOverview A multi-step flow that first fuses two images into one, 
 * then generates a video from that fused image.
 */
import { fuseFaces } from './fuse-faces';
import { GenerateKissVideoInput, GenerateKissVideoOutput } from './types'; // Import types
import { admin } from '@/lib/firebase/firebase-admin';

/**
 * A two-step flow to generate a video:
 * 1. Fuse two separate images into a single, coherent scene.
 * 2. Animate that new scene to create a video.
 */
export async function generateKissVideo(input: GenerateKissVideoInput): Promise<GenerateKissVideoOutput> {
  console.log('[MAIN_FLOW] Starting two-step video generation process...');

  // STEP 1: Fuse the two images into a single scene
  console.log('[MAIN_FLOW] Step 1: Fusing faces...');
  const fusionResult = await fuseFaces(input);

  if (fusionResult.error || !fusionResult.fusedImageUri) {
    console.error('[MAIN_FLOW_ERROR] Step 1 failed:', fusionResult.error);
    return { error: `Failed during image fusion step: ${fusionResult.error}` };
  }
  console.log('[MAIN_FLOW] Step 1 successful. Fused image created.');

  // STEP 2: Generate a video from the newly created scene using Pollo AI
  console.log('[MAIN_FLOW] Step 2: Animating the fused image with Pollo AI...');
  try {
    const url = 'https://pollo.ai/api/platform/generation/kling-ai/kling-v2-1';
    // IMPORTANT: Replace with your actual Pollo AI API key
    const apiKey = process.env.POLLO_API_KEY || '<your-pollo-api-key>';

    const bucket = admin.storage().bucket();
    const fileName = `fused-images/${Date.now()}.png`;
    const file = bucket.file(fileName);
    const buffer = Buffer.from(fusionResult.fusedImageUri.split(',')[1], 'base64');

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
      },
      public: true,
    });

    const imageUrl = file.publicUrl();


    const options = {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            input: {
                image: imageUrl,
                prompt: 'Make the two people in the image kiss passionately. The video should be cinematic, 4k, and high quality.',
                negativePrompt: '',
                strength: 50,
                length: 5,
                mode: 'std'
            },
            // You can optionally provide a webhook URL to be notified when the video is ready.
            // webhookUrl: 'https://your-webhook-url.com/endpoint'
        })
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        console.error('[MAIN_FLOW_ERROR] Step 2 failed: Pollo AI API returned an error.', data);
        return { error: `Video animation failed: ${data.message || 'Unknown error'}` };
    }

    console.log('[MAIN_FLOW] Step 2 successful. Video generation started with Pollo AI.');
    return {
      taskId: data.taskId,
      status: data.status,
      sourceImageUri: fusionResult.fusedImageUri, // Pass the fused image back to the client
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[MAIN_FLOW_ERROR] An error occurred during video animation: ${errorMessage}`);
    return {
      error: `Failed to animate the image: ${errorMessage}`,
    };
  }
}
