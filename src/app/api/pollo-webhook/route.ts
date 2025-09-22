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

  // 1. Get headers
  const webhookId = headersList.get('x-webhook-id');
  const webhookTimestamp = headersList.get('x-webhook-timestamp');
  const signatureFromHeader = headersList.get('x-webhook-signature');
  const webhookSecret = process.env.POLLO_WEBHOOK_SECRET;

  if (!webhookId || !webhookTimestamp || !signatureFromHeader || !webhookSecret) {
    const missing = [!webhookId && 'id', !webhookTimestamp && 'timestamp', !signatureFromHeader && 'signature', !webhookSecret && 'secret'].filter(Boolean).join(', ');
    console.error(`[WEBHOOK_ERROR] Missing required config or headers: ${missing}.`);
    return NextResponse.json({ error: 'Configuration or header error.' }, { status: 400 });
  }

  try {
    // 2. Verify signature
    const body = await req.text();
    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
    const secretBytes = Buffer.from(webhookSecret, 'base64');
    const computedSignature = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

    if (!crypto.timingSafeEqual(Buffer.from(signatureFromHeader, 'base64'), Buffer.from(computedSignature, 'base64'))) {
      console.warn('[WEBHOOK_WARN] Invalid signature attempt detected.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- Signature is valid, process the event ---
    console.log('[WEBHOOK] Received verified payload from Pollo AI:', body);
    const event = JSON.parse(body);

    // 3. **CORRECTION**: Get our internal ID from the 'passthrough' field
    if (!event.passthrough) {
        console.error('[WEBHOOK_ERROR] Invalid payload: Missing \'passthrough\' field.');
        return NextResponse.json({ error: 'Invalid payload: missing passthrough' }, { status: 400 });
    }

    const passthrough = JSON.parse(event.passthrough);
    const { generationId } = passthrough;

    if (!generationId) {
        console.error('[WEBHOOK_ERROR] Invalid passthrough data: Missing \'generationId\'.');
        return NextResponse.json({ error: 'Invalid passthrough data' }, { status: 400 });
    }

    // 4. Use the correct internal `generationId` to update the document
    const docRef = admin.db.collection('videoGenerations').doc(generationId);
    const { status } = event;

    await docRef.update({
      status: status, // 'succeed' or 'failed'
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      webhookPayload: event, // Store the full payload for debugging
    });

    console.log(`[WEBHOOK] Successfully updated status for internal task ${generationId} to ${status}.`);
    return NextResponse.json({ success: true });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WEBHOOK_FATAL] Error processing webhook: ${message}`);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
