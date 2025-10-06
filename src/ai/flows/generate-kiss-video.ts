'use server';
import '@lib/firebase/firebase-admin';
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
  console.log('[MAIN_FLOW] Starting video generation...');
  const db = admin.firestore();

  try {
    const storage = admin.storage();
    const fusionResult = await fuseFaces({ image1DataUri, image2DataUri });
    if (fusionResult.error || !fusionResult.fusedImageUri) {
      throw new Error(`Image fusion failed: ${fusionResult.error || 'Unknown error'}`);
    }
    const generationDocRef = db.collection('videoGenerations').doc(generationId);
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
    await generationDocRef.update({ status: 'processing', externalTaskId });
    console.log(`[MAIN_FLOW] Task submitted. External ID: ${externalTaskId}`);

    // CORRECTED CREDIT DECREMENT
    const userRef = db.collection('users').doc(userId);
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                console.error(`[CREDIT_ERROR] User profile ${userId} not found.`);
                return;
            }
            
            const userData = userDoc.data();
            if (userData && userData.credits > 0) {
                transaction.update(userRef, { credits: FieldValue.increment(-1) });
                console.log(`[MAIN_FLOW] Decremented 1 credit for user ${userId}.`);
            }
        });
    } catch (e) {
        console.error(`[CREDIT_ERROR] Transaction to decrement credits failed for user ${userId}.`, e);
    }

    return { generationId, status: 'processing', sourceImageUri: imageUrl };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[FATAL_CRASH] Critical error in generation ${generationId}:`, err);
    
    try {
      const safeDb = admin.firestore();
      await safeDb.collection('videoGenerations').doc(generationId).update({ 
        status: 'failed', 
        error: `Fatal crash: ${errorMessage}` 
      });
    } catch (firestoreError) {
      console.error(`[CATASTROPHIC_FAILURE] Could not write error to Firestore for ${generationId}.`, firestoreError);
    }
    
    return { error: `Failed to animate image due to fatal crash: ${errorMessage}` };
  }
}
