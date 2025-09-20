'use server';

import { FuseFacesInput, FuseFacesOutput } from './types';

async function fetchAsBase64(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed ${url}: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct =
    r.headers.get('content-type') ||
    (/\.(jpe?g)$/i.test(url) ? 'image/jpeg' : 'image/png');
  return { data: buf.toString('base64'), mime: ct };
}

export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { error: 'Missing GOOGLE_GENAI_API_KEY / GOOGLE_API_KEY' };

  try {
    // 1) Charger les deux images en base64
    const [img1, img2] = await Promise.all([
      fetchAsBase64(input.image1Uri),
      fetchAsBase64(input.image2Uri),
    ]);

    // 2) Endpoint + payload (v1beta + imagegeneration@005)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagegeneration@005:generateContent?key=${apiKey}`;

    const prompt =
      'Create one 16:9 photorealistic image (American shot). ' +
      'Left = person inspired by first photo, Right = person inspired by second photo. ' +
      'Neutral background. Preserve likeness without copying identity.';

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: img1.mime, data: img1.data } },
            { inline_data: { mime_type: img2.mime, data: img2.data } },
          ],
        },
      ],
      // ❌ pas de generation_config.* ici ; le modèle renvoie l’image en inline_data
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
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p.inline_data);

    if (!imgPart) {
      const txt = parts.find((p: any) => p.text)?.text;
      // Also log safety ratings if available
      const safetyRatings = data?.candidates?.[0]?.safetyRatings;
      console.error('[FUSE_FACES] No image in response. Text:', txt, 'Safety Ratings:', safetyRatings);
      return { error: `No image in response (imagegeneration@005). Text: ${txt ?? '—'}` };
    }

    const mime = imgPart.inline_data.mime_type || 'image/png';
    const b64  = imgPart.inline_data.data;
    return { fusedImageUri: `data:${mime};base64,${b64}` };
  } catch (e: any) {
    console.error('[FUSE_FACES] Unexpected error:', e);
    return { error: e?.message ?? 'Unknown error' };
  }
}
