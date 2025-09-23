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

  // Effect 1: Listen to Firestore and update the local state `videoDoc`
  useEffect(() => {
    if (!generationId) {
      return; // Do nothing if there's no ID
    }

    console.log(`[CLIENT] Starting Firestore listener for: videoGenerations/${generationId}`);
    const unsubscribe = onSnapshot(
      doc(db, 'videoGenerations', generationId),
      (docSnap) => {
        if (docSnap.exists()) {
          console.log('[CLIENT] Received Firestore update:', docSnap.data());
          setVideoDoc(docSnap.data()); // The ONLY job of this listener is to update the state
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

    // Cleanup function to stop listening when the component unmounts
    return () => {
      console.log(`[CLIENT] Stopping Firestore listener for: videoGenerations/${generationId}`);
      unsubscribe();
    };
  }, [generationId]);

  // Effect 2: React to changes in `videoDoc` state and update UI effects (progress bar, video player)
  useEffect(() => {
    // If there is no document data, set initial progress based on whether we have an ID
    if (!videoDoc) {
      setProgress(generationId ? 10 : 0);
      setError(null);
      return;
    }

    // Update progress and error state based on the document status
    switch (videoDoc.status) {
      case 'pending':
        setProgress(25);
        break;
      case 'processing':
        setProgress(75);
        break;
      case 'succeed':
        setProgress(100);
        // By the time this effect runs, the component has re-rendered and the <video> element exists.
        // It is now safe to access videoRef.current.
        if (videoRef.current && videoDoc.videoUrl) {
          console.log('[CLIENT] Status is SUCCEED. videoRef is available. Setting video src.', videoDoc.videoUrl);
          if (videoRef.current.src !== videoDoc.videoUrl) {
            videoRef.current.src = videoDoc.videoUrl;
          }
          // Attempt to play, but catch errors as autoplay can be blocked by browsers
          videoRef.current.play().catch(e => console.warn('[CLIENT] Autoplay was prevented by the browser.', e));
        } else if (!videoDoc.videoUrl) {
          console.error('[CLIENT] Status is SUCCEED but videoUrl field is missing in the document.');
          setError('Video has been generated, but its URL is missing.');
        }
        break;
      case 'failed':
        setProgress(100);
        setError(videoDoc.error || 'An unknown error occurred during video generation.');
        break;
      default:
        console.log(`[CLIENT] Received unknown status: ${videoDoc.status}`);
        break;
    }
  }, [videoDoc, generationId]); // This effect runs whenever videoDoc changes

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
              controls
              playsInline
              autoPlay // It's better to use the autoPlay attribute
              className="w-full h-full object-contain"
              onLoadedData={() => console.log('[CLIENT] Video data has been loaded into the player.')}
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
