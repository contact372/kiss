
import { NextResponse } from 'next/server';
import { generateKissVideo } from '@/ai/flows/generate-kiss-video';
import { GenerateKissVideoInput } from '@/ai/flows/types';

export async function POST(request: Request) {
  console.log('[GENERATION_WORKER_ROUTE] Received a request.');

  try {
    const body = await request.json();

    // Pub/Sub messages have a specific format
    if (!body || !body.message || !body.message.data) {
      console.error('[GENERATION_WORKER_ROUTE] Invalid Pub/Sub message format.');
      return NextResponse.json({ error: 'Invalid Pub/Sub message format' }, { status: 400 });
    }

    // The actual message is base64 encoded
    const messageData = body.message.data;
    const decodedData = Buffer.from(messageData, 'base64').toString('utf-8');
    const input: GenerateKissVideoInput = JSON.parse(decodedData);
    
    console.log('[GENERATION_WORKER_ROUTE] Decoded input:', input);

    // Call the main flow function. 
    // We don't wait for it to finish, as Pub/Sub expects a quick response.
    generateKissVideo(input).catch(err => {
        console.error('[GENERATION_WORKER_ROUTE] Uncaught error from generateKissVideo flow:', err);
    });

    // Acknowledge the message immediately to prevent Pub/Sub from resending it
    console.log('[GENERATION_WORKER_ROUTE] Acknowledged Pub/Sub message. Processing will continue in the background.');
    return NextResponse.json({ success: true, message: "Request received and is being processed." }, { status: 202 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[GENERATION_WORKER_ROUTE] Failed to process request: ${errorMessage}`);
    // Acknowledge the message even if there's an error in parsing, to prevent infinite retries.
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 200 });
  }
}
