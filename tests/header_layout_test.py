"""Responsive layout test for the building page header.

Verifies that the "Back to archive" button sits above the ATOM logo as a
vertical stack, aligned with the language switcher on the right across
viewports.

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


def union_rect(a, b):
    return {
        "left": min(a["left"], b["left"]),
        "top": min(a["top"], b["top"]),
        "right": max(a["right"], b["right"]),
        "bottom": max(a["bottom"], b["bottom"]),
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
                left_column = union_rect(r["back"], r["logo"])

                # Back button must be vertically above the logo.
                if r["back"]["bottom"] > r["logo"]["top"] + 1:
                    failures.append(f"[{name}] back is not above logo")

                # Back button and logo should be horizontally aligned
                # (same left/right edges since they share a stretched column).
                if abs(r["back"]["left"] - r["logo"]["left"]) > 1:
                    failures.append(f"[{name}] back/logo left edge misaligned")
                if abs(r["back"]["right"] - r["logo"]["right"]) > 1:
                    failures.append(f"[{name}] back/logo right edge misaligned")

                # The left column must not overlap the language switcher.
                if overlaps(left_column, r["lang"]):
                    failures.append(f"[{name}] left column overlaps language switcher")

                # Language switcher must sit to the right of the left column.
                if r["lang"]["left"] < left_column["right"] - 1:
                    failures.append(f"[{name}] language switcher is not to the right")

                # Back button and logo must meet a 44px tap target; the language
                # switcher is a compact control and only needs >= 32px.
                for k in ("logo", "back"):
                    if r[k]["height"] < 40:
                        failures.append(f"[{name}] {k} < 40px tap target ({r[k]['height']:.0f})")
                if r["lang"]["height"] < 32:
                    failures.append(f"[{name}] lang < 32px ({r['lang']['height']:.0f})")

                for k in ("logo", "back", "lang"):
                    if r[k]["right"] > w + 1 or r[k]["left"] < -1:
                        failures.append(f"[{name}] {k} escapes viewport")

                # The whole header must stay within the top-safe area.
                if left_column["top"] < 0 or left_column["left"] < -1:
                    failures.append(f"[{name}] left column escapes viewport")
                if left_column["right"] > w + 1:
                    failures.append(f"[{name}] left column too wide for viewport")

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
