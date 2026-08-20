# Production Readiness Plan

Deliverable: a new `plan.md` at the project root that documents the steps below, plus the code/config changes needed to actually harden the app for production.

## 1. Security hardening (code + auth config)

- Remove `claimFirstAdmin` from `src/lib/buildings.functions.ts` and any UI that calls it — bootstrapping is done, keeping it is a privilege-escalation risk.
- Auth config (`supabase--configure_auth`):
  - `auto_confirm_email: false` (require real email confirmation).
  - `password_hibp_enabled: true` (leaked-password check).
  - `mailer_otp_exp` ≤ 3600, sensible rate limits.
- Confirm all `public.*` tables have RLS enabled + explicit `GRANT`s, and that the anon role only sees what the public site truly needs (`buildings`, `building_images`).
- Rotate the test admin password (or delete `admin+test@buildingstories.app`) before go-live.
- Run `security--run_security_scan` and resolve any critical/high findings.

## 2. Domain, URLs, SEO

- Buy/connect a custom domain in Project Settings → Domains.
- Replace the hardcoded `PUBLIC_BASE = "https://house-tales-scanner.lovable.app"` in `src/lib/buildings.functions.ts` with an env-driven value (e.g. `process.env.PUBLIC_SITE_URL`) so QR codes point at the production domain.
- Regenerate `qr_code_url` for existing buildings after the domain switch (one-off migration/update).
- Add `robots.txt` and a `sitemap.xml` route listing all buildings.
- Verify `__root.tsx` metadata + per-building `head()` (og:title, og:description, og:image from cover) are correct.

## 3. Emails (Lovable Email)

- Configure a verified sending domain via Lovable Email.
- Customize auth email templates (confirm signup, reset password, magic link) in RO + EN with the site branding.

## 4. Storage & media

- Confirm `building-images` and `qr-codes` buckets have the intended public/private posture and size limits.
- Add server-side cleanup: when a building or gallery image is deleted, remove the underlying object from storage (currently only the DB row is removed).
- Consider an image CDN transform / max-dimension on upload to keep mobile payloads small.

## 5. Observability & backups

- Enable Lovable Cloud daily backups; document restore procedure.
- Wire an error-reporting sink (Sentry or similar) into `reportLovableError` for both client and server functions.
- Add basic uptime monitoring on `/` and one `/b/<slug>` route.

## 6. Performance & UX polish

- Verify `Cache-Control` on public building pages (SSR HTML + images).
- Preload the hero/cover image on `/b/$slug`.
- Lighthouse pass on mobile: target ≥90 for Performance, Accessibility, SEO.
- Confirm 404 / error boundaries render correctly for unknown slugs.

## 7. Legal & content

- Add Privacy Policy, Terms, and Cookie notice pages (RO + EN).
- Add an admin-visible content checklist (cover image, RO + EN text) before a building can be marked "published".
- Optional: add a `published` boolean on `buildings` so drafts are not publicly reachable.

## 8. Release process

- Enable GitHub sync; protect `main`; require PR review.
- Hide the "Edit with Lovable" badge (Pro plan) for the production deploy.
- Publish, smoke-test the QR flow end-to-end on a real phone, then hand over admin access to the client and remove the test admin.

## Technical section (what actually gets edited)

- **New file**: `plan.md` at repo root containing the sections above in a client-readable form.
- **Edit** `src/lib/buildings.functions.ts`: remove `claimFirstAdmin`; replace `PUBLIC_BASE` constant with an env lookup + sane fallback.
- **Edit** any UI referencing `claimFirstAdmin` (admin page) to drop the button.
- **Auth config call** via `supabase--configure_auth` with the values in §1.
- **New routes**: `src/routes/robots[.]txt.ts`, `src/routes/sitemap[.]xml.ts`, `src/routes/privacy.tsx`, `src/routes/terms.tsx` (RO/EN via existing i18n).
- **Migration**: optional `published boolean not null default true` on `buildings` + RLS tweak so anon only sees `published = true`.
- **Storage cleanup**: extend `deleteBuilding` / `deleteBuildingImage` server fns to also delete the storage object via `supabaseAdmin.storage`.

No changes to `src/integrations/supabase/*` auto-generated files, and no touching `auth`/`storage`/`realtime` schemas.
