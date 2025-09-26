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
          text: `Create a new photorealistic 16:9 image in an American shot. The image must feature the person from the first input image and the person from the second input image.
          The two individuals should be seen from the waist up, standing close to each other, sharing a gentle kiss.
          The background should be a romantic, dimly lit, urban rooftop at night, with a soft bokeh effect on the city lights behind them.
          The overall mood should be intimate and heartfelt.`,
        },
        { media: { url: input.image1Uri } },
        { media: { url: input.image2Uri } },
      ],
      config: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
    });

    if (!candidates || candidates.length === 0 || !candidates[0].media?.url) {
      console.error('[FUSE_FACES_FLOW_ERROR] No image candidates returned from the model.');
      return {
        error: 'Failed to generate a fused image: No candidates returned.',
      };
    }

    const firstCandidate = candidates[0];

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
