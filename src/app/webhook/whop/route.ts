
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { activateUser, deactivateUser } from '@/lib/firebase/firebase-admin';

// Errors based on Whop's documentation
const ERRORS = {
  NO_SIGNATURE: 'No signature found in the headers',
  INVALID_SIGNATURE: 'The signature in the headers is not valid',
  WEBHOOK_SECRET_NOT_SET: 'The WEBHOOK_SECRET is not set in the environment variables',
};

/**
 * This is a webhook that receives POST requests from Whop.
 * It verifies the signature of the request and then processes the event.
 * @param req - The Next.js request object.
 * @returns A Next.js response object.
 */
export async function POST(req: NextRequest) {
    const headersList = headers();
    const signature = headersList.get('X-Whop-Signature');

    if (!process.env.WHOP_WEBHOOK_SECRET) {
        console.error('[Whop Webhook] Webhook secret is not set.');
        return NextResponse.json({ error: ERRORS.WEBHOOK_SECRET_NOT_SET }, { status: 500 });
    }

    if (!signature) {
        console.error('[Whop Webhook] No signature found.');
        return NextResponse.json({ error: ERRORS.NO_SIGNATURE }, { status: 400 });
    }

    try {
        const body = await req.text();
        const hash = crypto.createHmac('sha256', process.env.WHOP_WEBHOOK_SECRET).update(body).digest('hex');

        if (hash !== signature) {
            console.error('[Whop Webhook] Invalid signature.');
            return NextResponse.json({ error: ERRORS.INVALID_SIGNATURE }, { status: 401 });
        }

        const event = JSON.parse(body);

        switch (event.type) {
            case 'membership.created':
                await activateUser(event.data.whop_id);
                break;
            case 'membership.cancelled':
                await deactivateUser(event.data.whop_id);
                break;
            case 'membership.ended':
                 await deactivateUser(event.data.whop_id);
                 break;
        }

        return NextResponse.json({ status: 'success' }, { status: 200 });

    } catch (err: any) {
        console.error(`[Whop Webhook] Error processing webhook: ${err.message}`);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
