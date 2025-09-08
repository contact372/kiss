
'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/firebase';
import { Loader2 } from 'lucide-react';
import { checkUserSubscription } from '@/lib/firebase/db';
import type { UserProfile } from '@/lib/firebase/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, refreshUserProfile: async () => null });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = useCallback(async () => {
    if (user) {
        console.log('[AUTH_CONTEXT] Refreshing user profile for UID:', user.uid);
        const profile = await checkUserSubscription(user.uid);
        setUserProfile(profile);
        return profile;
    }
    return null;
  }, [user]);


  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setUser(user);
      if (user) {
        const profile = await checkUserSubscription(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // The loading screen is shown only once during initial auth check.
  // Subsequent navigations will not re-trigger this.
  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen w-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
  }

  return <AuthContext.Provider value={{ user, userProfile, loading, refreshUserProfile }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
