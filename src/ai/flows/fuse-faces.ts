'use server';

import sharp from 'sharp';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { FuseFacesInput, FuseFacesOutput } from './types';

const vision = new ImageAnnotatorClient();

function dataUriToBuffer(uri: string): { buf: Buffer; mime: string } {
  if (!uri.startsWith('data:')) throw new Error('Invalid data URI');
  const commaIdx = uri.indexOf(',');
  if (commaIdx === -1) throw new Error('Invalid data URI format');
  const meta = uri.substring(5, commaIdx);
  const data = uri.substring(commaIdx + 1);
  return { buf: Buffer.from(data, 'base64'), mime: meta.split(';')[0] || 'image/png' };
}

async function detectFace(imageBuffer: Buffer): Promise<{ boundingBox: { x: number; y: number; w: number; h: number }; rollAngle: number } | null> {
    console.log('[VISION_API] Detecting face...');
    const [res] = await vision.faceDetection({ image: { content: imageBuffer } });
    const annotations = res.faceAnnotations ?? [];

    if (annotations.length === 0) {
        console.warn('[VISION_API] No face detected.');
        return null;
    }
    
    const [annotation] = annotations;
    const v = annotation.fdBoundingPoly?.vertices ?? [];
    if (v.length === 0) return null;

    const xs = v.map(p => p.x ?? 0);
    const ys = v.map(p => p.y ?? 0);
    const minX = Math.max(0, Math.min(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const rollAngle = annotation.rollAngle ?? 0;

    console.log(`[VISION_API] Face detected at: x:${minX}, y:${minY}, w:${maxX - minX}, h:${maxY - minY} with roll angle: ${rollAngle}`);
    
    return {
        boundingBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
        rollAngle: rollAngle,
    };
}

async function cropToFace(
    imageBuffer: Buffer,
    detection: { boundingBox: { x: number; y: number; w: number; h: number }; rollAngle: number } | null
): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const { width: imgW = 0, height: imgH = 0 } = metadata;

    let cropArea: { left: number; top: number; width: number; height: number };

    if (detection) {
        const { x, y, w, h } = detection.boundingBox;
        const desiredSize = Math.round(Math.max(w, h) * 3.5);
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        // Clamp the crop size to the image dimensions to prevent out-of-bounds errors.
        const finalSize = Math.min(desiredSize, imgW, imgH);

        let left = Math.round(centerX - finalSize / 2);
        let top = Math.round(centerY - finalSize / 2);

        // Adjust position to ensure the crop area is within the image frame.
        if (left < 0) left = 0;
        if (top < 0) top = 0;
        if (left + finalSize > imgW) left = imgW - finalSize;
        if (top + finalSize > imgH) top = imgH - finalSize;

        cropArea = { left, top, width: finalSize, height: finalSize };
    } else {
        const size = Math.min(imgW, imgH);
        cropArea = { left: Math.round((imgW - size) / 2), top: Math.round((imgH - size) / 2), width: size, height: size };
    }

    let processedImage = image.extract(cropArea);

    if (detection && Math.abs(detection.rollAngle) > 90) {
        console.log(`[CROP_TO_FACE] Face appears upside down (roll angle: ${detection.rollAngle}). Forcing 180-degree rotation.`);
        processedImage = processedImage.rotate(180);
    }
    
    return processedImage.toBuffer();
}

async function makeSideBySideCollage(leftBuf: Buffer, rightBuf: Buffer): Promise<Buffer> {
    const TARGET_W = 1280;
    const TARGET_H = 720;
    const PANEL_W = Math.floor(TARGET_W / 2);

    const leftPanel = await sharp(leftBuf).resize(PANEL_W, TARGET_H, { fit: 'cover' }).toBuffer();
    const rightPanel = await sharp(rightBuf).resize(PANEL_W, TARGET_H, { fit: 'cover' }).toBuffer();

    return sharp({ create: { width: TARGET_W, height: TARGET_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
        .composite([
            { input: leftPanel, left: 0, top: 0 },
            { input: rightPanel, left: PANEL_W, top: 0 },
        ])
        .png()
        .toBuffer();
}

export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
    console.log('[FUSE_FACES_FLOW] Starting image fusion with Google Vision API.');
    try {
        const { buf: buf1, mime } = dataUriToBuffer(input.image1DataUri);
        const { buf: buf2 } = dataUriToBuffer(input.image2DataUri);

        const rotatedBuf1 = await sharp(buf1).rotate().toBuffer();
        const rotatedBuf2 = await sharp(buf2).rotate().toBuffer();

        const [detection1, detection2] = await Promise.all([
            detectFace(rotatedBuf1),
            detectFace(rotatedBuf2),
        ]);

        const [croppedBuf1, croppedBuf2] = await Promise.all([
            cropToFace(rotatedBuf1, detection1),
            cropToFace(rotatedBuf2, detection2),
        ]);

        console.log('[FUSE_FACES_FLOW] Creating side-by-side collage.');
        const collageBuffer = await makeSideBySideCollage(croppedBuf1, croppedBuf2);
        const collageB64 = collageBuffer.toString('base64');

        console.log('[FUSE_FACES_FLOW] Image fusion successful.');
        return { fusedImageUri: `data:${mime || 'image/png'};base64,${collageB64}` };

    } catch (err: any) {
        console.error('[FUSE_FACES_ERROR] An unexpected error occurred:', err.message || String(err));
        return { error: err.message || 'An unknown error occurred during image fusion.' };
    }
}
