
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PaymentStatusPage() {
  const router = useRouter();
  
  // This page has a single purpose: redirect the user to the home page with the correct parameter
  // to trigger the post-payment flow. This ensures a clean URL and a single entry point.
  useEffect(() => {
    router.replace('/?paid=true');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Finalizing Payment...</h1>
            <p className="text-muted-foreground">Please wait, you are being redirected.</p>
        </div>
    </div>
  ); 
}
