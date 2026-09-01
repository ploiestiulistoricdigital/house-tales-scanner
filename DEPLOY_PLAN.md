# Deploy Plan — Staging → Production

This document describes the process for running two isolated environments —
**staging** and **production** — each with its own GitHub branch, Netlify
site, and Supabase project, so changes are validated in staging before being
promoted to production. This is a manual process for the team to follow;
nothing here is automated beyond what's explicitly called out (optional CI).

## 0. Purpose & scope

- **staging** — an isolated environment for validating changes before they
  reach real users. Own GitHub branch, own Netlify site, own Supabase
  project (own database, auth, storage — no production data).
- **production** — the live site at `ploiestiulistoricdigital.ro`.
- Promotion flows one direction: `staging → production`, only after manual
  validation on staging.

## 1. Environment inventory

Fill in the blank cells once staging is set up (§2) and keep this updated.

| | staging | production |
|---|---|---|
| GitHub branch | `staging` | `main` |
| Netlify site name / URL | _fill in_ | `ploiestiulistoricdigital.ro` |
| Supabase project ref | _fill in_ | `gxpiixyldoqxvluogziy` |
| Supabase Auth Site URL | _fill in_ | `https://ploiestiulistoricdigital.ro` |
| MCP OAuth redirect URI | _fill in_ | `https://ploiestiulistoricdigital.ro/.lovable/oauth/consent` |

## 2. One-time setup

### 2.1 GitHub

1. Create a `staging` branch off the current `main`.
2. Protect `main`: require a PR before merging, require review, disallow
   direct pushes and force-pushes.
3. Protect `staging` with lighter rules (require a PR is enough).
4. Add to `.gitignore`:
   ```
   supabase/.temp/
   supabase/.branches/
   ```
   (These are Supabase CLI link artifacts created locally when running
   `supabase link` — they already exist untracked on disk today, and matter
   more once you're relinking the CLI between two projects.)

### 2.2 Supabase

1. Create a **second Supabase project** for staging.
2. Link the CLI and replay all existing migrations:
   ```
   supabase link --project-ref <staging-ref>
   supabase db push
   ```
3. **Recreate storage buckets by hand** — `building-images` and `qr-codes`
   are not created by migrations (only RLS policies on `storage.objects`
   are), so create both buckets in the new project with the same
   public/private posture as production.
4. Create a staging admin user (via Supabase Auth) and give it an `admin`
   row in `user_roles` so the admin area is testable.
5. In Supabase Auth settings, set **Site URL** and **Redirect URLs** to the
   staging domain (set once the Netlify staging site exists, §2.3).
6. **MCP OAuth app** — register the OAuth redirect URI for this project as
   `https://<staging-domain>/.lovable/oauth/consent`. This is the trickiest
   step: `src/lib/mcp/index.ts` builds the OAuth issuer URL directly from
   `VITE_SUPABASE_PROJECT_ID`, and Supabase's hosted OAuth app config is
   registered per-project — get either side wrong and MCP auth silently
   points at the wrong project, with no build-time error.

### 2.3 Netlify

1. Create a **new Netlify site** linked to the same GitHub repo (do not
   reuse the production site's branch-deploy contexts — a fully separate
   site keeps env vars, deploy history, and rollback cleanly isolated per
   environment).
2. Set that site's **Production branch** to `staging`.
3. In that site's dashboard, set every variable from `.env.example` to
   staging-specific values:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` → staging project
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
     → staging project
   - `VITE_SUPABASE_PROJECT_ID` → the staging project's ref (drives the MCP
     OAuth issuer — see 2.2 step 6)
   - `PUBLIC_SITE_URL`, `VITE_PUBLIC_SITE_URL` → the staging domain
     (`src/lib/site-url.ts` falls back to the production domain
     `https://ploiestiulistoricdigital.ro` if these are unset — staging
     **must** set both explicitly or QR codes/canonical links will point at
     production)
   - `ANTHROPIC_API_KEY` → can reuse the production key, or use a separate
     one if you want isolated usage/budget tracking
4. Assign a staging domain (a Netlify subdomain is fine, or a `staging.`
   DNS record).
5. `netlify.toml` is shared and environment-agnostic — no changes needed;
   its `SECRETS_SCAN_OMIT_KEYS = "SUPABASE_URL"` applies automatically to
   both sites.

