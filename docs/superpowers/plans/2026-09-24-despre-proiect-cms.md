# Admin-managed "Despre proiect" content and team gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins edit the `/despre-proiect` page's title + intro description and manage a drag-reorderable team member gallery (photo, name, trilingual role), replacing the page's current empty body.

**Architecture:** Two new tables — a singleton `about_content` row and a normal `team_members` collection — back five server functions in a new `src/lib/about.functions.ts` (mirroring `heritage-items.functions.ts`'s `assertAdmin`/rate-limit/service-role pattern, plus a `reorderTeamMembers` copied from the heritage items drag-reorder added earlier this session). A new admin page combines an `AboutContentForm` (title/description, RO/EN/FR) with a `@dnd-kit`-sortable team member table (same pattern as `HeritagePage.tsx`), plus new/edit pages using a new `TeamMemberForm`. The public `/despre-proiect` page is rewritten to render the fetched content and a team grid styled after the reference screenshot.

**Tech Stack:** TanStack Start (`createServerFn`, file-based routing), Supabase (Postgres + Storage + RLS), Zod, React 19 (plain `useState`, no react-hook-form), Tailwind v4, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (already a project dependency since the heritage items drag-reorder feature).

**Spec:** [docs/superpowers/specs/2026-09-24-despre-proiect-cms-design.md](../specs/2026-09-24-despre-proiect-cms-design.md)

## Global Constraints

- Every mutating server function must call `assertAdmin(context)` first, then `assertRateLimit(context.userId, "about:mutate", 60, 300)` — one shared rate-limit key for all five functions in `about.functions.ts`, matching the one-key-per-feature convention (`heritage:mutate`, `antiteza:mutate`, `buildings:mutate`).
- Table grants: `GRANT SELECT ON <table> TO anon, authenticated; GRANT ALL ON <table> TO service_role;` — no direct `INSERT`/`UPDATE`/`DELETE` grant to `authenticated`. All writes go through the service-role client (`@/integrations/supabase/client.server`), imported lazily inside each handler.
- RLS policies still get admin `INSERT`/`UPDATE`/`DELETE` policies via `private.has_role(auth.uid(), 'admin'::app_role)` even though `authenticated` has no grant for those operations — belt-to-suspenders defense in depth, matching every prior migration in this repo.
- `about_content` is a singleton enforced by `CHECK (id = 1)` on the primary key — the app never inserts a row, only ever `UPDATE ... WHERE id = 1`.
- Title fields max 200 chars (matches other title fields in the app). Description fields max 5000 chars, plain text (never `sanitizeRichText`/`dangerouslySetInnerHTML`). Team member `name` max 200 chars, `role`/`role_en`/`role_fr` max 300 chars each (matches `antiteza_pairs` caption length), plain text.
- New Supabase Storage bucket: `team-photos` (public read, admin-only write) — separate from `building-images`/`antiteza-images`.
- This repo has no JS/TS test runner (see `CLAUDE.md`) — every task's "test" step is `bunx tsc --noEmit`, `bun run build`, and a described manual smoke check, not an automated test file.
- Auto-generated files (`src/routeTree.gen.ts`, the `src/routes/[.mcp]/*` / `[.well-known]/*` files) must be inspected with `git diff` before every commit and reverted if the only change is line-ending noise, per this repo's established workflow.
- Every commit message ends with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- The Supabase CLI in this environment cannot reach the database directly (`supabase migration list --linked` fails with `LegacyDbConfigIpv6Error`) — migrations must be applied by hand via the Supabase SQL Editor for project `gxpiixyldoqxvluogziy` (https://supabase.com/dashboard/project/gxpiixyldoqxvluogziy/sql/new). `supabase gen types typescript --linked` **does** work (Management API, not a direct DB connection) and must be run after the migration is applied.

## Review Focus

- **Empty about_content / zero team members:** the public page must not crash or show a broken layout if the singleton row has empty title/description and `team_members` is an empty array — the whole section should render gracefully (heading only, or omitted per the spec) rather than throwing on `undefined` access.
- **Team member with no `photo_url`:** the public grid must render a placeholder icon, not a broken `<img>` tag with an empty `src`.
- **Drag-reorder persistence failure:** if `reorderTeamMembers` fails mid-flight (network error, rate limit), the admin table must revert to the pre-drag order rather than leaving the UI showing an order that was never saved — mirrors the heritage items reorder's revert-on-failure behavior.
- **Non-admin access:** a signed-in non-admin (or signed-out visitor) must not be able to load the admin routes or successfully call `updateAboutContent`/`createTeamMember`/`updateTeamMember`/`deleteTeamMember`/`reorderTeamMembers` directly — `assertAdmin` must reject before any write.
- **Long description text:** a description near the 5000-char limit must still translate successfully (via chunking) rather than silently truncating or timing out in a single oversized translate request.

---

### Task 1: Database migration — `about_content` + `team_members` tables + storage bucket

**Files:**
- Create: `supabase/migrations/20260924120000_add_about_content_and_team_members.sql`

**Interfaces:**
- Produces: table `public.about_content` (singleton, columns `id, title, title_en, title_fr, description, description_en, description_fr, updated_at`) seeded with its one row; table `public.team_members` (columns `id, name, role, role_en, role_fr, photo_url, sort_order, created_at`); storage bucket `team-photos` (public).

- [ ] **Step 1: Write the migration file**

```sql
-- Admin-managed "Despre proiect" page content: a singleton title/description
-- row plus a reorderable team member gallery. Mirrors antiteza_pairs'
-- RLS/grant pattern (20260917120000_add_antiteza_pairs.sql): writes go
-- exclusively through the service-role client after an application-level
-- assertAdmin() check; authenticated only gets SELECT at the grant level,
-- the RLS policies below are the belt to that suspenders.
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

GRANT SELECT ON public.about_content TO anon, authenticated;
GRANT ALL ON public.about_content TO service_role;
ALTER TABLE public.about_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view about content" ON public.about_content
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can update about content" ON public.about_content
FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

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

GRANT SELECT ON public.team_members TO anon, authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view team members" ON public.team_members
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert team members" ON public.team_members
FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update team members" ON public.team_members
FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete team members" ON public.team_members
FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX team_members_sort_idx ON public.team_members(sort_order, created_at);

-- Storage bucket for team member photos, separate from building-images /
-- antiteza-images so this content's lifecycle stays independent.
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read team-photos" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'team-photos');

CREATE POLICY "Admins can upload team-photos" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'team-photos' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update team-photos" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'team-photos' AND private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'team-photos' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete team-photos" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'team-photos' AND private.has_role(auth.uid(), 'admin'::app_role));
```

- [ ] **Step 2: Apply it to production manually**

The CLI can't reach the DB from this environment. Open the Supabase SQL Editor for project `gxpiixyldoqxvluogziy` (https://supabase.com/dashboard/project/gxpiixyldoqxvluogziy/sql/new), paste the full SQL from Step 1, and run it. Confirm it succeeds with no errors.

- [ ] **Step 3: Verify the tables, seed row, and bucket exist**

In the SQL Editor, run:
```sql
select * from public.about_content;
select count(*) from public.team_members;
select id, public from storage.buckets where id = 'team-photos';
```
Expected: `about_content` has exactly one row with `id = 1` and empty-string title/description; `team_members` count is `0`; the bucket row exists with `public = true`.

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/20260924120000_add_about_content_and_team_members.sql
git commit -m "$(cat <<'EOF'
Add about_content and team_members tables and storage bucket

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Regenerate Supabase types

**Files:**
- Modify: `src/integrations/supabase/types.ts` (fully regenerated, not hand-edited)

**Interfaces:**
- Consumes: the `about_content` and `team_members` tables created in Task 1 (must already be applied to production before this step).
- Produces: `Database["public"]["Tables"]["about_content"]` and `Database["public"]["Tables"]["team_members"]` with `Row`/`Insert`/`Update` types, used by every later task's Supabase queries.

- [ ] **Step 1: Regenerate the file**

```bash
npx supabase gen types typescript --linked --schema public > src/integrations/supabase/types.ts
```

- [ ] **Step 2: Verify the diff only adds the new tables (plus expected formatting)**

```bash
git diff --stat src/integrations/supabase/types.ts
git diff src/integrations/supabase/types.ts | grep -A 30 "about_content"
git diff src/integrations/supabase/types.ts | grep -A 30 "team_members"
```
Expected: new `about_content: { Row: {...}, Insert: {...}, Update: {...} }` and `team_members: { Row: {...}, Insert: {...}, Update: {...} }` blocks with the columns from Task 1, and no unrelated table definitions changed or removed. If unrelated tables show diffs, stop and investigate before proceeding.

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Regenerate Supabase types for about_content and team_members

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Server functions (`src/lib/about.functions.ts`)

**Files:**
- Create: `src/lib/about.functions.ts`

**Interfaces:**
- Consumes: `Database` type from Task 2, `requireSupabaseAuth` (`@/integrations/supabase/auth-middleware`), `assertRateLimit` (`@/lib/rate-limit`).
- Produces:
  - `updateAboutContent({ data: AboutContentInput }) => Promise<AboutContentRow>`
  - `createTeamMember({ data: TeamMemberInput }) => Promise<TeamMemberRow>`
  - `updateTeamMember({ data: TeamMemberInput & { id: string } }) => Promise<TeamMemberRow>`
  - `deleteTeamMember({ data: { id: string } }) => Promise<{ ok: true }>`
  - `reorderTeamMembers({ data: { ids: string[] } }) => Promise<{ ok: true }>`
  - where `AboutContentInput = { title: string; title_en?: string | null; title_fr?: string | null; description: string; description_en?: string | null; description_fr?: string | null }`
  - and `TeamMemberInput = { name: string; role?: string | null; role_en?: string | null; role_fr?: string | null; photo_url?: string | null; sort_order: number }`

- [ ] **Step 1: Write the file**

```ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit } from "@/lib/rate-limit";
import type { Database } from "@/integrations/supabase/types";

const aboutContentInput = z.object({
  title: z.string().trim().max(200).default(""),
  title_en: z.string().trim().max(200).optional().nullable(),
  title_fr: z.string().trim().max(200).optional().nullable(),
  description: z.string().max(5000).default(""),
  description_en: z.string().max(5000).optional().nullable(),
  description_fr: z.string().max(5000).optional().nullable(),
});

const teamMemberInput = z.object({
  name: z.string().trim().min(1).max(200),
  role: z.string().max(300).optional().nullable(),
  role_en: z.string().max(300).optional().nullable(),
  role_fr: z.string().max(300).optional().nullable(),
  photo_url: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

async function assertAdmin(ctx: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const updateAboutContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof aboutContentInput>) => aboutContentInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "about:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("about_content")
      .update(data)
      .eq("id", 1)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof teamMemberInput>) => teamMemberInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "about:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, photo_url: data.photo_url || null };
    const { data: row, error } = await supabaseAdmin
      .from("team_members")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof teamMemberInput> & { id: string }) =>
    z.object({ id: z.string().uuid() }).merge(teamMemberInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "about:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const payload = { ...rest, photo_url: rest.photo_url || null };
    const { data: row, error } = await supabaseAdmin
      .from("team_members")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "about:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("team_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderTeamMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "about:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results = await Promise.all(
      data.ids.map((id, index) =>
        supabaseAdmin.from("team_members").update({ sort_order: index }).eq("id", id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
    return { ok: true };
  });
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors. If `about_content`/`team_members` aren't recognized on `.from(...)`, re-check Task 2's diff landed correctly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/about.functions.ts
git commit -m "$(cat <<'EOF'
Add about_content/team_members server functions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: i18n keys

**Files:**
- Modify: `src/lib/i18n.tsx`

**Interfaces:**
- Produces: the following keys in all three dictionaries (RO block `const RO: Dict = {`, EN block `const EN: Dict = {`, FR block `const FR: Dict = {`). Insert each group near the existing `antiteza.admin.*` keys added earlier this session — find `"antiteza.err.afterImage.required"` in each block and insert immediately after its line.

- [ ] **Step 1: Add the RO keys**

```ts
  "about.admin.title": "Despre proiect",
  "about.admin.contentSection": "Conținut pagină",
  "about.admin.teamSection": "Echipa",
  "about.admin.addMember": "Adaugă membru",
  "about.admin.editMember": "Editează membru",
  "about.admin.empty": "Niciun membru încă. Adaugă primul.",
  "about.admin.confirmDelete.title": "Ștergi membrul?",
  "about.admin.confirmDelete": "Ștergi „{name}” din echipă? Această acțiune este ireversibilă.",
  "about.field.title": "Titlu",
  "about.field.description": "Descriere",
  "about.field.memberName": "Nume *",
  "about.field.memberRole": "Rol / descriere",
  "about.field.memberPhoto": "Fotografie",
  "about.err.memberName.required": "Numele este obligatoriu.",
```

- [ ] **Step 2: Add the EN keys**

```ts
  "about.admin.title": "About project",
  "about.admin.contentSection": "Page content",
  "about.admin.teamSection": "Team",
  "about.admin.addMember": "Add team member",
  "about.admin.editMember": "Edit team member",
  "about.admin.empty": "No team members yet. Add the first one.",
  "about.admin.confirmDelete.title": "Delete team member?",
  "about.admin.confirmDelete": "Delete \"{name}\" from the team? This action is irreversible.",
  "about.field.title": "Title",
  "about.field.description": "Description",
  "about.field.memberName": "Name *",
  "about.field.memberRole": "Role / description",
  "about.field.memberPhoto": "Photo",
  "about.err.memberName.required": "Name is required.",
```

- [ ] **Step 3: Add the FR keys**

```ts
  "about.admin.title": "À propos du projet",
  "about.admin.contentSection": "Contenu de la page",
  "about.admin.teamSection": "Équipe",
  "about.admin.addMember": "Ajouter un membre",
  "about.admin.editMember": "Modifier le membre",
  "about.admin.empty": "Aucun membre pour l'instant. Ajoutez le premier.",
  "about.admin.confirmDelete.title": "Supprimer le membre ?",
  "about.admin.confirmDelete": "Supprimer « {name} » de l'équipe ? Cette action est irréversible.",
  "about.field.title": "Titre",
  "about.field.description": "Description",
  "about.field.memberName": "Nom *",
  "about.field.memberRole": "Rôle / description",
  "about.field.memberPhoto": "Photo",
  "about.err.memberName.required": "Le nom est obligatoire.",
```

- [ ] **Step 4: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.tsx
git commit -m "$(cat <<'EOF'
Add i18n keys for about/team admin section

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `TeamMemberForm` component

**Files:**
- Create: `src/components/TeamMemberForm.tsx`

**Interfaces:**
- Consumes: `ImageUploader` (`@/components/ImageUploader`), `translateText` (`@/lib/translate.functions`), `useI18n` (`@/lib/i18n`).
- Produces: `TeamMemberFormValues` type and `TeamMemberForm` component, consumed by Task 7's `NewTeamMemberPage`/`EditTeamMemberPage`:
  ```ts
  export type TeamMemberFormValues = {
    name: string;
    role: string;
    role_en: string;
    role_fr: string;
    photo_url: string;
    sort_order: number;
  };
  ```
  Props: `{ initial: TeamMemberFormValues; submitLabel: string; onSubmit: (v: TeamMemberFormValues) => void; submitting: boolean; error: string | null }`.

- [ ] **Step 1: Write the file**

```tsx
import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { useI18n } from "@/lib/i18n";
import { translateText } from "@/lib/translate.functions";

export type TeamMemberFormValues = {
  name: string;
  role: string;
  role_en: string;
  role_fr: string;
  photo_url: string;
  sort_order: number;
};

type FormLang = "ro" | "en" | "fr";

function roleKey(lang: FormLang): keyof TeamMemberFormValues {
  if (lang === "ro") return "role";
  return `role_${lang}` as keyof TeamMemberFormValues;
}

type FieldErrors = Partial<Record<"name", string>>;

function validate(v: TeamMemberFormValues, t: (k: string) => string): FieldErrors {
  const errs: FieldErrors = {};
  if (!v.name.trim()) errs.name = t("about.err.memberName.required");
  return errs;
}

const inputCls = "w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background";

export function TeamMemberForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
  error,
}: {
  initial: TeamMemberFormValues;
  submitLabel: string;
  onSubmit: (v: TeamMemberFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [v, setV] = useState<TeamMemberFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [translating, setTranslating] = useState<FormLang | null>(null);
  const translate = useServerFn(translateText);

  function set<K extends keyof TeamMemberFormValues>(k: K, val: TeamMemberFormValues[K]) {
    setV((p) => {
      const next = { ...p, [k]: val };
      if (attempted) setFieldErrors(validate(next, t));
      return next;
    });
  }

  async function translateRole(target: "en" | "fr") {
    const ro = v.role.trim();
    const other = (target === "en" ? v.role_fr : v.role_en).trim();
    const source = ro || other;
    if (!source) {
      toast.error(t("translate.empty"));
      return;
    }
    setTranslating(target);
    try {
      const res = await translate({ data: { text: source, target } });
      set(roleKey(target), res.text);
    } catch (e: any) {
      toast.error(e?.message ?? t("translate.error"));
    } finally {
      setTranslating(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const errs = validate(v, t);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit({ ...v, name: v.name.trim() });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <label className="block" data-field-error={fieldErrors.name ? "true" : undefined}>
        <span className="mb-1.5 block text-base font-medium">{t("about.field.memberName")}</span>
        <input
          className={inputCls}
          value={v.name}
          aria-invalid={!!fieldErrors.name}
          onChange={(e) => set("name", e.target.value)}
        />
        {fieldErrors.name && <span className="mt-1 block text-sm font-medium text-destructive">{fieldErrors.name}</span>}
      </label>

      <div>
        <span className="mb-1.5 block text-base font-medium">{t("about.field.memberPhoto")}</span>
        <ImageUploader bucket="team-photos" onUploaded={(url) => set("photo_url", url)} />
        {v.photo_url && (
          <img
            src={v.photo_url}
            alt=""
            className="mt-2 h-24 w-24 rounded-full border object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
      </div>

      <fieldset className="rounded-md border border-border/70 bg-muted/20 p-3 sm:p-4 space-y-2">
        <legend className="px-1 text-base font-medium">{t("about.field.memberRole")}</legend>
        <RoleRow lang="RO" value={v.role} onChange={(val) => set("role", val)} />
        <RoleRow
          lang="EN"
          value={v.role_en}
          onChange={(val) => set("role_en", val)}
          onTranslate={() => translateRole("en")}
          translating={translating === "en"}
          disabled={translating !== null}
        />
        <RoleRow
          lang="FR"
          value={v.role_fr}
          onChange={(val) => set("role_fr", val)}
          onTranslate={() => translateRole("fr")}
          translating={translating === "fr"}
          disabled={translating !== null}
        />
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-base font-medium">{t("heritageItems.field.sortOrder")}</span>
        <input
          type="number"
          min={0}
          max={9999}
          className={inputCls}
          value={v.sort_order}
          onChange={(e) => set("sort_order", Math.min(9999, Math.max(0, Number(e.target.value) || 0)))}
        />
      </label>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary text-primary-foreground px-5 py-3 text-base font-medium min-h-11 hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? t("form.saving") : submitLabel}
      </button>
    </form>
  );
}

function RoleRow({
  lang,
  value,
  onChange,
  onTranslate,
  translating,
  disabled,
}: {
  lang: "RO" | "EN" | "FR";
  value: string;
  onChange: (v: string) => void;
  onTranslate?: () => void;
  translating?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-widest text-muted-foreground w-6 shrink-0">{lang}</span>
      <input
        className="flex-1 rounded-md border border-border/70 px-3 py-3 text-base bg-background"
        value={value}
        maxLength={300}
        onChange={(e) => onChange(e.target.value)}
      />
      {onTranslate && (
        <button
          type="button"
          onClick={onTranslate}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-2 text-sm hover:bg-muted disabled:opacity-50"
          aria-label="Translate"
        >
          {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TeamMemberForm.tsx
git commit -m "$(cat <<'EOF'
Add TeamMemberForm component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `AboutContentForm` component

**Files:**
- Create: `src/components/AboutContentForm.tsx`

**Interfaces:**
- Consumes: `translateText` (`@/lib/translate.functions`), `chunkText` (`@/lib/text-chunks`), `useI18n` (`@/lib/i18n`).
- Produces: `AboutContentFormValues` type and `AboutContentForm` component, consumed by Task 8's `AboutPage`:
  ```ts
  export type AboutContentFormValues = {
    title: string;
    title_en: string;
    title_fr: string;
    description: string;
    description_en: string;
    description_fr: string;
  };
  ```
  Props: `{ initial: AboutContentFormValues; onSubmit: (v: AboutContentFormValues) => void; submitting: boolean; error: string | null }`.

- [ ] **Step 1: Write the file**

```tsx
import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { translateText } from "@/lib/translate.functions";
import { chunkText } from "@/lib/text-chunks";

export type AboutContentFormValues = {
  title: string;
  title_en: string;
  title_fr: string;
  description: string;
  description_en: string;
  description_fr: string;
};

type Field = "title" | "description";
type FormLang = "ro" | "en" | "fr";
const FORM_LANGS: FormLang[] = ["ro", "en", "fr"];

function fieldKey(field: Field, lang: FormLang): keyof AboutContentFormValues {
  if (lang === "ro") return field;
  return `${field}_${lang}` as keyof AboutContentFormValues;
}

const inputCls = "w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background";

export function AboutContentForm({
  initial,
  onSubmit,
  submitting,
  error,
}: {
  initial: AboutContentFormValues;
  onSubmit: (v: AboutContentFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [v, setV] = useState<AboutContentFormValues>(initial);
  const [translating, setTranslating] = useState<null | { field: Field; lang: FormLang }>(null);
  const translate = useServerFn(translateText);

  function set<K extends keyof AboutContentFormValues>(k: K, val: AboutContentFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function translateLong(text: string, target: FormLang): Promise<string> {
    const chunks = chunkText(text);
    if (chunks.length <= 1) {
      const res = await translate({ data: { text, target } });
      return res.text;
    }
    const results: string[] = new Array(chunks.length);
    let next = 0;
    async function worker() {
      while (next < chunks.length) {
        const i = next++;
        const res = await translate({ data: { text: chunks[i], target } });
        results[i] = res.text;
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, chunks.length) }, worker));
    return results.join("\n\n");
  }

  async function handleTranslate(field: Field, target: FormLang) {
    const otherLang: FormLang = FORM_LANGS.find((l) => l !== target && l !== "ro") === "en" ? "en" : "fr";
    const ro = v[fieldKey(field, "ro")].trim();
    const other = v[fieldKey(field, otherLang)].trim();
    const source = ro || other;
    if (!source) {
      toast.error(t("translate.empty"));
      return;
    }
    setTranslating({ field, lang: target });
    try {
      const translated = await translateLong(source, target);
      set(fieldKey(field, target), translated);
    } catch (e: any) {
      toast.error(e?.message ?? t("translate.error"));
    } finally {
      setTranslating(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...v, title: v.title.trim(), title_en: v.title_en.trim(), title_fr: v.title_fr.trim() });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <TranslatableField
        label={t("about.field.title")}
        field="title"
        values={v}
        translating={translating}
        onTranslate={handleTranslate}
        onChange={(lang, val) => set(fieldKey("title", lang), val)}
        renderInput={(value, onChange) => <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />}
      />

      <TranslatableField
        label={t("about.field.description")}
        field="description"
        values={v}
        translating={translating}
        onTranslate={handleTranslate}
        onChange={(lang, val) => set(fieldKey("description", lang), val)}
        renderInput={(value, onChange) => (
          <textarea
            className={`${inputCls} min-h-32`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      />

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary text-primary-foreground px-5 py-3 text-base font-medium min-h-11 hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? t("form.saving") : t("form.save")}
      </button>
    </form>
  );
}

function TranslatableField({
  label,
  field,
  values,
  translating,
  onTranslate,
  onChange,
  renderInput,
}: {
  label: string;
  field: Field;
  values: AboutContentFormValues;
  translating: null | { field: Field; lang: FormLang };
  onTranslate: (field: Field, lang: FormLang) => void;
  onChange: (lang: FormLang, value: string) => void;
  renderInput: (value: string, onChange: (v: string) => void) => React.ReactNode;
}) {
  const { t } = useI18n();
  const busy = translating !== null;
  return (
    <fieldset className="rounded-md border border-border/70 bg-muted/20 p-3 sm:p-4">
      <legend className="px-1 text-base font-medium">{label}</legend>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {FORM_LANGS.map((lang) => (
          <div key={lang} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{t(`lang.${lang}`)}</span>
              {lang !== "ro" && (
                <button
                  type="button"
                  onClick={() => onTranslate(field, lang)}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/60 disabled:opacity-60"
                >
                  {translating?.field === field && translating.lang === lang ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Languages className="h-3.5 w-3.5" />
                  )}
                  {t(lang === "en" ? "translate.toEn" : "translate.toFr")}
                </button>
              )}
            </div>
            {renderInput(values[fieldKey(field, lang)], (val) => onChange(lang, val))}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AboutContentForm.tsx
git commit -m "$(cat <<'EOF'
Add AboutContentForm component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Admin page components (`AboutPage`, `NewTeamMemberPage`, `EditTeamMemberPage`)

**Files:**
- Create: `src/components/admin/AboutPage.tsx`
- Create: `src/components/admin/NewTeamMemberPage.tsx`
- Create: `src/components/admin/EditTeamMemberPage.tsx`

**Interfaces:**
- Consumes: `AboutContentForm`/`AboutContentFormValues` (Task 6), `TeamMemberForm`/`TeamMemberFormValues` (Task 5), `updateAboutContent`/`createTeamMember`/`updateTeamMember`/`deleteTeamMember`/`reorderTeamMembers` (Task 3), `checkIsAdmin` (`@/lib/buildings.functions`), `ConfirmDialog` (`@/components/ConfirmDialog`), `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (already installed — see `src/components/admin/HeritagePage.tsx` for the exact pattern being mirrored here).
- Produces: `AboutPage`, `NewTeamMemberPage`, `EditTeamMemberPage({ id })` — consumed by Task 8's route files.

- [ ] **Step 1: Write `src/components/admin/AboutPage.tsx`**

```tsx
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/buildings.functions";
import { updateAboutContent, deleteTeamMember, reorderTeamMembers } from "@/lib/about.functions";
import { AboutContentForm, type AboutContentFormValues } from "@/components/AboutContentForm";
import { Plus, Pencil, Trash2, LogOut, GripVertical, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type TeamMemberRow = {
  id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  sort_order: number;
};

export function AboutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const checkAdmin = useServerFn(checkIsAdmin);
  const updateContent = useServerFn(updateAboutContent);
  const deleteFn = useServerFn(deleteTeamMember);
  const reorderFn = useServerFn(reorderTeamMembers);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [contentSubmitting, setContentSubmitting] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return { isAdmin: false };
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      if (data) return { isAdmin: true };
      try {
        return await checkAdmin();
      } catch {
        return { isAdmin: false };
      }
    },
  });

  const { data: content } = useQuery({
    queryKey: ["admin-about-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("about_content").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: teamMembers, isError: teamError } = useQuery({
    queryKey: ["admin-team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, role, photo_url, sort_order")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as TeamMemberRow[];
    },
    enabled: adminCheck?.isAdmin === true,
  });

  useEffect(() => {
    if (teamMembers) setMembers(teamMembers);
  }, [teamMembers]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: undefined }, replace: true });
  }

  async function handleContentSubmit(v: AboutContentFormValues) {
    setContentSubmitting(true);
    setContentError(null);
    try {
      await updateContent({ data: v });
      qc.invalidateQueries({ queryKey: ["admin-about-content"] });
    } catch (e: any) {
      setContentError(e.message ?? t("form.saveFailed"));
    } finally {
      setContentSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteFn({ data: { id: pendingDelete.id } });
    setPendingDelete(null);
    qc.invalidateQueries({ queryKey: ["admin-team-members"] });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = members.findIndex((m) => m.id === active.id);
    const newIndex = members.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(members, oldIndex, newIndex);
    setMembers(reordered);
    try {
      await reorderFn({ data: { ids: reordered.map((m) => m.id) } });
      qc.invalidateQueries({ queryKey: ["admin-team-members"] });
    } catch {
      setMembers(members);
    }
  }

  if (checkingAdmin) {
    return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="fixed top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-2xl sm:text-3xl font-semibold">{t("admin.unauthorized.title")}</h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">{t("admin.unauthorized.desc")}</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md border px-4 py-2 text-base hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> {t("nav.signOut")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <h1 className="text-lg sm:text-xl font-semibold">{t("about.admin.title")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/admin"
              className="text-sm sm:text-base text-muted-foreground hover:text-foreground px-3 py-2 min-h-11 inline-flex items-center"
            >
              {t("admin.all")}
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1 min-h-11 rounded-md border px-3 py-2 text-sm sm:text-base hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> {t("nav.signOut")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-12">
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">{t("about.admin.contentSection")}</h2>
          {content && (
            <AboutContentForm
              initial={{
                title: content.title,
                title_en: content.title_en ?? "",
                title_fr: content.title_fr ?? "",
                description: content.description,
                description_en: content.description_en ?? "",
                description_fr: content.description_fr ?? "",
              }}
              onSubmit={handleContentSubmit}
              submitting={contentSubmitting}
              error={contentError}
            />
          )}
        </section>

        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold">{t("about.admin.teamSection")}</h2>
            <Link
              to="/admin/despre-proiect/team/new"
              className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> {t("about.admin.addMember")}
            </Link>
          </div>

          {teamError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-12 text-center text-base text-destructive leading-relaxed">
              {t("admin.error")}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-base text-muted-foreground leading-relaxed">
              {t("about.admin.empty")}
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 overflow-x-auto">
              <table className="w-full min-w-[480px] text-base">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <tbody>
                    <SortableContext items={members.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                      {members.map((member) => (
                        <SortableTeamRow
                          key={member.id}
                          member={member}
                          onDelete={() => setPendingDelete({ id: member.id, name: member.name })}
                          t={t}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </DndContext>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t("about.admin.confirmDelete.title")}
        description={pendingDelete ? t("about.admin.confirmDelete", { name: pendingDelete.name }) : undefined}
        confirmLabel={t("common.delete")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function SortableTeamRow({
  member,
  onDelete,
  t,
}: {
  member: TeamMemberRow;
  onDelete: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: member.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-t border-border/70 bg-background">
      <td className="w-10 px-2 py-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={t("admin.dragToReorder")}
          title={t("admin.dragToReorder")}
          className="touch-none p-2 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="w-16 px-2 py-3">
        {member.photo_url ? (
          <img src={member.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <User className="h-5 w-5" />
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-medium">{member.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{member.role || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Link
            to="/admin/despre-proiect/team/$id/edit"
            params={{ id: member.id }}
            className="p-2 hover:bg-accent rounded inline-flex items-center justify-center"
            aria-label={t("admin.edit")}
            title={t("admin.edit")}
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded inline-flex items-center justify-center"
            aria-label={t("admin.delete")}
            title={t("admin.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Write `src/components/admin/NewTeamMemberPage.tsx`**

```tsx
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { TeamMemberForm, type TeamMemberFormValues } from "@/components/TeamMemberForm";
import { createTeamMember } from "@/lib/about.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function NewTeamMemberPage() {
  const navigate = useNavigate();
  const create = useServerFn(createTeamMember);
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(v: TeamMemberFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const row = await create({
        data: {
          name: v.name,
          role: v.role || null,
          role_en: v.role_en || null,
          role_fr: v.role_fr || null,
          photo_url: v.photo_url || null,
          sort_order: v.sort_order,
        },
      });
      navigate({ to: "/admin/despre-proiect/team/$id/edit", params: { id: row.id } });
    } catch (e: any) {
      setError(e.message ?? t("form.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            to="/admin/despre-proiect"
            className="inline-flex items-center gap-1 min-h-11 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("about.admin.addMember")}</h1>
        <TeamMemberForm
          initial={{ name: "", role: "", role_en: "", role_fr: "", photo_url: "", sort_order: 0 }}
          submitLabel={t("form.create")}
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/admin/EditTeamMemberPage.tsx`**

```tsx
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TeamMemberForm, type TeamMemberFormValues } from "@/components/TeamMemberForm";
import { updateTeamMember } from "@/lib/about.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function EditTeamMemberPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const update = useServerFn(updateTeamMember);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: member, isLoading } = useQuery({
    queryKey: ["team-member", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  async function onSubmit(v: TeamMemberFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await update({
        data: {
          id,
          name: v.name,
          role: v.role || null,
          role_en: v.role_en || null,
          role_fr: v.role_fr || null,
          photo_url: v.photo_url || null,
          sort_order: v.sort_order,
        },
      });
      qc.invalidateQueries({ queryKey: ["team-member", id] });
      qc.invalidateQueries({ queryKey: ["admin-team-members"] });
      navigate({ to: "/admin/despre-proiect" });
    } catch (e: any) {
      setError(e.message ?? t("form.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !member) {
    return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            to="/admin/despre-proiect"
            className="inline-flex items-center gap-1 min-h-11 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("about.admin.editMember")}</h1>
        <TeamMemberForm
          initial={{
            name: member.name,
            role: member.role ?? "",
            role_en: member.role_en ?? "",
            role_fr: member.role_fr ?? "",
            photo_url: member.photo_url ?? "",
            sort_order: member.sort_order,
          }}
          submitLabel={t("form.save")}
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `bunx tsc --noEmit`
Expected: errors only about `to="/admin/despre-proiect/team/new"` / `to="/admin/despre-proiect/team/$id/edit"` not matching any known route — expected until Task 8 creates the route files. If you see any *other* error, fix it before proceeding.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AboutPage.tsx src/components/admin/NewTeamMemberPage.tsx src/components/admin/EditTeamMemberPage.tsx
git commit -m "$(cat <<'EOF'
Add about/team admin page components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Route files + admin nav link

**Files:**
- Create: `src/routes/_authenticated/admin_.despre-proiect.tsx`
- Create: `src/routes/_authenticated/admin_.despre-proiect_.team.new.tsx`
- Create: `src/routes/_authenticated/admin_.despre-proiect_.team.$id.edit.tsx`
- Modify: `src/components/admin/AdminPage.tsx`

**Interfaces:**
- Consumes: `AboutPage`/`NewTeamMemberPage`/`EditTeamMemberPage` (Task 7), `requireAdminRoute` (`@/lib/admin-guard`).
- Produces: working routes `/admin/despre-proiect`, `/admin/despre-proiect/team/new`, `/admin/despre-proiect/team/$id/edit`; `src/routeTree.gen.ts` regenerated to include them.

- [ ] **Step 1: Write `src/routes/_authenticated/admin_.despre-proiect.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const AboutPage = lazy(() =>
  import("@/components/admin/AboutPage").then((m) => ({ default: m.AboutPage })),
);

function AboutFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/despre-proiect")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Despre proiect — Admin" }] }),
  component: () => (
    <Suspense fallback={<AboutFallback />}>
      <AboutPage />
    </Suspense>
  ),
});
```

- [ ] **Step 2: Write `src/routes/_authenticated/admin_.despre-proiect_.team.new.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const NewTeamMemberPage = lazy(() =>
  import("@/components/admin/NewTeamMemberPage").then((m) => ({ default: m.NewTeamMemberPage })),
);

function NewTeamMemberFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/despre-proiect_/team/new")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "New team member — Admin" }] }),
  component: () => (
    <Suspense fallback={<NewTeamMemberFallback />}>
      <NewTeamMemberPage />
    </Suspense>
  ),
});
```

- [ ] **Step 3: Write `src/routes/_authenticated/admin_.despre-proiect_.team.$id.edit.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const EditTeamMemberPage = lazy(() =>
  import("@/components/admin/EditTeamMemberPage").then((m) => ({ default: m.EditTeamMemberPage })),
);

function EditTeamMemberFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/despre-proiect_/team/$id/edit")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Edit team member — Admin" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <Suspense fallback={<EditTeamMemberFallback />}>
      <EditTeamMemberPage id={id} />
    </Suspense>
  );
}
```

- [ ] **Step 4: Add the nav link in `src/components/admin/AdminPage.tsx`**

Find this block (inside the `<header>`, in the `<div className="flex items-center gap-2">`):

```tsx
            <Link
              to="/admin/antiteza"
              className="text-sm sm:text-base text-muted-foreground hover:text-foreground px-3 py-2 min-h-11 inline-flex items-center"
            >
              {t("antiteza.admin.title")}
            </Link>
```

Add immediately after it:

```tsx
            <Link
              to="/admin/despre-proiect"
              className="text-sm sm:text-base text-muted-foreground hover:text-foreground px-3 py-2 min-h-11 inline-flex items-center"
            >
              {t("about.admin.title")}
            </Link>
```

- [ ] **Step 5: Regenerate the route tree and type-check**

Run: `bun run build`
Expected: build succeeds; `src/routeTree.gen.ts` is regenerated to include the three new routes. Then run `bunx tsc --noEmit` and expect no errors — the route-not-found errors from Task 7 Step 4 should now be gone.

- [ ] **Step 6: Manual smoke test**

Run `bun run dev`, sign in as an admin, and:
1. Navigate to `/admin` — confirm the new "Despre proiect" link appears in the header nav.
2. Click it, confirm `/admin/despre-proiect` loads, shows the content form pre-filled with empty title/description, and an empty team members state.
3. Edit the title/description (RO), click a translate button, confirm EN/FR fill in, save, confirm no error.
4. Click "Add team member" / "Adaugă membru", upload a test photo, fill in a RO role, translate to EN/FR, submit.
5. Confirm it redirects to the edit page for the new member with the same data loaded.
6. Go back to the list, confirm the new member's photo/name/role show up in the table.
7. Add a second member, drag-reorder the two rows, confirm the order persists after a page reload.
8. Delete one via the trash icon + confirm dialog, confirm it disappears from the list.
9. Paste a long description (at least 2000 characters, with a couple of blank-line paragraph breaks) into the RO description field, save, then click the EN translate button on it — confirm it completes successfully (this exercises the `chunkText`-based multi-request path in `AboutContentForm`, not just a single short request).
10. Sign out, then either sign in as a non-admin account or open `/admin/despre-proiect` while signed out — confirm you're redirected/blocked rather than seeing the admin page (matches how `/admin/heritage` already behaves). If you have access to a non-admin account's bearer token, calling `updateAboutContent`/`createTeamMember` directly should also fail with "Forbidden: admin role required" — this is enforced by the same `assertAdmin` helper already proven out for `heritage-items.functions.ts`, so a code read-through of Task 3's handlers is an acceptable substitute for a live call if a second test account isn't available.

- [ ] **Step 7: Revert incidental auto-generated noise, then commit**

```bash
git diff --stat src/routeTree.gen.ts
```
If the diff is only line-ending noise with no real content changes beyond the three new routes, keep it as-is (it's expected to change — it now includes real new routes, unlike the phantom CRLF-only diffs this repo sometimes shows on files you didn't touch). Then:

```bash
git add src/routes/_authenticated/admin_.despre-proiect.tsx src/routes/_authenticated/admin_.despre-proiect_.team.new.tsx "src/routes/_authenticated/admin_.despre-proiect_.team.\$id.edit.tsx" src/components/admin/AdminPage.tsx src/routeTree.gen.ts
git commit -m "$(cat <<'EOF'
Add about/team admin routes and nav link

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Public `/despre-proiect` page

**Files:**
- Modify: `src/routes/despre-proiect.tsx`

**Interfaces:**
- Consumes: `supabase` client (`@/integrations/supabase/client`), `pick` helper (copy the same 8-line implementation already duplicated in `HeritageListPage.tsx`/`b.$slug.tsx` — this repo has no shared `pick` module, each public route defines its own), `SiteNav`/`SiteFooter`/`AtomLogo`.
- Produces: the page renders real content instead of an empty body.

- [ ] **Step 1: Rewrite the file**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

type AboutContent = {
  title: string;
  title_en: string | null;
  title_fr: string | null;
  description: string;
  description_en: string | null;
  description_fr: string | null;
};

type TeamMember = {
  id: string;
  name: string;
  role: string | null;
  role_en: string | null;
  role_fr: string | null;
  photo_url: string | null;
};

function pick(
  lang: string,
  ro: string | null | undefined,
  en: string | null | undefined,
  fr: string | null | undefined,
): string | null {
  const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
  const r = clean(ro);
  const e = clean(en);
  const f = clean(fr);
  if (lang === "en") return e ?? r ?? f ?? null;
  if (lang === "fr") return f ?? r ?? e ?? null;
  return r ?? e ?? f ?? null;
}

async function loadAboutPage(): Promise<{ content: AboutContent | null; team: TeamMember[] }> {
  const [contentRes, teamRes] = await Promise.all([
    supabase.from("about_content").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("team_members")
      .select("id, name, role, role_en, role_fr, photo_url")
      .order("sort_order")
      .order("created_at"),
  ]);
  return {
    content: contentRes.data ?? null,
    team: teamRes.data ?? [],
  };
}

export const Route = createFileRoute("/despre-proiect")({
  loader: () => loadAboutPage(),
  head: () => ({
    meta: [
      { title: "Despre proiect — Ploieștiul Istoric Digital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DespreProiect,
});

function DespreProiect() {
  const { t, lang } = useI18n();
  const { content, team } = Route.useLoaderData();

  const title = content ? pick(lang, content.title, content.title_en, content.title_fr) : null;
  const description = content ? pick(lang, content.description, content.description_en, content.description_fr) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <section className="mx-auto max-w-3xl px-4 pt-10 sm:pt-14 pb-24 flex-1 w-full">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold border-b border-border/70 pb-3 mb-8">
          {title || t("nav.despreProiect")}
        </h1>

        {description && (
          <div className="rich-text-content max-w-none font-serif text-foreground text-lg leading-[1.7] mb-12">
            {description
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
          </div>
        )}

        {team.length > 0 && (
          <>
            <div className="ornament-divider mb-10">
              <span className="font-display text-accent text-xl">✦</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-10">
              {team.map((member) => {
                const role = pick(lang, member.role, member.role_en, member.role_fr);
                return (
                  <div key={member.id} className="flex flex-col items-center text-center">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt=""
                        className="h-24 w-24 rounded-full object-cover grayscale"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <User className="h-10 w-10" />
                      </div>
                    )}
                    <span className="mt-3 font-display text-base font-semibold">{member.name}</span>
                    {role && <span className="mt-1 text-sm text-muted-foreground">{role}</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `bun run build`
Expected: build succeeds.

- [ ] **Step 4: Manual smoke test**

Run `bun run dev`:
1. Visit `/despre-proiect` with no content/team members yet (fresh migration state) — confirm it renders just the fallback heading (`t("nav.despreProiect")`) with no errors, no broken layout.
2. After completing Task 8's manual smoke test (which adds real content + 1-2 team members via the admin page), reload `/despre-proiect` and confirm the title, description paragraphs, ornament divider, and team grid all render correctly.
3. Check a team member with no photo — confirm the placeholder user-icon circle renders instead of a broken image.
4. Switch language (RO/EN/FR) via the header switcher and confirm the title/description/role text updates accordingly (falling back to RO for any language left untranslated).
5. Check at phone width (~400px) — confirm the team grid drops to 2 columns and nothing overflows.

- [ ] **Step 5: Commit**

```bash
git add src/routes/despre-proiect.tsx
git commit -m "$(cat <<'EOF'
Render real content and team gallery on the public Despre proiect page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
