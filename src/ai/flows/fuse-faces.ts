'use server';
/**
 * @fileOverview A flow for fusing two faces into a single scene using a specialized image generation model.
 * This implementation uses the @google/genai SDK directly to access models capable of image output.
 */
import { FuseFacesInput, FuseFacesOutput } from './types';

// Last resort: Using a dynamic require and checking for the default export,
// which can sometimes resolve complex module interoperability issues in Next.js.
const GoogleGenerativeAI = require('@google/genai').GoogleGenerativeAI;

async function urlToGenerativePart(url: string, mimeType: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}. Status: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { inlineData: { data: buffer.toString('base64'), mimeType } };
}

export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  console.log('[FUSE_FACES_FLOW] Starting image fusion process with @google/genai SDK...');

  if (!process.env.GOOGLE_API_KEY) {
    const errorMsg = 'GOOGLE_API_KEY environment variable is not set. Please create a key in Google AI Studio and add it to your environment.';
    console.error(`[FUSE_FACES_FLOW_ERROR] ${errorMsg}`);
    return { error: errorMsg };
  }

  try {
    // This instantiation might fail if the constructor is not found.
    if (!GoogleGenerativeAI) {
      throw new Error('Failed to load GoogleGenerativeAI constructor. The @google/genai module may not be correctly resolved.');
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-preview-0514' });

    console.log('[FUSE_FACES_FLOW] Fetching and converting images to inline data...');
    const image1Part = await urlToGenerativePart(input.image1Uri, 'image/png');
    const image2Part = await urlToGenerativePart(input.image2Uri, 'image/png');

    const prompt = `Create a new photorealistic 16:9 image in an American shot. The image must feature the person from the first input image and the person from the second input image. They should be standing side-by-side against a simple, neutral background. The person from the first image should be on the left, and the person from the second image on the right. Most importantly, you must faithfully reproduce the facial features of each person from their respective input images. Do not change their faces.`;

    console.log('[FUSE_FACES_FLOW] Calling the generative model...');
    const result = await model.generateContent([prompt, image1Part, image2Part]);
    const response = result.response;

    console.log('[FUSE_FACES_FLOW_DEBUG] Full generation response:', JSON.stringify(response, null, 2));
    
    const firstCandidate = response.candidates?.[0];
    const imagePart = firstCandidate?.content?.parts.find(p => p.hasOwnProperty('inlineData'));

    if (!imagePart || !('inlineData' in imagePart)) {
      const errorMsg = 'The model did not return a valid image candidate in the response.';
      console.error(`[FUSE_FACES_FLOW_ERROR] ${errorMsg}`);
      console.error(`[FUSE_FACES_FLOW_ERROR] Text response from model (if any): ${response.text()}`);
      return { error: errorMsg };
    }

    const { inlineData } = imagePart;
    const fusedImageUri = `data:${inlineData.mimeType};base64,${inlineData.data}`;

    console.log('[FUSE_FACES_FLOW] Successfully generated fused image.');
    return { fusedImageUri };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[FUSE_FACES_FLOW_ERROR] An error occurred during image fusion: ${errorMessage}`);
    // Provide a more specific error message if it's the constructor issue.
    if (err instanceof TypeError && err.message.includes('is not a constructor')) {
        return { error: `Failed to fuse images: The GoogleGenerativeAI object loaded from @google/genai is not a valid constructor. There is a critical issue with module resolution in the project.` };
    }
    return { error: `Failed to fuse images: ${errorMessage}` };
  }
}
