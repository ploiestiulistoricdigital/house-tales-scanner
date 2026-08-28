import { defineConfig, type PluginOption } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
    }),
  ];

  if (command === "build") {
    // Builds the actual deployable server adapter (Netlify Functions) for the
    // SSR/server-fn routes. Without this, `vite build` only produces a
    // generic server bundle with no Netlify wiring, so every dynamic route
    // 404s in production even though the client assets build fine.
    const { nitro } = await import("nitro/vite");
    plugins.push(
      nitro({
        preset: "netlify",
        routeRules: {
          // Public building pages: cache briefly on the client, longer at
          // the CDN, and serve stale content while a fresh copy revalidates
          // in the background so an editor's change is never blocked on a
          // cache miss.
          "/b/**": {
            headers: {
              "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
            },
          },
          // Vite fingerprints these filenames with a content hash, so a
          // given URL never changes meaning — safe to cache for a year.
          "/assets/**": {
            headers: {
              "cache-control": "public, max-age=31536000, immutable",
            },
          },
        },
      }),
    );
  }

  // trustForwardedHost defaults to true, which is meant for proxies (like
  // Lovable's) that rewrite Host and overwrite X-Forwarded-Host themselves.
  // This site has a single fixed public origin (see src/lib/site-url.ts) and
  // Netlify passes the real Host through unmodified, so there's no need to
  // trust a client-suppliable header for the advertised OAuth resource URL.
  plugins.push(viteReact(), mcpPlugin({ trustForwardedHost: false }));

  return {
    resolve: {
      alias: { "@": new URL("./src", import.meta.url).pathname },
    },
    plugins,
  };
});
