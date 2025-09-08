
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, type UserCredential } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { updateUserProfile } from '@/lib/firebase/db';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'login';
  const startTeaser = searchParams.get('start_teaser');
  const { toast } = useToast();

  const isFormFilled = email.trim() !== '' && password.trim() !== '';

  const handleSuccessfulAuth = async (userCredential: UserCredential) => {
    const user = userCredential.user;
    
    await updateUserProfile(user.uid, {
        email: user.email!.toLowerCase(),
        uid: user.uid,
    });
    
    toast({ title: 'Success!', description: 'Redirecting...' });
    
    // If the user came from the teaser flow, redirect them back to the home page with a param.
    if (startTeaser) {
      router.push('/?start_teaser=true');
    } else {
      router.push('/');
    }
  };

  const handleAuth = async (isLogin: boolean) => {
    if (!isFormFilled) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      let userCredential: UserCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      await handleSuccessfulAuth(userCredential);
    } catch (err: any) {
      setError(err.message);
      toast({ variant: 'destructive', title: 'Authentication Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    try {
        const userCredential = await signInWithPopup(auth, provider);
        await handleSuccessfulAuth(userCredential);
    } catch (err: any) {
         setError(err.message);
         toast({ variant: 'destructive', title: 'Google Sign-In Failed', description: err.message });
    } finally {
        setLoading(false);
    }
  }

  const renderAuthCard = (isLogin: boolean) => (
      <Card>
        <CardHeader>
          <CardTitle>{isLogin ? 'Welcome Back' : 'Create an Account'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Enter your credentials to access your account.' : 
                <>
                    By signing up, you agree to the{' '}
                    <Link href="/terms" className="underline hover:text-primary">
                      Terms of Use
                    </Link>
                    .
                </>
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor={isLogin ? 'email-login' : 'email-signup'}>Email</Label>
                <Input
                id={isLogin ? 'email-login' : 'email-signup'}
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor={isLogin ? 'password-login' : 'password-signup'}>Password</Label>
                <Input
                id={isLogin ? 'password-login' : 'password-signup'}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                />
            </div>
             <Button 
                onClick={() => handleAuth(isLogin)} 
                className="w-full"
                variant={isFormFilled ? "secondary" : "ghost"}
                disabled={loading || !isFormFilled}
            >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Or
                    </span>
                </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white" onClick={handleGoogleSignIn} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 74.8C307.2 99.4 280.7 86 248 86c-84.3 0-152.3 68.3-152.3 152.3s68 152.3 152.3 152.3c99.2 0 129.2-74.4 133.2-111.8H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
                }
                {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
            </Button>
        </CardContent>
      </Card>
  );

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Tabs defaultValue={defaultTab} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        
        <TabsContent value="login">
            {renderAuthCard(true)}
        </TabsContent>
        <TabsContent value="signup">
            {renderAuthCard(false)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
