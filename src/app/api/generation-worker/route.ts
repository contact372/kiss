
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
  console.log('[GENERATION_WORKER_ROUTE] Received a request.');

  try {
    const body: PubSubMessage = await request.json();

    if (!body || !body.message || !body.message.data) {
      console.error('[GENERATION_WORKER_ROUTE] Invalid Pub/Sub message format.');
      return NextResponse.json({ error: 'Invalid Pub/Sub message format' }, { status: 400 });
    }

    const messageData = body.message.data;
    const decodedData = Buffer.from(messageData, 'base64').toString('utf-8');
    const rawInput: RawInput = JSON.parse(decodedData);
    
    const correctedInput: GenerateKissVideoInput = {
      generationId: rawInput.generationId,
      userId: rawInput.userId,
      image1DataUri: rawInput.image1DataUri,
      image2DataUri: rawInput.image2_data_uri,
    };
    
    console.log('[GENERATION_WORKER_ROUTE] Corrected input object is ready.');

    // --- THE FIX IS HERE ---
    // Call the main flow function with explicit, simple arguments to avoid transpiler issues.
    generateKissVideo(
      correctedInput.generationId,
      correctedInput.userId,
      correctedInput.image1DataUri,
      correctedInput.image2DataUri
    ).catch(err => {
        console.error('[GENERATION_WORKER_ROUTE] Uncaught error from generateKissVideo flow:', err);
    });

    console.log('[GENERATION_WORKER_ROUTE] Acknowledged Pub/Sub message. Processing will continue in the background.');
    return NextResponse.json({ success: true, message: "Request received and is being processed." }, { status: 202 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[GENERATION_WORKER_ROUTE] Failed to process request: ${errorMessage}`);
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 200 });
  }
}
