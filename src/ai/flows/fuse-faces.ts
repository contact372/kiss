'use server';

import sharp from 'sharp';
import { FuseFacesInput, FuseFacesOutput } from './types';

/* =========================================================
   Helpers
   ========================================================= */

/** Télécharge une image et retourne Buffer + mime */
async function fetchImage(url: string): Promise<{ buf: Buffer; mime: string }> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed ${url}: ${r.status}`);
  const arrayBuf = await r.arrayBuffer();
  const mime =
    r.headers.get('content-type') ||
    (/\.(jpe?g)$/i.test(url) ? 'image/jpeg' : 'image/png');
  return { buf: Buffer.from(arrayBuf), mime };
}

/** Construit un collage 16:9 (1280x720) : image1 à gauche, image2 à droite (cover). */
async function makeSideBySideCollagePNG(
  leftBuf: Buffer,
  rightBuf: Buffer
): Promise<Buffer> {
  const W = 1280;
  const H = 720;
  const panelW = Math.floor(W / 2);

  const leftPanel = await sharp(leftBuf)
    .resize(panelW, H, { fit: 'cover', position: 'center' })
    .toBuffer();

  const rightPanel = await sharp(rightBuf)
    .resize(panelW, H, { fit: 'cover', position: 'center' })
    .toBuffer();

  const canvas = sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 245, g: 245, b: 245 },
    },
  });

  return await canvas
    .composite([
      { input: leftPanel, left: 0, top: 0 },
      { input: rightPanel, left: panelW, top: 0 },
    ])
    .png()
    .toBuffer();
}

/** Tente de trouver un modèle *image-preview* accessible à la clé (v1beta). */
async function pickImagePreviewModel(apiKey: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) return null;

  const data = await res.json();
  const list: Array<{ name: string }> = data?.models ?? [];
  const hit = list.find((m) => /image-preview/i.test(m.name));

  // v1beta veut le nom sans le préfixe "models/"
  return hit ? hit.name.replace(/^models\//, '') : null;
}

/** Utilise la variable d’env si fournie, sinon autodétection, sinon valeur par défaut. */
async function resolveModelName(apiKey: string): Promise<string> {
  const fromEnv =
    process.env.GOOGLE_IMAGE_MODEL?.replace(/^models\//, '').trim();
  if (fromEnv) return fromEnv;

  const detected = await pickImagePreviewModel(apiKey);
  if (detected) return detected;

  // Valeur sûre courante côté preview :
  return 'gemini-2.5-flash-image-preview';
}

/** Appel API avec time-out (évite les loaders qui tournent indéfiniment). */
async function postJsonWithTimeout<T>(
  url: string,
  payload: unknown,
  ms = 60000
): Promise<{ ok: boolean; status: number; json?: T; text?: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify(payload),
    });

    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const json = (await resp.json()) as T;
      return { ok: resp.ok, status: resp.status, json };
    }
    const text = await resp.text();
    return { ok: resp.ok, status: resp.status, text };
  } finally {
    clearTimeout(t);
  }
}

/** Récupère l’image (inline_data/inlineData) et le texte éventuel d’un résultat. */
function extractImageFromCandidates(data: any): {
  imageB64?: string;
  mime?: string;
  text?: string;
} {
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const imgPart =
    parts.find((p) => p?.inline_data) ?? parts.find((p) => p?.inlineData);
  const txtPart = parts.find((p) => typeof p?.text === 'string');

  const mime =
    imgPart?.inline_data?.mime_type ??
    imgPart?.inlineData?.mimeType ??
    undefined;
  const imageB64 =
    imgPart?.inline_data?.data ?? imgPart?.inlineData?.data ?? undefined;

  return { imageB64, mime, text: txtPart?.text };
}

/* =========================================================
   Action principale
   ========================================================= */

export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { error: 'Missing GOOGLE_GENAI_API_KEY / GOOGLE_API_KEY' };

  try {
    // 1) Télécharge les 2 images
    const [{ buf: buf1 }, { buf: buf2 }] = await Promise.all([
      fetchImage(input.image1Uri),
      fetchImage(input.image2Uri),
    ]);

    // 2) Fabrique un collage PNG 16:9
    const collagePng = await makeSideBySideCollagePNG(buf1, buf2);
    const collageB64 = collagePng.toString('base64');

    // 3) Choix du modèle image-preview (v1beta)
    const model = await resolveModelName(apiKey);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 4) Prompt prudent (évite les refus “identité”) + une seule image en entrée
    const prompt =
      'Create one new 16:9 photorealistic image (American shot). ' +
      'Use the provided collage only as *inspiration* for two generic people: ' +
      'the left person is inspired by the collage left side and the right person by the right side. ' +
      'Do not reproduce any unique identity; generate an original scene with two generic people. ' +
      'Place them side-by-side on a simple neutral background with consistent lighting and color grading.';

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: 'image/png', data: collageB64 } }, // v1beta = snake_case
            { text: prompt },
          ],
        },
      ],
      // Pas de generation_config exotique : les modèles image-preview renvoient l’image en inline_data.
    };

    // 5) Appel API (timeout 60s pour éviter les loaders infinis)
    const res = await postJsonWithTimeout<any>(url, payload, 60000);
    if (!res.ok) {
      const body = res.text ?? JSON.stringify(res.json ?? {}, null, 2);
      return { error: `API ${res.status}: ${body}` };
    }

    // 6) Extraction de l’image
    const { imageB64, mime, text } = extractImageFromCandidates(res.json);

    if (!imageB64) {
      // Trace serveur utile pour débogage
      console.error(
        '[FUSE_FACES] No image in response. Full response:',
        JSON.stringify(res.json)
      );

      // Cas fréquents : refus Safety, “I can only work with one image”, etc.
      const tail =
        text?.trim()
          ? ` Model said: ${text.trim()}`
          : '';
      return { error: `No image in response.${tail}` };
    }

    const contentType = mime || 'image/png';
    return { fusedImageUri: `data:${contentType};base64,${imageB64}` };
  } catch (e: any) {
    console.error('[FUSE_FACES] Unexpected error:', e);
    return { error: e?.message ?? 'Unknown error' };
  }
}
