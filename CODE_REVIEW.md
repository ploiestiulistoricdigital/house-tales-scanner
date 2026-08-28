# Code Review — Poveștile Caselor

Comprehensive review of the TanStack Start + Supabase + Netlify codebase.
Items already tracked in `plan.md` are noted as such and not duplicated in the priority list.

Severity scale: **CRITICAL** > **HIGH** > **MEDIUM** > **LOW**

---

## 1. Security

### CRITICAL

#### SEC-1 · `translateText` has no authentication middleware
**Status:** Complete
**File:** `src/lib/translate.functions.ts:15–17`

`translateText` is a `createServerFn` with only `.inputValidator()` — no `.middleware([requireSupabaseAuth])` and no `assertAdmin()` call. Any anonymous HTTP client can POST to this endpoint and trigger Anthropic API calls at the owner's expense.

```ts
// Current (insecure)
export const translateText = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => { ... });

// Required
export const translateText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    ...
  });
```

#### SEC-2 · `claimFirstAdmin` is an active privilege-escalation path
**Status:** Complete
**File:** `src/lib/buildings.functions.ts:167–181`
**Already in:** `plan.md §1`

The function is still deployed and reachable. The count check is non-atomic; two concurrent authenticated users could both satisfy `count === 0` and both be granted admin. **Delete this function and every call site before production.**

#### SEC-3 · JWT validation is structural, not cryptographic
**Status:** Complete
**File:** `src/integrations/supabase/auth-middleware.ts:69–97`

The middleware checks `token.split('.').length !== 3` before calling `supabase.auth.getClaims(token)`. The structural check is trivially satisfied by any malformed token. `getClaims()` is the real verification step, but the code is unclear about this contract.

Fix: remove the structural pre-check and rely entirely on `getClaims()` for validation; add a comment explaining that `getClaims()` performs cryptographic verification.

---

### HIGH

#### SEC-4 · No rate limiting on any server function
**Status:** Complete
**Files:** `src/lib/*.functions.ts` (all)

All eleven server functions — including `translateText` (Anthropic API) and bulk operations on buildings — have zero rate limiting. This enables cost-amplification attacks and DoS.

Add a lightweight per-user rate-limit middleware or use Netlify Edge rate limiting. Priority: `translateText` first (direct financial cost), then mutations.

**Resolution:** Added `assertRateLimit()` (`src/lib/rate-limit.ts`), backed by a `public.rate_limits` table + atomic `public.check_rate_limit()` SQL function (migration `supabase/migrations/20260827120000_add_rate_limiting.sql`), both locked to `service_role`. Wired into `translateText` (150 req / 10 min — sized for the client-side chunking burst on a max-length field) and every mutating function in `buildings.functions.ts` / `qr-exports.functions.ts` (60 req / 5 min). Migration applied to the live project (`gxpiixyldoqxvluogziy`) and `types.ts` regenerated against it.

