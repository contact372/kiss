''''use client';

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from 'next/navigation';
import { Star } from "lucide-react";

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
    
    // CORRECTION DÉFINITIVE : Utilisation de 'customer_email'
    if(user?.email) {
        checkoutUrl += `&customer_email=${encodeURIComponent(user.email)}`;
    }

    // VÉRIFICATION : L'alerte est maintenue pour le test.
    alert(checkoutUrl);
    // window.location.href = checkoutUrl;
  };

  return (
    <main className="flex flex-col items-center justify-start md:justify-center min-h-screen bg-white p-6 py-12">
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-y-10 md:gap-x-16 items-center">
          
          {/* FIX: Conteneur pour aligner le titre comme le reste du contenu sur mobile */}
          <div>
            <div className="max-w-xs mx-auto md:mx-0 md:max-w-none">
              <h1 className="text-left text-4xl leading-tight sm:text-5xl md:text-6xl font-extrabold tracking-tight md:tracking-tighter bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                You're one step away from kissing your crush
              </h1>
            </div>
          </div>

          {/* Offre : Centrée, assurant un alignement parfait sur mobile */}
          <div className="w-full flex flex-col items-center">
            <div className="border rounded-2xl p-6 w-full max-w-xs mx-auto flex flex-col items-center text-center shadow-lg bg-slate-50">
              <p className="text-5xl sm:text-6xl font-bold text-slate-800">0,6$<span className="text-xl sm:text-2xl font-medium text-slate-500">/credit</span></p>
            </div>

            {/* Avantages : Étoiles roses pour la cohérence de la marque */}
            <ul className="space-y-3 my-8 text-slate-600 w-full max-w-xs mx-auto">
              <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-pink-500 shrink-0" fill="currentColor" />
                  <span>No hidden fees</span>
              </li>
              <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-pink-500 shrink-0" fill="currentColor" />
                  <span>Best video quality</span>
              </li>
              <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-pink-500 shrink-0" fill="currentColor" />
                  <span>15 credits for 15 days</span>
              </li>
               <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-pink-500 shrink-0" fill="currentColor" />
                  <span>Billed each 15 days</span>
              </li>
            </ul>

            {/* Bouton : Application du dégradé de la marque */}
            <Button onClick={handlePurchaseClick} size="lg" className="w-full max-w-xs mx-auto text-lg text-white font-semibold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-md">
              Watch the kiss now
            </Button>
          </div>

        </div>
      </div>
    </main>
  );
}
''''
