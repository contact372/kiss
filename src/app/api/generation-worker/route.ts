
import { NextResponse } from 'next/server';
import { generateKissVideo } from '@/ai/flows/generate-kiss-video';
import { GenerateKissVideoInput } from '@/ai/flows/types';

interface PubSubMessage {
  message: {
    data: string;
  };
}

interface RawInput {
  generationId: string;
  userId: string;
  image1DataUri: string;
  image2_data_uri: string; // The incorrect format we receive
}

export async function POST(request: Request) {
  console.log('[GENERATION_WORKER_ROUTE] --- REQUEST RECEIVED ---');

  try {
    const body: PubSubMessage = await request.json();

    if (!body || !body.message || !body.message.data) {
      console.error('[GENERATION_WORKER_ROUTE] FATAL: Invalid Pub/Sub message format.');
      return NextResponse.json({ error: 'Invalid Pub/Sub message format' }, { status: 400 });
    }
    console.log('[GENERATION_WORKER_ROUTE] Pub/Sub message is valid.');

    const messageData = body.message.data;
    const decodedData = Buffer.from(messageData, 'base64').toString('utf-8');
    const rawInput: RawInput = JSON.parse(decodedData);
    
    const correctedInput: GenerateKissVideoInput = {
      generationId: rawInput.generationId,
      userId: rawInput.userId,
      image1DataUri: rawInput.image1DataUri,
      image2DataUri: rawInput.image2_data_uri,
    };
    
    console.log(`[GENERATION_WORKER_ROUTE] Input corrected for userId: ${correctedInput.userId}, generationId: ${correctedInput.generationId}`);
    console.log('[GENERATION_WORKER_ROUTE] Attempting to call generateKissVideo flow...');

    // Call the main flow function and await its result to properly handle errors.
    try {
      await generateKissVideo(
        correctedInput.generationId,
        correctedInput.userId,
        correctedInput.image1DataUri,
        correctedInput.image2DataUri
      );
      console.log('[GENERATION_WORKER_ROUTE] Successfully initiated generateKissVideo flow.');
    } catch (flowError) {
      console.error('[GENERATION_WORKER_ROUTE] CRITICAL: The 'generateKissVideo' flow threw an error:', flowError);
      // We still return 202 so Pub/Sub doesn't retry, but the error is logged.
    }

    console.log('[GENERATION_WORKER_ROUTE] Acknowledging Pub/Sub message. Processing continues in background.');
    return NextResponse.json({ success: true, message: "Request received and is being processed." }, { status: 202 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[GENERATION_WORKER_ROUTE] FATAL: Failed to process request: ${errorMessage}`);
    // Return 200 to prevent Pub/Sub from retrying a malformed request.
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 200 });
  }
}
