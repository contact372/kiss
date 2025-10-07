'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createKissVideoAction } from './actions';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Eye, Download } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/firebase';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import KissGenerator from '@/components/app/KissGenerator';

// Types
type AppState = 'form' | 'loading' | 'result' | 'teaser';
type LoadingReason = 'generating' | 'teaser' | 'configuring';
interface CreateKissVideoActionInput { userId: string; image1DataUri: string; image2_data_uri: string; }
interface CreateKissVideoActionOutput { generationId?: string; error?: string; sourceImageUrl?: string; }

function PageContent() {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appState, setAppState] = useState<AppState>('form');
  const [loadingReason, setLoadingReason] = useState<LoadingReason>('generating');
  const [isDownloading, setIsDownloading] = useState(false);
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const firestoreUnsubscribeRef = useRef<Unsubscribe | null>(null);
  const postLoginFlowHandled = useRef(false); // Ref to prevent re-runs

  const saveStateToSession = useCallback(() => {
    try {
        if (image1 && image2) {
            sessionStorage.setItem('preLoginState', JSON.stringify({ image1, image2 }));
        }
    } catch (e) { console.error("Failed to save state", e); }
  }, [image1, image2]);

  const restoreStateFromSession = useCallback(() => {
    try {
      const savedState = sessionStorage.getItem('preLoginState');
      if (savedState) {
        const { image1: i1, image2: i2 } = JSON.parse(savedState);
        if (i1) setImage1(i1);
        if (i2) setImage2(i2);
        return { restoredImage1: i1, restoredImage2: i2 };
      }
    } catch (e) { console.error("Failed to restore state", e); }
    return { restoredImage1: null, restoredImage2: null };
  }, []);

  const clearSessionState = useCallback(() => {
    try {
      sessionStorage.removeItem('preLoginState');
    } catch (e) { console.error("Failed to clear state", e); }
  }, []);
  
  const startLoadingAnimation = useCallback((reason: LoadingReason = 'generating', duration: number = 69000) => {
    setLoadingReason(reason);
    setAppState('loading');
    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    if (duration <= 0) {
        setProgress(100);
        return;
    }

    const increment = 100 / (duration / 100);
    progressIntervalRef.current = setInterval(() => setProgress(p => Math.min(p + increment, 99)), 100);
  }, []);

  const stopLoading = useCallback(() => {
      if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
      }
      setProgress(100);
  }, []);

  const handleGenerationResult = useCallback((result: CreateKissVideoActionOutput) => {
    if (result.error) {
        stopLoading();
        setAppState('form');
        toast({ variant: 'destructive', title: 'Video Generation Failed', description: result.error, duration: 9000 });
        return;
    }

    if (result.generationId) {
        if (result.sourceImageUrl) {
            setSourceImageUrl(result.sourceImageUrl);
        }

        const unsub = onSnapshot(doc(db, "videoGenerations", result.generationId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                if (data.status === 'failed') {
                    stopLoading();
                    setAppState('form');
                    toast({ variant: 'destructive', title: 'Generation Failed', description: data.error || 'The AI failed to process the video.' });
                    if (firestoreUnsubscribeRef.current) firestoreUnsubscribeRef.current();
                    return;
                }

                if (data.videoUrl) {
                    stopLoading();
                    setVideoUrl(data.videoUrl);
                    setAppState('result');
                    if (firestoreUnsubscribeRef.current) firestoreUnsubscribeRef.current();
                    refreshUserProfile();
                }
            }
        }, (error) => {
            stopLoading();
            setAppState('form');
            toast({ variant: 'destructive', title: 'Error', description: 'Could not listen for video updates.'});
        });

        firestoreUnsubscribeRef.current = unsub;
    }
  }, [stopLoading, toast, refreshUserProfile]);
  
  const handleTeaserFlow = useCallback(() => {
    const teaserDuration = 8000;
    startLoadingAnimation('teaser', teaserDuration);

    const teaserTimeout = setTimeout(() => {
        stopLoading();
        setAppState('teaser');
    }, teaserDuration);

    return () => clearTimeout(teaserTimeout);
  }, [startLoadingAnimation, stopLoading]);

  const startRealGeneration = useCallback(async (img1?: string | null, img2?: string | null) => {
    const finalImage1 = img1 || image1;
    const finalImage2 = img2 || image2;
    
    if (!finalImage1 || !finalImage2 || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing data to start generation.' });
        return;
    }
    
    startLoadingAnimation('generating', 69000);
    clearSessionState();

    const result = await createKissVideoAction({
        userId: user.uid,
        image1DataUri: finalImage1,
        image2_data_uri: finalImage2,
    });
    
    handleGenerationResult(result);

  }, [user, image1, image2, toast, handleGenerationResult, clearSessionState, startLoadingAnimation]);

  // Cleanup effect for intervals and listeners
  useEffect(() => {
    return () => {
      if (firestoreUnsubscribeRef.current) firestoreUnsubscribeRef.current();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // *** MOBILE-FRIENDLY FIX ***: Handles the redirection flow after login/signup
  useEffect(() => {
    const startTeaserParam = searchParams.get('start_teaser');
    if (startTeaserParam !== 'true' || postLoginFlowHandled.current) {
        return;
    }

    // Conditions are NOT met, wait for the next render. Crucial for mobile.
    if (authLoading || !user || !userProfile) {
        return;
    }

    // --- All conditions are met, execute the logic ONCE ---
    postLoginFlowHandled.current = true;
    
    const { restoredImage1, restoredImage2 } = restoreStateFromSession();

    if (!restoredImage1 || !restoredImage2) {
        router.replace('/', { scroll: false });
        return;
    }

    if (userProfile.hasPaid || userProfile.credits > 0) {
        toast({ title: "Welcome back!", description: "Starting your video generation..." });
        startRealGeneration(restoredImage1, restoredImage2);
    } else {
        toast({ title: "Success! Logged in.", description: "Creating a short teaser for you..." });
        handleTeaserFlow();
    }
    
    router.replace('/', { scroll: false });

  }, [authLoading, user, userProfile, searchParams, router, clearSessionState, restoreStateFromSession, startRealGeneration, handleTeaserFlow, toast]);
  
  // Handles the flow after a successful payment
  useEffect(() => {
    const paid = searchParams.get('paid');
    if (!user || paid !== 'true') return;

    const handlePostPayment = async () => {
        startLoadingAnimation('configuring', 10000);
        
        try {
            const { restoredImage1, restoredImage2 } = restoreStateFromSession();
            const idToken = await user.getIdToken();

            const response = await fetch('/api/grant-access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Server responded with ${response.status}` }));
                throw new Error(errorData.message || 'Failed to grant paid access.');
            }

            await refreshUserProfile();
            
            if (!restoredImage1 || !restoredImage2) {
                toast({ title: 'Account Upgraded!', description: 'Please upload your images again to start.' });
                setAppState('form');
            } else {
                toast({ title: 'Account Upgraded!', description: 'Starting your video generation...' });
                startRealGeneration(restoredImage1, restoredImage2);
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
            toast({ variant: 'destructive', title: 'Payment Flow Failed', description: message });
            setAppState('form');
        } finally {
            clearSessionState();
            router.replace('/', { scroll: false });
        }
    };
    
    handlePostPayment();
  }, [user, searchParams, refreshUserProfile, restoreStateFromSession, clearSessionState, startRealGeneration, startLoadingAnimation, toast, router]);

  useEffect(() => {
    setCanGenerate(!!(image1 && image2));
  }, [image1, image2]);

  const handleGenerate = () => {
    if (!canGenerate) return;
    saveStateToSession();

    if (!user) {
        router.push('/login?tab=signup&start_teaser=true');
        return;
    }

    if (userProfile && (userProfile.hasPaid || userProfile.credits > 0)) {
        startRealGeneration();
    } else {
        handleTeaserFlow();
    }
  };

  const handleDownload = async () => {
     if (!videoUrl) return;
    setIsDownloading(true);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    try {
        const proxyUrl = `/api/download-video?url=${encodeURIComponent(videoUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);

        const blob = await response.blob();
        const file = new File([blob], "eternal-kiss.mp4", { type: "video/mp4" });

        if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Your Eternal Kiss' });
        } else {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'eternal-kiss.mp4';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error("Download or share failed:", error);
            toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not download the video.' });
        }
    } finally {
        setIsDownloading(false);
    }
  }

  const handleReset = () => {
    setAppState('form');
    setImage1(null); setImage2(null); setSourceImageUrl(null); setVideoUrl(null); setProgress(0); setLoadingReason('generating');
    clearSessionState();
    router.replace('/', { scroll: false });
  };

  const renderLoadingState = () => ( <div className="flex flex-col items-center justify-center gap-6 text-center w-full max-w-md"><Loader2 className="h-12 w-12 animate-spin text-pink-500" /><div className="w-full space-y-2"><h2 className="text-2xl font-semibold font-headline">{loadingReason === 'teaser' ? 'Creating your teaser...' : loadingReason === 'configuring' ? 'Finalising your account...' : 'Creating your video...'}</h2><p className="text-muted-foreground">{loadingReason === 'teaser' ? 'This will just take a moment.' : "This can take up to a minute. Please don't close this page."}</p><div className="flex items-center gap-2"><Progress value={progress} className="w-full" showShimmer={true} /><span className="text-sm font-medium text-muted-foreground w-10 text-right">{Math.round(progress)}%</span></div></div></div> );
  const renderResultState = () => ( <Card className="w-full overflow-hidden shadow-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-red-50"><CardHeader className="text-center p-6"><CardTitle className="text-3xl font-headline bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Your Kiss is Ready!</CardTitle><CardDescription className="text-muted-foreground">Here is your moment of magic.</CardDescription></CardHeader><CardContent className="p-4 pt-0"><div className="relative rounded-lg overflow-hidden border-4 border-white shadow-lg aspect-video">{videoUrl && <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />}</div></CardContent><CardFooter className="p-4 pt-0 flex flex-col sm:flex-row gap-3"><Button variant="outline" onClick={handleReset} className="w-full"><ArrowLeft className="mr-2 h-4 w-4" />Create Another</Button>{videoUrl && <Button onClick={handleDownload} disabled={isDownloading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"><Download className="mr-2 h-4 w-4" />{isDownloading ? 'Downloading...' : 'Download Video'}</Button>}</CardFooter></Card> );
  const renderTeaserState = () => ( <Card className="w-full overflow-hidden shadow-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-red-50"><CardHeader className="text-center p-6"><CardTitle className="text-3xl font-headline bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Your Kiss is Ready!</CardTitle><CardDescription className="text-muted-foreground">Unlock your video to see the magic moment.</CardDescription></CardHeader><CardContent className="p-4 pt-0"><div className="relative rounded-lg overflow-hidden border-4 border-white shadow-lg aspect-video"><div className="absolute inset-0 flex filter blur-lg scale-110">{image1 && (<img src={image1} alt="Preview 1" className="w-1/2 h-full object-cover" />)}{image2 && (<img src={image2} alt="Preview 2" className="w-1/2 h-full object-cover" />)}</div><div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Button onClick={() => router.push('/pricing')} size="lg" className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"><Eye className="mr-2 h-5 w-5" />See the Video</Button></div></div></CardContent><CardFooter className="p-4 pt-0"><Button variant="outline" onClick={handleReset} className="w-full"><ArrowLeft className="mr-2 h-4 w-4" />Start Over</Button></CardFooter></Card> );

  const renderFormState = () => (
    <div className="w-full max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-4 md:gap-16 items-center">
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <h1 className="text-[2.8rem] sm:text-6xl md:text-7xl font-extrabold tracking-tighter bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent flex flex-col leading-none">
                    <span>Kiss Your Crush</span>
                    <span>With AI</span>
                </h1>
                <div className="mt-6 w-full max-w-md aspect-video rounded-2xl overflow-hidden shadow-xl bg-black/5">
                    <video 
                        key={Date.now()} // Force re-render
                        src={`/demo.mp4?t=${Date.now()}`} // Cache-busting
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            <div className="md:mt-0 flex items-center">
                <KissGenerator 
                    image1={image1}
                    setImage1={setImage1}
                    image2={image2}
                    setImage2={setImage2}
                    onGenerate={handleGenerate}
                    isGenerating={appState === 'loading'}
                    canGenerate={canGenerate}
                />
            </div>
        </div>
    </div>
  );

  if (authLoading && !user) {
     return <div className="flex items-center justify-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <main className="flex-grow flex items-center justify-center p-4">
        {appState === 'form' && renderFormState()}
        {appState === 'loading' && <div className="w-full max-w-xl mx-auto">{renderLoadingState()}</div>}
        {appState === 'result' && <div className="w-full max-w-xl mx-auto">{renderResultState()}</div>}
        {appState === 'teaser' && <div className="w-full max-w-xl mx-auto">{renderTeaserState()}</div>}
    </main>
  );
}

export default function Home() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <PageContent />
        </Suspense>
    );
}
