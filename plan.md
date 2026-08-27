# Production Readiness Plan — Poveștile Caselor

This document lists the concrete steps to take this app from its current preview state to a production deployment.

## 1. Security hardening

- [x] **Remove the bootstrap escalation path.** Deleted `claimFirstAdmin` from `src/lib/buildings.functions.ts` and the claim UI in `admin.tsx`. Admin bootstrapping is complete.
- **Tighten auth config** (via the Supabase dashboard, Authentication → Settings):
  - `auto_confirm_email: false` — require real email confirmation.
  - `password_hibp_enabled: true` — block leaked passwords.
  - Sensible OTP expiry and rate limits.
- **RLS audit.** Confirm every `public.*` table has RLS enabled and explicit `GRANT`s, and that the `anon` role can only read what the public site truly needs (`buildings`, `building_images`).
- **Remove test credentials.** Delete or rotate `admin+test@buildingstories.app` before go-live.
- **Run a full security scan** and resolve any critical/high findings.

## 2. Domain, URLs, SEO

- [x] Custom domain `ploiestiulistoricdigital.ro` connected via Netlify; `PUBLIC_SITE_URL` /
  `VITE_PUBLIC_SITE_URL` env vars wired into `src/lib/site-url.ts` and used everywhere QR/canonical
  URLs are built. Set both vars in Netlify's environment settings for the production deploy.
- One-off migration to regenerate `qr_code_url` for existing buildings now that the domain is set.
- Add `public/robots.txt` and a `src/routes/sitemap[.]xml.ts` route that lists all buildings.
- Verify `__root.tsx` metadata + per-building `head()` (title, description, `og:image` from the cover) are correct.

## 3. Emails

- Configure a verified sending domain for transactional email (Supabase Auth SMTP, or a provider like Resend).
- Customize auth email templates (confirm signup, reset password, magic link) in RO + EN with the site branding.

## 4. Storage & media

- Confirm `building-images` and `qr-codes` buckets have the intended public/private posture and file size limits.
- Server-side cleanup: when a building or gallery image is deleted, also remove the underlying object from storage (currently only the DB row is removed).
- Consider a max upload dimension / image transform to keep mobile payloads small.

## 5. Observability & backups

- Enable Supabase daily backups; document the restore procedure.
- Wire an error-reporting sink (e.g. Sentry) into the root error boundary (`src/routes/__root.tsx`) for
  both client and server functions — there is currently none.
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

- Protect `main`; require PR review; add a minimal CI workflow (lint + build).
- Publish, smoke-test the QR flow end-to-end on a real phone, then hand over admin access to the client and remove the test admin.

## Estimated monthly costs

| Item | Cost |
|---|---|
| Custom domain (`ploiestiulistoricdigital.ro`) | ~$1–2 / mo (amortized) |
| Supabase usage (DB + storage + auth) | Free tier covers small traffic; paid tier if usage grows |
| Netlify hosting | Free tier covers small traffic |
| Anthropic API usage (translation button) | Pay-as-you-go, negligible at admin-only usage |