**Note found along the way:** `supabase/config.toml` and the local `.env` disagreed on which Supabase project is production (`gxpiixyldoqxvluogziy` vs. the `.env`'s `qbfbbpmpgzsairoejztx`). Confirmed via the live site's network requests that `gxpiixyldoqxvluogziy` is the real one — `config.toml` now points there. The regenerated `types.ts` also dropped a `contact_messages` table that was in the old file but isn't used anywhere in the code and doesn't exist on `gxpiixyldoqxvluogziy`; it was almost certainly a leftover from generating types against the wrong project. The local `.env` is still stale and should be updated separately (out of scope for this fix).

#### SEC-5 · Overly permissive `GRANT` on `authenticated` role
**Status:** Done
**File:** `supabase/migrations/20260718163324_*.sql:51,80`
**Also in:** `plan.md §1` (RLS audit)

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_images TO authenticated;
```

RLS policies enforce admin-only writes, but if RLS is ever accidentally disabled or a policy is misconfigured, any logged-in user can freely mutate data. Restrict to `SELECT`; let service_role and RLS policies handle writes.

**Resolution:** Added migration `supabase/migrations/20260827180000_restrict_authenticated_write_grants.sql`, which revokes `INSERT, UPDATE, DELETE` on `public.buildings` and `public.building_images` from `authenticated` (leaving the existing `SELECT` grant). Writes now go through the service-role client (`supabaseAdmin`, lazily imported) after the existing app-level `assertAdmin()`/admin-role check, matching the pattern already used for `qr_code_exports` in `qr-exports.functions.ts`:
- `src/lib/buildings.functions.ts` — `createBuilding`, `updateBuilding`, `deleteBuilding`, `addBuildingImage`, `updateBuildingImage`, `deleteBuildingImage` now write via `supabaseAdmin` instead of the caller's RLS-bound `context.supabase`.
- `src/lib/mcp/tools/{create,update,delete}-building.ts` and `add-building-image.ts` write via `supabaseAdmin` for the same reason — they run under the `authenticated` role too (a client built from the caller's bearer token), so they would otherwise have broken once the GRANT was restricted.

**Note found along the way:** while switching `add-building-image.ts` to the properly-typed `supabaseAdmin` client, TypeScript caught a pre-existing bug — the MCP tool's `insert()` call passed the raw input object (`url`, `position`) instead of mapping to the actual column names (`image_url`, `sort_order`). The untyped ad-hoc client used previously (`createClient(...)` with no type parameter) silently allowed this, so the tool has likely been failing at runtime with a Postgres "column not found" error since it was added. Fixed the mapping as part of this change; worth a follow-up look under SEC-6 (MCP input validation) for whether the other MCP tools have similar drift from the DB schema.

Applied to the live project (`gxpiixyldoqxvluogziy`): the `REVOKE` statements were run directly via the dashboard SQL editor (the CLI account initially linked didn't have management-API privileges for that project), and `supabase migration repair --status applied 20260827180000` brought the CLI's local migration history back in sync with the remote — confirmed via `supabase migration list`.

#### SEC-6 · MCP write tools have weaker input validation than server functions
**Status:** Done
**Files:** `src/lib/mcp/tools/create-building.ts`, `update-building.ts`, `add-building-image.ts`

The MCP tools lack max-length constraints and URL-scheme guards that `buildings.functions.ts` already applies. A malicious client could submit a 10 MB `history` string or a `javascript:` URL as `cover_image_url`.

Mirror the Zod schema from `buildings.functions.ts` in all MCP write tools:
- `name`: `max(200)`, `address`: `max(300)`, `history`: `max(50000)`
- `cover_image_url`: reject `data:` and `javascript:` schemes

**Resolution:** Added max-length constraints to every string field in `create_building` and `update_building` (`slug` 120, `name` 200, `address` 300, `short_description` 500, `history` 50000, `year_built` 50, `architect` 200) and to `caption` (300) and `position` (0–9999) in `add_building_image`, mirroring `buildingInput`/`imageInput` in `src/lib/buildings.functions.ts`. Added a shared `safeImageUrl` Zod schema (`src/lib/mcp/tools/validation.ts` — `.url().max(2000)` plus a refinement rejecting `javascript:`/`data:`/`vbscript:` schemes) and applied it to `cover_image_url` in both building tools and `url` in `add_building_image`, since none of these schemes were actually blocked by plain `z.string().url()` in either the MCP tools or the server functions.

#### SEC-7 · Error messages expose internal config names
**Status:** Done
**File:** `src/integrations/supabase/auth-middleware.ts:44–45`

When Supabase env vars are missing, the thrown `Error` message includes the variable names (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`). This message propagates to clients.

Keep detailed messages in `console.error()`; throw a generic `"Missing required server configuration"` to the caller.

**Resolution:** The variable-name list now only goes to `console.error()`; the thrown error the caller/client sees is the generic `"Missing required server configuration"`.

#### SEC-8 · `trustForwardedHost: true` in MCP handler without documented guarantees
**File:** `src/routes/mcp.ts:12`

If Netlify's edge does not strip user-supplied `X-Forwarded-Host` headers, OAuth redirect URIs can be hijacked. Verify Netlify strips this header, or set `trustForwardedHost: false` and hard-code the expected origin.

---

### MEDIUM

#### SEC-9 · No domain whitelist for `cover_image_url` (SSRF surface)
**Files:** `src/lib/buildings.functions.ts:16`, MCP tools

URLs accepted for cover images are validated only by `z.string().url()`, which allows internal network addresses. Add an allowlist of trusted CDN hostnames (e.g., Supabase Storage subdomain) in the Zod schema.

#### SEC-10 · `atob()` without try-catch in QR export handler
**File:** `src/lib/qr-exports.functions.ts:29`

```ts
const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
```

Malformed base64 throws a synchronous `DOMException` that propagates as an unhandled error, potentially leaking a stack trace. Wrap in try-catch and rethrow a sanitised error.

#### SEC-11 · No ESLint rule preventing top-level `client.server` imports
**File:** `src/integrations/supabase/client.server.ts`

The service-role key is safe today because all imports are lazy (`await import(...)`), but there is no linting guard against a future top-level import that would bundle the key into client code. Add a `no-restricted-imports` rule pointing to `@/integrations/supabase/client.server`.

