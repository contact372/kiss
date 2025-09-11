
'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import ImageUploader from '@/components/app/image-uploader';
import { createKissVideoAction } from './actions';
import type { CreateKissVideoActionInput } from './actions';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, ArrowLeft, Eye, Download } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import SubscriptionDialog from '@/components/app/subscription-dialog';
import { useAuth } from '@/contexts/auth-context';
import { grantPaidAccessClient } from '@/lib/firebase/db';

type AppState = 'form' | 'loading' | 'result' | 'teaser';
type LoadingReason = 'generating' | 'teaser' | 'configuring';

function PageContent() {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appState, setAppState] = useState<AppState>('form');
  const [loadingReason, setLoadingReason] = useState<LoadingReason>('generating');
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  const { toast } = useToast();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const saveStateToSession = useCallback(() => {
    try {
        if (image1 && image2) {
            const stateToSave = { image1, image2 };
            sessionStorage.setItem('preLoginState', JSON.stringify(stateToSave));
        }
    } catch (e) {
        console.error("Failed to save state to session storage", e);
    }
  }, [image1, image2]);

  const restoreStateFromSession = useCallback(() => {
    try {
      const savedState = sessionStorage.getItem('preLoginState');
      if (savedState) {
        const { image1: savedImage1, image2: savedImage2 } = JSON.parse(savedState);
        if (savedImage1) setImage1(savedImage1);
        if (savedImage2) setImage2(savedImage2);
        return { restoredImage1: savedImage1, restoredImage2: savedImage2 };
      }
    } catch (e) {
      console.error("Failed to restore state from session storage", e);
    }
    return { restoredImage1: null, restoredImage2: null };
  }, []);

  const clearSessionState = useCallback(() => {
    try {
      sessionStorage.removeItem('preLoginState');
    } catch (e) {
      console.error("Failed to clear state from session storage", e);
    }
  }, []);
  
  const startLoadingAnimation = (reason: LoadingReason = 'generating', duration: number = 40000) => {
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
            if (newProgress >= 100) {
                 if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                 return 100;
            }
            return newProgress;
        });
    }, updateInterval);
  };
  
  const handleGenerationResult = useCallback(async (result: { videoDataUri?: string; sourceImageDataUri?: string; error?: string }) => {
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
    } else if (result.videoDataUri && result.sourceImageDataUri) {
        setVideoUrl(result.videoDataUri);
        setSourceImageUrl(result.sourceImageDataUri);
        setAppState('result');
    }
    await refreshUserProfile();
  }, [toast, refreshUserProfile]);
  
  const startRealGeneration = useCallback(async (img1?: string | null, img2?: string | null) => {
    const finalImage1 = img1 || image1;
    const finalImage2 = img2 || image2;
    
    if (!finalImage1 || !finalImage2 || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing required data to start generation.' });
        setAppState('form');
        return;
    }
    
    startLoadingAnimation('generating', 40000); 
    clearSessionState();

    const actionInput: CreateKissVideoActionInput = {
        userId: user.uid,
        image1DataUri: finalImage1,
        image2_data_uri: finalImage2,
    };
    
    const result = await createKissVideoAction(actionInput);
    await handleGenerationResult(result);
  }, [user, image1, image2, toast, handleGenerationResult, clearSessionState, startLoadingAnimation]);

  // Handles post-login teaser flow
  useEffect(() => {
    const startTeaserParam = searchParams.get('start_teaser');
    if (startTeaserParam !== 'true' || !user) return;
    
    const { restoredImage1, restoredImage2 } = restoreStateFromSession();
    if (!restoredImage1 || !restoredImage2) return;

    // Use a timeout to ensure userProfile is likely loaded after login redirect
    setTimeout(() => {
        if (userProfile && (userProfile.isSubscribed || userProfile.credits > 0)) {
            startRealGeneration(restoredImage1, restoredImage2);
        } else {
            handleTeaserFlow();
        }
    }, 500); // Small delay to allow auth context to update
    
    router.replace('/', { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, searchParams]);
  
  // This is the robust post-payment flow.
  useEffect(() => {
    const paid = searchParams.get('paid');
    if (!user || paid !== 'true') return;

    const handlePostPayment = async () => {
        // Set up the single loading screen immediately
        setLoadingReason('configuring');
        setAppState('loading');
        setProgress(0);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        
        try {
            const { restoredImage1, restoredImage2 } = restoreStateFromSession();

            // Step 1: Configure account (no progress bar movement)
            await grantPaidAccessClient(user.uid);
            await refreshUserProfile();
            toast({ variant: 'default', title: 'Account Upgraded!', description: 'Your account is now active. Starting video generation...' });
            
            if (!restoredImage1 || !restoredImage2) {
                toast({ title: 'Account Upgraded!', description: 'Please upload your images again to start.' });
                setAppState('form');
                return; // Exit if no images
            }
            
            // Step 2: Start real generation (this will start the progress bar)
            // We now pass the loading reason to startRealGeneration
            const finalImage1 = restoredImage1 || image1;
            const finalImage2 = restoredImage2 || image2;
            
            if (!finalImage1 || !finalImage2) {
                toast({ variant: 'destructive', title: 'Error', description: 'Missing required data to start generation.' });
                setAppState('form');
                return;
            }
            
            // Manually call the generation logic instead of startRealGeneration to keep the 'configuring' text
            startLoadingAnimation('configuring', 40000);
            clearSessionState();
        
            const actionInput: CreateKissVideoActionInput = {
                userId: user.uid,
                image1DataUri: finalImage1,
                image2_data_uri: finalImage2,
            };
            
            const result = await createKissVideoAction(actionInput);
            await handleGenerationResult(result);

        } catch (error) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
            console.error('[DEBUG] Failed during post-payment flow:', message);
            toast({ variant: 'destructive', title: 'Flow Failed', description: 'There was an issue with your request. Please contact support.' });
            setAppState('form');
        } finally {
            router.replace('/', { scroll: false });
        }
    };
    
    handlePostPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams]);

  useEffect(() => {
    setCanGenerate(!!(image1 && image2));
  }, [image1, image2]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handleTeaserFlow = () => {
    const teaserDuration = 8000;
    startLoadingAnimation('teaser', teaserDuration);

    const teaserTimeout = setTimeout(() => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setProgress(100);
        
        const teaserSourceImage = image2 || image1;
        setSourceImageUrl(teaserSourceImage);
        setAppState('teaser');
    }, teaserDuration);
    
    return () => clearTimeout(teaserTimeout);
  };

  const handleGenerate = () => {
    if (!canGenerate) {
      toast({ variant: 'destructive', title: 'Missing Images', description: 'Please upload all required images.' });
      return;
    }
    
    saveStateToSession();

    if (!user) {
        router.push('/login?tab=signup&start_teaser=true');
        return;
    }

    if (userProfile && (userProfile.isSubscribed || userProfile.credits > 0)) {
        startRealGeneration();
    } else {
        handleTeaserFlow();
    }
  };

  const handleSeeVideo = () => {
     saveStateToSession();
     if (!user) {
        router.push('/login?tab=signup&start_teaser=true');
        return;
     }
     setIsSubDialogOpen(true);
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
    setImage1(null);
    setImage2(null);
    setSourceImageUrl(null);
    setVideoUrl(null);
    setProgress(0);
    setLoadingReason('generating');
    clearSessionState();
    router.replace('/', { scroll: false });
  };

  if (authLoading && !user) {
     return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  const getButtonText = () => {
    if (appState === 'loading') return 'Generating...';
    return 'Generate Kiss';
  };

  const renderLoadingState = () => {
      let title = 'Creating your video...';
      let description = "This can take up to a minute. Please don't close this page.";

      if(loadingReason === 'teaser') {
          title = 'Creating your teaser...';
          description = "This will just take a moment. Please don't close this page.";
      }
      
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

  const renderTeaserState = () => (
    <Card className="w-full overflow-hidden shadow-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
      <CardHeader className="text-center p-6">
          <CardTitle className="text-3xl font-headline bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Your Kiss is Ready!
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Unlock your video to see the magic moment.
          </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="relative rounded-lg overflow-hidden border-4 border-white shadow-lg aspect-video">
            <Image
                src={sourceImageUrl || 'https://placehold.co/1280x720.png'}
                alt="Blurred preview of the generated video"
                width={1280}
                height={720}
                className="w-full h-full object-cover filter blur-lg scale-110"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Button onClick={handleSeeVideo} size="lg" className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm">
                    <Eye className="mr-2 h-5 w-5" />
                    See the Video
                </Button>
            </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
         <Button variant="outline" onClick={handleReset} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start Over
          </Button>
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
                    Kiss Your Crush with AI
                  </h2>
                </div>
                <ImageUploader
                  image1={image1}
                  setImage1={setImage1}
                  image2={image2}
                  setImage2={setImage2}
                />
                <div className="space-y-3">
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || (appState === 'loading')}
                    size="lg"
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white disabled:opacity-75"
                  >
                     {appState === 'loading' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                    {getButtonText()}
                  </Button>
                </div>
              </div>
            )}

            {appState === 'loading' && renderLoadingState()}
            {appState === 'result' && renderResultState()}
            {appState === 'teaser' && renderTeaserState()}

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

