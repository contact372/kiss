'use server';
/**
 * @fileOverview A flow for fusing two faces into a single scene using the Imagen model on Vertex AI.
 */
import { ai } from '@/ai/genkit';
import { FuseFacesInput, FuseFacesOutput } from './types'; // Import types

/**
 * Takes two images, each with a face, and generates a new image
 * that combines both people side-by-side in a new scene using Imagen.
 */
export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  console.log('[FUSE_FACES_FLOW] Starting image fusion process with Vertex AI Imagen 3...');

  try {
    // Using the powerful Imagen 3 model via Vertex AI
    const { candidates } = await ai.generate({
      model: 'googleai/imagen-3.0-generate-002', // Correct model for Imagen 3 on Vertex AI
      prompt: [
        {
          text: `Create a new photorealistic 16:9 image in an American shot. The image must feature the person from the first input image and the person from the second input image. 

They should be standing side-by-side against a simple, neutral background. The person from the first image should be on the left, and the person from the second image on the right. 

Most importantly, you must faithfully reproduce the facial features of each person from their respective input images. Do not change their faces.`,
        },
        { media: { url: input.image1Uri } },
        { media: { url: input.image2Uri } },
      ],
      output: {
        format: 'uri', // Request a data URI directly
      }
    });

    const firstCandidate = candidates[0];

    if (!firstCandidate || !firstCandidate.media) {
      console.error('[FUSE_FACES_FLOW_ERROR] The model did not return a valid image candidate.');
      return { error: 'Image fusion failed to produce a result.' };
    }

    console.log('[FUSE_FACES_FLOW] Successfully generated fused image with Imagen 3.');
    return {
      fusedImageUri: firstCandidate.media.url,
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[FUSE_FACES_FLOW_ERROR] An error occurred during image fusion: ${errorMessage}`, err);
    return {
      error: `Failed to fuse images: ${errorMessage}`,
    };
  }
}

