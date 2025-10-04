
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
      return new NextResponse(JSON.stringify({ message: 'Missing video URL' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Valider que l'URL est bien celle de notre CDN pour la sécurité
    if (!videoUrl.startsWith('https://videocdn.pollo.ai/')) {
      return new NextResponse(JSON.stringify({ message: 'Invalid video URL' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Fetch la vidéo depuis le CDN. Ceci est un appel de serveur à serveur, donc pas de CORS.
    const videoResponse = await fetch(videoUrl);

    if (!videoResponse.ok) {
      return new NextResponse(JSON.stringify({ message: 'Failed to fetch video from CDN' }), { status: videoResponse.status, headers: { 'Content-Type': 'application/json' } });
    }

    // Récupérer le corps de la réponse comme un ReadableStream
    const videoStream = videoResponse.body;

    // Renvoyer le flux vidéo directement au client
    return new NextResponse(videoStream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="eternal-kiss.mp4"',
      },
    });

  } catch (error) {
    console.error('[API/download-video] Error:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
