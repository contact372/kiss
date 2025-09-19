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
    // Reverting to gemini-1.5-pro-latest. We have confirmed this model is found (unlike others that gave a 404).
    // The remaining issue is a 429 quota error, which is a Google Cloud account issue, not a code issue.
    const generationResponse = await ai.generate({
      model: 'googleai/gemini-1.5-pro-latest',
      prompt: [
        {
          text: `Create a new photorealistic 16:9 image in an American shot. The image must feature the person from the first input image and the person from the second input image. \n\nThey should be standing side-by-side against a simple, neutral background. The person from the first image should be on the left, and the person from the second image on the right. \n\nMost importantly, you must faithfully reproduce the facial features of each person from their respective input images. Do not change their faces.`,
        },
        { media: { url: input.image1Uri } },
        { media: { url: input.image2Uri } },
      ],
      config: {
        // Additional configurations can be added here if needed
      },
    });

    // Log the entire response for debugging purposes
    console.log('[FUSE_FACES_FLOW_DEBUG] Full generation response:', JSON.stringify(generationResponse, null, 2));

    const firstCandidate = generationResponse.candidates[0];

    if (!firstCandidate || !firstCandidate.media || !firstCandidate.media.content) {
      console.error('[FUSE_FACES_FLOW_ERROR] The model did not return a valid image candidate.');
      return { error: 'Image fusion failed to produce a result.' };
    }

    // Convert the buffer to a data URI
    const imageBuffer = firstCandidate.media.content;
    const fusedImageUri = `data:${firstCandidate.media.contentType};base64,${imageBuffer.toString('base64')}`;

    console.log('[FUSE_FACES_FLOW] Successfully generated fused image.');
    return {
      fusedImageUri: fusedImageUri,
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[FUSE_FACES_FLOW_ERROR] An error occurred during image fusion: ${errorMessage}`);
    return {
      error: `Failed to fuse images: ${errorMessage}`,
    };
  }
}
