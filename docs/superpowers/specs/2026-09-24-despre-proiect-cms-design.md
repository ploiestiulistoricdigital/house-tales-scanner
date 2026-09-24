# Admin-managed "Despre proiect" content and team gallery

## Context

The public `/despre-proiect` page (`src/routes/despre-proiect.tsx`) currently renders only a heading —
its content (org description, contact info) was moved to `/contact` earlier this session, and the user
explicitly chose to leave the page in the nav with no body content for the time being.

The user now wants this page repopulated with editable content, modeled on a reference site
(azuga365.ro's "Despre" page): a title, an intro description, and a grid of project team members, each
shown as a circular photo with their name and role underneath. All of it should be editable from the
admin area — following the same patterns already established for `buildings` / `heritage_items` /
`antiteza_pairs` (server functions with `assertAdmin`, service-role writes, RLS-open reads, trilingual
RO/EN/FR fields with translate buttons in the admin forms).

Decisions made during brainstorming:
- Title and intro description are trilingual (RO/EN/FR), plain text (not rich text) — paragraphs are
  split on blank lines at render time, same convention as the plain-text branches of
  `poveste.$slug.tsx` / `b.$slug.tsx`.
- Team members are trilingual for their role/description text, each with a photo, and are reorderable
  via drag-and-drop in the admin list — reusing the `@dnd-kit` setup added for the heritage items admin
  table earlier this session.
- The title/description is a **singleton** (one row, always present, only ever updated — never
  created/deleted), while team members are a normal reorderable collection (full CRUD).

## Data model

Two new tables.

```sql
CREATE TABLE public.about_content (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title TEXT NOT NULL DEFAULT '',
  title_en TEXT,
  title_fr TEXT,
  description TEXT NOT NULL DEFAULT '',
  description_en TEXT,
  description_fr TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.about_content (id) VALUES (1);

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  role_en TEXT,
  role_fr TEXT,
  photo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The `CHECK (id = 1)` on `about_content` enforces the singleton at the database level — an `INSERT` with
any other id fails, and the app never attempts one; it only ever `UPDATE ... WHERE id = 1`.

RLS follows the current strict pattern (matching `antiteza_pairs`):

```sql
GRANT SELECT ON public.about_content TO anon, authenticated;
GRANT ALL ON public.about_content TO service_role;
ALTER TABLE public.about_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view about content" ON public.about_content
FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.team_members TO anon, authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view team members" ON public.team_members
FOR SELECT TO anon, authenticated USING (true);
```

No `INSERT`/`UPDATE`/`DELETE` grants to `authenticated` — every mutation goes through a `createServerFn`
using the service-role client after `assertAdmin(context)`, exactly like the other admin features.

## Storage

New public Supabase Storage bucket, `team-photos` (public read, admin-only write via storage policies),
kept separate from `building-images`/`antiteza-images` for the same reason those are separate from each
other — distinct content, distinct lifecycle.

## Server functions (`src/lib/about.functions.ts`, new file)

- No dedicated read/list server function: the public page and the admin page both read `about_content`
  and `team_members` directly via the browser Supabase client (RLS-open `SELECT`), matching every other
  list/detail read in the app.
- `updateAboutContent` — `POST`, `assertAdmin` + rate limit, zod input validating the 6 title/description
  fields (title max 200 chars matching other title fields, description max 5000 chars matching heritage
  item description-ish limits but plain text), updates `about_content` where `id = 1` via
  `supabaseAdmin`.
- `createTeamMember` — `POST`, `assertAdmin` + rate limit, zod input validating `name` (required, max
  200), `role`/`role_en`/`role_fr` (optional, max 300 each — same length as antiteza captions),
  `photo_url` (optional URL), `sort_order` (int 0–9999 default 0), inserts via `supabaseAdmin`.
- `updateTeamMember` — same shape plus `id`.
- `deleteTeamMember` — `assertAdmin` + rate limit, deletes by `id`. Does not delete the underlying
  storage object — consistent with `deleteBuildingImage`/`deleteAntitezaPair` (storage cleanup is a
  known pre-existing gap tracked in `plan.md`, not introduced here).
- `reorderTeamMembers` — `POST`, `assertAdmin` + rate limit, takes an ordered array of team member IDs,
  writes sequential `sort_order` values — mirrors `reorderHeritageItems` exactly (added earlier this
  session).

All five mutations rate-limit under one shared `about:mutate` key (`60` limit / `300`s window), matching
the one-key-per-feature convention already used by `buildings:mutate` / `heritage:mutate` /
`antiteza:mutate`.

## Admin UI

- New route `src/routes/_authenticated/admin_.despre-proiect.tsx` — single admin page combining:
  - A content form (title + description, RO/EN/FR, translate buttons — same `MultilingualField` pattern
    from `HeritageItemForm.tsx`, plain `<textarea>` inputs since description is plain text) with its own
    "Save" button, pre-filled from the current `about_content` row.
  - A team members section below it: a table with a drag handle (grip icon), photo thumbnail, name, RO
    role preview, and edit/delete actions — directly reusing the `SortableHeritageRow` /
    `DndContext`/`SortableContext` pattern from `HeritagePage.tsx`, backed by `reorderTeamMembers`.
    "Add team member" button links to a new-member route.
- New routes `admin_.despre-proiect_.team.new.tsx` / `admin_.despre-proiect_.team.$id.edit.tsx` — a new
  `TeamMemberForm.tsx` component: `ImageUploader` (bucket=`"team-photos"`) for the photo, a plain text
  `name` input, and a `MultilingualField`-style RO/EN/FR `role` input with translate buttons (reusing
  the `CaptionRow`/translate-button shape from `AntitezaPairForm.tsx`, since role text is short plain
  text like a caption, not a rich-text field).
- `AdminPage.tsx`'s nav gets a link to `/admin/despre-proiect`, alongside the existing links.

## Public page (`src/routes/despre-proiect.tsx`)

- Loader fetches `about_content` (single row) and `team_members` ordered by `sort_order` in parallel.
- Renders: heading (localized title, falling back to the nav label if empty), intro description as
  justified paragraphs (same `.split(/\n\s*\n/)` convention as other plain-text content, reusing the
  `rich-text-content` utility class for consistent typography), an `ornament-divider`, then a responsive
  grid of team members — circular grayscale photo (`sepia-[0.1]`/`grayscale` treatment consistent with
  the site's existing photo styling), name, and localized role underneath — styled after the reference
  screenshot's card layout.
- If a team member has no photo, a placeholder circle with a generic user icon (lucide `User`) is shown
  instead of a broken image.
- The section is omitted gracefully if both title/description are empty and there are no team members
  (matches how other optional homepage sections guard on empty data).

## Testing

- `bunx tsc --noEmit` and `bun run build`.
- Manual: edit the title/description and confirm it saves and renders on the public page in all three
  languages; add/edit/delete a team member; drag-reorder team members and confirm the public grid order
  updates; confirm a non-admin can't reach the admin routes or call the mutating server functions
  directly; confirm the page renders sensibly with zero team members and with a team member missing a
  photo.

## Out of scope

- Rich text formatting for the title/description (plain text only, per the reference design).
- Linking a team member to any other entity (buildings, heritage items).
- Storage cleanup of orphaned photos on delete/replace (pre-existing gap, tracked separately in
  `plan.md`).
- Any change to the `/contact` page's existing org description content — this is a separate, new
  content area on `/despre-proiect`.
