'use server';
/**
 * @fileOverview A multi-step flow that first fuses two images into one, 
 * then generates a video from that fused image.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fuseFaces, FuseFacesInputSchema } from './fuse-faces';

// The main input schema now takes the two original images
export const GenerateKissVideoInputSchema = FuseFacesInputSchema; // Reuse the schema
export type GenerateKissVideoInput = z.infer<typeof GenerateKissVideoInputSchema>;

// The output schema remains the same, returning the final video
export const GenerateKissVideoOutputSchema = z.object({
  videoUri: z.string().optional().describe("The final generated video, as a data URI."),
  sourceImageUri: z.string().optional().describe("The intermediate fused image, for debugging or display."),
  error: z.string().optional(),
});
export type GenerateKissVideoOutput = z.infer<typeof GenerateKissVideoOutputSchema>;

/**
 * A two-step flow to generate a video:
 * 1. Fuse two separate images into a single, coherent scene.
 * 2. Animate that new scene to create a video.
 */
export async function generateKissVideo(input: GenerateKissVideoInput): Promise<GenerateKissVideoOutput> {
  console.log('[MAIN_FLOW] Starting two-step video generation process...');

  // STEP 1: Fuse the two images into a single scene
  console.log('[MAIN_FLOW] Step 1: Fusing faces...');
  const fusionResult = await fuseFaces(input);

  if (fusionResult.error || !fusionResult.fusedImageUri) {
    console.error('[MAIN_FLOW_ERROR] Step 1 failed:', fusionResult.error);
    return { error: `Failed during image fusion step: ${fusionResult.error}` };
  }
  console.log('[MAIN_FLOW] Step 1 successful. Fused image created.');

  // STEP 2: Generate a video from the newly created scene
  console.log('[MAIN_FLOW] Step 2: Animating the fused image...');
  try {
    const { candidates } = await ai.generate({
      model: 'googleai/veo', // Using the standard Veo model for video generation
      prompt: [
        { text: 'Make the two people in the image kiss passionately. The video should be cinematic, 4k, and high quality.' },
        { media: { url: fusionResult.fusedImageUri } }
      ],
      config: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
      output: {
        format: 'uri', // Ask Genkit to return a data URI directly
      }
    });

    const videoCandidate = candidates[0];

    if (!videoCandidate || !videoCandidate.media) {
      console.error('[MAIN_FLOW_ERROR] Step 2 failed: Veo did not return a valid video candidate.');
      return { error: 'Video animation failed to produce a result.' };
    }

    console.log('[MAIN_FLOW] Step 2 successful. Video generated.');
    return {
      videoUri: videoCandidate.media.url,
      sourceImageUri: fusionResult.fusedImageUri, // Pass the fused image back to the client
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[MAIN_FLOW_ERROR] An error occurred during video animation: ${errorMessage}`);
    return {
      error: `Failed to animate the image: ${errorMessage}`,
    };
  }
}
