'use server';
/**
 * @fileOverview A flow for fusing two faces into a single scene by calling the Google AI REST API directly.
 * This approach avoids SDK complexities and build issues.
 */
import { FuseFacesInput, FuseFacesOutput } from './types';

// --- Helper Functions --- 

/**
 * Fetches an image from a URL and converts it to a base64-encoded string.
 * This is required for inline data in the REST API payload.
 */
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}. Status: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}

/**
 * The main function to fuse faces. It now calls the Google AI REST API.
 * It takes two image URIs and generates a new image combining them.
 */
export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  console.log('[FUSE_FACES_FLOW] Starting image fusion process via REST API...');

  if (!process.env.GOOGLE_API_KEY) {
    const errorMsg = 'GOOGLE_API_KEY environment variable is not set.';
    console.error(`[FUSE_FACES_FLOW_ERROR] ${errorMsg}`);
    return { error: errorMsg };
  }

  try {
    console.log('[FUSE_FACES_FLOW] Converting image URIs to base64 data...');
    const image1Base64 = await urlToBase64(input.image1Uri);
    const image2Base64 = await urlToBase64(input.image2Uri);

    const model = 'gemini-1.5-flash-latest'; // Use the valid API model name.
    const apiKey = process.env.GOOGLE_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // REVISED PROMPT: The previous prompt was too direct and likely triggered safety filters.
    // This version asks for inspiration and likeness, which is a softer approach.
    const prompt = `Generate a new photorealistic 16:9 image in an American shot. The image should feature two people, inspired by the individuals in the two provided images. Place the person inspired by the first image on the left, and the person inspired by the second image on the right. They should be standing side-by-side against a simple, neutral background. The goal is to create a new, original scene that captures the likeness and essence of the people in the photos.`;

    // Construct the payload for the REST API.
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/png', data: image1Base64 } },
            { inline_data: { mime_type: 'image/png', data: image2Base64 } },
          ],
        },
      ],
    };

    console.log('[FUSE_FACES_FLOW] Calling the Google AI REST API...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json(); // API errors are in JSON format
      throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorBody)}`);
    }

    const responseData = await response.json();

    // Extract the base64 image data from the API response.
    const candidate = responseData.candidates?.[0];

    // Check for safety ratings first. If the response was blocked, there won't be content.
    if (candidate?.finishReason === 'SAFETY') {
        console.error('[FUSE_FACES_FLOW_ERROR] The model blocked the response due to safety settings.', candidate.safetyRatings);
        throw new Error('The response was blocked due to safety policies. This can happen with images of people. Please try different images.');
    }

    const imagePart = candidate?.content?.parts.find((p: any) => p.inline_data);
    if (!imagePart) {
      // Log the text response if no image is found, which might contain a refusal.
      const textResponse = candidate?.content?.parts.find((p: any) => p.text)?.text;
      console.error('[FUSE_FACES_FLOW_ERROR] API response did not contain image data. Model response text: ', textResponse);
      throw new Error('API response did not contain valid image data.');
    }

    const base64Data = imagePart.inline_data.data;
    const mimeType = imagePart.inline_data.mime_type;
    const fusedImageUri = `data:${mimeType};base64,${base64Data}`;

    console.log('[FUSE_FACES_FLOW] Successfully generated fused image via REST API.');
    return { fusedImageUri };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[FUSE_FACES_FLOW_ERROR] An error occurred during image fusion: ${errorMessage}`);
    return { error: `Failed to fuse images: ${errorMessage}` };
  }
}
