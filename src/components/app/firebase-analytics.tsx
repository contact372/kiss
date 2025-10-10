"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { app } from "@/lib/firebase/firebase";

export function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // This effect will run on the client after the component mounts.
    // isSupported() checks if the browser environment supports Analytics.
    isSupported().then((supported) => {
      if (supported) {
        const analytics = getAnalytics(app);
        const url = pathname + searchParams.toString();

        // Log the page_view event to Analytics
        logEvent(analytics, "page_view", {
          page_path: url,
          page_location: window.location.href,
        });

        console.log(`[Analytics] Logged page_view for: ${url}`)
      }
    });
  }, [pathname, searchParams]); // Re-run this effect when the path changes

  return null; // This component does not render anything to the DOM
}
