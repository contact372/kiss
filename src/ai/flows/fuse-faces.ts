'use server';

import { FuseFacesInput, FuseFacesOutput } from './types';

type B64Img = { data: string; mime: string };

async function fetchAsBase64(url: string): Promise<B64Img> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed ${url}: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const mime =
    r.headers.get('content-type') ||
    (/\.(jpe?g)$/i.test(url) ? 'image/jpeg' : 'image/png');
  return { data: buf.toString('base64'), mime };
}

export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { error: 'Missing GOOGLE_GENAI_API_KEY / GOOGLE_API_KEY' };

  try {
    // 1) Charger les deux images (base64)
    const [img1, img2] = await Promise.all([
      fetchAsBase64(input.image1Uri),
      fetchAsBase64(input.image2Uri),
    ]);

    // 2) Endpoint "Images" (PAS generateContent)
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `imagegeneration@005:generateImages?key=${apiKey}`;

    // 3) Prompt + sources
    const prompt =
      'Create one 16:9 photorealistic image (American shot). ' +
      'Left = person inspired by first photo, Right = person inspired by second photo. ' +
      'Neutral background. Preserve likeness without copying identity.';

    // NOTE: The user-provided payload structure seems to have a slight error.
    // The API expects `image.sources` to be an array of objects, not an object containing an array.
    // Correcting it to the documented structure.
    const payload = {
      prompt: { text: prompt },
      sources: [
          { inlineData: { mimeType: img1.mime, data: img1.data } },
          { inlineData: { mimeType: img2.mime, data: img2.data } },
      ],
      imageGenerationConfig: {
        numberOfImages: 1,
        aspectRatio: '16:9',
      },
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error('[FUSE_FACES] API error:', body);
      return { error: `API ${resp.status}: ${body}` };
    }

    const data = await resp.json();

    const img =
      data?.images?.[0] ??
      data?.generatedImages?.[0] ??
      null;

    if (!img?.data) {
      console.error('[FUSE_FACES] No image field in images API response:', JSON.stringify(data));
      return { error: 'No image returned by Images API (imagegeneration@005).' };
    }

    const mime = img.mimeType || 'image/png';
    return { fusedImageUri: `data:${mime};base64,${img.data}` };
  } catch (e: any) {
    console.error('[FUSE_FACES] Unexpected error:', e);
    return { error: e?.message ?? 'Unknown error' };
  }
}
