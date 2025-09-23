'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/db';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Repeat } from 'lucide-react';

type VideoDoc = {
  status: 'pending' | 'processing' | 'succeed' | 'failed' | string;
  videoUrl?: string;
  webhookPayload?: {
    generations?: Array<{ url?: string }>;
    status?: string;
  };
  error?: string;
};

interface KissGeneratorProps {
  generationId: string | null;
  sourceImageUri: string | null;
  onReset: () => void;
}

export default function KissGenerator({ generationId, sourceImageUri, onReset }: KissGeneratorProps) {
  const [videoDoc, setVideoDoc] = useState<VideoDoc | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // -------- 1) Connect the Firestore listener, ONLY responsible for setVideoDoc ----------
  useEffect(() => {
    if (!generationId) {
      setVideoDoc(null);
      setProgress(0);
      setError(null);
      return;
    }

    const ref = doc(db, 'videoGenerations', generationId);
    console.log(`[CLIENT] Listening: videoGenerations/${generationId}`);

    const unsub = onSnapshot(
      ref,
      { includeMetadataChanges: true }, // <— Important to fight cache effects
      snap => {
        if (!snap.exists()) {
          console.warn('[CLIENT] Doc not found (yet).');
          return;
        }
        const data = snap.data() as VideoDoc;
        console.log('[CLIENT] Snapshot data:', data);
        setVideoDoc(data);
      },
      err => {
        console.error('[CLIENT] onSnapshot error:', err);
        setError('Realtime listener error.');
      }
    );

    return () => {
      console.log(`[CLIENT] Unsubscribe: videoGenerations/${generationId}`);
      unsub();
    };
  }, [generationId]);

  // -------- Helper: derive the reliable video URL (with fallback) ------------
  const derivedVideoUrl = useMemo(() => {
    if (!videoDoc) return undefined;
    return (
      videoDoc.videoUrl ||
      videoDoc.webhookPayload?.generations?.[0]?.url ||
      undefined
    );
  }, [videoDoc]);

  // -------- 2) React to changes in `videoDoc` and drive the UI ----------- 
  useEffect(() => {
    if (!generationId) return;

    if (!videoDoc) {
      // Just launched
      setProgress(10);
      setError(null);
      return;
    }

    switch (videoDoc.status) {
      case 'pending':
        setProgress(25);
        break;
      case 'processing':
        setProgress(75);
        break;
      case 'succeed': {
        setProgress(100);
        // At this point, the render has occurred -> the <video> element exists
        const url = derivedVideoUrl;
        if (videoRef.current && url) {
          if (videoRef.current.src !== url) {
            console.log('[CLIENT] Setting video src:', url);
            videoRef.current.src = url;
          }
          videoRef.current
            .play()
            .catch(e => console.warn('[CLIENT] Autoplay prevented:', e));
        } else if (!url) {
          console.error('[CLIENT] SUCCEED without videoUrl.');
          setError('Video generated but URL is missing.');
        }
        break;
      }
      case 'failed':
        setProgress(100);
        setError(videoDoc.error || 'Video generation failed.');
        break;
      default:
        console.log('[CLIENT] Unknown status:', videoDoc.status);
        break;
    }
  }, [videoDoc, generationId, derivedVideoUrl]);

  // -------- 3) Watchdog: if stuck at 99% for > 10s, force a getDoc ------
  useEffect(() => {
    if (!generationId || progress < 75 || progress === 100) return;

    let cancelled = false;
    const handle = setTimeout(async () => {
      if (cancelled) return;
      try {
        console.log('[CLIENT] Watchdog: refetching doc from server...');
        const ref = doc(db, 'videoGenerations', generationId);
        const snap = await getDoc(ref); // Force a one-time read
        if (snap.exists()) {
          const data = snap.data() as VideoDoc;
          console.log('[CLIENT] Watchdog fetched:', data);
          setVideoDoc(data);
        }
      } catch (e) {
        console.error('[CLIENT] Watchdog getDoc error:', e);
      }
    }, 10_000);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [progress, generationId]);

  // -------- 4) Download Handler ----------
  const handleDownload = () => {
    const url = derivedVideoUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiss-video-${generationId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isLoading = progress > 0 && progress < 100;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
          {videoDoc?.status === 'succeed' && derivedVideoUrl ? (
            <video
              ref={videoRef}
              controls
              playsInline
              autoPlay
              className="w-full h-full object-contain"
              onLoadedData={() => console.log('[CLIENT] Video loaded.')}
              onError={(e) => console.error('[CLIENT] <video> error', e)}
            />
          ) : (
            <img
              src={sourceImageUri || ''}
              alt="Fused"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {isLoading && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Generating your video… {progress}%
            </p>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {error && (
          <div className="mt-4 text-center p-3 bg-destructive/10 rounded-md">
            <p className="text-sm font-medium text-destructive">
              Video Generation Failed
            </p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        )}

        {videoDoc?.status === 'succeed' && derivedVideoUrl && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={onReset} variant="outline">
              <Repeat className="mr-2 h-4 w-4" />
              Create New
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
