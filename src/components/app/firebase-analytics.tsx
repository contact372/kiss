"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
// 1. On importe l'instance déjà initialisée, et plus les outils d'initialisation.
import { analytics } from "@/lib/firebase/firebase"; 
import { logEvent } from "firebase/analytics";

export function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 2. Le composant n'a plus qu'une seule responsabilité : logger les page_view.
    // Il n'y a plus de logique d'initialisation ici.
    if (analytics) {
      const url = pathname + searchParams.toString();

      logEvent(analytics, "page_view", {
        page_path: url,
        page_location: window.location.href,
      });

      console.log(`[Analytics Component] Logged page_view for: ${url}`);
    }
  }, [pathname, searchParams]);

  return null;
}
