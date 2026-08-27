# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Poveștile Caselor" (Poveștile Ploieștiului / house-tales-scanner) — a Romanian-language catalog of
historic buildings. Visitors scan a QR code on a building's façade (or browse the public archive) to
read its history; admins manage building records, images, and QR exports behind an authenticated
`/admin` area. Built with TanStack Start + Supabase, deployed on Netlify.

## Commands

Package manager is **bun** (see `bunfig.toml`, `bun.lock`).

```
bun install          # install deps
bun run dev           # vite dev server
bun run build         # production build
bun run build:dev     # dev-mode build
bun run preview        # preview the production build
bun run lint            # eslint .
bun run format          # prettier --write .
```

There is no JS/TS test runner configured. The one test in the repo is a Playwright/Python UI-layout
check:

```
python3 tests/header_layout_test.py     # requires the dev server running at http://localhost:8080
```

## Architecture

**Stack:** TanStack Start (file-based router + SSR, React 19) + Vite + Tailwind v4 + shadcn/ui
(Radix primitives in `src/components/ui/`) + Supabase (Postgres, auth, storage).

### Routing (`src/routes/`)

File-based routing per TanStack Start conventions — see [src/routes/README.md](src/routes/README.md)
for the naming rules (`$id` dynamic segments, `{-$category}` optional, `$` splat, `_layout` vs
`__root`). Key routes:

- `index.tsx` — public home / archive browse
- `b.$slug.tsx` — public building detail page (the QR-code destination)
- `auth.tsx`, `reset-password.tsx` — auth flows
- `_authenticated/route.tsx` — layout guard: client-side (`ssr: false`), redirects to `/auth` unless a
  Supabase session exists; wraps `_authenticated/admin.tsx`, `admin_.buildings.$id.edit.tsx`,
  `admin_.buildings.new.tsx`
- `mcp.ts`, `[.mcp]/*`, `[.well-known]/oauth-protected-resource.ts` — MCP server endpoint + OAuth
  protected-resource metadata (see MCP section below)
- `__root.tsx` — app shell (head tags, `<Outlet/>`, i18n + query providers, toaster, 404/error
  boundaries)
- `routeTree.gen.ts` is auto-generated — never hand-edit it

Route-level admin access is enforced twice: `_authenticated/route.tsx` only checks for a logged-in
user, so `requireAdminRoute` (`src/lib/admin-guard.ts`) additionally checks the `user_roles` table for
an `admin` role and redirects non-admins home. Server functions re-check admin status independently
server-side (see below) — the client-side guards are UX only, not the security boundary.

### Server functions (`src/lib/*.functions.ts`)

Mutations and privileged reads go through TanStack Start `createServerFn`, not client-side Supabase
calls directly. Pattern (see `src/lib/buildings.functions.ts`):

1. `.middleware([requireSupabaseAuth])` — validates the `Authorization: Bearer <jwt>` header
   server-side and injects `{ supabase, userId, claims }` into context (see
   `src/integrations/supabase/auth-middleware.ts`).
2. `.inputValidator(...)` — zod schema parse.
3. `.handler(...)` — calls `assertAdmin(context)` for any mutating operation (checks `user_roles` for
   an `admin` row), then performs the query with the request-scoped, RLS-bound `context.supabase`
   client (not the service-role client).

### Supabase clients (`src/integrations/supabase/`)

Three distinct clients:

- `client.ts` — browser client, publishable key, RLS-bound, session persisted to `localStorage`.
- `client.server.ts` — service-role client (`supabaseAdmin`), bypasses RLS. Server-only; import it
  lazily inside handlers (`await import(...)`), never at top level in a route or `*.functions.ts`
  file, since those ship to the client bundle.
- `auth-middleware.ts` — per-request client built from the caller's bearer token, used by server
  functions so queries run under the caller's own RLS policies.

`types.ts` is the generated Postgres schema; regenerate via the Supabase CLI rather than editing by
hand.

### Database (`supabase/migrations/`)

Plain numbered SQL migration files (Supabase CLI convention). Core tables: `buildings`,
`building_images`, `user_roles`, plus QR export tracking. RLS is expected on every `public.*` table;
when adding a table, add an explicit migration with RLS policies and grants rather than relying on
defaults — see the RLS-audit item in [plan.md](plan.md).

### MCP server (`src/lib/mcp/`)

Exposes the buildings catalog as MCP tools (`src/lib/mcp/tools/*.ts`, wired in `src/lib/mcp/index.ts`,
served from `src/routes/mcp.ts`) via `@lovable.dev/mcp-js` (a thin wrapper around the official
`@modelcontextprotocol/sdk`, kept intentionally — see the note below), OAuth-protected against the
Supabase auth issuer. Read tools (`list_buildings`, `get_building`) are open; write tools
(`create_building`/`update_building`/`delete_building`/`add_building_image`) re-check
`ctx.isAuthenticated()` and the `user_roles` admin row inside the handler — mirror the
`assertAdmin`-style check when adding new tools, don't rely on route-level auth alone. The four
`mcp.ts`/`[.mcp]/*`/`[.well-known]/oauth-protected-resource.ts` route files and the OAuth consent
screen at `src/routes/[.]lovable.oauth.consent.tsx` are regenerated by `mcpPlugin()` (wired in
`vite.config.ts`) — don't hand-edit them; the consent route's `/.lovable/oauth/consent` path is kept
as-is because renaming it would require updating the redirect URI in Supabase's hosted OAuth config
too.

### i18n (`src/lib/i18n.tsx`)

Custom lightweight i18n (no external library): `Lang = "ro" | "en" | "fr"`, default `"ro"`, dictionaries
as flat `key -> string` records, persisted to `localStorage` under `hts.lang`. Building content itself
is multi-lingual at the data level (`name`/`name_en`/`name_fr`, `history`/`history_en`/`history_fr`,
etc. in `buildings.functions.ts`), separate from UI-string translation.

### Path alias

`@/*` maps to `src/*` (see `tsconfig.json` and `components.json` for the shadcn aliases).

## Notes

- `plan.md` is the production-readiness checklist (security hardening, domain/SEO, email, storage
  cleanup, observability, legal pages, release process) — consult it before assuming a feature (e.g.
  storage cleanup on delete, error reporting sink) is already wired up.
- `types.ts` and `routeTree.gen.ts` are auto-generated — treat those as read-only and make schema or
  routing changes through the Supabase CLI / TanStack Router respectively instead. The MCP route files
  under `src/routes/` (see MCP section above) are similarly auto-regenerated by `mcpPlugin()`.
