'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Home, User, Settings, FileText, Shield, LogOut, PanelRight, Video, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import Image from 'next/image';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const handleLogout = async () => {
    console.log("Logout button clicked. Attempting to sign out...");
    try {
      await signOut(auth);
      console.log("Firebase signOut successful. Redirecting...");
      window.location.href = '/';
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  
  const handleLinkClick = () => {
    setOpen(false);
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
        <header className="p-4 border-b">
          <Link href="/" onClick={handleLinkClick} className="flex items-center gap-2">
            <Image src="/logokissgros.png" alt="Akiss Logo" width={28} height={28} />
            <h1 className="text-xl font-semibold tracking-tighter">Akiss</h1>
          </Link>
        </header>
        <nav className="flex-grow p-4 space-y-2">
           <Button asChild variant={pathname === '/' ? 'secondary' : 'ghost'} className="w-full justify-start">
              <Link href="/" onClick={handleLinkClick}>
                <Home className="mr-2 h-4 w-4" />
                Generator
              </Link>
            </Button>
            {user && (
                 <Button asChild variant={pathname === '/account' ? 'secondary' : 'ghost'} className="w-full justify-start">
                    <Link href="/account" onClick={handleLinkClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    My Account
                    </Link>
                </Button>
            )}
            {user && userProfile && (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <span className="font-medium">Credits</span>
                  </div>
                  <Badge variant="secondary" className="text-lg">
                    {userProfile.credits ?? 0}
                  </Badge>
              </div>
            )}
        </nav>
        <footer className="p-4 border-t space-y-4">
            <nav className="space-y-2">
                <Button asChild variant={pathname === '/terms' ? 'secondary' : 'ghost'} className="w-full justify-start">
                    <Link href="/terms" onClick={handleLinkClick}>
                    <FileText className="mr-2 h-4 w-4" />
                    Terms
                    </Link>
                </Button>
                <Button asChild variant={pathname === '/privacy' ? 'secondary' : 'ghost'} className="w-full justify-start">
                    <Link href="/privacy" onClick={handleLinkClick}>
                    <Shield className="mr-2 h-4 w-4" />
                    Privacy
                    </Link>
                </Button>
            </nav>

          {loading ? (
            <div className="flex items-center gap-3 rounded-md border p-2">
                 <Avatar className="h-9 w-9">
                    <AvatarFallback></AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded-md" />
                </div>
            </div>
          ) : user ? (
            <>
              <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
              <div className="flex items-center gap-3 rounded-md border p-2">
                <Avatar className="h-9 w-9">
                  {user.photoURL && <AvatarImage src={user.photoURL} alt="User avatar" />}
                  <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden space-y-1">
                  <p className="truncate text-sm font-medium">{user.displayName || user.email}</p>
                  {userProfile?.isSubscribed && (
                      <Badge variant="secondary" className="text-xs text-primary font-bold">
                          <Crown className="mr-1 h-3 w-3" />
                          Pro Account
                      </Badge>
                  )}
                </div>
              </div>
            </>
          ) : (
            <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/login" onClick={handleLinkClick}>
                  <User className="mr-2 h-4 w-4" />
                  Sign In
                </Link>
            </Button>
          )}
        </footer>
    </div>
  );


  return (
    <div className="min-h-svh flex flex-col">
       <header className="flex h-14 items-center justify-between border-b bg-background px-4 sticky top-0 z-10">
            <Link href="/" className="flex items-center gap-2">
                 <Image src="/logo.svg" alt="Akiss Logo" width={24} height={24} />
                 <span className="font-semibold">Akiss</span>
            </Link>
             <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <PanelRight className="h-6 w-6"/>
                        <span className="sr-only">Open menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-[300px] sm:w-[340px]">
                    <SheetHeader>
                        <SheetTitle className="sr-only">Menu</SheetTitle>
                    </SheetHeader>
                    <SidebarContent />
                </SheetContent>
            </Sheet>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
