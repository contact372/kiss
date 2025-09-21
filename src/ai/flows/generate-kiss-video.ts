'use server';
/**
 * @fileOverview A multi-step flow that first fuses two images into one, 
 * then generates a video from that fused image, managing state via Firestore.
 */
import { fuseFaces } from './fuse-faces';
import { GenerateKissVideoInput, GenerateKissVideoOutput } from './types';
import { admin } from '@/lib/firebase/firebase-admin';

/**
 * A two-step flow to generate a video:
 * 1. Fuse two separate images into a single, coherent scene.
 * 2. Animate that new scene to create a video, now with webhook support.
 */
export async function generateKissVideo(input: GenerateKissVideoInput): Promise<GenerateKissVideoOutput> {
  console.log('[MAIN_FLOW] Starting two-step video generation process...');

  // STEP 1: Fuse the two images
  console.log('[MAIN_FLOW] Step 1: Fusing faces...');
  const fusionResult = await fuseFaces(input);

  if (fusionResult.error || !fusionResult.fusedImageUri) {
      console.error('[MAIN_FLOW_ERROR] Step 1 failed unexpectedly.', fusionResult.error);
      return { error: `Image fusion failed: ${fusionResult.error || 'Unknown error'}` };
  }

  console.log('[MAIN_FLOW] Step 1 successful. Fused image created.');

  // STEP 2: Initiate video generation with Pollo AI and track via Firestore
  console.log('[MAIN_FLOW] Step 2: Animating the fused image with Pollo AI...');
  
  // We create the doc ref first to get a unique ID
  const generationDocRef = admin.db.collection('videoGenerations').doc();
  const generationId = generationDocRef.id;

  try {
    // Step 2a: Upload the fused image to Firebase Storage FIRST.
    // This is where we get the URL we can safely store in Firestore.
    const bucket = admin.storage.bucket();
    const fileName = `fused-images/${generationId}.png`;
    const file = bucket.file(fileName);
    const buffer = Buffer.from(fusionResult.fusedImageUri.split(',')[1], 'base64');
    await file.save(buffer, { metadata: { contentType: 'image/png' } });
    await file.makePublic(); // Ensure the file is publicly accessible
    const imageUrl = file.publicUrl(); // This is the URL we will save

    console.log(`[MAIN_FLOW] Fused image uploaded to Storage: ${imageUrl}`);

    // Step 2b: NOW create the tracking document in Firestore using the storage URL.
    // This avoids the 1MB document size limit.
    await generationDocRef.set({
        id: generationId,
        userId: input.userId, // Keep track of the user
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        sourceImageUrl: imageUrl, // CORRECT: Storing the URL, not the large base64 data
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
            input: {
                image: imageUrl, // Use the public URL of the uploaded image
                prompt: 'Make the two people in the image kiss passionately. The video should be cinematic, 4k, and high quality.',
                strength: 50,
                length: 5,
                mode: 'std',
                webhookUrl: webhookUrl,
                passthrough: JSON.stringify({ generationId: generationId }), 
            },
        })
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        console.error('[MAIN_FLOW_ERROR] Pollo AI API returned an error.', data);
        // Update tracker to reflect failure
        await generationDocRef.update({ status: 'failed', error: data.message || 'Pollo API Error' }); 
        return { error: `Video animation failed: ${data.message || 'Unknown error'}` };
    }

    // Step 2d: Update tracking document with the external task ID from Pollo
    const externalTaskId = data.data.taskId;
    await generationDocRef.update({
        status: 'processing',
        externalTaskId: externalTaskId,
    });

    console.log(`[MAIN_FLOW] Task successfully submitted to Pollo AI. External Task ID: ${externalTaskId}`);
    return {
      generationId: generationId, // Return our internal ID to the client
      status: 'processing',
      sourceImageUri: fusionResult.fusedImageUri, // Return the original base64 to the client for immediate preview
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[MAIN_FLOW_ERROR] An error occurred during video animation: ${errorMessage}`);
    // If the process fails, update the document to reflect the failure.
    await generationDocRef.set({ status: 'failed', error: errorMessage }, { merge: true });
    return { error: `Failed to animate the image: ${errorMessage}` };
  }
}
