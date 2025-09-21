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

  // STEP 1: Fuse the two images with a retry mechanism
  console.log('[MAIN_FLOW] Step 1: Fusing faces...');
  let fusionResult: Awaited<ReturnType<typeof fuseFaces>>;
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    fusionResult = await fuseFaces(input);
    if (!fusionResult.error) {
      break; // Success
    }
    console.warn(`[MAIN_FLOW] Image fusion attempt ${i + 1} failed. Retrying...`, fusionResult.error);
    if (i === maxRetries - 1) {
      console.error('[MAIN_FLOW_ERROR] Step 1 failed after all retries:', fusionResult.error);
      return { error: `Failed during image fusion step after ${maxRetries} attempts: ${fusionResult.error}` };
    }
  }

  if (fusionResult.error || !fusionResult.fusedImageUri) {
      console.error('[MAIN_FLOW_ERROR] Step 1 failed unexpectedly after retry loop.', fusionResult.error);
      return { error: `Image fusion failed: ${fusionResult.error || 'Unknown error'}` };
  }

  console.log('[MAIN_FLOW] Step 1 successful. Fused image created.');

  // STEP 2: Generate a video from the newly created scene using Pollo AI
  console.log('[MAIN_FLOW] Step 2: Animating the fused image with Pollo AI...');
  try {
    const url = 'https://pollo.ai/api/platform/generation/kling-ai/kling-v2-1';
    const apiKey = process.env.POLLO_API_KEY || '<your-pollo-api-key>';

    const bucket = admin.storage.bucket();
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
        })
    };

    const response = await fetch(url, options);
    const data = await response.json();

    // Log the full response from Pollo AI for debugging
    console.log('[MAIN_FLOW] Full response from Pollo AI:', JSON.stringify(data));

    if (!response.ok) {
        console.error('[MAIN_FLOW_ERROR] Step 2 failed: Pollo AI API returned an error.', data);
        return { error: `Video animation failed: ${data.message || 'Unknown error'}` };
    }

    console.log('[MAIN_FLOW] Step 2 successful. Video generation started with Pollo AI.');
    return {
      taskId: data.id, // Let's try `data.id` as it is a common alternative to `taskId`
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
