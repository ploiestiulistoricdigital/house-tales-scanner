// Client-only: the VITE_-prefixed env var is inlined into the browser bundle
// by Vite, same pattern as VITE_PUBLIC_SITE_URL in site-url.ts.
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-SLBE39ZM42";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

let loaded = false;

/**
 * Injects the gtag.js script and fires the initial config call. Safe to call
 * more than once — only the first call has any effect. Must only be called
 * client-side, after the visitor has given cookie consent.
 */
export function loadGoogleAnalytics() {
  if (loaded || typeof document === "undefined") return;
  loaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
}
