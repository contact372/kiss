'use server';
/**
 * @fileOverview A flow for fusing two faces into a single scene using an image generation model.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Defines the input schema for the fuseFaces flow
export const FuseFacesInputSchema = z.object({
  image1Uri: z.string().describe("The first image, as a data URI."),
  image2Uri: z.string().describe("The second image, as a data URI."),
});
export type FuseFacesInput = z.infer<typeof FuseFacesInputSchema>;

// Defines the output schema for the fuseFaces flow
export const FuseFacesOutputSchema = z.object({
  fusedImageUri: z.string().optional().describe("The generated image with both faces, as a data URI."),
  error: z.string().optional(),
});
export type FuseFacesOutput = z.infer<typeof FuseFacesOutputSchema>;

/**
 * Takes two images, each with a face, and generates a new image
 * that combines both people side-by-side in a new scene.
 */
export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  console.log('[FUSE_FACES_FLOW] Starting image fusion process...');

  try {
    const { candidates } = await ai.generate({
      model: 'googleai/imagen-2', // Using Imagen 2 as requested
      prompt: [
        {
          text: `Create a new photorealistic 16:9 image in an American shot. The image must feature the person from the first input image and the person from the second input image. 

They should be standing side-by-side against a simple, neutral background. The person from the first image should be on the left, and the person from the second image on the right. 

Most importantly, you must faithfully reproduce the facial features of each person from their respective input images. Do not change their faces.`,
        },
        { media: { url: input.image1Uri } },
        { media: { url: input.image2Uri } },
      ],
      config: {
        // Additional configurations can be added here if needed
        // For example, negative prompts, quality settings etc.
      },
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
