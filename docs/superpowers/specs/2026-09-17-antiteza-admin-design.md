# Admin-managed before/after ("antiteza") image pairs

## Context

The homepage's "Ploieștiul atunci și acum" section (`src/routes/index.tsx`) currently cycles through
a hardcoded list of 4 before/after image pairs (`ANTITEZA_PAIRS`), rotating automatically every 10
seconds via `BeforeAfterSlider`. Each pair's images live as static files at
`public/images/antiteza/<Name>-trecut.jpg` / `<Name>-prezent.jpg`, with no captions and no way to add,
remove, reorder, or recaption pairs without a code change and redeploy.

This feature moves that content into the database and gives admins full CRUD over it — add/edit/delete
pairs, upload their own before/after photos, and set a caption shown below each photo — following the
same patterns already established for `buildings` / `building_images` / `heritage_items` (server
functions with `assertAdmin`, service-role writes, RLS-open reads, trilingual RO/EN/FR fields with a
translate button in the admin form).

Decisions made during brainstorming:
- Pairs are purely decorative — no link to a building or heritage item.
- Captions are per-picture (one below the "before" photo, one below the "after" photo), trilingual.
- The 4 existing pairs are seeded as real rows in a one-time data migration so production is visually
  unchanged right after this ships; the static files under `public/images/antiteza/` are then removed.

## Data model

New table `antiteza_pairs`:

```sql
CREATE TABLE public.antiteza_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  before_caption TEXT,
  before_caption_en TEXT,
  before_caption_fr TEXT,
  after_caption TEXT,
  after_caption_en TEXT,
  after_caption_fr TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS follows the current strict pattern (the one `20260827180000_restrict_authenticated_write_grants.sql`
moved `buildings`/`building_images` to), not the older direct-grant pattern:

```sql
GRANT SELECT ON public.antiteza_pairs TO anon, authenticated;
GRANT ALL ON public.antiteza_pairs TO service_role;
ALTER TABLE public.antiteza_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view antiteza pairs" ON public.antiteza_pairs
FOR SELECT TO anon, authenticated USING (true);
```

No `INSERT`/`UPDATE`/`DELETE` grants to `authenticated` at all — every mutation goes through a
`createServerFn` using the service-role client (`client.server.ts`) after an `assertAdmin(context)`
check, exactly like `createBuilding`/`updateBuilding`/`deleteBuilding`. `sort_order` determines both
the admin list order and the homepage rotation order.

## Storage

New public Supabase Storage bucket, `antiteza-images` (public read, writes only via the browser
`supabase` client from an already-admin-gated route — same trust model as the existing
`building-images` bucket used by `ImageUploader`). Kept separate from `building-images` so antiteza
photos aren't mixed in with per-building galleries.

## Server functions (`src/lib/antiteza.functions.ts`, new file)

Mirrors `buildings.functions.ts`'s image functions:

- No dedicated list/read server function: both the public homepage and the admin list page read
  `antiteza_pairs` directly via the browser Supabase client (RLS-open `SELECT`), matching how
  `heritage_items`/`buildings` reads and `AdminPage.tsx`'s building list already work today.
- `createAntitezaPair` — `POST`, `assertAdmin` + rate limit, zod input validating both image URLs
  (required) and the 6 optional caption fields (max length matching `building_images.caption`, 300
  chars) and `sort_order`, sanitizes nothing (captions are plain text, not rich text — rendered as
  plain `<span>`/`<p>`, never `dangerouslySetInnerHTML`), inserts via `supabaseAdmin`.
- `updateAntitezaPair` — `POST`, same shape plus `id`.
- `deleteAntitezaPair` — `POST`, `assertAdmin` + rate limit, deletes by `id`. (Does not delete the
  underlying storage objects — consistent with how `deleteBuildingImage` already behaves; storage
  cleanup is a known pre-existing gap tracked in `plan.md`, not introduced by this feature.)

Mutations rate-limit under a new `antiteza:mutate` key (own resource, not shared with
`buildings:mutate`), using the same `60` limit / `300`s window shape as the existing calls.

## Admin UI

- New route `src/routes/_authenticated/admin_.antiteza.tsx` — list page, `beforeLoad:
  requireAdminRoute()`, fetches `antiteza_pairs` ordered by `sort_order` via the browser client
  (`useQuery`), renders a table: before/after thumbnails, RO caption preview, sort order, edit/delete
  actions (`ConfirmDialog` for delete) — same hand-rolled shape as `AdminPage.tsx`, since the repo has
  no shared list abstraction to reuse.
- New routes `admin_.antiteza.new.tsx` / `admin_.antiteza.$id.edit.tsx` — a form component (new file
  `src/components/admin/AntitezaPairForm.tsx`) with two upload blocks (before/after), each showing the
  current image preview, an `ImageUploader` (bucket=`"antiteza-images"`), and RO/EN/FR caption inputs
  with a translate button (same `TranslatableField`/`chunkText`/`translateLong` pattern already used in
  `BuildingForm`/`HeritageItemForm`, but using the plain-text `chunkText`, not `chunkRichText`, since
  captions aren't rich text), plus a `sort_order` number field.
- `AdminPage.tsx`'s header nav gets a new link to `/admin/antiteza`, alongside the existing links to
  buildings and `/admin/heritage`.

## Homepage integration (`src/routes/index.tsx`)

- Loader adds a second query fetching `antiteza_pairs` ordered by `sort_order` (same loader that
  already fetches `story` and `heritageImages` — one more `Promise.all` member).
- `ANTITEZA_PAIRS` constant and the `antitezaPair` derivation are removed; `antitezaIndex` now indexes
  into the loaded array, and the `setInterval` rotation logic (added in the previous change) is
  unchanged except it modulos by the loaded array's length instead of a fixed constant.
- If the array is empty, the entire before/after `<section>` is not rendered (matches how the featured
  story section already guards on `story &&`).
- `BeforeAfterSlider` gains two new optional props, `beforeCaption`/`afterCaption` (localized via
  `pick(lang, ...)` at the call site, same helper already imported in `b.$slug.tsx`/used inline in
  `index.tsx`), rendered as a small caption line under each side's existing label badge.

## Seeding (one-time, not a code path)

A one-time script (run locally against production via the Supabase CLI/service-role key, not committed
as an app code path) uploads the 4 existing files from `public/images/antiteza/` to the new
`antiteza-images` bucket and inserts 4 rows (`sort_order` 0–3) with empty captions (the current static
version has no captions either, so there's nothing to backfill there). After the script runs
successfully against production, `public/images/antiteza/` is deleted from the repo in the same PR that
ships this feature.

## Testing

- `bunx tsc --noEmit` and `bun run build`.
- Manual: create/edit/delete a pair in `/admin/antiteza`, confirm captions and images show correctly
  (RO/EN/FR) on the homepage, confirm rotation still works with a non-4-length list (e.g. 2 or 5
  pairs), confirm the section disappears cleanly if all pairs are deleted, confirm a non-admin can't
  reach the admin routes or call the mutating server functions directly.
- Re-run `python3 tests/header_layout_test.py` only if header markup changes (it shouldn't here).

## Out of scope

- Drag-and-drop reordering (manual `sort_order` number field only, consistent with
  `building_images`/gallery ordering today).
- Linking a pair to a building/heritage item.
- Storage cleanup of orphaned images on delete (pre-existing gap, tracked separately in `plan.md`).
