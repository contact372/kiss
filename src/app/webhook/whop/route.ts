import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { activateUserSubscriptionAdmin, cancelUserSubscriptionAdmin } from '@/lib/firebase/firebase-admin';

export async function POST(request: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  console.log('[WHOP_WEBHOOK] Received a request.');

  if (!secret) {
    console.error('[WHOP_WEBHOOK_ERROR] WHOP_WEBHOOK_SECRET is not set in environment variables.');
    return NextResponse.json({ error: 'Webhook secret is not configured.' }, { status: 500 });
  }

  try {
    const headersList = headers();
    const signature = headersList.get('x-whop-signature');
    const body = await request.text();
    console.log('[WHOP_WEBHOOK] Request Body:', body.substring(0, 500) + '...'); // Log first 500 chars

    if (!signature) {
      console.warn('[WHOP_WEBHOOK_WARN] Webhook received without a signature.');
      return NextResponse.json({ error: 'No signature found in headers.' }, { status: 401 });
    }
    console.log('[WHOP_WEBHOOK] Signature from header:', signature);

    const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
    console.log('[WHOP_WEBHOOK] Calculated hash:', hash);

    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
      console.warn('[WHOP_WEBHOOK_ERROR] Invalid webhook signature received.');
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
    }
    console.log('[WHOP_WEBHOOK] Signature is valid.');

    const payload = JSON.parse(body);
    const eventType = payload.type;
    const uid = payload.data?.metadata?.uid;
    console.log(`[WHOP_WEBHOOK] Event Type: ${eventType}, UID from metadata: ${uid}`);

    if (!uid) {
        console.error(`[WHOP_WEBHOOK_CRITICAL] Webhook (${eventType}) received but UID was missing from metadata.`);
        return NextResponse.json({ error: 'User UID was missing from webhook metadata.' }, { status: 400 });
    }

    switch (eventType) {
        case 'payment_succeeded':
        case 'subscription.created':
        case 'subscription.renewed':
            console.log(`[WHOP_WEBHOOK] Activating subscription for user: ${uid}...`);
            await activateUserSubscriptionAdmin(uid);
            console.log(`[WHOP_WEBHOOK] Successfully activated/renewed subscription for user: ${uid}`);
            return NextResponse.json({ message: `Subscription activated for user ${uid}.` }, { status: 200 });
        
        case 'subscription.ended':
            const endsAtEnded = payload.data?.ends_at || new Date().toISOString();
            console.log(`[WHOP_WEBHOOK] Subscription for user ${uid} officially ended at ${endsAtEnded}. Cancelling access.`);
            await cancelUserSubscriptionAdmin(uid, endsAtEnded, true); // Mark as ended
            return NextResponse.json({ message: `Subscription for user ${uid} ended.` }, { status: 200 });

        case 'subscription.canceled':
            const endsAtCanceled = payload.data?.ends_at;
            if (!endsAtCanceled) {
                console.error(`[WHOP_WEBHOOK_CRITICAL] subscription.canceled webhook for UID ${uid} is missing the 'ends_at' date.`);
                return NextResponse.json({ error: "Cancellation event is missing the subscription end date." }, { status: 400 });
            }
            console.log(`[WHOP_WEBHOOK] Subscription cancellation scheduled for user: ${uid} on ${endsAtCanceled}. Storing end date.`);
            await cancelUserSubscriptionAdmin(uid, endsAtCanceled, false); // Mark with end date, but not ended yet
            return NextResponse.json({ message: `Subscription cancellation for user ${uid} acknowledged.` }, { status: 200 });

        default:
            console.log(`[WHOP_WEBHOOK] Received unhandled event type: ${eventType}. Acknowledging.`);
            return NextResponse.json({ message: `Webhook event ${eventType} received and acknowledged.` }, { status: 200 });
    }

  } catch (error) {
    console.error('[WHOP_WEBHOOK_FATAL] Error processing Whop webhook:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook processing failed: ${message}` }, { status: 500 });
  }
}
