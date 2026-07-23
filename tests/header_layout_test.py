"""Responsive layout test for the building page header.

Verifies that the ATOM logo, "Back to archive" button, and language switcher
stay aligned on a single row without overlap across viewports.

Run: python3 tests/header_layout_test.py
Requires the dev server at http://localhost:8080.
"""

import asyncio
import os
import sys

from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080")
SLUG = os.environ.get("TEST_SLUG", "gara-de-sud")

VIEWPORTS = [
    ("mobile-320", 320, 720),
    ("mobile-390", 390, 844),
    ("tablet-768", 768, 1024),
    ("desktop-1280", 1280, 900),
]


def overlaps(a, b):
    return not (a["right"] <= b["left"] or b["right"] <= a["left"]
                or a["bottom"] <= b["top"] or b["bottom"] <= a["top"])


def to_rect(box):
    return {
        "left": box["x"],
        "top": box["y"],
        "right": box["x"] + box["width"],
        "bottom": box["y"] + box["height"],
        "height": box["height"],
    }


async def run():
    failures = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        try:
            for name, w, h in VIEWPORTS:
                ctx = await browser.new_context(viewport={"width": w, "height": h})
                page = await ctx.new_page()
                await page.goto(f"{BASE}/b/{SLUG}", wait_until="domcontentloaded")

                logo = page.locator('a[aria-label="ATOM Ploiești"]').first
                back = page.locator('a:has(svg.lucide-arrow-left)').first
                await logo.wait_for(state="visible", timeout=8000)
                await back.wait_for(state="visible", timeout=8000)

                logo_box = await logo.bounding_box()
                back_box = await back.bounding_box()
                lang_box = await page.evaluate(
                    """() => {
                        const header = document.querySelector('.fixed.top-4');
                        if (!header) return null;
                        const last = header.children[header.children.length - 1];
                        const r = last?.getBoundingClientRect();
                        return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
                    }"""
                )

                boxes = {"logo": logo_box, "back": back_box, "lang": lang_box}
                missing = [k for k, v in boxes.items() if not v]
                if missing:
                    failures.append(f"[{name}] missing box: {', '.join(missing)}")
                    await ctx.close()
                    continue

                r = {k: to_rect(v) for k, v in boxes.items()}

                for a, b in (("logo", "back"), ("logo", "lang"), ("back", "lang")):
                    if overlaps(r[a], r[b]):
                        failures.append(f"[{name}] {a} overlaps {b}")

                centers = [(r[k]["top"] + r[k]["bottom"]) / 2 for k in ("logo", "back", "lang")]
                spread = max(centers) - min(centers)
                if spread > 6:
                    failures.append(f"[{name}] vertical misalign spread={spread:.1f}px")

                heights = [r[k]["height"] for k in ("logo", "back", "lang")]
                if max(heights) - min(heights) > 4:
                    failures.append(f"[{name}] height mismatch {heights}")
                if min(heights) < 40:
                    failures.append(f"[{name}] item < 40px tap target ({min(heights):.0f})")

                for k in ("logo", "back", "lang"):
                    if r[k]["right"] > w + 1 or r[k]["left"] < -1:
                        failures.append(f"[{name}] {k} escapes viewport")

                if not (r["logo"]["left"] <= r["back"]["left"]
                        and r["back"]["right"] <= r["lang"]["left"] + 1):
                    failures.append(f"[{name}] header order broken (logo->back->lang)")

                print(f"[{name}] ok")
                await ctx.close()
        finally:
            await browser.close()

    if failures:
        print("\nFAILURES:", file=sys.stderr)
        for f in failures:
            print(" -", f, file=sys.stderr)
        sys.exit(1)
    print("\nAll header layout checks passed.")


if __name__ == "__main__":
    asyncio.run(run())
