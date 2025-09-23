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
  console.log('[FUSE_FACES_FLOW] Starting image fusion process with new model...');

  try {
    // The new model expects raw base64 data, not the full data URI.
    const base64Image1 = input.image1Uri.split(',')[1];
    const base64Image2 = input.image2Uri.split(',')[1];

    if (!base64Image1 || !base64Image2) {
      console.error('[FUSE_FACES_FLOW_ERROR] Invalid image format. Expected two data URIs.');
      return { error: 'Image fusion failed: One or more images were missing or invalid.' };
    }

    const { candidates } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      
      // FIX: Use the exact prompt structure from the documentation.
      prompt: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Image1, // Pass the base64 string directly
          },
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Image2, // Pass the base64 string directly
          },
        },
        {
          text: "From these two face images, create a picture where the two people are placed side by side, facing forward, in a horizontal 9:16 image, captured in a close-up/chest-up shot, with a simple background — while preserving the fidelity of their faces.",
        },
      ],
      output: {
        format: 'uri', // Continue to request a data URI as output.
      },
    });

    const firstCandidate = candidates[0];

    if (!firstCandidate || !firstCandidate.media) {
      console.error('[FUSE_FACES_FLOW_ERROR] The model did not return a valid image candidate.');
      return { error: 'Image fusion failed to produce a result.' };
    }

    console.log('[FUSE_FACES_FLOW] Image fusion successful.');
    return {
      fusedImageUri: firstCandidate.media.uri,
    };
    
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[FUSE_FACES_FLOW_ERROR] An error occurred: ${message}`);
    return { error: `Image fusion failed: ${message}` };
  }
}
