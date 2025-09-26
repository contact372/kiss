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
 * Creates a side-by-side 16:9 collage from two image buffers, with intelligent cropping and orientation correction.
 */
async function makeSideBySideCollage(leftBuf: Buffer, rightBuf: Buffer): Promise<Buffer> {
  const TARGET_W = 1280; // Target 16:9 width
  const TARGET_H = 720;  // Target 16:9 height
  const PANEL_W = Math.floor(TARGET_W / 2);

  // Process left image: auto-rotate and crop to the most interesting area (attention).
  const leftPanel = await sharp(leftBuf)
    .rotate() // Automatically corrects orientation based on EXIF data
    .resize(PANEL_W, TARGET_H, {
      fit: 'cover',
      position: sharp.strategy.attention, // Focus on the most salient region
    })
    .toBuffer();

  // Process right image similarly.
  const rightPanel = await sharp(rightBuf)
    .rotate()
    .resize(PANEL_W, TARGET_H, {
      fit: 'cover',
      position: sharp.strategy.attention,
    })
    .toBuffer();

  // Composite the two processed panels into a single 16:9 image.
  return sharp({
    create: {
      width: TARGET_W,
      height: TARGET_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: leftPanel, left: 0, top: 0 },
      { input: rightPanel, left: PANEL_W, top: 0 },
    ])
    .png()
    .toBuffer();
}

/**
 * Main flow function: takes two images and creates a fused collage to be sent to the video generator.
 */
export async function fuseFaces(input: FuseFacesInput): Promise<FuseFacesOutput> {
  console.log('[FUSE_FACES_FLOW] Starting image fusion.');

  try {
    const { buf: buf1, mime } = dataUriToBuffer(input.image1Uri);
    const { buf: buf2 } = dataUriToBuffer(input.image2Uri);

    console.log('[FUSE_FACES_FLOW] Creating side-by-side collage with intelligent cropping.');
    const collageBuffer = await makeSideBySideCollage(buf1, buf2);
    const collageB64 = collageBuffer.toString('base64');

    console.log('[FUSE_FACES_FLOW] Image fusion successful.');
    return { fusedImageUri: `data:${mime || 'image/png'};base64,${collageB64}` };

  } catch (err: any) {
    console.error('[FUSE_FACES_ERROR] An unexpected error occurred:', err);
    return { error: err.message || 'An unknown error occurred during image fusion.' };
  }
}
