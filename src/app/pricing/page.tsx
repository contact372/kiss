'use client';

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star } from "lucide-react";

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handlePurchaseClick = () => {
    let checkoutUrl = 'https://whop.com/checkout/plan_ZtUQy2ebvc8Gc?d2c=true';
    
    if (user?.uid) {
        checkoutUrl += `&metadata[uid]=${user.uid}`;
    } else {
        router.push('/login?tab=signup&redirect=/pricing');
        return;
    }
    
    if(user?.email) {
        checkoutUrl += `&email=${encodeURIComponent(user.email)}`;
    }

    window.location.href = checkoutUrl;
  };

  return (
    <main className="flex flex-col items-center justify-start md:justify-center min-h-screen bg-white p-4 py-12 sm:p-6">
      
      <Button variant="ghost" onClick={() => router.back()} className="absolute top-4 left-4 text-slate-600 hover:bg-slate-100 z-10">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="w-full max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-y-8 md:gap-x-16 items-center">
          
          <div className="text-left">
            {/* Changement: font-extrabold remplacé par font-bold pour une meilleure consistance */}
            <h1 className="text-4xl leading-tight sm:text-5xl md:text-6xl font-bold tracking-tight md:tracking-tighter bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              You're one step away from kissing your crush
            </h1>
          </div>

          <div className="w-full flex flex-col items-center">
            <div className="border rounded-2xl p-6 w-full max-w-xs mx-auto flex flex-col items-center text-center shadow-lg bg-slate-50">
              {/* Le font-bold est déjà ici, on s'assure qu'il est bien appliqué */}
              <p className="text-5xl sm:text-6xl font-bold text-slate-800">0,6$<span className="text-xl sm:text-2xl font-medium text-slate-500">/credit</span></p>
            </div>

            <ul className="space-y-2 my-6 text-slate-600 w-full max-w-xs mx-auto">
              <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-purple-400 shrink-0" fill="currentColor" />
                  <span>No hidden fees</span>
              </li>
              <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-purple-400 shrink-0" fill="currentColor" />
                  <span>Best video quality</span>
              </li>
              <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-purple-400 shrink-0" fill="currentColor" />
                  <span>15 credits for 15 days</span>
              </li>
               <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-purple-400 shrink-0" fill="currentColor" />
                  <span>Billed each 15 days</span>
              </li>
            </ul>

            <Button onClick={handlePurchaseClick} size="lg" className="w-full max-w-xs mx-auto text-lg bg-purple-500 hover:bg-purple-600 text-white shadow-md">
              Watch the kiss now
            </Button>
          </div>

        </div>
      </div>
    </main>
  );
}
