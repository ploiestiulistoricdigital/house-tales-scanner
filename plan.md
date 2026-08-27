# Production Readiness Plan — Poveștile Caselor

This document lists the concrete steps to take this app from its current preview state to a production deployment.

## 1. Security hardening

- **Remove the bootstrap escalation path.** Delete `claimFirstAdmin` from `src/lib/buildings.functions.ts` and any UI that calls it. Admin bootstrapping is complete; leaving it in is a privilege-escalation risk.
- **Tighten auth config** (via `supabase--configure_auth`):
  - `auto_confirm_email: false` — require real email confirmation.
  - `password_hibp_enabled: true` — block leaked passwords.
  - Sensible OTP expiry and rate limits.
- **RLS audit.** Confirm every `public.*` table has RLS enabled and explicit `GRANT`s, and that the `anon` role can only read what the public site truly needs (`buildings`, `building_images`).
- **Remove test credentials.** Delete or rotate `admin+test@buildingstories.app` before go-live.
- **Run a full security scan** (`security--run_security_scan`) and resolve any critical/high findings.

## 2. Domain, URLs, SEO

- Buy or connect a custom domain in **Project Settings → Domains**.
- Replace the hardcoded `PUBLIC_BASE = "https://house-tales-scanner.lovable.app"` in `src/lib/buildings.functions.ts` with an env-driven value (e.g. `process.env.PUBLIC_SITE_URL`) so QR codes point at the production domain.
- One-off migration to regenerate `qr_code_url` for existing buildings after the domain switch.
- Add `public/robots.txt` and a `src/routes/sitemap[.]xml.ts` route that lists all buildings.
- Verify `__root.tsx` metadata + per-building `head()` (title, description, `og:image` from the cover) are correct.

## 3. Emails (Lovable Email)

- Configure a verified sending domain via Lovable Email.
- Customize auth email templates (confirm signup, reset password, magic link) in RO + EN with the site branding.

## 4. Storage & media

- Confirm `building-images` and `qr-codes` buckets have the intended public/private posture and file size limits.
- Server-side cleanup: when a building or gallery image is deleted, also remove the underlying object from storage (currently only the DB row is removed).
- Consider a max upload dimension / image transform to keep mobile payloads small.

## 5. Observability & backups

- Enable Lovable Cloud daily backups; document the restore procedure.
- Wire an error-reporting sink (e.g. Sentry) into `reportLovableError` for both client and server functions.
- Basic uptime monitoring on `/` and one `/b/<slug>` route.

## 6. Performance & UX polish

- Verify `Cache-Control` on public building pages (SSR HTML + images).
- Preload the hero/cover image on `/b/$slug`.
- Lighthouse pass on mobile: target ≥ 90 for Performance, Accessibility, SEO.
- Confirm 404 / error boundaries render correctly for unknown slugs.

## 7. Legal & content

- Add Privacy Policy, Terms, and Cookie notice pages (RO + EN).
- Admin content checklist (cover image, RO + EN text) before a building can be marked "published".
- Optional: add a `published boolean` on `buildings` so drafts are not publicly reachable, with the anon RLS policy filtering to `published = true`.

## 8. Release process

- Enable GitHub sync; protect `main`; require PR review.
- Hide the "Edit with Lovable" badge (Pro plan) for the production deploy.
- Publish, smoke-test the QR flow end-to-end on a real phone, then hand over admin access to the client and remove the test admin.

## Estimated monthly costs

| Item | Cost |
|---|---|
| Lovable Pro plan | ~$25 / mo |
| Custom domain (`.ro` / `.com`) | ~$1–2 / mo (amortized) |
| Lovable Cloud usage (DB + storage + edge) | Covered by the free monthly credit allowance for small traffic; overages billed from workspace credits |
| Lovable AI Gateway (translation button) | Pay-as-you-go from workspace credits; negligible at admin-only usage |
| **Total (typical small deployment)** | **~$26–27 / mo** |
