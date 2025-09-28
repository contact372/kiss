'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase'; // Correctly import the auth instance
import { Loader2 } from 'lucide-react';
import { getUserProfile } from '@/lib/firebase/db'; // Use the new function
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
        const profile = await getUserProfile(user.uid); // Use the new function
        setUserProfile(profile);
        return profile;
    }
    return null;
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => { // Use the imported auth instance directly
      setLoading(true);
      setUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid); // Use the new function
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
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
