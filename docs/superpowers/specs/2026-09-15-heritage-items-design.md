# Heritage items: backend + admin CRUD + public pages for the homepage category cards

## Context

The homepage's "Descoperă Ploieștiul de altădată" teaser (`src/routes/index.tsx`)
currently shows 3 fixed category cards (Locuri care au dispărut / Oameni și
povești / Documente din arhivă), each borrowing a photo from the first 3 rows
of `buildings` — a placeholder, not real content for those categories.
`/istoria-ploiestiului`, `/personalitati`, and `/arhiva` are still the generic
`ComingSoonPage` stub.

This introduces a real content type — title, description, picture, each
translatable RO/EN/FR like `buildings` — so an admin can publish items into
one of the three categories, and wires it into the homepage teaser and the
three placeholder nav pages.

## Data model

New table `public.heritage_items`, migration modeled directly on the
`buildings` migration (`supabase/migrations/20260718163324_...sql`) and its
translation-column follow-up (`20260721055218_...sql`):

```sql
CREATE TYPE public.heritage_category AS ENUM (
  'locuri_disparute', 'oameni_povesti', 'documente_arhiva'
);

CREATE TABLE public.heritage_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category heritage_category NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_en TEXT,
  title_fr TEXT,
  description TEXT,
  description_en TEXT,
  description_fr TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Grants, RLS, and policies mirror `buildings` exactly: public `SELECT` for
`anon`/`authenticated`, `INSERT`/`UPDATE`/`DELETE` for `authenticated` gated by
`public.has_role(auth.uid(), 'admin')` (reusing the existing `has_role`
function — no new role infrastructure needed), `updated_at` trigger reusing
`public.update_updated_at_column()`.

Ordering: the homepage teaser picks, per category, the row with the lowest
`sort_order` (ties broken by `created_at asc`); listing pages show all rows
for their category in the same order.

## Storage

Reuses the existing `building-images` bucket — no new bucket or storage
policy. `src/components/ImageUploader.tsx` gets an optional `bucket` prop
(default `"building-images"`) so it stays a generic uploader; heritage forms
pass the same bucket explicitly for clarity.

## Backend (`src/lib/heritage-items.functions.ts`)

Same shape as `src/lib/buildings.functions.ts`: `createServerFn` +
`requireSupabaseAuth` middleware + local `assertAdmin` + `assertRateLimit`
(reusing the `"buildings:mutate"`-style bucket, e.g. `"heritage:mutate"`, 60
per 300s) + lazy `supabaseAdmin` import inside each handler.

- `createHeritageItem` — zod input: `category` (enum), `slug`
  (`/^[a-z0-9-]+$/`), `title`/`title_en`/`title_fr`,
  `description`/`description_en`/`description_fr`, `image_url`, `sort_order`.
- `updateHeritageItem` — same shape + `id`.
- `deleteHeritageItem` — `{ id }`.

No QR-code concept here (that's building-specific) — otherwise a direct
structural copy.

## Admin UI

New routes under `_authenticated/` (guarded the same way as the existing
`admin_.buildings.*` routes via `requireAdminRoute`):

- `admin_.heritage.tsx` — list view, grouped/filterable by category, mirroring
  `AdminPage.tsx`'s table-of-rows + edit/delete actions.
- `admin_.heritage.new.tsx` / `admin_.heritage.$id.edit.tsx` — thin wrappers
  around a new `HeritageItemForm.tsx` (mirrors `BuildingForm.tsx`: RO field +
  optional EN/FR fields with the existing `translate.*` AI-fill buttons,
  `ImageUploader`, slug input with the same regex hint).
- `AdminPage.tsx` gets a link/tab to `/admin/heritage` alongside the existing
  buildings list.

## Public pages

- `src/routes/istoria-ploiestiului.tsx`, `personalitati.tsx`, `arhiva.tsx`
  stop rendering `ComingSoonPage` and instead render a shared
  `HeritageListPage` component parameterized by `category`, fetching that
  category's rows (loader, same `fetchBuildings`-style pattern) and rendering
  a card grid (title, image, description excerpt) linking to
  `/poveste/$slug`.
- New route `src/routes/poveste.$slug.tsx` — single shared detail page for
  all three categories (title, full picture, full description, RO/EN/FR via
  the existing `pick()` helper), styled like `b.$slug.tsx`'s building detail
  page but simpler (no gallery/QR).

## Homepage (`src/routes/index.tsx`)

The category-teaser loader changes from slicing the first 3 `buildings` rows
to fetching the featured `heritage_items` row per category (lowest
`sort_order`). A category with no items yet keeps today's icon-placeholder
fallback instead of a photo. Cards link to their category's real listing page
(`/istoria-ploiestiului`, `/personalitati`, `/arhiva`) instead of `/patrimoniu`.

## i18n

New `heritageItems.*` keys (RO/EN/FR) for listing/detail page chrome ("no
items yet", "back to list", category page titles/intros) — following the
existing flat key-dictionary convention in `src/lib/i18n.tsx`. Category display
names reuse the existing `nav.istoriaPloiestiului` / `nav.personalitati` /
`nav.arhiva` keys as page headings.

## Out of scope

No image gallery per item (single `image_url`, like a building's cover
photo), no comments/likes, no draft/published status (every row is public
once created — matches how `buildings` works today), no pagination on the
category listing pages yet (add if/when a category grows large enough to
need it).
