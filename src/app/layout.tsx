'use client';

import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import React from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { AppLayout } from '@/components/app/app-layout';

export const metadata: Metadata = {
  title: 'Eternal Kiss',
  description: 'Create a video of you and your loved one kissing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* FIX: Chargement de toutes les graisses de police nécessaires */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
            <AppLayout>
              {children}
            </AppLayout>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
