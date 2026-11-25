"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js (production only). The service worker only provides an
 * offline fallback page — it never caches product data, so prices and
 * booking status are always live.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
