// Responsive layout test for the building page header.
// Verifies that the ATOM logo, "Back to archive" button, and language switcher
// stay aligned on a single row without overlap across viewports.
//
// Run with: node tests/header-layout.spec.mjs
// Requires the dev server at http://localhost:8080.

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8080";
const SLUG = process.env.TEST_SLUG || "gara-de-sud";

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 720 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
];

function rectsOverlap(a, b) {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

const failures = [];

const browser = await chromium.launch({ headless: true });
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/b/${SLUG}`, { waitUntil: "domcontentloaded" });

    const logo = page.locator('a[aria-label="ATOM Ploiești"]').first();
    const back = page.getByRole("link").filter({ has: page.locator("svg.lucide-arrow-left") }).first();
    const langSwitcher = page.locator('[aria-label*="lang" i], [role="group"]').first();

    await logo.waitFor({ state: "visible", timeout: 5000 });
    await back.waitFor({ state: "visible", timeout: 5000 });

    const [logoBox, backBox] = await Promise.all([logo.boundingBox(), back.boundingBox()]);
    // Language switcher may not have a stable aria label; grab the first fixed-header child at right edge.
    const langBox = await page
      .evaluate(() => {
        const header = document.querySelector(".fixed.top-4");
        if (!header) return null;
        const kids = Array.from(header.children);
        const last = kids[kids.length - 1];
        const r = last?.getBoundingClientRect();
        return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
      });

    const boxes = { logo: logoBox, back: backBox, lang: langBox };
    const missing = Object.entries(boxes).filter(([, b]) => !b).map(([k]) => k);
    if (missing.length) {
      failures.push(`[${vp.name}] missing bounding box for: ${missing.join(", ")}`);
      await ctx.close();
      continue;
    }

    const rects = Object.fromEntries(
      Object.entries(boxes).map(([k, b]) => [
        k,
        { left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height, height: b.height },
      ]),
    );

    // 1. No overlap between the three elements.
    for (const [a, b] of [["logo", "back"], ["logo", "lang"], ["back", "lang"]]) {
      if (rectsOverlap(rects[a], rects[b])) {
        failures.push(`[${vp.name}] ${a} overlaps ${b}`);
      }
    }

    // 2. Same row: vertical centers within 6px.
    const cy = (r) => (r.top + r.bottom) / 2;
    const centers = [cy(rects.logo), cy(rects.back), cy(rects.lang)];
    const spread = Math.max(...centers) - Math.min(...centers);
    if (spread > 6) {
      failures.push(`[${vp.name}] header items not vertically aligned (spread ${spread.toFixed(1)}px)`);
    }

    // 3. Heights match closely (44px touch target, tolerate ±4px).
    const heights = [rects.logo.height, rects.back.height, rects.lang.height];
    const hSpread = Math.max(...heights) - Math.min(...heights);
    if (hSpread > 4) {
      failures.push(`[${vp.name}] header items height mismatch (${heights.map((h) => h.toFixed(0)).join("/")})`);
    }
    if (Math.min(...heights) < 40) {
      failures.push(`[${vp.name}] header item too short for tap target (min ${Math.min(...heights).toFixed(0)}px)`);
    }

    // 4. All fit within the viewport width.
    for (const k of ["logo", "back", "lang"]) {
      if (rects[k].right > vp.width + 1 || rects[k].left < -1) {
        failures.push(`[${vp.name}] ${k} escapes viewport (left=${rects[k].left}, right=${rects[k].right})`);
      }
    }

    // 5. Left-to-right order: logo → back → lang.
    if (!(rects.logo.left <= rects.back.left && rects.back.right <= rects.lang.left + 1)) {
      failures.push(`[${vp.name}] header order broken (logo→back→lang)`);
    }

    console.log(`[${vp.name}] ok`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("\nFAILURES:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("\nAll header layout checks passed.");
