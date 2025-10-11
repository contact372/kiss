import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import React, { Suspense } from 'react'; // Importer Suspense
import { AuthProvider } from '@/contexts/auth-context';
import { AppLayout } from '@/components/app/app-layout';
import { FirebaseAnalytics } from '@/components/app/firebase-analytics';

export const metadata: Metadata = {
  title: 'Akiss',
  description: 'Create a video of you and your loved one kissing.',
  icons: {
    icon: '/logokissgros.png',
  },
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {/* Envelopper le composant Analytics dans une Suspense Boundary */}
          <Suspense fallback={null}>
            <FirebaseAnalytics />
          </Suspense>
          <AppLayout>
            {children}
          </AppLayout>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
