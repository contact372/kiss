'use server';
/**
 * @fileOverview A multi-step flow that first fuses two images into one, 
 * then generates a video from that fused image.
 */
import { ai } from '@/ai/genkit';
import { fuseFaces } from './fuse-faces';
import { GenerateKissVideoInput, GenerateKissVideoOutput } from './types';

/** Tente de trouver un modèle *vidéo* (Veo) accessible à la clé et supportant la génération longue. */
async function pickVideoModel(apiKey: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) return null;

  const data = await res.json();
  const list: Array<{ name: string; supportedGenerationMethods: string[] }> =
    data?.models ?? [];

  // Cherche un modèle qui est (1) un modèle Veo et (2) supporte la méthode de génération vidéo.
  const hit = list.find(
    (m) =>
      /veo/i.test(m.name) &&
      m.supportedGenerationMethods.includes('predictLongRunning')
  );

  // Genkit attend le nom court (ex: 'veo-2') pour le préfixer avec 'googleai/'
  return hit ? hit.name.replace(/^models\//, '') : null;
}

/**
 * A two-step flow to generate a video:
 * 1. Fuse two separate images into a single, coherent scene.
 * 2. Animate that new scene to create a video.
 */
export async function generateKissVideo(
  input: GenerateKissVideoInput
): Promise<GenerateKissVideoOutput> {
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
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return { error: 'Missing GOOGLE_GENAI_API_KEY / GOOGLE_API_KEY' };
    }

    // Découverte dynamique du modèle vidéo
    const videoModelName = await pickVideoModel(apiKey);
    if (!videoModelName) {
      return {
        error:
          'Failed to find a suitable video generation model (Veo) for your API key. Please ensure the model is enabled for your project.',
      };
    }
    console.log(`[MAIN_FLOW] Using video model: ${videoModelName}`);

    const { candidates } = await ai.generate({
      model: `googleai/${videoModelName}`, // Utilise le modèle découvert dynamiquement
      prompt: [
        {
          text: 'Make the two people in the image kiss passionately. The video should be cinematic, 4k, and high quality.',
        },
        { media: { url: fusionResult.fusedImageUri } },
      ],
      config: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
      output: {
        format: 'uri', // Demande à Genkit de retourner une data URI
      },
    });

    const videoCandidate = candidates[0];

    if (!videoCandidate || !videoCandidate.media) {
      console.error(
        '[MAIN_FLOW_ERROR] Step 2 failed: Veo did not return a valid video candidate.'
      );
      return { error: 'Video animation failed to produce a result.' };
    }

    console.log('[MAIN_FLOW] Step 2 successful. Video generated.');
    return {
      videoUri: videoCandidate.media.url,
      sourceImageUri: fusionResult.fusedImageUri, // Retourne l'image fusionnée au client
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(
      `[MAIN_FLOW_ERROR] An error occurred during video animation: ${errorMessage}`
    );
    return {
      error: `Failed to animate the image: ${errorMessage}`,
    };
  }
}
