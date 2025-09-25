'use server';

import sharp from 'sharp';
import { FuseFacesInput, FuseFacesOutput } from './types';

/**
 * Converts a data URI string into a Buffer.
 */
function dataUriToBuffer(uri: string): { buf: Buffer; mime: string } {
  if (!uri.startsWith('data:')) {
    throw new Error('Invalid data URI');
  }
  const commaIdx = uri.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Invalid data URI format');
  }
  const meta = uri.substring(5, commaIdx);
  const data = uri.substring(commaIdx + 1);

  return {
    buf: Buffer.from(data, 'base64'),
    mime: meta.split(';')[0] || 'image/png',
  };
}

/**
 * Creates a side-by-side 16:9 collage from two image buffers.
 */
async function makeSideBySideCollage(leftBuf: Buffer, rightBuf: Buffer): Promise<Buffer> {
  const W = 1920; // 16:9 aspect ratio width
  const H = 1080; // 16:9 aspect ratio height
  const panelW = Math.floor(W / 2);

  // Resize each image to fit one half of the canvas
  const leftPanel = await sharp(leftBuf)
    .resize(panelW, H, { fit: 'cover', position: 'center' })
    .toBuffer();

  const rightPanel = await sharp(rightBuf)
    .resize(panelW, H, { fit: 'cover', position: 'center' })
    .toBuffer();

  // Create a blank canvas and composite the two panels
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: leftPanel, left: 0, top: 0 },
      { input: rightPanel, left: panelW, top: 0 },
    ])
    .png() // Output as PNG to preserve transparency and quality
    .toBuffer();
}

/**
 * Extracts the base64 image data from the Google API response.
 */
function extractGoogleImage(data: any): { b64?: string; mime?: string } {
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p?.inlineData);
  if (imgPart) {
    return {
      b64: imgPart.inlineData.data,
      mime: imgPart.inlineData.mimeType || 'image/png',
    };
  }
  return {};
}

/**
 * Main flow function: takes two images, creates a collage, and sends it to Google Gemini.
 */
export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  console.log('[FUSE_FACES_FLOW] Starting image fusion using direct API call.');
  
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('[FUSE_FACES_ERROR] GOOGLE_API_KEY is not set.');
    return { error: 'Server configuration error: Missing API Key.' };
  }

  try {
    // 1. Convert data URIs to buffers
    const { buf: buf1 } = dataUriToBuffer(input.image1Uri);
    const { buf: buf2 } = dataUriToBuffer(input.image2Uri);

    // 2. Create a side-by-side collage
    console.log('[FUSE_FACES_FLOW] Creating side-by-side collage.');
    const collage = await makeSideBySideCollage(buf1, buf2);
    const collageB64 = collage.toString('base64');

    // 3. Call Google Gemini API
    console.log('[FUSE_FACES_FLOW] Calling Google Gemini API.');
    const model = 'gemini-1.5-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt =
      'From this collage, create a single, photorealistic 16:9 image. \n' +
      'The final image should feature two people inspired by the collage: the person on the left inspired by the left side of the collage, and the person on the right by the right side. \n' +
      'Place them side-by-side in a chest-up shot. Do not reproduce the collage itself. \n' +
      'Aim for a neutral, clean studio background with soft, consistent lighting. Preserve the general likeness of the faces but create new, unique individuals.';

    const payload = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'image/png', data: collageB64 } },
            { text: prompt },
          ],
        },
      ],
    };

    const res = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) 
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[FUSE_FACES_ERROR] Google API error (${res.status}):`, errorBody);
      return { error: `Image generation failed with status: ${res.status}` };
    }

    const json = await res.json();
    const { b64, mime } = extractGoogleImage(json);

    if (!b64) {
      console.error('[FUSE_FACES_ERROR] No image data found in Google API response:', JSON.stringify(json));
      return { error: 'Image generation failed: No image was returned.' };
    }

    console.log('[FUSE_FACES_FLOW] Image fusion successful.');
    return { fusedImageUri: `data:${mime || 'image/png'};base64,${b64}` };

  } catch (err: any) {
    console.error('[FUSE_FACES_ERROR] An unexpected error occurred:', err);
    return { error: err.message || 'An unknown error occurred during image fusion.' };
  }
}
