// Isomorphic: server code reads PUBLIC_SITE_URL directly (never bundled into
// the client, same as SUPABASE_URL in auth-middleware.ts); client code reads
// the VITE_-prefixed twin so Vite can inline it into the browser bundle.
const rawSiteUrl =
  (typeof window === "undefined"
    ? process.env.PUBLIC_SITE_URL
    : import.meta.env.VITE_PUBLIC_SITE_URL) || "https://ploiestiulistoricdigital.ro";

// A misconfigured env var without a scheme (e.g. "example.com" instead of
// "https://example.com") makes links built from it look absolute but get
// resolved by the browser as relative to the current page path. Normalize
// so that can't happen.
export const PUBLIC_SITE_URL = /^https?:\/\//i.test(rawSiteUrl)
  ? rawSiteUrl.replace(/\/+$/, "")
  : `https://${rawSiteUrl.replace(/\/+$/, "")}`;
