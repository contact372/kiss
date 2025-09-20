'use server';

import { FuseFacesInput, FuseFacesOutput } from './types';

async function urlToBase64(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed ${url}: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.toString('base64');            // base64 sans "data:" ni mime
}

export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { error: 'Missing GOOGLE_GENAI_API_KEY / GOOGLE_API_KEY' };

  // 1) Convertir les 2 images en base64
  const img1 = await urlToBase64(input.image1Uri);
  const img2 = await urlToBase64(input.image2Uri);

  // 2) Construire la requête v1 avec le modèle de génération d'image correct
  const model = 'gemini-2.5-flash-image-preview'; // CORRECTED: Use image generation model
  const url   = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  const prompt =
    'Create a single 16:9 photorealistic image (American shot). ' +
    'Person from the first image on the left, person from the second on the right. ' +
    'Neutral background. Preserve facial likeness faithfully.';

  const payload = {
    contents: [{
      role: 'user',
      parts: [
        // v1 = camelCase
        { inlineData: { mimeType: 'image/png', data: img1 } },
        { inlineData: { mimeType: 'image/png', data: img2 } },
        { text: prompt }
      ]
    }],
    // IMPORTANT : demander explicitement une sortie IMAGE
    generationConfig: { responseModalities: ['IMAGE'] } // CORRECTED: Use responseModalities
  };

  const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    console.error("[FUSE_FACES_ERROR] API call failed:", errBody);
    return { error: `API request failed with status ${resp.status}: ${errBody}` };
  }

  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData);

  if (!imagePart) {
    const txt = parts.find((p: any) => p.text)?.text;
    console.error("[FUSE_FACES_ERROR] No image in API response. Text was:", txt);
    return { error: `No image in response. Text was: ${txt ?? '—'}` };
  }

  const mime = imagePart.inlineData.mimeType || 'image/png';
  const b64  = imagePart.inlineData.data;         // base64 renvoyé par l’API
  return { fusedImageUri: `data:${mime};base64,${b64}` };
}
