
'use server';
import { admin } from '@/lib/firebase/firebase-admin';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

/**
 * This is the webhook endpoint that Pollo AI will call.
 * It verifies the request and updates the Firestore document with the task status.
 */
export async function POST(req: Request) {
  const headersList = headers();

  // 1. Get headers from Pollo AI request
  const webhookId = headersList.get('x-webhook-id');
  const webhookTimestamp = headersList.get('x-webhook-timestamp');
  const signatureFromHeader = headersList.get('x-webhook-signature');

  // 2. Get the secret from environment variables
  const webhookSecret = process.env.POLLO_WEBHOOK_SECRET;

  if (!webhookId || !webhookTimestamp || !signatureFromHeader) {
    return NextResponse.json({ error: 'Missing required webhook headers.' }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error('[WEBHOOK_ERROR] POLLO_WEBHOOK_SECRET is not set.');
    return NextResponse.json({ error: 'Internal server configuration error.' }, { status: 500 });
  }

  try {
    // 3. Get the raw request body
    const body = await req.text();

    // 4. Calculate the signature (as per Pollo AI docs)
    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
    const secretBytes = Buffer.from(webhookSecret, 'base64');
    const computedSignature = crypto
      .createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64');

    // 5. Securely compare the signatures
    const isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(signatureFromHeader, 'base64'),
        Buffer.from(computedSignature, 'base64')
    );

    if (!isSignatureValid) {
      console.warn('[WEBHOOK_WARN] Invalid signature attempt detected.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- Signature is valid, process the event ---
    console.log('[WEBHOOK] Received verified payload from Pollo AI:', body);
    const event = JSON.parse(body);
    const { taskId, status } = event;

    if (!taskId) {
        console.error('[WEBHOOK_ERROR] Invalid payload. Missing taskId.');
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    
    // IMPORTANT: The payload only gives us a status, not the video URL.
    // We will update the status in Firestore.
    // You might need a separate process to fetch the final URL using the taskId.

    const docRef = admin.db.collection('videoGenerations').doc(taskId);

    await docRef.update({
      status: status, // 'succeed' or 'failed'
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      webhookPayload: event, // Store the full payload for debugging
    });

    console.log(`[WEBHOOK] Successfully updated status for task ${taskId} to ${status}.`);
    return NextResponse.json({ success: true });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WEBHOOK_FATAL] Error processing webhook: ${message}`);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
