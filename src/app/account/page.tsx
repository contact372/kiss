'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function AccountPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleManageSubscription = () => {
    window.location.href = 'https://whop.com/hub/';
  }

  if (authLoading || !userProfile) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4 sm:p-6">
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
          <p className="text-muted-foreground">Manage your subscription and profile details.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>
              {userProfile.hasPaid
                ? 'You have an active subscription.'
                : 'You do not have an active subscription.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <p className="font-medium">Video Credits</p>
                    <p className="text-sm text-muted-foreground">Credits remaining for video generation.</p>
                </div>
                <p className="text-2xl font-bold">{userProfile.credits}</p>
             </div>
             <div className="flex flex-col sm:flex-row gap-2">
                {userProfile.hasPaid && (
                    <Button onClick={handleManageSubscription}>Manage Subscription on Whop</Button>
                )}
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
             <CardDescription>
              This is your personal information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center">
                <p className="w-24 font-medium">Email:</p>
                <p className="text-muted-foreground">{userProfile.email}</p>
            </div>
             <div className="flex items-center">
                <p className="w-24 font-medium">User ID:</p>
                <p className="text-muted-foreground text-xs">{userProfile.uid}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
