'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from 'react';
import Link from 'next/link';

const PrivacyPage = () => {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto bg-card p-8 rounded-lg shadow-md">
                    <h1 className="text-3xl font-bold text-center text-primary mb-4">Privacy Policy</h1>
                    <p className="text-sm text-muted-foreground text-center mb-8">Last updated: October 2025</p>

                    <p className="mb-6">
                        Your privacy is important to us. This Privacy Policy explains how Akiss (“we,” “our,” or “us”) collects, uses, and protects your personal information when you use our website and AI-based video generation services.
                    </p>

                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">1. Information We Collect</h2>
                            <p className="mb-3">We collect only the information necessary to provide and improve our services, always with your knowledge and consent.</p>
                            <ul className="list-disc list-inside space-y-2 pl-4">
                                <li><strong>Account Information:</strong> When you create an account, we collect your email address and authentication details.</li>
                                <li><strong>Uploaded Images:</strong> Images uploaded for video generation are temporarily stored and processed through our AI system.</li>
                                <li><strong>Payment Information:</strong> All payments are handled securely by our third-party provider, Whop. We never store your full payment details—only your subscription status and transaction confirmation.</li>
                                <li><strong>Technical Data:</strong> For security and analytics, we may collect anonymized logs (e.g., IP address, device type, browser version) through our hosting and analytics providers.</li>
                            </ul>
                            <p className="text-sm text-muted-foreground mt-3"><strong>Legal basis for processing:</strong> Data is processed under Article 6(1)(b) of the GDPR (performance of a contract) and, where applicable, Article 6(1)(a) (your consent).</p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">2. How We Use Your Information</h2>
                            <p className="mb-3">We use the information we collect to:</p>
                            <ul className="list-disc list-inside space-y-2 pl-4">
                                <li>Provide, maintain, and improve our services.</li>
                                <li>Process your video generation requests.</li>
                                <li>Manage user accounts and subscriptions.</li>
                                <li>Communicate with you for customer support or important updates.</li>
                                <li>Ensure compliance with legal and security obligations.</li>
                            </ul>
                            <p className="mt-3">We never sell or rent personal information to third parties.</p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">3. Data Storage, Retention, and Deletion</h2>
                            <ul className="list-disc list-inside space-y-2 pl-4">
                                <li><strong>Image and video data:</strong> Uploaded images and generated videos are handled ephemerally and automatically deleted once processing is complete.</li>
                                <li><strong>Account data:</strong> Retained as long as your account is active or required for legal and accounting purposes.</li>
                                <li><strong>Storage location:</strong> Data is hosted on Google Cloud servers located in the European Union (europe-west4).</li>
                                <li><strong>Deletion:</strong> You may request permanent deletion of your account or personal data at any time by contacting us at <a href="mailto:contact-akiss@maigic.pro" className="text-primary hover:underline">contact-akiss@maigic.pro</a>.</li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">4. Third-Party Services</h2>
                            <p className="mb-3">We rely on trusted third-party services to operate securely and efficiently:</p>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border bg-card-foreground/5 rounded-lg">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Service</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Purpose</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">Google Cloud / Pollo AI</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">AI processing and hosting</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">Whop</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">Payment processing and subscription management</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">Firebase</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">Authentication and analytics</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-sm text-muted-foreground mt-3">When data is transferred outside the European Economic Area, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission to ensure GDPR compliance.</p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">5. Your Rights (GDPR)</h2>
                            <p className="mb-3">Under the General Data Protection Regulation (GDPR), you have the right to:</p>
                            <ul className="list-disc list-inside space-y-2 pl-4">
                                <li>Access your personal data.</li>
                                <li>Request correction or deletion of your data.</li>
                                <li>Withdraw your consent at any time.</li>
                                <li>Object to or restrict certain types of processing.</li>
                                <li>Request a copy of your data in a portable format (data portability).</li>
                                <li>Lodge a complaint with a supervisory authority (in France: CNIL – <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr</a>).</li>
                            </ul>
                            <p className="mt-3">You can exercise your rights at any time by emailing <a href="mailto:contact-akiss@maigic.pro" className="text-primary hover:underline">contact-akiss@maigic.pro</a>.</p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">6. Cookies and Tracking</h2>
                             <p className="mb-3">Akiss uses essential cookies only, required for authentication and security. We do not use advertising or third-party tracking cookies.</p>
                            <p>If additional analytics or performance cookies are introduced, users will be informed and may opt out.</p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">7. Security</h2>
                            <p className="mb-3">We implement reasonable technical and organizational measures to protect your data from unauthorized access, disclosure, or loss.</p>
                            <p>Despite these measures, no online system is 100% secure, and you acknowledge the inherent risks of using digital services.</p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">8. Updates to This Policy</h2>
                            <p>We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. Any modifications will be published on this page, and the “Last updated” date will be revised.</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default PrivacyPage;
