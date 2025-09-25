import { admin } from '@/lib/firebase/firebase-admin';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  const headersList = headers();

  const webhookId = headersList.get('x-webhook-id');
  const webhookTimestamp = headersList.get('x-webhook-timestamp');
  const signatureFromHeader = headersList.get('x-webhook-signature');
  const webhookSecret = process.env.POLLO_WEBHOOK_SECRET;

  if (!webhookId || !webhookTimestamp || !signatureFromHeader || !webhookSecret) {
    return NextResponse.json({ error: 'Configuration or header error.' }, { status: 400 });
  }

  try {
    const body = await req.text();
    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
    const secretBytes = Buffer.from(webhookSecret, 'base64');
    const computedSignature = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

    if (!crypto.timingSafeEqual(Buffer.from(signatureFromHeader, 'base64'), Buffer.from(computedSignature, 'base64'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[WEBHOOK] Received verified payload from Pollo AI:', body);
    const event = JSON.parse(body);
    const { taskId, status } = event;

    if (!taskId) {
        console.error('[WEBHOOK_ERROR] Invalid payload: Missing \'taskId\' field.');
        return NextResponse.json({ error: 'Invalid payload: missing taskId' }, { status: 400 });
    }

    const videoGenerationsRef = admin.db.collection('videoGenerations');
    const q = videoGenerationsRef.where('externalTaskId', '==', taskId).limit(1);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
        console.error(`[WEBHOOK_ERROR] No matching document found for externalTaskId: ${taskId}`);
        return NextResponse.json({ success: true, message: 'No matching task found.' });
    }

    const doc = querySnapshot.docs[0];
    const videoUrl = event.generations?.[0]?.url;

    console.log(`[WEBHOOK_DEBUG] Extracted videoUrl: ${videoUrl}`);

    const updatePayload = {
      status: status, 
      updatedAt: FieldValue.serverTimestamp(),
      webhookPayload: event,
      ...(videoUrl && { videoUrl: videoUrl }),
    };

    console.log('[WEBHOOK_DEBUG] Preparing to write payload to Firestore:', JSON.stringify(updatePayload));

    await doc.ref.update(updatePayload);

    console.log(`[WEBHOOK] Successfully updated status for internal task ${doc.id} to ${status}.`);
    return NextResponse.json({ success: true });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WEBHOOK_FATAL] Error processing webhook: ${message}`);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
