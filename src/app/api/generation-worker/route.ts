
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
  console.log('[WORKER] --- REQUEST RECEIVED ---');

  try {
    const body: PubSubMessage = await request.json();

    if (!body || !body.message || !body.message.data) {
      console.error('[WORKER] FATAL: Invalid Pub/Sub message format.');
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
    
    console.log(`[WORKER] Processing for user: ${correctedInput.userId}, generation: ${correctedInput.generationId}`);

    // --- AWAIT THE ENTIRE FLOW ---
    const result = await generateKissVideo(
      correctedInput.generationId,
      correctedInput.userId,
      correctedInput.image1DataUri,
      correctedInput.image2DataUri
    );

    if (result.error) {
      console.error(`[WORKER] Flow completed with an error for generation ${correctedInput.generationId}.`);
      return NextResponse.json({ success: false, error: result.error }, { status: 200 });
    }

    console.log(`[WORKER] Successfully finished processing for generation ${correctedInput.generationId}. Responding to Pub/Sub.`);
    return NextResponse.json({ success: true });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[WORKER] UNHANDLED FATAL ERROR: ${errorMessage}`);
    return NextResponse.json({ error: 'Unhandled fatal error', details: errorMessage }, { status: 500 });
  }
}
