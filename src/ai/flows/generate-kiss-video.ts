
'use server';
import '@/lib/firebase/firebase-admin'; 
import * as admin from 'firebase-admin';
import { fuseFaces } from './fuse-faces'; 
import { GenerateKissVideoInput, GenerateKissVideoOutput } from './types';
import { FieldValue } from 'firebase-admin/firestore';

export async function generateKissVideo(input: GenerateKissVideoInput): Promise<GenerateKissVideoOutput> {
  console.log('[MAIN_FLOW] Starting...');

  try {
    console.log('[DEBUG] Initializing Firestore and Storage...');
    const db = admin.firestore();
    const storage = admin.storage();
    console.log('[DEBUG] Firestore and Storage initialized.');

    console.log('[MAIN_FLOW] Step 1: Fusing faces...');
    const fusionResult = await fuseFaces({ image1Uri: input.image1Uri, image2Uri: input.image2Uri });

    if (fusionResult.error || !fusionResult.fusedImageUri) {
        console.error('[MAIN_FLOW_ERROR] Step 1 failed unexpectedly.', fusionResult.error);
        return { error: `Image fusion failed: ${fusionResult.error || 'Unknown error'}` };
    }
    console.log('[DEBUG] Step 1 (fuseFaces) successful.');

    console.log('[MAIN_FLOW] Step 2: Animating the fused image...');
    const generationDocRef = db.collection('videoGenerations').doc();
    const generationId = generationDocRef.id;
    console.log(`[DEBUG] Generated Firestore ID: ${generationId}`);

    console.log('[DEBUG] Getting storage bucket...');
    const bucket = storage.bucket();
    console.log('[DEBUG] Got bucket. Defining file...');
    const fileName = `fused-images/${generationId}.png`;
    const file = bucket.file(fileName);
    console.log('[DEBUG] File defined. Converting buffer...');
    const buffer = Buffer.from(fusionResult.fusedImageUri.split(',')[1], 'base64');
    console.log('[DEBUG] Buffer converted. Saving file to bucket...');
    await file.save(buffer, { metadata: { contentType: 'image/png' } });
    console.log('[DEBUG] File saved to bucket.');

    const [imageUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
    });
    console.log(`[MAIN_FLOW] Fused image uploaded and signed URL created: ${imageUrl}`);

    await generationDocRef.set({
        id: generationId,
        userId: input.userId, 
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        sourceImageUrl: imageUrl,
    });
    console.log(`[MAIN_FLOW] Created tracking document in Firestore.`);

    const url = 'https://pollo.ai/api/platform/generation/kling-ai/kling-v2-1';
    const apiKey = process.env.POLLO_API_KEY || '';
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/pollo-webhook`;

    console.log(`[DIAGNOSTIC] Using API Key starting with: ${apiKey.substring(0, 10)}`);

    if (!apiKey) {
        throw new Error('POLLO_API_KEY is not set in environment variables.');
    }

    const options = {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, passthrough: JSON.stringify({ generationId }), input: { image: imageUrl, prompt: '...' } })
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[MAIN_FLOW_ERROR] Pollo AI API returned an error. Status: ', response.status, ' Body: ', errorText);
        await generationDocRef.update({ status: 'failed', error: `Pollo API Error: ${response.status}` }); 
        return { error: `Video animation failed: Pollo API Error: ${response.status}` };
    }

    const externalTaskId = data.data.taskId;
    await generationDocRef.update({ status: 'processing', externalTaskId });
    console.log(`[MAIN_FLOW] Task successfully submitted. External ID: ${externalTaskId}`);
    
    return { generationId, status: 'processing', sourceImageUri: imageUrl };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[FATAL_CRASH] A critical error occurred: ${errorMessage}`, err);
    // Try to update Firestore one last time, but this might fail too.
    try {
      const db = admin.firestore();
      const generationDocRef = db.collection('videoGenerations').doc();
      await generationDocRef.set({ status: 'failed', error: `Fatal crash: ${errorMessage}` }, { merge: true });
    } catch (firestoreError) {
      console.error('[FATAL_CRASH] Could not even write error to Firestore.', firestoreError);
    }
    return { error: `Failed to animate the image due to a fatal crash: ${errorMessage}` };
  }
}
