'use server';
/**
 * @fileOverview A multi-step flow that first fuses two images into one, 
 * then generates a video from that fused image, managing state via Firestore.
 */
import { fuseFaces } from './fuse-faces'; 
import { GenerateKissVideoInput, GenerateKissVideoOutput } from './types';
import { getFirebaseAdmin } from '@/lib/firebase/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * A two-step flow to generate a video:
 * 1. Fuse two separate images into a single, coherent scene.
 * 2. Animate that new scene to create a video, now with webhook support.
 */
export async function generateKissVideo(input: GenerateKissVideoInput): Promise<GenerateKissVideoOutput> {
  console.log('[MAIN_FLOW] Starting two-step video generation process...');
  const admin = getFirebaseAdmin();

  // STEP 1: Fuse the two images
  console.log('[MAIN_FLOW] Step 1: Fusing faces...');
  const fusionResult = await fuseFaces({ image1Uri: input.image1Uri, image2Uri: input.image2Uri });

  if (fusionResult.error || !fusionResult.fusedImageUri) {
      console.error('[MAIN_FLOW_ERROR] Step 1 failed unexpectedly.', fusionResult.error);
      return { error: `Image fusion failed: ${fusionResult.error || 'Unknown error'}` };
  }

  console.log('[MAIN_FLOW] Step 1 successful. Fused image created.');

  // STEP 2: Initiate video generation with Pollo AI and track via Firestore
  console.log('[MAIN_FLOW] Step 2: Animating the fused image with Pollo AI...');
  
  const generationDocRef = admin.db.collection('videoGenerations').doc();
  const generationId = generationDocRef.id;

  try {
    const bucket = admin.storage.bucket();
    const fileName = `fused-images/${generationId}.png`;
    const file = bucket.file(fileName);
    const buffer = Buffer.from(fusionResult.fusedImageUri.split(',')[1], 'base64');
    await file.save(buffer, { metadata: { contentType: 'image/png' } });
    await file.makePublic();
    const imageUrl = file.publicUrl(); // This is the public URL we need.

    console.log(`[MAIN_FLOW] Fused image uploaded to Storage: ${imageUrl}`);

    await generationDocRef.set({
        id: generationId,
        userId: input.userId, 
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        sourceImageUrl: imageUrl, // The public URL is correctly saved here.
    });
    console.log(`[MAIN_FLOW] Created tracking document in Firestore with ID: ${generationId}`);

    // Step 2c: Call Pollo AI with the public image URL and webhook
    const url = 'https://pollo.ai/api/platform/generation/kling-ai/kling-v2-1';
    const apiKey = process.env.POLLO_API_KEY || '<your-pollo-api-key>';
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/pollo-webhook`;

    const options = {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            webhookUrl: webhookUrl,
            passthrough: JSON.stringify({ generationId: generationId }), 
            input: {
                image: imageUrl, 
                prompt: 'Make the two people in the image kiss passionately. The video should be cinematic, 4k, and high quality. Shot with static camera that doesnt move, only the people are moving, the camera is not shaking',
            },
        })
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        console.error('[MAIN_FLOW_ERROR] Pollo AI API returned an error.', data);
        await generationDocRef.update({ status: 'failed', error: data.message || 'Pollo API Error' }); 
        return { error: `Video animation failed: ${data.message || 'Unknown error'}` };
    }

    const externalTaskId = data.data.taskId;
    await generationDocRef.update({
        status: 'processing',
        externalTaskId: externalTaskId,
    });

    console.log(`[MAIN_FLOW] Task successfully submitted to Pollo AI. External Task ID: ${externalTaskId}`);
    
    // THE FINAL, CORRECT FIX: Return the public URL, not the base64 data URI.
    return {
      generationId: generationId,
      status: 'processing',
      sourceImageUri: imageUrl,
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[MAIN_FLOW_ERROR] An error occurred during video animation: ${errorMessage}`);
    await generationDocRef.set({ status: 'failed', error: errorMessage }, { merge: true });
    return { error: `Failed to animate the image: ${errorMessage}` };
  }
}
