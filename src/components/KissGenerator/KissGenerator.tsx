
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/db';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Download, Repeat } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface KissGeneratorProps {
  generationId: string | null;
  sourceImageUri: string | null;
  onReset: () => void;
}

export default function KissGenerator({ generationId, sourceImageUri, onReset }: KissGeneratorProps) {
  const [videoDoc, setVideoDoc] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!generationId) {
      setProgress(0);
      setVideoDoc(null);
      setError(null);
      return;
    }

    setProgress(10); // Initial progress when generation starts
    setError(null);

    console.log(`[CLIENT] Starting to listen to document: videoGenerations/${generationId}`);

    const unsubscribe = onSnapshot(
      doc(db, 'videoGenerations', generationId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('[CLIENT] Received Firestore update:', data);
          setVideoDoc(data); // This is crucial for React to re-render with new data

          switch (data.status) {
            case 'pending':
              setProgress(25);
              break;
            case 'processing':
              setProgress(75);
              break;
            case 'succeed':
              console.log('[CLIENT] Status is \'succeed\'. Attempting to play video.');
              setProgress(100);
              if (videoRef.current && data.videoUrl) {
                console.log('[CLIENT] Video URL found. Setting src and playing.', data.videoUrl);
                videoRef.current.src = data.videoUrl;
                videoRef.current.play().catch(e => console.error("Autoplay failed:", e));
              } else {
                console.error('[CLIENT] Status is \'succeed\' but videoRef or videoUrl is missing.');
                setError('Video generated, but URL is missing.');
              }
              break;
            case 'failed':
              console.error('[CLIENT] Status is \'failed\'.', data.error);
              setProgress(100);
              setError(data.error || 'An unknown error occurred during video generation.');
              break;
            default:
              console.log(`[CLIENT] Received unknown status: ${data.status}`);
              break;
          }
        } else {
          console.error('[CLIENT] Document does not exist.');
          setError('The generation task could not be found.');
        }
      },
      (err) => {
        console.error('[CLIENT] Firestore snapshot listener error:', err);
        setError('Error connecting to the database for real-time updates.');
      }
    );

    // This is the cleanup function that runs when the component unmounts or generationId changes
    return () => {
      console.log(`[CLIENT] Stopping listener for document: videoGenerations/${generationId}`);
      unsubscribe();
    };
  }, [generationId]); // The effect re-runs ONLY when generationId changes

  const handleDownload = () => {
    if (videoDoc && videoDoc.videoUrl) {
      const a = document.createElement('a');
      a.href = videoDoc.videoUrl;
      a.download = `kiss-video-${generationId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const isLoading = progress > 0 && progress < 100;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
          {videoDoc?.status === 'succeed' && videoDoc.videoUrl ? (
            <video
              ref={videoRef}
              src={videoDoc.videoUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
              onLoadedData={() => console.log('[CLIENT] Video data loaded.')}
            />
          ) : (
            <img src={sourceImageUri || ''} alt="Fused faces" className="w-full h-full object-contain" />
          )}
        </div>
        
        {isLoading && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Generating your kiss... {progress}%</p>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {error && (
          <div className="mt-4 text-center p-3 bg-destructive/10 rounded-md">
            <p className="text-sm font-medium text-destructive">Video Generation Failed</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        )}

        {videoDoc?.status === 'succeed' && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={handleDownload}><Download className="mr-2 h-4 w-4"/>Download</Button>
            <Button onClick={onReset} variant="outline"><Repeat className="mr-2 h-4 w-4"/>Create New</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
