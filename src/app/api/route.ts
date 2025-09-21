'use server';
import { admin } from '@/lib/firebase/firebase-admin';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * This is the webhook endpoint that Pollo AI will call.
 * It verifies the request and updates the Firestore document with the final video URL.
 */
export async function POST(req: Request) {
  // 1. Verify the request comes from Pollo AI using the secret token
  const headersList = headers();
  const authHeader = headersList.get('authorization');
  const webhookSecret = process.env.POLLO_WEBHOOK_SECRET;

  if (!webhookSecret) {
      console.error('[WEBHOOK_ERROR] POLLO_WEBHOOK_SECRET is not set in environment variables.');
      // Don't expose internal configuration details in the response
      return NextResponse.json({ error: 'Internal server configuration error.' }, { status: 500 });
  }

  // The expected format is "Bearer <YOUR_SECRET>"
  if (authHeader !== `Bearer ${webhookSecret}`) {
    console.warn('[WEBHOOK_WARN] Unauthorized webhook attempt detected.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Parse the payload from Pollo AI
    const payload = await req.json();
    console.log('[WEBHOOK] Received verified payload from Pollo AI:', JSON.stringify(payload));

    // The `passthrough` field contains the stringified JSON we sent earlier.
    const passthrough = JSON.parse(payload.passthrough || '{}');
    const generationId = passthrough.generationId;
    const videoUrl = payload.video_url; // Assuming the field is named `video_url`

    if (!generationId || !videoUrl) {
      console.error('[WEBHOOK_ERROR] Invalid payload. Missing generationId or videoUrl.', { generationId, videoUrl });
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 3. Update the correct document in Firestore
    const docRef = admin.db.collection('videoGenerations').doc(generationId);
    
    await docRef.update({
      status: 'completed',
      videoUrl: videoUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      webhookPayload: payload, // Store the full payload for debugging
    });

    console.log(`[WEBHOOK] Successfully updated generation ${generationId} with video URL.`);
    return NextResponse.json({ success: true });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WEBHOOK_FATAL] Error processing webhook: ${message}`);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
