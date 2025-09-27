'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from './ImageUploader';
import { createKissVideoAction } from '@/app/actions';
import { useAuth } from '@/context/AuthContext';
import { doc } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/firebase';
import { Progress } from "@/components/ui/progress";

export function KissGenerator() {
    const { currentUser, userProfile } = useAuth();
    const [image1, setImage1] = useState<string | null>(null);
    const [image2, setImage2] = useState<string | null>(null);
    const [generationId, setGenerationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const docRef = generationId ? doc(db, 'videoGenerations', generationId) : null;
    const [videoDoc, isDocLoading, docError] = useDocumentData(docRef);

    useEffect(() => {
        if (isLoading) {
            const totalDuration = 40000; // 40 seconds
            const updateInterval = 100; // ms
            const increment = 95 / (totalDuration / updateInterval);

            intervalRef.current = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 95) {
                        if (intervalRef.current) clearInterval(intervalRef.current);
                        return 95;
                    }
                    return prev + increment;
                });
            }, updateInterval);
        } else {
            setProgress(0);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isLoading]);

    useEffect(() => {
        if (docError) {
            setError(`Error listening to video document: ${docError.message}`);
            setIsLoading(false);
        }

        if (videoDoc) {
            setProgressMessage(videoDoc.status);
            switch (videoDoc.status) {
                case 'pending':
                    // Progress is handled by the timer
                    break;
                case 'processing':
                    // Progress is handled by the timer
                    break;
                case 'succeed':
                    setProgress(100);
                    setIsLoading(false);
                    if (videoRef.current && videoDoc.videoUrl) {
                        videoRef.current.src = videoDoc.videoUrl;
                    }
                    break;
                case 'failed':
                    setError(videoDoc.error || 'Generation failed for an unknown reason.');
                    setIsLoading(false);
                    setProgress(0);
                    break;
            }
        }
    }, [videoDoc, docError]);

    const handleGenerateClick = async () => {
        if (!image1 || !image2 || !currentUser) {
            setError("Please upload both images and ensure you are logged in.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGenerationId(null);
        setProgressMessage('Starting generation...');

        const result = await createKissVideoAction({
            userId: currentUser.uid,
            image1DataUri: image1,
            image2_data_uri: image2,
        });

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
            setProgress(0);
        } else if (result.generationId) {
            setProgressMessage('Task submitted, waiting for AI...');
            setGenerationId(result.generationId);
        }
    };
    
    const canGenerate = image1 && image2 && !isLoading;

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
                <CardTitle>Create Your Eternal Kiss</CardTitle>
                <CardDescription>Upload two photos to see them combined and animated in a passionate kiss.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUploader onImageUpload={setImage1} title="Person 1" />
                    <ImageUploader onImageUpload={setImage2} title="Person 2" />
                </div>
                {isLoading && (
                    <div className="space-y-2">
                        <Progress value={progress} />
                        <p className="text-sm text-center text-gray-500">{progressMessage || `Generating... ${progress.toFixed(0)}%`}</p>
                    </div>
                )}

                {videoDoc?.videoUrl && videoDoc.status === 'succeed' && (
                     <div className="mt-4">
                        <h3 className="text-lg font-semibold text-center mb-2">Your Video is Ready!</h3>
                        <video ref={videoRef} controls autoPlay muted loop className="w-full rounded-lg">
                            <source src={videoDoc.videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col items-center">
                 <Button onClick={handleGenerateClick} disabled={!canGenerate} className="w-full">
                    {isLoading ? 'Generating...' : 'Generate Kiss Video'}
                </Button>
                {userProfile && (
                    <p className="text-xs text-gray-500 mt-2">
                        {userProfile.isSubscribed ? 'Unlimited Generations' : `${userProfile.credits || 0} credits remaining`}
                    </p>
                )}
            </CardFooter>
        </Card>
    );
}
