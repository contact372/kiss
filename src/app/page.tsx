
'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getApiKey, decrementCreditsAction } from './actions';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, ArrowLeft, Download } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import SubscriptionDialog from '@/components/app/subscription-dialog';
import { useAuth } from '@/contexts/auth-context';
import ImageUploader from '@/components/app/image-uploader';


type AppState = 'form' | 'loading' | 'result';
type LoadingReason = 'generating' | 'configuring';

/**
 * Combines two images from data URIs into a single horizontal image.
 * @param image1DataUri The data URI of the first image.
 * @param image2DataUri The data URI of the second image.
 * @returns A promise that resolves with the data URI of the combined image.
 */
async function combineImages(image1DataUri: string, image2DataUri: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error('Could not get canvas context'));
        }

        const img1 = new Image();
        const img2 = new Image();

        let loadedImages = 0;
        const onImageLoad = () => {
            loadedImages++;
            if (loadedImages === 2) {
                const targetHeight = 576;
                const img1Ratio = targetHeight / img1.height;
                const img1Width = img1.width * img1Ratio;
                
                const img2Ratio = targetHeight / img2.height;
                const img2Width = img2.width * img2Ratio;

                canvas.width = img1Width + img2Width;
                canvas.height = targetHeight;

                ctx.drawImage(img1, 0, 0, img1Width, targetHeight);
                ctx.drawImage(img2, img1Width, 0, img2Width, targetHeight);
                
                resolve(canvas.toDataURL('image/jpeg'));
            }
        };
        
        img1.onload = onImageLoad;
        img2.onload = onImageLoad;
        img1.onerror = (e) => reject(new Error("Image 1 failed to load."));
        img2.onerror = (e) => reject(new Error("Image 2 failed to load."));
        
        img1.src = image1DataUri;
        img2.src = image2DataUri;
    });
}

// Client-side polling function
async function pollForVideo(taskId: string, apiKey: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 2 minutes (60 * 2s)
    const interval = 2000; // 2 seconds

    while (attempts < maxAttempts) {
        try {
            console.log(`[POLLO_CLIENT] Polling attempt ${attempts + 1}/${maxAttempts} for task: ${taskId}`);
            const statusResponse = await fetch(`https://api.pollo.ai/v1/task/${taskId}`, {
                method: 'GET',
                headers: { 'x-api-key': apiKey },
            });

            if (!statusResponse.ok) {
                throw new Error(`Polling failed with status: ${statusResponse.status}`);
            }

            const statusData = await statusResponse.json();
            
            if (statusData.status === 'completed') {
                console.log('[POLLO_CLIENT] Task completed!', statusData);
                return statusData.output.video_url;
            } else if (statusData.status === 'failed') {
                throw new Error('Video generation failed on Pollo.ai.');
            }
            // If status is 'processing' or 'pending', continue polling
        } catch (error) {
            console.error('[POLLO_CLIENT_ERROR] Polling error:', error);
            throw error; // Propagate error to stop the process
        }

        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
    }

    throw new Error('Video generation timed out.');
}

async function generateVideoClientSide(combinedImageUri: string): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API key is not available.');
  }

  try {
    console.log('[POLLO_CLIENT] Starting task creation...');
    const startResponse = await fetch('https://api.pollo.ai/v1/run/kling', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        prompt: 'make the two people in the image kiss passionately, 4k, cinematic, high quality',
        image_url: combinedImageUri,
        negative_prompt: 'ugly, disfigured, low quality, blurry',
        fps: 24,
        motion: 3,
      }),
    });

    if (!startResponse.ok) {
        const errorBody = await startResponse.text();
        console.error('[POLLO_CLIENT_ERROR] Failed to start task:', errorBody);
        throw new Error(`Failed to start video generation: ${startResponse.statusText}`);
    }
    
    const startData = await startResponse.json();
    const taskId = startData.task_id;

    if (!taskId) {
        throw new Error("Pollo.ai did not return a task ID.");
    }
    console.log(`[POLLO_CLIENT] Task created with ID: ${taskId}. Starting to poll.`);

    return await pollForVideo(taskId, apiKey);

  } catch (error) {
    console.error('[POLLO_CLIENT_FATAL] Error in generateVideoClientSide:', error);
    throw error;
  }
}

