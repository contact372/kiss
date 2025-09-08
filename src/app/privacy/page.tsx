'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

export default function PrivacyPage() {
    return (
        <main className="container mx-auto p-4 sm:p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <p>Your privacy is important to us. It is Eternal Kiss's policy to respect your privacy regarding any information we may collect from you across our website.</p>

                    <h2 className="text-xl font-semibold text-foreground pt-4">1. Information We Collect</h2>
                    <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We collect the following information:</p>
                    <ul>
                        <li><strong>Account Information:</strong> When you create an account, we collect your email address and authentication details.</li>
                        <li><strong>Uploaded Images:</strong> We temporarily store the images you upload to process your video generation request.</li>
                        <li><strong>Payment Information:</strong> All payments are handled by our third-party payment processor, Whop. We do not store your full credit card information. We only receive a confirmation of your subscription status.</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-foreground pt-4">2. How We Use Your Information</h2>
                    <p>We use the information we collect to:</p>
                    <ul>
                        <li>Provide, operate, and maintain our services.</li>
                        <li>Process your video generation requests.</li>
                        <li>Manage your account and subscription.</li>
                        <li>Communicate with you, including for customer service.</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-foreground pt-4">3. Data Storage and Deletion</h2>
                    <p>Images you upload are sent to our AI service provider (Google Gemini/Veo) for processing. We do not permanently store your uploaded images or the generated videos on our servers. They are handled ephemerally for the duration of the generation process.</p>
                    <p>Your account information is stored as long as your account is active.</p>
                    
                    <h2 className="text-xl font-semibold text-foreground pt-4">4. Third-Party Services</h2>
                    <p>We use third-party services for AI processing (Google) and payments (Whop). We encourage you to review their privacy policies.</p>

                    <h2 className="text-xl font-semibold text-foreground pt-4">5. Your Rights</h2>
                    <p>You are free to refuse our request for your personal information, with the understanding that we may be unable to provide you with some of your desired services.</p>

                    <h2 className="text-xl font-semibold text-foreground pt-4">6. Changes to This Policy</h2>
                    <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
                    
                    <p className="pt-6">Last updated: July 31, 2024</p>
                </CardContent>
            </Card>
        </main>
    )
}
