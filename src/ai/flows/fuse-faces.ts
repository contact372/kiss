import { FuseFacesInput, FuseFacesOutput } from './types';
async function urlToBase64(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed ${url}: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get('content-type') || (url.endsWith('.jpg') || url.endsWith('.jpeg') ? 'image/jpeg' : 'image/png');
  return { b64: buf.toString('base64'), mime: ct };
}
export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { error: 'Missing GOOGLE_GENAI_API_KEY / GOOGLE_API_KEY' };
  try {
    const [img1, img2] = await Promise.all([urlToBase64(input.image1Uri), urlToBase64(input.image2Uri)]);
    // ⚠️ Utiliser v1beta + modèle image-preview
    const model = 'gemini-2.5-flash-image-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const prompt =
      'Create one 16:9 photorealistic image (American shot). ' +
      'Left = person from first photo, Right = person from second photo. ' +
      'Neutral background. Preserve facial likeness.';
    const payload = {
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: img1.mime, data: img1.b64 } }, // v1beta = snake_case
          { inline_data: { mime_type: img2.mime, data: img2.b64 } },
          { text: prompt }
        ]
      }]
      // ❌ PAS de generation_config.*
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.error("[FUSE_FACES_ERROR] API call failed:", body);
      return { error: `API ${resp.status}: ${body}` };
    }
    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inline_data);
    if (!imagePart) {
      const txt = parts.find((p: any) => p.text)?.text;
      console.error("[FUSE_FACES_ERROR] No image in API response. Text was:", txt);
      return { error: `No image in response (Gemini image preview). Text: ${txt ?? '—'}` };
    }
    const mime = imagePart.inline_data.mime_type || 'image/png';
    const b64 = imagePart.inline_data.data;
    return { fusedImageUri: `data:${mime};base64,${b64}` };
  
  } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(`[FUSE_FACES_ERROR] An unexpected error occurred: ${errorMessage}`);
      return { error: `An unexpected error occurred: ${errorMessage}` };
  }
}
