
'use server';
/**
 * @fileOverview A multi-step flow that first fuses two images into one, 
 * then generates a video from that fused image, managing state via Firestore.
 */

// THIS IS THE FIX: Ensure the admin SDK is initialized before any other code runs.
import '@/lib/firebase/firebase-admin'; 

import * as admin from 'firebase-admin';
import { fuseFaces } from './fuse-faces'; 
import { GenerateKissVideoInput, GenerateKissVideoOutput } from './types';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * A two-step flow to generate a video:
 * 1. Fuse two separate images into a single, coherent scene.
 * 2. Animate that new scene to create a video, now with webhook support.
 */
export async function generateKissVideo(input: GenerateKissVideoInput): Promise<GenerateKissVideoOutput> {
  console.log('[MAIN_FLOW] Starting two-step video generation process...');

  const db = admin.firestore();
  const storage = admin.storage();

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
  
  const generationDocRef = db.collection('videoGenerations').doc();
  const generationId = generationDocRef.id;

  try {
    // Because the admin SDK is now properly initialized, this will find the correct bucket.
    const bucket = storage.bucket();
    const fileName = `fused-images/${generationId}.png`;
    const file = bucket.file(fileName);
    const buffer = Buffer.from(fusionResult.fusedImageUri.split(',')[1], 'base64');
    await file.save(buffer, { metadata: { contentType: 'image/png' } });

    const [imageUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491' // A date in the distant future.
    });

    console.log(`[MAIN_FLOW] Fused image uploaded and signed URL created: ${imageUrl}`);

    await generationDocRef.set({
        id: generationId,
        userId: input.userId, 
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        sourceImageUrl: imageUrl,
    });
    console.log(`[MAIN_FLOW] Created tracking document in Firestore with ID: ${generationId}`);

    // Call Pollo AI with the public image URL and webhook
    const url = 'https://pollo.ai/api/platform/generation/kling-ai/kling-v2-1';
    const apiKey = process.env.POLLO_API_KEY || '';
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/pollo-webhook`;

    // DIAGNOSTIC LOG
    console.log(`[DIAGNOSTIC] Using API Key starting with: ${apiKey.substring(0, 10)} and ending with: ${apiKey.substring(apiKey.length - 4)}`);

    if (!apiKey) {
        throw new Error('POLLO_API_KEY is not set in environment variables.');
    }

    const options = {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            webhookUrl: webhookUrl,
            passthrough: JSON.stringify({ generationId: generationId }), 
            input: {
                image: imageUrl, 
                prompt: 'Make the two people in the image kiss passionately. Do not add anything, no other person. The video should be cinematic, 4k, and high quality. Shot with static camera that doesnt move, only the people are moving, the camera is not shaking',
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
