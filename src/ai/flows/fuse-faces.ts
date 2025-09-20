'use server';
import { FuseFacesInput, FuseFacesOutput } from './types';

type B64 = { data: string; mime: string };
async function fetchB64(url: string): Promise<B64> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch ${url} => ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const mime = r.headers.get('content-type') || (/\.(jpe?g)$/i.test(url) ? 'image/jpeg' : 'image/png');
  return { data: buf.toString('base64'), mime };
}

export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  const key = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return { error: 'Missing GOOGLE_GENAI_API_KEY / GOOGLE_API_KEY' };

  try {
    const [img1, img2] = await Promise.all([fetchB64(input.image1Uri), fetchB64(input.image2Uri)]);

    const model = 'gemini-2.5-flash-image-preview'; // modèle "image preview"
    const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const prompt =
      'Create a single 16:9 photorealistic image (American shot). ' +
      'Left = person inspired by first photo, Right = person inspired by second photo. ' +
      'Neutral background. Preserve likeness.';

    const payload = {
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: img1.mime, data: img1.data } },
          { inline_data: { mime_type: img2.mime, data: img2.data } },
          { text: prompt }
        ]
      }]
      // ⚠️ pas de generation_config exotique en v1beta ici
    };

    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!resp.ok) {
      return { error: `API ${resp.status}: ${await resp.text()}` };
    }
    const data = await resp.json();

    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p.inline_data);
    if (!imgPart) {
      const text = parts.find((p: any) => p.text)?.text;
      console.error("[FUSE_FACES] No image in API response. Full response:", JSON.stringify(data));
      return { error: `No image in response (likely Safety/refusal). Text: ${text ?? '—'}` };
    }

    const mime = imgPart.inline_data.mime_type || 'image/png';
    const b64  = imgPart.inline_data.data;
    return { fusedImageUri: `data:${mime};base64,${b64}` };

  } catch (e: any) {
      console.error('[FUSE_FACES] Unexpected error:', e);
      return { error: e?.message ?? 'Unknown error' };
  }
}
