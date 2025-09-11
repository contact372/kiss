import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Zap, Video } from 'lucide-react';
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from 'next/navigation';


interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SubscriptionDialog({ open, onOpenChange }: SubscriptionDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  const handlePurchaseClick = () => {
    let checkoutUrl = 'https://whop.com/checkout/plan_ZtUQy2ebvc8Gc?d2c=true';
    
    if (user?.uid) {
        checkoutUrl += `&metadata[uid]=${user.uid}`;
    } else {
        console.error("[DEBUG] Purchase Clicked: User not logged in. Redirecting to login.");
        router.push('/login?tab=signup');
        return;
    }
    
    if(user?.email) {
        checkoutUrl += `&email=${encodeURIComponent(user.email)}`;
    }

    // Use the public URL from environment variables for the redirect.
    // This is the CRITICAL fix to ensure the correct redirect on production.
    const publicUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!publicUrl) {
        console.error('[FATAL] NEXT_PUBLIC_APP_URL is not set. Cannot build redirect URL for payment.');
        // In a real app, you might want to show a toast or an alert to the user here.
        // For now, we proceed without a redirect_url, which might cause issues but is better than crashing.
    } else {
        // We construct the correct redirect URL pointing to our /payment-status page.
        const redirectUrl = `${publicUrl}/payment-status`;
        checkoutUrl += `&redirect_url=${encodeURIComponent(redirectUrl)}`;
    }
    
    console.log('[DEBUG] Redirecting to Whop checkout with URL:', checkoutUrl);
    
    onOpenChange(false);
    
    window.location.href = checkoutUrl;
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
        onOpenChange(false);
    }
  }


  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <div className="relative">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-pink-400 to-purple-500" />
            <div className="relative flex justify-center pt-8">
                <div className="bg-white rounded-full p-3 shadow-lg border-4 border-white">
                    <Zap className="h-12 w-12 text-yellow-500" fill="currentColor" />
                </div>
            </div>
        </div>
        <DialogHeader className="p-6 text-center space-y-2">
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Unlock Everything</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Join now to get instant access and create your magic moments.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
            <div className="bg-slate-50 rounded-lg p-6 text-center space-y-2 border">
                <p className="text-4xl font-bold tracking-tight text-slate-800">7.50€</p>
                <p className="text-sm font-medium text-slate-500">for 15 days</p>
            </div>
          
            <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-purple-500" />
                    <span><span className="font-bold">15 Video Credits</span> to use immediately.</span>
                </li>
                <li className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-purple-500" />
                    <span><span className="font-bold">Premium Quality</span> video generation.</span>
                </li>
            </ul>

          <Button onClick={handlePurchaseClick} size="lg" className="w-full text-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg">
            Get Access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