### 2.4 (Optional) CI

Not required for the pipeline to work, but low-cost and closes an existing
`plan.md` §8 backlog item. Add `.github/workflows/ci.yml` running:
```
bun install
bun run lint
bun run build
```
on every PR into `staging` and `main`. Once added, make it a required
status check in both branches' protection rules.

## 3. Recurring promotion workflow

1. Branch off `staging` for the change; open a PR **into `staging`**.
2. If the change includes a migration file: link the CLI to the staging
   project, `supabase db push`, then `supabase migration list` to confirm
   there's no drift — do this before or at merge time.
3. Merge with a **regular merge commit** (never squash, never rebase — this
   keeps `staging` and `main` from diverging over time). Netlify
   auto-deploys the staging site.
4. **Validate on the staging domain:**
   - Admin login + CRUD (create/edit/delete a building)
   - Public building page renders correctly
   - QR flow end-to-end: hit `/b/<slug>`, confirm the QR image points at
     the staging domain (not production)
   - i18n toggle across RO/EN/FR
   - MCP tool call smoke test, if `src/lib/mcp/` was touched
   - Confirm the migration's effect looks correct in the staging DB
5. Once validated, open a PR **from `staging` into `main`** — again a
   regular merge commit, not squash/rebase.
6. If a migration is included: link the CLI to the production project,
   `supabase db push`, then `supabase migration list` to verify — do this
   right before or alongside the merge/deploy, never speculatively ahead of
   the code that depends on it. For breaking changes (renames, drops, new
   `NOT NULL` columns), use expand/contract: add nullable → backfill →
   deploy code that writes both old and new → make required/drop old in a
   follow-up migration. This repo has no down-migration tooling, so a
   mismatch between deployed code and applied schema needs to be
   impossible, not just unlikely.
7. Merge → Netlify auto-deploys production → smoke-test on the real domain
   and a real phone (QR scan, admin login), per `plan.md` §8.

## 4. Keeping branches in sync

Always promote `staging → main` wholesale — never cherry-pick individual
commits to production ahead of staging validation. If a hotfix must go
straight to `main`, merge `main` back into `staging` immediately afterward
so the branches don't drift apart.

## 5. Rollback

- **App-level:** for a fast revert, use Netlify's "publish previous deploy."
  For a durable fix, open a revert PR on `main` and let it redeploy normally.
- **DB-level:** there are no down-migrations. To undo a migration, write and
  apply a new forward migration that reverses the change (preferred — keeps
  `supabase migration list` accurate), or restore from a Supabase backup.
  Note: scheduled Supabase backups aren't enabled yet — see `plan.md` §5,
  which this plan surfaces as a prerequisite but doesn't fix.
- Sequence any rollback so schema and code are never mismatched mid-rollback
  — same expand/contract discipline as forward migrations, in reverse.

## 6. Gotchas specific to this codebase

- **MCP OAuth coupling** — `VITE_SUPABASE_PROJECT_ID` builds the OAuth
  issuer URL; the consent screen path (`/.lovable/oauth/consent`) is fixed,
  and its redirect URI is registered per-project in Supabase's hosted OAuth
  app config. Staging needs its own registration pointed at the staging
  domain (§2.2 step 6).
- `mcpPlugin({ trustForwardedHost: false })` in `vite.config.ts` relies on
  Netlify passing the real `Host` header through — this is host-derived, not
  hardcoded, so it should keep working per-site, but test an MCP OAuth flow
  against the staging domain once it exists to be sure.
- `PUBLIC_SITE_URL`/`VITE_PUBLIC_SITE_URL` fall back to the production
  domain if unset (`src/lib/site-url.ts`) — staging must set both.
- Re-linking the CLI between two project refs is manual and error-prone —
  check `supabase/.temp/project-ref` (or run `supabase status`) before every
  `db push` to confirm which project is actually linked.
- Storage buckets aren't migration-managed — a fresh staging project needs
  them created by hand, and posture (public/private) will silently drift
  from production if forgotten.
- Known gap (`plan.md` §4): deleting a building/image only removes the DB
  row, not the underlying storage object. This will replicate identically
  in staging — orphaned staging storage objects will accumulate the same
  way they do in production.
