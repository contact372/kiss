'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, type UserCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronDown } from 'lucide-react';
import { ensureUserProfile } from '@/lib/firebase/db';
import Link from 'next/link';


// SVG component for the colored Google Icon
const GoogleIcon = () => (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);


export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'login';
  const startTeaser = searchParams.get('start_teaser');
  const { toast } = useToast();


  const isFormFilled = email.trim() !== '' && password.trim() !== '';


  const handleSuccessfulAuth = async (userCredential: UserCredential) => {
    const user = userCredential.user;
   
    await ensureUserProfile(user.uid, user.email);
   
    toast({ title: 'Success!', description: 'Redirecting...' });
   
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
            <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white" onClick={handleGoogleSignIn} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
            </Button>


            <div
                className="text-center text-sm text-muted-foreground underline cursor-pointer flex items-center justify-center"
                onClick={() => setShowEmailForm(!showEmailForm)}
            >
                or with email
                <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showEmailForm ? 'rotate-180' : ''}`} />
            </div>


            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showEmailForm ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-4 pt-4">
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
              </div>
            </div>
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