function PageContent() {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('form');
  const [loadingReason, setLoadingReason] = useState<LoadingReason>('generating');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  const { toast } = useToast();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const startLoadingAnimation = (reason: LoadingReason = 'generating', duration: number = 120000) => { // 2 minutes
    setLoadingReason(reason);
    setAppState('loading');
    setProgress(0);
    
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    if (duration <= 0) {
        setProgress(100);
        return;
    }

    const updateInterval = 100; // ms
    const increment = 100 / (duration / updateInterval);
    
    progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
            const newProgress = prev + increment;
            if (newProgress >= 95) { 
                 if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                 return 95;
            }
            return newProgress;
        });
    }, updateInterval);
  };
  
  const handleGenerationResult = useCallback(async (result: { videoUrl?: string; error?: string }) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setProgress(100);

    if (result.error) {
        setAppState('form');
        toast({
            variant: 'destructive',
            title: 'Video Generation Failed',
            description: result.error,
            duration: 9000,
        });
    } else if (result.videoUrl) {
        setVideoUrl(result.videoUrl);
        setAppState('result');
        if (user) {
            await decrementCreditsAction(user.uid);
            await refreshUserProfile();
        }
    }
  }, [toast, refreshUserProfile, user]);
  
  const startRealGeneration = useCallback(async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to start generation.' });
        setIsSubDialogOpen(true);
        return;
    }
    
    if (!image1 || !image2) {
        toast({ variant: 'destructive', title: 'Missing Photos', description: 'Please upload both photos to continue.'});
        return;
    }
    
    if (!userProfile || (!userProfile.isSubscribed && userProfile.credits <= 0)) {
        toast({ variant: 'destructive', title: 'No Credits', description: 'Please subscribe to generate videos.'});
        setIsSubDialogOpen(true);
        return;
    }
    
    startLoadingAnimation('generating'); 

    try {
        const combinedImageUri = await combineImages(image1, image2);
        const generatedVideoUrl = await generateVideoClientSide(combinedImageUri);
        await handleGenerationResult({ videoUrl: generatedVideoUrl });
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setAppState('form');
        toast({
            variant: 'destructive',
            title: 'Error',
            description: message,
        });
    }

  }, [user, userProfile, toast, handleGenerationResult, image1, image2]);
  
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handleGenerate = () => {
    if (!user) {
      setIsSubDialogOpen(true);
      return;
    }
    startRealGeneration();
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = 'eternal-kiss.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setAppState('form');
    setVideoUrl(null);
    setImage1(null);
    setImage2(null);
    setProgress(0);
    setLoadingReason('generating');
  };

  if (authLoading && !user) {
     return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  const renderLoadingState = () => {
      let title = 'Creating your video...';
      let description = "This can take up to 2 minutes. Please don't close this page.";
      
      if(loadingReason === 'configuring') {
          title = 'Finalising your account...';
          description = "This can take up to a minute. Please don't close this page.";
      }

      return (
        <div className="flex flex-col items-center justify-center gap-6 text-center w-full max-w-md">
            <Loader2 className="h-12 w-12 animate-spin text-pink-500" />
            <div className="w-full space-y-2">
                <h2 className="text-2xl font-semibold font-headline">
                  {title}
                </h2>
                <p className="text-muted-foreground">
                    {description}
                </p>
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="w-full" showShimmer={true} />
                  <span className="text-sm font-medium text-muted-foreground w-10 text-right">{Math.round(progress)}%</span>
                </div>
            </div>
        </div>
      );
  };

  const renderResultState = () => (
     <Card className="w-full overflow-hidden shadow-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
        <CardHeader className="text-center p-6">
            <CardTitle className="text-3xl font-headline bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              Your Kiss is Ready!
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Here is your moment of magic.
            </CardDescription>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <div className="relative rounded-lg overflow-hidden border-4 border-white shadow-lg aspect-video">
              {videoUrl ? (
                  <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
              ) : null}
          </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={handleReset} className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Create Another
        </Button>
        {videoUrl && (
          <Button onClick={handleDownload} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white">
              <Download className="mr-2 h-4 w-4" />
              Download Video
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <>
      <SubscriptionDialog
        open={isSubDialogOpen}
        onOpenChange={setIsSubDialogOpen}
       />
     
      <main className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-xl mx-auto">
            {appState === 'form' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-5xl font-extrabold tracking-tighter bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                    Kiss your crush with AI
                  </h2>
                </div>

                <ImageUploader image1={image1} setImage1={setImage1} image2={image2} setImage2={setImage2} />
                
                <div className="space-y-3">
                  <Button
                    onClick={handleGenerate}
                    disabled={(appState === 'loading') || !image1 || !image2}
                    size="lg"
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white disabled:opacity-75"
                  >
                     {appState === 'loading' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                    {appState === 'loading' ? 'Generating...' : 'Generate Kiss Video'}
                  </Button>
                </div>
              </div>
            )}

            {appState === 'loading' && renderLoadingState()}
            {appState === 'result' && renderResultState()}
          </div>
        </main>
    </>
  );
}

export default function Home() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <PageContent />
        </Suspense>
    );
}
