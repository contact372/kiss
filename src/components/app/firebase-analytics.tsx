"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getAnalytics, logEvent, isSupported, Analytics } from "firebase/analytics";
import { app } from "@/lib/firebase/firebase";

// --- SOLUTION ---
// On initialise Analytics une seule fois et on le stocke dans une variable.
// On s'assure que ce code ne s'exécute que côté client.
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("[Analytics] Service initialized.");
    }
  });
}
// --- FIN SOLUTION ---

export function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // L'effet utilise maintenant l'instance d'Analytics déjà prête.
    if (analytics) {
      const url = pathname + searchParams.toString();

      logEvent(analytics, "page_view", {
        page_path: url,
        page_location: window.location.href,
      });

      console.log(`[Analytics] Logged page_view for: ${url}`);
    }
  }, [pathname, searchParams]);

  return null;
}
