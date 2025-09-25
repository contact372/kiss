'use server';
/**
 * @fileOverview A flow for fusing two faces into a single scene using an image generation model.
 */
import { ai } from '@/ai/genkit';
import { FuseFacesInput, FuseFacesOutput } from './types'; // Import types

/**
 * Takes two images, each with a face, and generates a new image
 * that combines both people side-by-side in a new scene.
 */
export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  console.log('[FUSE_FACES_FLOW] Starting image fusion process...');

  try {
    const { candidates } = await ai.generate({
      model: 'googleai/gemini-1.5-flash', // Correct, stable model identifier
      prompt: [
        {
          text: `CThe image you will receive is split into two, with one person on each side. From these two people, you need to create a horizontal 9:16 image showing both of them side by side, facing forward, in a medium close-up (chest level). The background should be simple and minimal, and the faces must remain faithful to the originals you received`,
        },
        { media: { url: input.image1Uri } },
        { media: { url: input.image2Uri } },
      ],
      config: {
        // Additional configurations can be added here if needed
      },
      output: {
        format: 'uri', // Request a data URI directly
      }
    });

    const firstCandidate = candidates[0];

    if (!firstCandidate || !firstCandidate.media) {
      console.error('[FUSE_FACES_FLOW_ERROR] The model did not return a valid image candidate.');
      return { error: 'Image fusion failed to produce a result.' };
    }

    console.log('[FUSE_FACES_FLOW] Successfully generated fused image.');
    return {
      fusedImageUri: firstCandidate.media.url,
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[FUSE_FACES_FLOW_ERROR] An error occurred during image fusion: ${errorMessage}`);
    return {
      error: `Failed to fuse images: ${errorMessage}`,
    };
  }
}
