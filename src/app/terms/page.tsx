'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

export default function TermsPage() {
    return (
        <main className="container mx-auto p-4 sm:p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <p>Welcome to Eternal Kiss!</p>
                    <p>These terms and conditions outline the rules and regulations for the use of our website and services.</p>

                    <h2 className="text-xl font-semibold text-foreground pt-4">1. Acceptance of Terms</h2>
                    <p>By accessing this website, we assume you accept these terms and conditions. Do not continue to use Eternal Kiss if you do not agree to all of the terms and conditions stated on this page.</p>

                    <h2 className="text-xl font-semibold text-foreground pt-4">2. Subscription and Credits</h2>
                    <p>Our service requires a paid subscription to generate videos. Upon successful payment via our third-party payment processor (Whop), your account will be credited with a specific number of video generation credits. These credits are non-refundable and are valid for the duration of your subscription period as stated at the time of purchase.</p>

                    <h2 className="text-xl font-semibold text-foreground pt-4">3. User Conduct</h2>
                    <p>You agree not to use the service for any unlawful purpose or any purpose prohibited under this clause. You agree not to use the service in any way that could damage the service, the servers, or the general business of Eternal Kiss.</p>
                    <p>You are prohibited from uploading any content that is illegal, defamatory, harassing, or otherwise objectionable.</p>
                    
                    <h2 className="text-xl font-semibold text-foreground pt-4">4. Intellectual Property</h2>
                    <p>You retain ownership of the images you upload. By using our service, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and modify the content solely for the purpose of generating the video for you.</p>
                    <p>The generated video is your property to use for personal, non-commercial purposes.</p>

                    <h2 className="text-xl font-semibold text-foreground pt-4">5. Disclaimer</h2>
                    <p>Our service is provided "as is," and we make no express or implied warranties of any kind. The AI generation process is complex and may not always produce the expected results. We are not responsible for the final output of the video generation.</p>

                    <h2 className="text-xl font-semibold text-foreground pt-4">6. Changes to Terms</h2>
                    <p>We reserve the right to revise these terms at any time. By using this website, you are expected to review these terms on a regular basis.</p>

                    <p className="pt-6">Last updated: July 31, 2024</p>
                </CardContent>
            </Card>
        </main>
    )
}