#### SEC-12 · Inconsistent admin-check pattern in MCP tools
**Files:** `src/lib/mcp/tools/*.ts`

MCP write tools inline an ad-hoc admin check (query `user_roles` directly) instead of reusing `assertAdmin()`. Create a shared `checkMcpAdmin(ctx, supabase)` helper and call it at the top of every MCP write handler, so a missed check is immediately visible in review.

---

## 2. Architecture & Code Quality

### HIGH

#### ARCH-1 · Missing error state on `useQuery` results (home page & admin list)
**Files:** `src/routes/index.tsx:73–83`, `src/routes/_authenticated/admin.tsx:56–67`

When the buildings query fails, `isLoading` becomes `false` and the component renders the empty state — users cannot distinguish a network error from "no buildings." Both call sites must destructure `isError`/`error` and render a visible error UI.

#### ARCH-2 · Silent error swallowing in PDF QR export
**File:** `src/routes/_authenticated/admin.tsx:201–203`

```ts
try { pdf.addImage(...) } catch {}
```

Failed image embeds are silently dropped. Admins receive a PDF with missing QR codes and no warning. At minimum `console.warn` with context; preferably accumulate failures and show a toast after generation.

#### ARCH-3 · `Promise.all` over QR fetches crashes entire export on one failure
**File:** `src/routes/_authenticated/admin.tsx:119–137`

A single failed QR fetch aborts the PDF for all buildings. Replace with `Promise.allSettled()` and skip (or placeholder) failed entries; report partial failures to the user.

#### ARCH-4 · Pervasive `as any` casts on Supabase query results
**Files:** `src/routes/_authenticated/admin_.buildings.$id.edit.tsx:230–255`, `src/lib/buildings.functions.ts:25`, `src/lib/qr-exports.functions.ts:5`

Supabase's generated `types.ts` covers all query shapes. Replace `(building as any)` with the generated row type and use proper null narrowing. This surfaces real type bugs that are currently hidden.

#### ARCH-5 · Sequential building + images fetches on the public detail page
**File:** `src/routes/b.$slug.tsx:45–59`

Two round-trips to Supabase on every page load. Combine into a single query using a Supabase join:
```ts
supabase.from("buildings").select("*, building_images(id, image_url, caption, sort_order)").eq("slug", slug)
```
or at minimum fetch in parallel with `Promise.all`.

---

### MEDIUM

#### ARCH-6 · `catch (e: any)` across 6+ error handlers
**Files:** `src/routes/auth.tsx:61`, `src/components/BuildingForm.tsx:144,171`, `src/routes/_authenticated/admin.tsx:212,234`, and others

`catch (e: any)` followed by `e?.message` can crash at runtime if `e` is not an `Error`. Use `catch (e: unknown)` and narrow with `e instanceof Error`.

#### ARCH-7 · All buildings loaded into memory, paginated client-side
**File:** `src/routes/index.tsx:34–93`

The full `buildings` table is fetched and sliced in-memory. Add `.range(start, end)` to the Supabase query and include `page`/`perPage` in the React Query key so pages are cached individually.

#### ARCH-8 · Clipboard write without error handling
**File:** `src/routes/_authenticated/admin.tsx:85–90`

`navigator.clipboard.writeText()` can throw in non-secure contexts or when permission is denied. Wrap in try-catch and show a toast on failure.

#### ARCH-9 · `CaptionRow` receives six props (prop drilling)
**File:** `src/routes/_authenticated/admin_.buildings.$id.edit.tsx:272–290`

Minor prop-drilling. A `CaptionRowGroup` component owning its own state would be cleaner, but this is low-priority.

---

## 3. Performance

### HIGH

#### PERF-1 · Images missing `width`, `height`, and `srcset`
**Files:** `src/routes/b.$slug.tsx:153,245`, `src/routes/index.tsx:193`

No intrinsic dimensions cause Cumulative Layout Shift; no `srcset` wastes bandwidth on mobile. Add explicit `width`/`height` on every `<img>`. For the hero cover, use `loading="eager" decoding="async"`; for gallery thumbnails and archive cards, `loading="lazy"`.

#### PERF-2 · `SELECT *` on building queries sends unnecessary payload
**Files:** `src/routes/b.$slug.tsx:48`, `src/components/QrExportHistory.tsx:21`

The public building detail page fetches all columns including large `history_*` fields regardless of current language. Select only the columns the page renders. (The admin edit page legitimately needs all columns.)

#### PERF-3 · No `Cache-Control` headers for SSR pages
**File:** `netlify.toml`
**Already in:** `plan.md §6`

