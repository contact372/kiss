'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Repeat } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast'; // Importer le hook pour les notifications

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
  const { toast } = useToast(); // Initialiser le système de notification

  useEffect(() => {
    if (!generationId) {
      setVideoDoc(null);
      setProgress(0);
      setError(null);
      return;
    }

    const ref = doc(db, 'videoGenerations', generationId);
    const unsub = onSnapshot(ref, { includeMetadataChanges: true }, snap => {
      if (snap.exists()) {
        setVideoDoc(snap.data() as VideoDoc);
      }
    }, err => {
      console.error('[CLIENT] onSnapshot error:', err);
      setError('Realtime listener error.');
    });

    return () => unsub();
  }, [generationId]);

  const derivedVideoUrl = useMemo(() => {
    if (!videoDoc) return undefined;
    return videoDoc.videoUrl || videoDoc.webhookPayload?.generations?.[0]?.url || undefined;
  }, [videoDoc]);

  useEffect(() => {
    if (!generationId || !videoDoc) {
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
      case 'succeed':
        setProgress(100);
        if (videoRef.current && derivedVideoUrl && videoRef.current.src !== derivedVideoUrl) {
          videoRef.current.src = derivedVideoUrl;
          videoRef.current.play().catch(e => console.warn('[CLIENT] Autoplay prevented:', e));
        }
        break;
      case 'failed':
        setProgress(100);
        setError(videoDoc.error || 'Video generation failed.');
        break;
    }
  }, [videoDoc, generationId, derivedVideoUrl]);

  useEffect(() => {
    if (!generationId || progress < 75 || progress === 100) return;
    const handle = setTimeout(async () => {
      const ref = doc(db, 'videoGenerations', generationId);
      const snap = await getDoc(ref);
      if (snap.exists()) setVideoDoc(snap.data() as VideoDoc);
    }, 10_000);
    return () => clearTimeout(handle);
  }, [progress, generationId]);

  // --- Gestionnaire de téléchargement amélioré ---
  const handleDownload = async () => {
    const url = derivedVideoUrl;
    if (!url) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Video URL not found.",
      });
      return;
    }

    try {
      // On utilise notre propre API comme proxy, ce qui est beaucoup plus fiable
      const response = await fetch(`/api/download-video?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // On transforme la réponse en un objet local pour le navigateur
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      // On crée le lien de téléchargement avec cet objet local
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'eternal-kiss.mp4'; // Le nom du fichier est déjà défini par l'API, ceci est un fallback
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // On nettoie l'objet local créé
      window.URL.revokeObjectURL(objectUrl);

    } catch (err) {
      console.error("[CLIENT] Download Error:", err);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not download the video. Please try again or use a different browser.",
      });
    }
  };

  const isLoading = progress > 0 && progress < 100;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
          {videoDoc?.status === 'succeed' && derivedVideoUrl ? (
            <video ref={videoRef} controls playsInline autoPlay className="w-full h-full object-contain" />
          ) : (
            <img src={sourceImageUri || ''} alt="Fused" className="w-full h-full object-contain" />
          )}
        </div>

        {isLoading && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Generating your video… {progress}%</p>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {error && (
          <div className="mt-4 text-center p-3 bg-destructive/10 rounded-md">
            <p className="text-sm font-medium text-destructive">Video Generation Failed</p>
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
