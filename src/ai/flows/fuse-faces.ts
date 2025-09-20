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

async function pickImagePreviewModel(apiKey: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const models: Array<{ name: string }> = data.models ?? data?.model ?? [];
  // Heuristique simple : garder ceux qui contiennent "image-preview"
  const m = models.find(m => /image-preview/i.test(m.name));
  return m?.name ?? null;
}

export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  const key = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return { error: 'Missing GOOGLE_GENAI_API_KEY / GOOGLE_API_KEY' };

  try {
    const [img1, img2] = await Promise.all([fetchB64(input.image1Uri), fetchB64(input.image2Uri)]);

    // 1) Trouver un modèle image-preview vraiment disponible
    const modelName = await pickImagePreviewModel(key);
    if (!modelName) {
      return {
        error:
          'Aucun modèle "image-preview" n’est disponible pour cette clé. ' +
          'Deux options : (A) activer l’accès image-preview dans Google AI Studio, ' +
          'ou (B) passer sur Images API (images:generate), qui est texte→image uniquement.'
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${key}`;

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
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const body = await resp.text();
      return { error: `API ${resp.status}: ${body}` };
    }

    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p.inline_data);

    if (!imgPart) {
      const txt = parts.find((p: any) => p.text)?.text;
      return {
        error:
          `No image in response (souvent un refus "Safety" pour les visages).` +
          (txt ? ` Model said: ${txt}` : '')
      };
    }

    const mime = imgPart.inline_data.mime_type || 'image/png';
    const b64  = imgPart.inline_data.data;
    return { fusedImageUri: `data:${mime};base64,${b64}` };

  } catch (e: any) {
    return { error: e?.message ?? 'Unknown error' };
  }
}