Add cache rules for `/b/*` (5 min client / 1 hr CDN with stale-while-revalidate) and for hashed static assets (1 year immutable).

#### PERF-4 · Missing preload hints for hero image and fonts
**File:** `src/routes/__root.tsx:86–98`
**Already in:** `plan.md §6`

Add `<link rel="preload" as="image" href="/atom-logo.png">` in the root head. On building detail pages, add a `preload` for `building.cover_image_url` from the loader.

#### PERF-5 · Admin-only heavy deps shipped in public bundle
**Files:** `package.json`, `src/routes/_authenticated/admin.tsx`

`jsPDF`, `react-hook-form`, `react-resizable-panels`, `date-fns`, and `embla-carousel` are all bundled into the initial download even for public visitors. Wrap admin routes with TanStack Router's `lazy()` to split them.

---

### MEDIUM

#### PERF-6 · Duplicate `pick()` utility defined in two route files
**Files:** `src/routes/b.$slug.tsx:28–41`, `src/routes/index.tsx:36–49`

Identical function, two definitions. Extract to `src/lib/content-locale.ts` and import from both routes.

#### PERF-7 · All three i18n dictionaries loaded on every page
**File:** `src/lib/i18n.tsx`

Approx. 600 string entries (RO + EN + FR) are inlined in one module. Split into three JSON files and dynamically `import()` only the active language.

#### PERF-8 · No `React.memo` on building cards and pagination controls
**File:** `src/routes/index.tsx:179–346`

Building cards re-render on every language switch or pagination change. Memoize the card component and `PaginationControls`.

---

## 4. Developer Experience & Maintainability

### HIGH

#### DX-1 · `<html lang="ro">` is hardcoded and never updates
**File:** `src/routes/__root.tsx:108`

The SSR shell serves `lang="ro"` regardless of the user's chosen language. `i18n.tsx` does patch `document.documentElement.lang` on the client (line ~602), but the SSR HTML is wrong for EN/FR users, breaking screenreaders and language-aware search engines.

Pass the detected/default language to the root shell so the `lang` attribute is correct on first paint.

#### DX-2 · Silent persistence failure in QR export (user data loss)
**File:** `src/components/QrCodePreview.tsx:31`

```ts
} catch (e) {
  console.error("Failed to save QR export", e);  // user sees nothing
}
```

The download completes but the database record is never written. The admin believes the export is saved; audit history is silently broken. Emit a `toast.error()` when persistence fails.

#### DX-3 · No `.env.example` file
**File:** (missing)

