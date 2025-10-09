
'use server';
import '@/lib/firebase/firebase-admin';
import * as admin from 'firebase-admin';
import { fuseFaces } from './fuse-faces';
import { GenerateKissVideoOutput } from './types';
import { FieldValue } from 'firebase-admin/firestore';

export async function generateKissVideo(
  generationId: string,
  userId: string,
  image1DataUri: string,
  image2DataUri: string
): Promise<GenerateKissVideoOutput> {
  const db = admin.firestore();
  const generationDocRef = db.collection('videoGenerations').doc(generationId);

  // --- IDEMPOTENCY CHECK ---
  const generationDoc = await generationDocRef.get();
  if (generationDoc.exists && generationDoc.data()?.status !== 'pending') {
    console.warn(`[IDEMPOTENCY_WARN] Generation ${generationId} already processed (status: ${generationDoc.data()?.status}). Halting.`);
    return { generationId, status: generationDoc.data()?.status };
  }

  console.log(`[MAIN_FLOW] Starting video generation for id: ${generationId}`);

  try {
    // === PROCEED WITH GENERATION ===
    // Credit deduction is now handled upstream in the initial server action.
    // The redundant credit deduction logic has been removed from this file.

    await generationDocRef.update({ status: 'processing'}); // Set status early
    const storage = admin.storage();
    const fusionResult = await fuseFaces({ image1DataUri, image2DataUri });
    if (fusionResult.error || !fusionResult.fusedImageUri) {
      throw new Error(`Image fusion failed: ${fusionResult.error || 'Unknown error'}`);
    }
    
    const bucket = storage.bucket();
    const fileName = `fused-images/${generationId}.png`;
    const file = bucket.file(fileName);
    const buffer = Buffer.from(fusionResult.fusedImageUri.split(',')[1], 'base64');
    await file.save(buffer, { metadata: { contentType: 'image/png' } });
    const [imageUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
    await generationDocRef.update({ sourceImageUrl: imageUrl });
    const url = 'https://pollo.ai/api/platform/generation/kling-ai/kling-v2-1';
    const apiKey = process.env.POLLO_API_KEY || '';
    if (!apiKey) throw new Error('POLLO_API_KEY is not set.');
    const options = {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/pollo-webhook`,
            passthrough: JSON.stringify({ generationId }),
            input: {
                image: imageUrl,
                prompt: 'You’ll receive an image with two faces. You have to make the two people in the image kiss passionately, like if this was the first image of a kiss video between two people set next to each other. Do not add anything, no other person. The background of the image you’ll receive is divided in the middle,do not mind it,  and do not change or animate or move the background, only animate the people. The video should be cinematic and ultra realistic like if it was taken by a true camera, 4k, and high quality. Shot with static camera that doesnt move, only the people are moving, the camera is not shaking.',
                strength: 50,
                length: 5,
                mode: 'std',
            },
        })
    };
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pollo API Error (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    const externalTaskId = data.data.taskId;
    await generationDocRef.update({ externalTaskId });
    console.log(`[MAIN_FLOW] Task submitted. External ID: ${externalTaskId}`);

    return { generationId, status: 'processing', sourceImageUri: imageUrl };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[FATAL_CRASH] Critical error in generation ${generationId}:`, err);
    
    // Credit rollback logic removed as credit is no longer deducted here.

    await generationDocRef.update({ 
      status: 'failed', 
      error: `Fatal crash: ${errorMessage}` 
    });
    
    return { error: `Failed to animate image due to fatal crash: ${errorMessage}` };
  }
}
