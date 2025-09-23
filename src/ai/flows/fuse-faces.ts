'use server';
/**
 * @fileOverview A flow for fusing two faces into a single scene using an image generation model.
 */

// BUNDLER-FIX ATTEMPT: Use namespace imports to avoid bundling issues.
import * as core from '@genkit-ai/core';
import { vertexAI } from '@genkit-ai/vertexai';
import { FuseFacesInput, FuseFacesOutput } from './types';

// Configure using the namespace.
core.configure({
  plugins: [
    vertexAI({
      location: 'europe-west1',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

/**
 * Takes two images, each with a face, and generates a new image
 * that combines both people side-by-side in a new scene.
 */
export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  console.log('[FUSE_FACES_FLOW] Starting image fusion with namespace imports.');

  try {
    if (!input.image1Uri || !input.image2Uri) {
      console.error('[FUSE_FACES_FLOW_ERROR] Invalid image format.');
      return { error: 'Image fusion failed: One or more images were missing or invalid.' };
    }

    // Generate using the namespace.
    const { candidates } = await core.generate({
      model: 'gemini-2.5-flash-image-preview',
      
      prompt: [
        { 
          text: "From these two face images, create a picture where the two people are placed side by side, facing forward, in a horizontal 9:16 image, captured in a close-up/chest-up shot, with a simple background — while preserving the fidelity of their faces." 
        },
        { media: { url: input.image1Uri } },
        { media: { url: input.image2Uri } },
      ],
      
      output: {
        format: 'uri',
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
    console.error('[FUSE_FACES_FLOW_ERROR] Detailed error object:', JSON.stringify(err, null, 2));
    
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { error: `Image fusion failed: ${message}` };
  }
}