Developers must grep the codebase to discover required environment variables. Create `.env.example` documenting every variable (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PUBLIC_SITE_URL`, `VITE_PUBLIC_SITE_URL`, `ANTHROPIC_API_KEY`) with placeholder values and comments.

#### DX-4 · i18n fallback silently serves wrong language
**File:** `src/lib/i18n.tsx:613–620`

```ts
const raw = dict[key] ?? RO[key] ?? key;
```

If a key exists in EN/FR but not in RO, Romanian users silently see English text. Add a development-mode warning (e.g., `if (import.meta.env.DEV && !dict[key] && !RO[key]) console.warn(...)`) to surface missing keys during authoring.

---

### MEDIUM

#### DX-5 · No error telemetry sink
**Files:** `src/routes/__root.tsx:39`, `src/server.ts:31,54`
**Already in:** `plan.md §5`

All errors go to `console.error()` only. Wire Sentry (or equivalent) into the root error boundary and server function catch blocks before launch.

#### DX-6 · Hardcoded brand strings in route `head()` meta
**Files:** `src/routes/__root.tsx:75,79–81`, `src/routes/index.tsx:19,25–26`, auth/admin routes

"Poveștile Caselor" and descriptions are hardcoded in Romanian across 8+ route head configs. Use i18n keys so a rebrand or translation update touches one place.

#### DX-7 · `noUnusedLocals` / `noUnusedParameters` disabled
**File:** `tsconfig.json:19–20`

Dead code accumulates silently. Enable these flags and prefix intentionally-ignored parameters with `_` (e.g., `_ctx`).

#### DX-8 · Missing JSDoc on non-obvious utilities
**Files:** `src/lib/text-chunks.ts`, `src/lib/error-capture.ts`

`chunkText()` has non-trivial sentence-boundary logic; `error-capture.ts` is a thin wrapper whose contract is unclear. Add a one-liner JSDoc to each explaining _why_ the logic exists.

#### DX-9 · Magic constants: QR API URL and storage bucket names
**Files:** `src/components/QrCodePreview.tsx:15–16`, `src/lib/buildings.functions.ts:38–40`

Extract to named constants:
```ts
const QR_API_BASE = "https://api.qrserver.com/v1/create-qr-code";
const STORAGE_BUCKETS = { images: "building-images", qr: "qr-codes" } as const;
```

---

## Prioritized Improvement List

Issues are ordered by impact × urgency. Items marked **(plan.md)** are already tracked there.

| Priority | ID | Summary | Effort |
|---|----|---------|--------|
| 1 | SEC-2 | Delete `claimFirstAdmin` and all call sites | XS |
| 2 | SEC-1 | Add `requireSupabaseAuth` + `assertAdmin` to `translateText` | XS |
| 3 | DX-3 | Create `.env.example` | XS |
| 4 | ARCH-2 | Surface QR embed failures in PDF export (replace `catch {}`) | XS |
| 5 | ARCH-3 | Use `Promise.allSettled` for QR batch export | XS |
| 6 | DX-2 | Show `toast.error` when QR persistence fails | XS |
| 7 | SEC-4 | Rate-limit `translateText` (at minimum) | S |
| 8 | ARCH-1 | Add error UI to home page and admin buildings list queries | S |
| 9 | DX-1 | Make `<html lang>` dynamic from i18n context | S |
| 10 | PERF-1 | Add `width`/`height` on all `<img>` tags | S |
| 11 | SEC-1→5 | Add GRANT/RLS restrictions (authenticated → SELECT only) | S · **(plan.md)** |
| 12 | SEC-11 | Add ESLint `no-restricted-imports` for `client.server` | XS |
| 13 | ARCH-4 | Replace `as any` casts with generated Supabase types | M |
| 14 | ARCH-6 | Replace `catch (e: any)` with `catch (e: unknown)` | S |
| 15 | ARCH-5 | Combine building + images into single Supabase query | S |
| 16 | SEC-6 | Tighten MCP tool input validation to match server function schemas | S |
| 17 | SEC-7 | Strip config names from user-facing error messages | XS |
| 18 | PERF-2 | Replace `SELECT *` with explicit column lists on public routes | S |
| 19 | PERF-6 | Extract duplicate `pick()` to `src/lib/content-locale.ts` | XS |
| 20 | SEC-9 | Add domain allowlist for `cover_image_url` | S |
| 21 | DX-4 | Warn on missing i18n keys in dev mode | XS |
| 22 | DX-7 | Enable `noUnusedLocals` / `noUnusedParameters` in tsconfig | S |
| 23 | DX-6 | Move hardcoded brand meta strings to i18n | M |
| 24 | PERF-5 | Lazy-load admin routes (code split) | M |
| 25 | PERF-7 | Split i18n dictionaries into per-language JSON dynamic imports | M |
| 26 | PERF-8 | Memoize building cards and pagination controls | S |
| 27 | SEC-3 | Clarify JWT validation contract in auth-middleware | XS |
| 28 | SEC-8 | Verify / remove `trustForwardedHost` in MCP handler | XS |
| 29 | SEC-10 | Wrap `atob()` in try-catch in QR export handler | XS |
| 30 | SEC-12 | Unify admin-check pattern in MCP tools | S |
| 31 | DX-5 | Wire error telemetry sink | M · **(plan.md)** |
| 32 | PERF-3 | Add Cache-Control headers in `netlify.toml` | XS · **(plan.md)** |
| 33 | PERF-4 | Add preload hints for hero image and fonts | XS · **(plan.md)** |
| 34 | ARCH-8 | Wrap clipboard write in try-catch | XS |
| 35 | DX-8 | Add JSDoc to `chunkText()` and `error-capture.ts` | XS |
| 36 | DX-9 | Extract QR API URL and bucket names to constants | XS |
| 37 | SEC-11 | Add startup env-var validation | S |

**Effort key:** XS < 30 min · S = 1–3 h · M = half-day

---

## Positive Findings

- Auth middleware correctly validates JWT via `getClaims()` and injects a scoped Supabase client — no RLS bypass possible through normal server function calls.
- `assertAdmin()` is consistently called server-side in all building mutation handlers; client-side guard is correctly documented as UX-only.
- Service-role client is always lazy-imported inside handlers; the module never appears at the top level of any route or `.functions.ts` file.
- Zod validation is present on every server function input.
- RLS is enabled on all `public.*` tables with explicit `USING` and `WITH CHECK` clauses on the latest migration.
- The `private.has_role()` function is schema-isolated and used consistently in RLS policies.
- `site-url.ts` correctly handles the VITE_ vs. server-only env var split.
- Supabase client is lazily initialised via Proxy — no connection overhead on pages that don't call it.
- Pagination is already implemented client-side on the home page.
