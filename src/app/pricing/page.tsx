'use client';

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star } from "lucide-react";

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handlePurchaseClick = () => {
    // L'URL de base de Whop que nous avons récupérée
    let checkoutUrl = 'https://whop.com/checkout/plan_ZtUQy2ebvc8Gc?d2c=true';
    
    // Si l'utilisateur est connecté, on ajoute son UID pour le tracking
    if (user?.uid) {
        checkoutUrl += `&metadata[uid]=${user.uid}`;
    } else {
        // Si l'utilisateur n'est pas connecté, on le renvoie vers la page de login
        // Il sera redirigé ici après s'être connecté.
        router.push('/login?tab=signup&redirect=/pricing');
        return;
    }
    
    // On ajoute aussi son email si disponible
    if(user?.email) {
        checkoutUrl += `&email=${encodeURIComponent(user.email)}`;
    }

    // Redirection vers la page de paiement
    window.location.href = checkoutUrl;
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
          
          {/* Colonne de gauche: Texte d'accroche */}
          <div className="text-center md:text-left">
            <Button variant="ghost" onClick={() => router.back()} className="absolute top-4 left-4 text-slate-600 hover:bg-slate-100">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              You're one step away from kissing your crush
            </h1>
          </div>

          {/* Colonne de droite: Offre */}
          <div className="w-full flex flex-col items-center">
            <div className="border rounded-2xl p-8 w-full max-w-sm flex flex-col items-center text-center shadow-lg bg-slate-50">
              <p className="text-6xl font-bold text-slate-800">0,6$<span className="text-2xl font-medium text-slate-500">/credit</span></p>
            </div>

            <ul className="space-y-3 mt-8 text-slate-600 w-full max-w-sm">
              <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-purple-400" fill="currentColor" />
                  <span>No hidden fees</span>
              </li>
              <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-purple-400" fill="currentColor" />
                  <span>Best video quality</span>
              </li>
              <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-purple-400" fill="currentColor" />
                  <span>15 credits for 15 days</span>
              </li>
               <li className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-purple-400" fill="currentColor" />
                  <span>Billed each 15 days</span>
              </li>
            </ul>

            <Button onClick={handlePurchaseClick} size="lg" className="w-full max-w-sm mt-8 text-lg bg-purple-500 hover:bg-purple-600 text-white shadow-md">
              Watch the kiss now
            </Button>
          </div>

        </div>
      </div>
    </main>
  );
}
