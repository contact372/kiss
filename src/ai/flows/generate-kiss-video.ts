
'use server';
/**
 * @fileOverview A flow for generating a video of two people kissing from a single combined image.
 *
 * - generateKissVideo - The main function to generate the video.
 * - GenerateKissVideoInput - The input type for the flow.
 * - GenerateKissVideoOutput - The return type for the flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as fs from 'fs';
import { Readable } from 'stream';

const GenerateKissVideoInputSchema = z.object({
  combinedImageUri: z.string().describe("A single combined image of two people, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateKissVideoInput = z.infer<typeof GenerateKissVideoInputSchema>;

const GenerateKissVideoOutputSchema = z.object({
  videoUrl: z.string().optional(),
  error: z.string().optional(),
});
export type GenerateKissVideoOutput = z.infer<typeof GenerateKissVideoOutputSchema>;

export async function generateKissVideo(input: GenerateKissVideoInput): Promise<GenerateKissVideoOutput> {
  console.log('[VEO_FLOW] Starting video generation process...');
  try {
    let { operation } = await ai.generate({
      model: 'googleai/veo-2.0-generate-001',
      prompt: [
          { text: 'make the two people in the image kiss passionately, 4k, cinematic, high quality' },
          { media: { url: input.combinedImageUri } }
      ],
      config: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
    });

    if (!operation) {
      console.error('[VEO_FLOW_ERROR] The model did not return an operation.');
      return { error: 'Video generation failed to start.' };
    }
    console.log('[VEO_FLOW] Operation started. Polling for completion...');

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      console.log('[VEO_FLOW] Checking operation status...');
      operation = await ai.checkOperation(operation);
    }

    if (operation.error) {
      console.error('[VEO_FLOW_ERROR] Operation failed:', operation.error.message);
      return { error: `Video generation failed: ${operation.error.message}` };
    }

    const videoPart = operation.output?.message?.content.find((p) => !!p.media);
    if (!videoPart || !videoPart.media) {
      console.error('[VEO_FLOW_ERROR] No video media found in the completed operation.');
      return { error: 'Failed to find the generated video in the result.' };
    }
    
    console.log('[VEO_FLOW] Video generation complete. Converting to data URI...');

    // The URL from Veo is temporary and needs the API key to be downloaded.
    // We download it on the server and convert to a data URI to send to the client.
    const fetch = (await import('node-fetch')).default;
    const videoDownloadUrl = `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(videoDownloadUrl);
    if (!response.ok) {
        throw new Error(`Failed to download video file: ${response.statusText}`);
    }
    const videoBuffer = await response.buffer();
    const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
    
    console.log('[VEO_FLOW] Successfully created data URI.');
    return { videoUrl: videoDataUri };

  } catch (e) {
    const message = e instanceof Error ? e.message : 'An unknown error occurred during video generation.';
    console.error('[VEO_FLOW_FATAL]', message, e);
    return { error: message };
  }
}
