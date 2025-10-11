'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const TermsPage = () => {
    const [showLegal, setShowLegal] = useState(false);

    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto bg-card p-8 rounded-lg shadow-md">
                    <h1 className="text-3xl font-bold text-center text-primary mb-4">Terms of Service</h1>
                    <p className="text-sm text-muted-foreground text-center mb-8">Last updated: 11/10/2025</p>

                    <p className="mb-6">
                        Welcome to Eternal Kiss (“we”, “our”, or “us”). These Terms of Service (“Terms”) govern your use of our website and services, including the generation of AI-based videos from user-uploaded images (collectively, the “Service”). By using the Service, you agree to be bound by these Terms and by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. If you do not agree, please do not use Eternal Kiss.
                    </p>

                    <div className="space-y-6">
                        {/* ... All the other sections from 1 to 11 ... */}
                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using our Service, you confirm that you are at least 18 years old or have obtained the consent of your legal guardian, and that you accept these Terms in full. We reserve the right to modify or update these Terms at any time. Continued use of the Service after any changes constitutes acceptance of the revised Terms.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">2. Subscriptions and Credits</h2>
                            <p className="mb-3">
                                The Service operates on a credit-based subscription model. Upon successful payment through our authorized payment processor (Whop), your account is credited with a set number of video generation credits.
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-4">
                                <li>Credits are non-transferable, non-refundable, and expire at the end of your active subscription period.</li>
                                <li>The subscription renews automatically unless canceled before the renewal date. You can cancel anytime via your Whop account.</li>
                                <li>If payment fails or is disputed, Eternal Kiss reserves the right to suspend or terminate your access.</li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">3. User Responsibilities and Content Restrictions</h2>
                            <p className="mb-3">
                                You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-4 mb-4">
                                <li>Upload or submit any image or material that is illegal, defamatory, harassing, pornographic, hateful, or invasive of privacy.</li>
                                <li>Use the Service to impersonate others or to create misleading or harmful content.</li>
                                <li>Attempt to harm, overload, or disrupt our servers or networks.</li>
                            </ul>
                            <h3 className="text-lg font-semibold text-foreground pt-2 mb-2">Consent and Image Rights</h3>
                            <p>
                                You are solely responsible for the images you upload and the individuals appearing in them. By submitting any photo, you represent and warrant that:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-4 mt-2">
                                <li>You are the rightful owner of the image or you have obtained the explicit consent of all individuals appearing in it.</li>
                                <li>You understand that generating or sharing AI-modified images of identifiable persons without their consent may violate their privacy, image, and personality rights under French and European law.</li>
                                <li>You will not use the Service to create or distribute any content that could harm, ridicule, or misrepresent others.</li>
                            </ul>
                            <p className="mt-3">
                                Eternal Kiss declines any responsibility for misuse of the Service or violations of third-party rights by users.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">4. Intellectual Property</h2>
                            <p className="mb-3">
                                You retain full ownership of the original images you upload.
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-4">
                                <li>By using the Service, you grant us a limited, worldwide, non-exclusive, royalty-free license to use, process, and temporarily store your images solely for the purpose of generating the requested video.</li>
                                <li>The generated video is your property for personal, non-commercial use only, unless otherwise authorized in writing.</li>
                                <li>Our software, design, and branding remain our exclusive intellectual property.</li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">5. Data Protection and Privacy</h2>
                            <p>
                                Eternal Kiss processes personal data (including photos and email addresses) in accordance with the EU General Data Protection Regulation (GDPR) and French data protection laws (Loi “Informatique et Libertés”). For details on how we collect, store, and delete your data, please refer to our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. You may request access, correction, or deletion of your personal data by contacting us at <a href="mailto:contact-akiss@maigic.pro" className="text-primary hover:underline">contact-akiss@maigic.pro</a>.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">6. Disclaimer of Warranty</h2>
                            <p>
                                The Service is provided “as is” and without any warranty of any kind. While we strive for high-quality results, AI-generated videos may vary in accuracy, style, or realism. We make no guarantee that results will meet your expectations or be free from defects.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">7. Limitation of Liability</h2>
                            <p>
                                To the maximum extent permitted by law, Eternal Kiss shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including but not limited to data loss, reputational harm, or misuse of generated content.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">8. Termination</h2>
                            <p>
                                We may suspend or terminate your access to the Service if you breach these Terms or use the Service in a manner that could cause harm to others or to our platform. Upon termination, all unused credits are forfeited.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">9. Governing Law and Jurisdiction</h2>
                            <p>
                                These Terms are governed by French law. Any disputes arising under these Terms shall be submitted to the exclusive jurisdiction of the courts of Paris (France).
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">10. Subscription details</h2>
                            <p>
                                We charge $8.97 (counting all taxes) each 15 days to our paying customer who benefits from keeping 15 credits of utilisation of our services each 15 days: 15 credits equals 15 video generations. The number of credits per user cannot exceed 15. The client can ask for a refund only for the first 15 days : he can ask for it on whop or by mail at <a href="mailto:contact-akiss@maigic.pro" className="text-primary hover:underline">contact-akiss@maigic.pro</a>.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-foreground pt-4 mb-3">11. Contact Information</h2>
                            <p>
                                For any questions regarding these Terms, please contact us at: <a href="mailto:contact-akiss@maigic.pro" className="text-primary hover:underline">📧contact-akiss@maigic.pro</a>
                            </p>
                        </div>
                    </div>

                    <div className="text-center mt-10">
                        <button 
                            onClick={() => setShowLegal(!showLegal)}
                            className="text-sm text-muted-foreground underline hover:text-primary transition-colors"
                        >
                            legal notice
                        </button>
                    </div>

                    {showLegal && (
                        <div className="mt-8 pt-6 border-t border-border">
                            <h2 className="text-xl font-bold text-center text-primary mb-4">Legal Notice</h2>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <h3 className="font-semibold">Akiss is published by:</h3>
                                    <p>Sylvain AGENEAU – Micro-entreprise</p>
                                    <p>SIRET: 952 734 234 00018</p>
                                    <p>Address: 50 rue du blosne, 35135, Chantepie, FRANCE</p>
                                    <p>Email: <a href="mailto:contact-akiss@maigic.pro" className="text-primary hover:underline">contact-akiss@maigic.pro</a></p>
                                    <p>Responsible for publication: Sylvain AGENEAU</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Hosting provider:</h3>
                                    <p>Our website is hosted by Google Cloud France SARL,</p>
                                    <p>8 Rue de Londres, 75009 Paris, France (SIREN 881 721 583),</p>
                                    <p>a subsidiary of Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA.</p>
                                    <p>Data is stored in Google Cloud’s European data centers (region: europe-west4) in compliance with GDPR requirements.</p>
                                    <p>More information: <a href="https://cloud.google.com/security/gdpr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://cloud.google.com/security/gdpr</a></p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default TermsPage;
