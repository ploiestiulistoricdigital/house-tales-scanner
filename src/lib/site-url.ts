// Isomorphic: server code reads PUBLIC_SITE_URL directly (never bundled into
// the client, same as SUPABASE_URL in auth-middleware.ts); client code reads
// the VITE_-prefixed twin so Vite can inline it into the browser bundle.
export const PUBLIC_SITE_URL =
  (typeof window === "undefined"
    ? process.env.PUBLIC_SITE_URL
    : import.meta.env.VITE_PUBLIC_SITE_URL) || "https://ploiestiulistoricdigital.ro";
