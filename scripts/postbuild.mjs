// Vite builds the app with base "/site/" so its URLs live under /site, but
// nitro's Netlify preset still writes the static client files at the root of
// dist. Move the hashed bundle under dist/site/ to match, then drop the static
// holding page in as the root index.html (Netlify serves static files before
// the SSR function, so "/" shows it while everything else is under /site).
import { cpSync, existsSync, mkdirSync, renameSync } from "node:fs";

mkdirSync("dist/site", { recursive: true });
if (existsSync("dist/assets")) renameSync("dist/assets", "dist/site/assets");
cpSync("holding/index.html", "dist/index.html");
console.log("postbuild: moved dist/assets -> dist/site/assets, added holding page");
