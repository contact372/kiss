'use server';
/**
 * @fileOverview A flow for fusing two faces into a single scene using an image generation model.
 */

import { FuseFacesInput, FuseFacesOutput } from './types';

// Use a global variable to ensure configuration happens only once.
let isGenkitConfigured = false;

/**
 * Takes two images, each with a face, and generates a new image
 * that combines both people side-by-side in a new scene.
 */
export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  // Dynamically import genkit libraries only when the function is called.
  const core = await import('@genkit-ai/core');
  const { vertexAI } = await import('@genkit-ai/vertexai');

  // Configure Genkit lazily and only once.
  if (!isGenkitConfigured) {
    console.log('[GENKIT_CONFIG] Attempting to configure Genkit dynamically...');
    try {
      core.configure({
        plugins: [
          vertexAI({
            location: 'europe-west1',
          }),
        ],
        logLevel: 'debug',
        // We disable tracing as it has caused issues with bundlers in the past.
        enableTracingAndMetrics: false,
      });
      isGenkitConfigured = true;
      console.log('[GENKIT_CONFIG] Genkit configured successfully.');
    } catch (e) {
      console.error('[GENKIT_CONFIG_ERROR] Failed to configure Genkit:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown configuration error';
      return { error: `Genkit configuration failed: ${errorMessage}` };
    }
  }

  console.log('[FUSE_FACES_FLOW] Starting image fusion.');

  try {
    if (!input.image1Uri || !input.image2Uri) {
      console.error('[FUSE_FACES_FLOW_ERROR] Invalid image format. Expected two data URIs.');
      return { error: 'Image fusion failed: One or more images were missing or invalid.' };
    }

    const { candidates } = await core.generate({
      model: 'gemini-1.5-flash-latest',
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
