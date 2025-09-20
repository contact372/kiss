'use server';

import sharp from 'sharp';
import { FuseFacesInput, FuseFacesOutput } from './types';

/* ----------------------- Helpers ----------------------- */

// Télécharge une image en Buffer + son mime
async function fetchImage(url: string): Promise<{ buf: Buffer; mime: string }> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed ${url}: ${r.status}`);
  const arrayBuf = await r.arrayBuffer();
  const mime =
    r.headers.get('content-type') ||
    (/\.(jpe?g)$/i.test(url) ? 'image/jpeg' : 'image/png');
  return { buf: Buffer.from(arrayBuf), mime };
}

// Construit un collage 16:9 (1280x720) : image1 à gauche, image2 à droite.
// Chaque côté est “cover” (recadré si besoin) pour remplir sa moitié proprement.
async function makeSideBySideCollagePNG(
  leftBuf: Buffer,
  rightBuf: Buffer
): Promise<Buffer> {
  const W = 1280;
  const H = 720;
  const panelW = Math.floor(W / 2);

  // prépare chaque panneau en 16:9 (cover)
  const leftPanel = await sharp(leftBuf)
    .resize(panelW, H, { fit: 'cover', position: 'center' })
    .toBuffer();

  const rightPanel = await sharp(rightBuf)
    .resize(panelW, H, { fit: 'cover', position: 'center' })
    .toBuffer();

  // canevas clair
  const canvas = sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 245, g: 245, b: 245 }
    }
  });

  const out = await canvas
    .composite([
      { input: leftPanel, left: 0, top: 0 },
      { input: rightPanel, left: panelW, top: 0 }
    ])
    .png()
    .toBuffer();

  return out;
}

// Essaie de trouver un vrai modèle *image-preview* accessible à ta clé (optionnel)
async function pickImagePreviewModel(apiKey: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const list: Array<{ name: string }> = data.models ?? [];
  const hit = list.find(m => /image-preview/i.test(m.name));
  // L’API v1beta attend l’URI sans le préfixe "models/", donc on normalise :
  // - si name est "models/gemini-2.5-flash-image-preview", on garde la partie après "models/"
  return hit ? hit.name.replace(/^models\//, '') : null;
}

/* ----------------------- Action principale ----------------------- */

export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { error: 'Missing GOOGLE_GENAI_API_KEY / GOOGLE_API_KEY' };

  try {
    // 1) Télécharge les 2 images
    const [{ buf: buf1 }, { buf: buf2 }] = await Promise.all([
      fetchImage(input.image1Uri),
      fetchImage(input.image2Uri)
    ]);

    // 2) Fabrique un collage PNG 16:9
    const collagePng = await makeSideBySideCollagePNG(buf1, buf2);
    const collageB64 = collagePng.toString('base64');

    // 3) Choisis un modèle image-preview
    const discovered = await pickImagePreviewModel(apiKey);
    const model = discovered || 'gemini-2.5-flash-image-preview';

    // 4) Appel API v1beta (une seule image en entrée)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt =
      'Create a single 16:9 photorealistic image (American shot). ' +
      'Use the collage as reference: the person on the **left** comes from the left side, ' +
      'and the person on the **right** comes from the right side. ' +
      'Place them side-by-side against a simple neutral background. ' +
      'Preserve likeness naturally (no caricature), consistent lighting and color grading.';

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: 'image/png', data: collageB64 } },
            { text: prompt }
          ]
        }
      ]
      // ⚠️ Pas de generation_config exotique ici ; les modèles image-preview renvoient l’image dans inline_data.
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

    // 5) Extraction de l’image générée
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p?.inline_data);

    if (!imgPart) {
      const txt = parts.find((p: any) => p?.text)?.text;
      // Logs utiles côté serveur pour debug
      console.error('[FUSE_FACES] No image in response. Full response:', JSON.stringify(data));
      return {
        error:
          `No image in response (souvent un refus "Safety" pour les visages).` +
          (txt ? ` Model said: ${txt}` : '')
      };
    }

    const mime = imgPart.inline_data.mime_type || 'image/png';
    const b64 = imgPart.inline_data.data;

    return { fusedImageUri: `data:${mime};base64,${b64}` };
  } catch (e: any) {
    console.error('[FUSE_FACES] Unexpected error:', e);
    return { error: e?.message ?? 'Unknown error' };
  }
}
