// Vite builds the app with base "/alin/" so its URLs live under /alin, but
// nitro's Netlify preset still writes the static client files at the root of
// dist. Move the hashed bundle under dist/alin/ to match, then drop the static
// holding page in as the root index.html (Netlify serves static files before
// the SSR function, so "/" shows it while everything else is under /alin).
import { cpSync, existsSync, mkdirSync, renameSync } from "node:fs";

mkdirSync("dist/alin", { recursive: true });
if (existsSync("dist/assets")) renameSync("dist/assets", "dist/alin/assets");
cpSync("holding/index.html", "dist/index.html");
console.log("postbuild: moved dist/assets -> dist/alin/assets, added holding page");
