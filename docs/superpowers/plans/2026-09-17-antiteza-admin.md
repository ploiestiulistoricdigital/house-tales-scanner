# Admin-managed before/after ("antiteza") image pairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins add/edit/delete the homepage's before/after ("Ploieștiul atunci și acum") image pairs — uploading both photos and a trilingual caption for each — instead of the pairs being hardcoded to 4 static files.

**Architecture:** A new `antiteza_pairs` table (mirrors `heritage_items`'s RLS/grant pattern exactly) backs a new admin CRUD section (list + new + edit pages, following the existing `HeritagePage`/`NewHeritageItemPage`/`EditHeritageItemPage` structure) and three server functions in a new `src/lib/antiteza.functions.ts`. The homepage's loader fetches the table instead of using a hardcoded array; `BeforeAfterSlider` gains caption props. A one-time seed step uploads the 4 existing static images into the new storage bucket and inserts them as rows so production is visually unchanged, after which the static files are deleted.

**Tech Stack:** TanStack Start (`createServerFn`, file-based routing), Supabase (Postgres + Storage + RLS), Zod, React 19 (no react-hook-form — plain `useState`, matching every other admin form in this repo), Tailwind v4.

**Spec:** [docs/superpowers/specs/2026-09-17-antiteza-admin-design.md](../specs/2026-09-17-antiteza-admin-design.md)

## Global Constraints

- Every mutating server function must call `assertAdmin(context)` first, then `assertRateLimit(context.userId, "antiteza:mutate", 60, 300)` — copied verbatim from the `heritage:mutate` / `buildings:mutate` pattern in `src/lib/heritage-items.functions.ts`.
- Table grants: `GRANT SELECT ON public.antiteza_pairs TO anon, authenticated; GRANT ALL ON public.antiteza_pairs TO service_role;` — no direct `INSERT`/`UPDATE`/`DELETE` grant to `authenticated`. All writes go through the service-role client (`@/integrations/supabase/client.server`), imported lazily inside each handler.
- RLS policies still get admin `INSERT`/`UPDATE`/`DELETE` policies via `private.has_role(auth.uid(), 'admin'::app_role)` even though `authenticated` has no grant for those operations — this is the "belt to suspenders" pattern already used in `20260915065524_add_heritage_items.sql`, kept for defense in depth.
- Caption fields are plain text (max 300 chars each, matching `building_images.caption`), never passed through `sanitizeRichText`/`dangerouslySetInnerHTML`.
- Image URL fields are required, validated with `z.string().url().max(2000)`.
- New Supabase Storage bucket: `antiteza-images` (public read, admin-only write) — separate from `building-images`.
- This repo has no JS/TS test runner (see `CLAUDE.md`) — every task's "test" step is `bunx tsc --noEmit`, `bun run build`, and a described manual smoke check, not an automated test file.
- Auto-generated files (`src/routeTree.gen.ts`, the four `src/routes/[.mcp]/*` / `[.well-known]/*` files) must be inspected with `git diff` before every commit and reverted if the only change is line-ending noise, per this repo's established workflow.
- Every commit message ends with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- The Supabase CLI in this environment cannot reach the database directly (`supabase migration list --linked` fails with `LegacyDbConfigIpv6Error`) — migrations must be applied by hand via the Supabase SQL Editor for project `gxpiixyldoqxvluogziy`. `supabase gen types typescript --linked` **does** work (it uses the Management API, not a direct DB connection) and must be run after the migration is applied, to regenerate `src/integrations/supabase/types.ts`.

---

### Task 1: Database migration — `antiteza_pairs` table + storage bucket

**Files:**
- Create: `supabase/migrations/20260917120000_add_antiteza_pairs.sql`

**Interfaces:**
- Produces: table `public.antiteza_pairs` with columns `id, before_image_url, after_image_url, before_caption, before_caption_en, before_caption_fr, after_caption, after_caption_en, after_caption_fr, sort_order, created_at`; storage bucket `antiteza-images` (public).

- [ ] **Step 1: Write the migration file**

```sql
-- Admin-managed before/after ("antiteza") image pairs shown in the
-- homepage's "Ploieștiul atunci și acum" section, replacing the previously
-- hardcoded ANTITEZA_PAIRS array + static /images/antiteza/*.jpg files.
-- Mirrors heritage_items' RLS/grant pattern (20260915065524_add_heritage_items.sql):
-- writes go exclusively through the service-role client after an
-- application-level assertAdmin() check; authenticated only gets SELECT at
-- the grant level, the RLS policies below are the belt to that suspenders.
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

GRANT SELECT ON public.antiteza_pairs TO anon, authenticated;
GRANT ALL ON public.antiteza_pairs TO service_role;
ALTER TABLE public.antiteza_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view antiteza pairs" ON public.antiteza_pairs
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert antiteza pairs" ON public.antiteza_pairs
FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update antiteza pairs" ON public.antiteza_pairs
FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete antiteza pairs" ON public.antiteza_pairs
FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX antiteza_pairs_sort_idx ON public.antiteza_pairs(sort_order, created_at);

-- Storage bucket for the before/after photos, separate from building-images
-- so antiteza photos aren't mixed into per-building galleries.
INSERT INTO storage.buckets (id, name, public)
VALUES ('antiteza-images', 'antiteza-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read antiteza-images" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'antiteza-images');

CREATE POLICY "Admins can upload antiteza-images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'antiteza-images' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update antiteza-images" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'antiteza-images' AND private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'antiteza-images' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete antiteza-images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'antiteza-images' AND private.has_role(auth.uid(), 'admin'::app_role));
```

- [ ] **Step 2: Apply it to production manually**

The CLI can't reach the DB from this environment. Open the Supabase SQL Editor for project `gxpiixyldoqxvluogziy` (https://supabase.com/dashboard/project/gxpiixyldoqxvluogziy/sql/new), paste the full SQL from Step 1, and run it. Confirm it succeeds with no errors (a `NOTICE`-only or empty success result is fine).

- [ ] **Step 3: Verify the table and bucket exist**

In the SQL Editor, run `select * from public.antiteza_pairs;` (expect an empty result, no error) and `select id, public from storage.buckets where id = 'antiteza-images';` (expect one row with `public = true`).

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/20260917120000_add_antiteza_pairs.sql
git commit -m "$(cat <<'EOF'
Add antiteza_pairs table and storage bucket

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Regenerate Supabase types

**Files:**
- Modify: `src/integrations/supabase/types.ts` (fully regenerated, not hand-edited)

**Interfaces:**
- Consumes: the `antiteza_pairs` table created in Task 1 (must already be applied to production before this step).
- Produces: `Database["public"]["Tables"]["antiteza_pairs"]` with `Row`/`Insert`/`Update` types, used by every later task's Supabase queries.

- [ ] **Step 1: Regenerate the file**

```bash
npx supabase gen types typescript --linked --schema public > src/integrations/supabase/types.ts
```

- [ ] **Step 2: Verify the diff only adds the new table (plus expected formatting)**

```bash
git diff --stat src/integrations/supabase/types.ts
git diff src/integrations/supabase/types.ts | grep -A 30 "antiteza_pairs"
```
Expected: a new `antiteza_pairs: { Row: {...}, Insert: {...}, Update: {...} }` block with the 11 columns from Task 1, and no unrelated table definitions changed or removed. If unrelated tables show diffs (e.g. from schema drift unrelated to this feature), stop and investigate before proceeding — don't blindly accept the regenerated file.

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Regenerate Supabase types for antiteza_pairs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Server functions (`src/lib/antiteza.functions.ts`)

**Files:**
- Create: `src/lib/antiteza.functions.ts`

**Interfaces:**
- Consumes: `Database` type from Task 2, `requireSupabaseAuth` (`@/integrations/supabase/auth-middleware`), `assertRateLimit` (`@/lib/rate-limit`).
- Produces: `createAntitezaPair`, `updateAntitezaPair`, `deleteAntitezaPair` — each a `createServerFn`, callable via `useServerFn(...)` from admin page components (Task 6). Input/output shapes:
  - `createAntitezaPair({ data: AntitezaPairInput }) => Promise<AntitezaPairRow>`
  - `updateAntitezaPair({ data: AntitezaPairInput & { id: string } }) => Promise<AntitezaPairRow>`
  - `deleteAntitezaPair({ data: { id: string } }) => Promise<{ ok: true }>`
  - where `AntitezaPairInput = { before_image_url: string; after_image_url: string; before_caption?: string | null; before_caption_en?: string | null; before_caption_fr?: string | null; after_caption?: string | null; after_caption_en?: string | null; after_caption_fr?: string | null; sort_order: number }`.

- [ ] **Step 1: Write the file**

```ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit } from "@/lib/rate-limit";
import type { Database } from "@/integrations/supabase/types";

const antitezaPairInput = z.object({
  before_image_url: z.string().url().max(2000),
  after_image_url: z.string().url().max(2000),
  before_caption: z.string().max(300).optional().nullable(),
  before_caption_en: z.string().max(300).optional().nullable(),
  before_caption_fr: z.string().max(300).optional().nullable(),
  after_caption: z.string().max(300).optional().nullable(),
  after_caption_en: z.string().max(300).optional().nullable(),
  after_caption_fr: z.string().max(300).optional().nullable(),
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

export const createAntitezaPair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof antitezaPairInput>) => antitezaPairInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "antiteza:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("antiteza_pairs")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateAntitezaPair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof antitezaPairInput> & { id: string }) =>
    z.object({ id: z.string().uuid() }).merge(antitezaPairInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "antiteza:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const { data: row, error } = await supabaseAdmin
      .from("antiteza_pairs")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAntitezaPair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "antiteza:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("antiteza_pairs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors. If `antiteza_pairs` isn't recognized on `.from(...)`, re-check Task 2's diff landed correctly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/antiteza.functions.ts
git commit -m "$(cat <<'EOF'
Add antiteza_pairs server functions (create/update/delete)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `BeforeAfterSlider` caption props

**Files:**
- Modify: `src/components/BeforeAfterSlider.tsx`

**Interfaces:**
- Produces: two new optional props, `beforeCaption?: string | null` and `afterCaption?: string | null`, rendered as a caption line under each side's existing label badge.

- [ ] **Step 1: Add the props and render the captions**

In `src/components/BeforeAfterSlider.tsx`, change the props destructuring and type:

```tsx
export function BeforeAfterSlider({
  beforeSrc,
  beforeLabel,
  beforeCaption,
  afterSrc,
  afterLabel,
  afterCaption,
  afterPlaceholder,
}: {
  beforeSrc: string;
  beforeLabel: string;
  beforeCaption?: string | null;
  afterSrc?: string;
  afterLabel: string;
  afterCaption?: string | null;
  afterPlaceholder?: string;
}) {
```

Then, in the "after" image block, change:

```tsx
        <span className="absolute bottom-3 right-3 rounded-sm bg-background/90 backdrop-blur px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-foreground border border-border/60">
          {afterLabel}
        </span>
```

to:

```tsx
        <div className="absolute bottom-3 right-3 max-w-[70%] rounded-sm bg-background/90 backdrop-blur px-2.5 py-1 text-right text-foreground border border-border/60">
          <span className="block text-xs font-semibold uppercase tracking-widest">{afterLabel}</span>
          {afterCaption && <span className="block text-xs italic mt-0.5">{afterCaption}</span>}
        </div>
```

and, in the "before" image block, change:

```tsx
        <span className="absolute bottom-3 left-3 rounded-sm bg-background/90 backdrop-blur px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-foreground border border-border/60">
          {beforeLabel}
        </span>
```

to:

```tsx
        <div className="absolute bottom-3 left-3 max-w-[70%] rounded-sm bg-background/90 backdrop-blur px-2.5 py-1 text-foreground border border-border/60">
          <span className="block text-xs font-semibold uppercase tracking-widest">{beforeLabel}</span>
          {beforeCaption && <span className="block text-xs italic mt-0.5">{beforeCaption}</span>}
        </div>
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors (the two call sites of `BeforeAfterSlider` — `src/routes/index.tsx` — don't pass the new optional props yet, which is fine since they're optional; Task 8 wires them).

- [ ] **Step 3: Commit**

```bash
git add src/components/BeforeAfterSlider.tsx
git commit -m "$(cat <<'EOF'
Add optional caption props to BeforeAfterSlider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: i18n keys

**Files:**
- Modify: `src/lib/i18n.tsx`

**Interfaces:**
- Produces: the following keys in all three dictionaries (RO block starting `const RO: Dict = {`, EN block `const EN: Dict = {`, FR block `const FR: Dict = {`) — insert each group near the existing `heritageItems.admin.*` keys (RO around line 314, EN around line 604, FR around line 894, adjusting for the line numbers shifting as you add earlier keys):

- [ ] **Step 1: Add the RO keys** (near `"heritageItems.admin.empty": "Niciun element încă. Creează primul.",`)

```ts
  "antiteza.admin.title": "Atunci și acum",
  "antiteza.admin.all": "Toate perechile",
  "antiteza.admin.new": "Pereche nouă",
  "antiteza.admin.edit": "Editează perechea",
  "antiteza.admin.empty": "Nicio pereche încă. Creează prima.",
  "antiteza.admin.confirmDelete.title": "Ștergi perechea?",
  "antiteza.admin.confirmDelete": "Ștergi această pereche de imagini? Această acțiune este ireversibilă.",
  "antiteza.field.beforeImage": "Fotografie „atunci”",
  "antiteza.field.afterImage": "Fotografie „acum”",
  "antiteza.field.beforeCaption": "Descriere „atunci”",
  "antiteza.field.afterCaption": "Descriere „acum”",
  "antiteza.field.sortOrder": "Ordine afișare",
  "antiteza.field.sortOrder.hint": "Valoarea mai mică apare prima în rotația de pe pagina principală.",
  "antiteza.err.beforeImage.required": "Fotografia „atunci” este obligatorie.",
  "antiteza.err.afterImage.required": "Fotografia „acum” este obligatorie.",
```

- [ ] **Step 2: Add the EN keys** (near `"heritageItems.admin.empty": "No items yet. Create the first one.",`)

```ts
  "antiteza.admin.title": "Then & now",
  "antiteza.admin.all": "All pairs",
  "antiteza.admin.new": "New pair",
  "antiteza.admin.edit": "Edit pair",
  "antiteza.admin.empty": "No pairs yet. Create the first one.",
  "antiteza.admin.confirmDelete.title": "Delete this pair?",
  "antiteza.admin.confirmDelete": "Delete this image pair? This action is irreversible.",
  "antiteza.field.beforeImage": "\"Then\" photo",
  "antiteza.field.afterImage": "\"Now\" photo",
  "antiteza.field.beforeCaption": "\"Then\" caption",
  "antiteza.field.afterCaption": "\"Now\" caption",
  "antiteza.field.sortOrder": "Display order",
  "antiteza.field.sortOrder.hint": "Lower values show first in the homepage rotation.",
  "antiteza.err.beforeImage.required": "The \"then\" photo is required.",
  "antiteza.err.afterImage.required": "The \"now\" photo is required.",
```

- [ ] **Step 3: Add the FR keys** (near `"heritageItems.admin.empty": "Aucun élément pour l'instant. Créez le premier.",`)

```ts
  "antiteza.admin.title": "Avant/Après",
  "antiteza.admin.all": "Toutes les paires",
  "antiteza.admin.new": "Nouvelle paire",
  "antiteza.admin.edit": "Modifier la paire",
  "antiteza.admin.empty": "Aucune paire pour l'instant. Créez la première.",
  "antiteza.admin.confirmDelete.title": "Supprimer cette paire ?",
  "antiteza.admin.confirmDelete": "Supprimer cette paire d'images ? Cette action est irréversible.",
  "antiteza.field.beforeImage": "Photo « avant »",
  "antiteza.field.afterImage": "Photo « après »",
  "antiteza.field.beforeCaption": "Légende « avant »",
  "antiteza.field.afterCaption": "Légende « après »",
  "antiteza.field.sortOrder": "Ordre d'affichage",
  "antiteza.field.sortOrder.hint": "Une valeur plus basse apparaît en premier dans la rotation de la page d'accueil.",
  "antiteza.err.beforeImage.required": "La photo « avant » est obligatoire.",
  "antiteza.err.afterImage.required": "La photo « après » est obligatoire.",
```

- [ ] **Step 4: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.tsx
git commit -m "$(cat <<'EOF'
Add i18n keys for antiteza admin section

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `AntitezaPairForm` component

**Files:**
- Create: `src/components/AntitezaPairForm.tsx`

**Interfaces:**
- Consumes: `ImageUploader` (`@/components/ImageUploader`), `translateText` (`@/lib/translate.functions`), `useI18n` (`@/lib/i18n`).
- Produces: `AntitezaPairFormValues` type and `AntitezaPairForm` component, consumed by Task 7's `NewAntitezaPairPage`/`EditAntitezaPairPage`:
  ```ts
  export type AntitezaPairFormValues = {
    before_image_url: string;
    after_image_url: string;
    before_caption: string;
    before_caption_en: string;
    before_caption_fr: string;
    after_caption: string;
    after_caption_en: string;
    after_caption_fr: string;
    sort_order: number;
  };
  ```
  Props: `{ initial: AntitezaPairFormValues; submitLabel: string; onSubmit: (v: AntitezaPairFormValues) => void; submitting: boolean; error: string | null }`.

- [ ] **Step 1: Write the file**

```tsx
import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { useI18n } from "@/lib/i18n";
import { translateText } from "@/lib/translate.functions";

export type AntitezaPairFormValues = {
  before_image_url: string;
  after_image_url: string;
  before_caption: string;
  before_caption_en: string;
  before_caption_fr: string;
  after_caption: string;
  after_caption_en: string;
  after_caption_fr: string;
  sort_order: number;
};

type Side = "before" | "after";
type FormLang = "ro" | "en" | "fr";

function captionKey(side: Side, lang: FormLang): keyof AntitezaPairFormValues {
  if (lang === "ro") return `${side}_caption`;
  return `${side}_caption_${lang}` as keyof AntitezaPairFormValues;
}

type FieldErrors = Partial<Record<"before_image_url" | "after_image_url", string>>;

function validate(
  v: AntitezaPairFormValues,
  t: (k: string) => string,
): FieldErrors {
  const errs: FieldErrors = {};
  if (!v.before_image_url.trim()) errs.before_image_url = t("antiteza.err.beforeImage.required");
  if (!v.after_image_url.trim()) errs.after_image_url = t("antiteza.err.afterImage.required");
  return errs;
}

const inputCls = "w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background";

export function AntitezaPairForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
  error,
}: {
  initial: AntitezaPairFormValues;
  submitLabel: string;
  onSubmit: (v: AntitezaPairFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [v, setV] = useState<AntitezaPairFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [translating, setTranslating] = useState<null | `${Side}:${FormLang}`>(null);
  const translate = useServerFn(translateText);

  function set<K extends keyof AntitezaPairFormValues>(k: K, val: AntitezaPairFormValues[K]) {
    setV((p) => {
      const next = { ...p, [k]: val };
      if (attempted) setFieldErrors(validate(next, t));
      return next;
    });
  }

  async function translateCaption(side: Side, target: "en" | "fr") {
    const ro = String(v[captionKey(side, "ro")] ?? "").trim();
    const other = String(v[captionKey(side, target === "en" ? "fr" : "en")] ?? "").trim();
    const source = ro || other;
    if (!source) {
      toast.error(t("translate.empty"));
      return;
    }
    setTranslating(`${side}:${target}`);
    try {
      const res = await translate({ data: { text: source, target } });
      set(captionKey(side, target), res.text);
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
    onSubmit(v);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <ImageSideFields
        side="before"
        imageLabel={t("antiteza.field.beforeImage")}
        captionLabel={t("antiteza.field.beforeCaption")}
        imageUrl={v.before_image_url}
        imageError={fieldErrors.before_image_url}
        onImageUploaded={(url) => set("before_image_url", url)}
        v={v}
        set={set}
        translating={translating}
        onTranslate={translateCaption}
      />
      <ImageSideFields
        side="after"
        imageLabel={t("antiteza.field.afterImage")}
        captionLabel={t("antiteza.field.afterCaption")}
        imageUrl={v.after_image_url}
        imageError={fieldErrors.after_image_url}
        onImageUploaded={(url) => set("after_image_url", url)}
        v={v}
        set={set}
        translating={translating}
        onTranslate={translateCaption}
      />

      <label className="block">
        <span className="mb-1.5 block text-base font-medium">{t("antiteza.field.sortOrder")}</span>
        <input
          type="number"
          min={0}
          max={9999}
          className={inputCls}
          value={v.sort_order}
          onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
        />
        <span className="mt-1 block text-sm text-muted-foreground">{t("antiteza.field.sortOrder.hint")}</span>
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

function ImageSideFields({
  side,
  imageLabel,
  captionLabel,
  imageUrl,
  imageError,
  onImageUploaded,
  v,
  set,
  translating,
  onTranslate,
}: {
  side: Side;
  imageLabel: string;
  captionLabel: string;
  imageUrl: string;
  imageError?: string;
  onImageUploaded: (url: string) => void;
  v: AntitezaPairFormValues;
  set: <K extends keyof AntitezaPairFormValues>(k: K, val: AntitezaPairFormValues[K]) => void;
  translating: null | `${Side}:${FormLang}`;
  onTranslate: (side: Side, target: "en" | "fr") => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="rounded-md border border-border/70 bg-muted/20 p-3 sm:p-4 space-y-3">
      <legend className="px-1 text-base font-medium">{imageLabel}</legend>
      <ImageUploader bucket="antiteza-images" onUploaded={onImageUploaded} />
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="h-32 rounded border object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      )}
      {imageError && <span className="block text-sm font-medium text-destructive">{imageError}</span>}

      <div className="space-y-2 pt-2 border-t border-border/60">
        <span className="block text-sm font-medium">{captionLabel}</span>
        <CaptionRow lang="RO" value={v[captionKey(side, "ro")] as string} onChange={(val) => set(captionKey(side, "ro"), val)} />
        <CaptionRow
          lang="EN"
          value={v[captionKey(side, "en")] as string}
          onChange={(val) => set(captionKey(side, "en"), val)}
          onTranslate={() => onTranslate(side, "en")}
          translating={translating === `${side}:en`}
          disabled={translating !== null}
        />
        <CaptionRow
          lang="FR"
          value={v[captionKey(side, "fr")] as string}
          onChange={(val) => set(captionKey(side, "fr"), val)}
          onTranslate={() => onTranslate(side, "fr")}
          translating={translating === `${side}:fr`}
          disabled={translating !== null}
        />
      </div>
    </fieldset>
  );
}

function CaptionRow({
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
git add src/components/AntitezaPairForm.tsx
git commit -m "$(cat <<'EOF'
Add AntitezaPairForm component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Admin list/new/edit page components

**Files:**
- Create: `src/components/admin/AntitezaPage.tsx`
- Create: `src/components/admin/NewAntitezaPairPage.tsx`
- Create: `src/components/admin/EditAntitezaPairPage.tsx`

**Interfaces:**
- Consumes: `AntitezaPairForm`/`AntitezaPairFormValues` (Task 6), `createAntitezaPair`/`updateAntitezaPair`/`deleteAntitezaPair` (Task 3), `checkIsAdmin` (`@/lib/buildings.functions`), `ConfirmDialog` (`@/components/ConfirmDialog`).
- Produces: `AntitezaPage`, `NewAntitezaPairPage`, `EditAntitezaPairPage({ id })` — consumed by Task 8's route files.

- [ ] **Step 1: Write `src/components/admin/AntitezaPage.tsx`**

```tsx
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/buildings.functions";
import { deleteAntitezaPair } from "@/lib/antiteza.functions";
import { Plus, Pencil, Trash2, LogOut } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function AntitezaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const checkAdmin = useServerFn(checkIsAdmin);
  const deleteFn = useServerFn(deleteAntitezaPair);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

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

  const { data: pairs, isError: pairsError } = useQuery({
    queryKey: ["admin-antiteza-pairs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("antiteza_pairs")
        .select("id, before_image_url, after_image_url, before_caption, after_caption, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: adminCheck?.isAdmin === true,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: undefined }, replace: true });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteFn({ data: { id: pendingDelete } });
    setPendingDelete(null);
    qc.invalidateQueries({ queryKey: ["admin-antiteza-pairs"] });
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
          <h1 className="text-lg sm:text-xl font-semibold">{t("antiteza.admin.title")}</h1>
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

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold">{t("antiteza.admin.all")}</h2>
          <Link
            to="/admin/antiteza/new"
            className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {t("antiteza.admin.new")}
          </Link>
        </div>

        {pairsError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-12 text-center text-base text-destructive leading-relaxed">
            {t("admin.error")}
          </div>
        ) : !pairs || pairs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-base text-muted-foreground leading-relaxed">
            {t("antiteza.admin.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {pairs.map((pair) => (
              <div key={pair.id} className="flex items-center gap-3 rounded-lg border border-border/70 p-3">
                <img src={pair.before_image_url} alt="" className="h-16 w-16 rounded object-cover bg-muted shrink-0" />
                <img src={pair.after_image_url} alt="" className="h-16 w-16 rounded object-cover bg-muted shrink-0" />
                <div className="flex-1 min-w-0 text-sm text-muted-foreground truncate">
                  {pair.before_caption || pair.after_caption || "—"}
                </div>
                <span className="text-sm text-muted-foreground shrink-0">#{pair.sort_order}</span>
                <div className="flex gap-1 shrink-0">
                  <Link
                    to="/admin/antiteza/$id/edit"
                    params={{ id: pair.id }}
                    className="p-2 hover:bg-accent rounded inline-flex items-center justify-center"
                    aria-label={t("admin.edit")}
                    title={t("admin.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setPendingDelete(pair.id)}
                    className="p-2 hover:bg-destructive/10 hover:text-destructive rounded inline-flex items-center justify-center"
                    aria-label={t("admin.delete")}
                    title={t("admin.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t("antiteza.admin.confirmDelete.title")}
        description={t("antiteza.admin.confirmDelete")}
        confirmLabel={t("common.delete")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/admin/NewAntitezaPairPage.tsx`**

```tsx
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AntitezaPairForm, type AntitezaPairFormValues } from "@/components/AntitezaPairForm";
import { createAntitezaPair } from "@/lib/antiteza.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function NewAntitezaPairPage() {
  const navigate = useNavigate();
  const create = useServerFn(createAntitezaPair);
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(v: AntitezaPairFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const row = await create({
        data: {
          before_image_url: v.before_image_url,
          after_image_url: v.after_image_url,
          before_caption: v.before_caption || null,
          before_caption_en: v.before_caption_en || null,
          before_caption_fr: v.before_caption_fr || null,
          after_caption: v.after_caption || null,
          after_caption_en: v.after_caption_en || null,
          after_caption_fr: v.after_caption_fr || null,
          sort_order: v.sort_order,
        },
      });
      navigate({ to: "/admin/antiteza/$id/edit", params: { id: row.id } });
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
            to="/admin/antiteza"
            className="inline-flex items-center gap-1 min-h-11 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("antiteza.admin.new")}</h1>
        <AntitezaPairForm
          initial={{
            before_image_url: "",
            after_image_url: "",
            before_caption: "",
            before_caption_en: "",
            before_caption_fr: "",
            after_caption: "",
            after_caption_en: "",
            after_caption_fr: "",
            sort_order: 0,
          }}
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

- [ ] **Step 3: Write `src/components/admin/EditAntitezaPairPage.tsx`**

```tsx
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AntitezaPairForm, type AntitezaPairFormValues } from "@/components/AntitezaPairForm";
import { updateAntitezaPair } from "@/lib/antiteza.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function EditAntitezaPairPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const update = useServerFn(updateAntitezaPair);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: pair, isLoading } = useQuery({
    queryKey: ["antiteza-pair", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("antiteza_pairs").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  async function onSubmit(v: AntitezaPairFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await update({
        data: {
          id,
          before_image_url: v.before_image_url,
          after_image_url: v.after_image_url,
          before_caption: v.before_caption || null,
          before_caption_en: v.before_caption_en || null,
          before_caption_fr: v.before_caption_fr || null,
          after_caption: v.after_caption || null,
          after_caption_en: v.after_caption_en || null,
          after_caption_fr: v.after_caption_fr || null,
          sort_order: v.sort_order,
        },
      });
      qc.invalidateQueries({ queryKey: ["antiteza-pair", id] });
      qc.invalidateQueries({ queryKey: ["admin-antiteza-pairs"] });
      navigate({ to: "/admin/antiteza" });
    } catch (e: any) {
      setError(e.message ?? t("form.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !pair) {
    return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            to="/admin/antiteza"
            className="inline-flex items-center gap-1 min-h-11 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("antiteza.admin.edit")}</h1>
        <AntitezaPairForm
          initial={{
            before_image_url: pair.before_image_url,
            after_image_url: pair.after_image_url,
            before_caption: pair.before_caption ?? "",
            before_caption_en: pair.before_caption_en ?? "",
            before_caption_fr: pair.before_caption_fr ?? "",
            after_caption: pair.after_caption ?? "",
            after_caption_en: pair.after_caption_en ?? "",
            after_caption_fr: pair.after_caption_fr ?? "",
            sort_order: pair.sort_order,
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
Expected: errors only about `to="/admin/antiteza"` / `to="/admin/antiteza/new"` / `to="/admin/antiteza/$id/edit"` not matching any known route — this is expected until Task 8 creates the route files; TanStack Router's typed `Link` will fail to compile until then. If you see any *other* error, fix it before proceeding; do not proceed past this task with route-unrelated type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AntitezaPage.tsx src/components/admin/NewAntitezaPairPage.tsx src/components/admin/EditAntitezaPairPage.tsx
git commit -m "$(cat <<'EOF'
Add antiteza admin list/new/edit page components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Route files + admin nav link

**Files:**
- Create: `src/routes/_authenticated/admin_.antiteza.tsx`
- Create: `src/routes/_authenticated/admin_.antiteza_.new.tsx`
- Create: `src/routes/_authenticated/admin_.antiteza_.$id.edit.tsx`
- Modify: `src/components/admin/AdminPage.tsx`

**Interfaces:**
- Consumes: `AntitezaPage`/`NewAntitezaPairPage`/`EditAntitezaPairPage` (Task 7), `requireAdminRoute` (`@/lib/admin-guard`).
- Produces: working routes `/admin/antiteza`, `/admin/antiteza/new`, `/admin/antiteza/$id/edit`; `src/routeTree.gen.ts` regenerated to include them.

- [ ] **Step 1: Write `src/routes/_authenticated/admin_.antiteza.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const AntitezaPage = lazy(() =>
  import("@/components/admin/AntitezaPage").then((m) => ({ default: m.AntitezaPage })),
);

function AntitezaFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/antiteza")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Antiteza pairs — Admin" }] }),
  component: () => (
    <Suspense fallback={<AntitezaFallback />}>
      <AntitezaPage />
    </Suspense>
  ),
});
```

- [ ] **Step 2: Write `src/routes/_authenticated/admin_.antiteza_.new.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const NewAntitezaPairPage = lazy(() =>
  import("@/components/admin/NewAntitezaPairPage").then((m) => ({ default: m.NewAntitezaPairPage })),
);

function NewAntitezaPairFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/antiteza_/new")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "New antiteza pair — Admin" }] }),
  component: () => (
    <Suspense fallback={<NewAntitezaPairFallback />}>
      <NewAntitezaPairPage />
    </Suspense>
  ),
});
```

- [ ] **Step 3: Write `src/routes/_authenticated/admin_.antiteza_.$id.edit.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const EditAntitezaPairPage = lazy(() =>
  import("@/components/admin/EditAntitezaPairPage").then((m) => ({ default: m.EditAntitezaPairPage })),
);

function EditAntitezaPairFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/antiteza_/$id/edit")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Edit antiteza pair — Admin" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <Suspense fallback={<EditAntitezaPairFallback />}>
      <EditAntitezaPairPage id={id} />
    </Suspense>
  );
}
```

- [ ] **Step 4: Add the nav link in `src/components/admin/AdminPage.tsx`**

Find this block (inside the `<header>`, in the `<div className="flex items-center gap-2">`):

```tsx
            <Link
              to="/admin/heritage"
              className="text-sm sm:text-base text-muted-foreground hover:text-foreground px-3 py-2 min-h-11 inline-flex items-center"
            >
              {t("heritageItems.admin.title")}
            </Link>
```

Add immediately after it:

```tsx
            <Link
              to="/admin/antiteza"
              className="text-sm sm:text-base text-muted-foreground hover:text-foreground px-3 py-2 min-h-11 inline-flex items-center"
            >
              {t("antiteza.admin.title")}
            </Link>
```

- [ ] **Step 5: Regenerate the route tree and type-check**

Run: `bun run build`
Expected: build succeeds; `src/routeTree.gen.ts` is regenerated to include the three new routes (TanStack Router's Vite plugin does this automatically during build). Then run `bunx tsc --noEmit` and expect no errors — the route-not-found errors from Task 7 Step 4 should now be gone.

- [ ] **Step 6: Manual smoke test**

Run `bun run dev`, sign in as an admin, and:
1. Navigate to `/admin` — confirm the new "Atunci și acum" (or your locale's translation) link appears in the header nav.
2. Click it, confirm `/admin/antiteza` loads and shows the empty state (no pairs exist yet).
3. Click "Pereche nouă" / "New pair", upload two test images (any small JPG/PNG), fill in a RO caption for each side, click a translate button and confirm EN/FR fill in, set sort order to `0`, submit.
4. Confirm it redirects to the edit page for the new pair with the same data loaded.
5. Go back to the list, confirm the new pair's thumbnails and caption show up.
6. Delete it via the trash icon + confirm dialog, confirm it disappears from the list.

- [ ] **Step 7: Revert incidental auto-generated noise, then commit**

```bash
git diff --stat src/routeTree.gen.ts
```
If the diff is larger than the three new route entries (e.g. touches `src/routes/[.mcp]/*` or `[.well-known]/*` files with only line-ending changes), inspect with `git diff` and revert any file whose only change is line-ending noise: `git checkout -- <file>`.

```bash
git add src/routes/_authenticated/admin_.antiteza.tsx src/routes/_authenticated/admin_.antiteza_.new.tsx src/routes/_authenticated/admin_.antiteza_.\$id.edit.tsx src/components/admin/AdminPage.tsx src/routeTree.gen.ts
git commit -m "$(cat <<'EOF'
Add antiteza admin routes and nav link

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Homepage integration

**Files:**
- Modify: `src/routes/index.tsx`

**Interfaces:**
- Consumes: `antiteza_pairs` table (Task 1/2), `BeforeAfterSlider` caption props (Task 4).
- Produces: `Home()`'s "Ploieștiul atunci și acum" section now driven by fetched data instead of the hardcoded `ANTITEZA_PAIRS` array.

- [ ] **Step 1: Add a fetch function and type, and include it in the loader**

Replace:

```tsx
const ANTITEZA_PAIRS = ["Casa_Socolescu", "Corp_Didactic", "Gara", "Scoala_baieti"] as const;
```

with:

```tsx
type AntitezaPair = {
  id: string;
  before_image_url: string;
  after_image_url: string;
  before_caption: string | null;
  before_caption_en: string | null;
  before_caption_fr: string | null;
  after_caption: string | null;
  after_caption_en: string | null;
  after_caption_fr: string | null;
};

async function fetchAntitezaPairs(): Promise<AntitezaPair[]> {
  const { data, error } = await supabase
    .from("antiteza_pairs")
    .select(
      "id, before_image_url, after_image_url, before_caption, before_caption_en, before_caption_fr, after_caption, after_caption_en, after_caption_fr",
    )
    .order("sort_order")
    .order("created_at");
  if (error) {
    console.error(error);
    return [];
  }
  return data;
}
```

Then change:

```tsx
async function loadHomeData() {
  const [story, heritageImages] = await Promise.all([fetchFeaturedStory(), fetchFeaturedHeritageItems()]);
  return { story, heritageImages };
}
```

to:

```tsx
async function loadHomeData() {
  const [story, heritageImages, antitezaPairs] = await Promise.all([
    fetchFeaturedStory(),
    fetchFeaturedHeritageItems(),
    fetchAntitezaPairs(),
  ]);
  return { story, heritageImages, antitezaPairs };
}
```

- [ ] **Step 2: Update `Home()`'s state and rotation logic**

Replace:

```tsx
  const { story, heritageImages } = Route.useLoaderData();
  const [antitezaIndex, setAntitezaIndex] = useState(0);
  const antitezaPair = ANTITEZA_PAIRS[antitezaIndex];

  useEffect(() => {
    const id = setInterval(() => {
      setAntitezaIndex((i) => (i + 1) % ANTITEZA_PAIRS.length);
    }, 10000);
    return () => clearInterval(id);
  }, []);
```

with:

```tsx
  const { story, heritageImages, antitezaPairs } = Route.useLoaderData();
  const [antitezaIndex, setAntitezaIndex] = useState(0);
  const antitezaPair = antitezaPairs.length > 0 ? antitezaPairs[antitezaIndex % antitezaPairs.length] : null;

  useEffect(() => {
    if (antitezaPairs.length <= 1) return;
    const id = setInterval(() => {
      setAntitezaIndex((i) => (i + 1) % antitezaPairs.length);
    }, 10000);
    return () => clearInterval(id);
  }, [antitezaPairs.length]);
```

- [ ] **Step 3: Guard the section and wire up captions**

Replace:

```tsx
      <section className="border-t border-border/70 bg-secondary/40 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-10 items-center">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-accent">{t("landing.compare.eyebrow")}</span>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight">
              {t("landing.compare.title.a")} <br className="hidden sm:block" /> {t("landing.compare.title.b")}
            </h2>
            <p className="mt-4 text-foreground/80 font-serif leading-relaxed">{t("landing.compare.lead")}</p>
          </div>
          <BeforeAfterSlider
            key={antitezaPair}
            beforeSrc={`/images/antiteza/${antitezaPair}-trecut.jpg`}
            beforeLabel={t("landing.compare.then")}
            afterSrc={`/images/antiteza/${antitezaPair}-prezent.jpg`}
            afterLabel={t("landing.compare.now")}
          />
        </div>
      </section>
```

with:

```tsx
      {antitezaPair && (
        <section className="border-t border-border/70 bg-secondary/40 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-10 items-center">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-accent">{t("landing.compare.eyebrow")}</span>
              <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight">
                {t("landing.compare.title.a")} <br className="hidden sm:block" /> {t("landing.compare.title.b")}
              </h2>
              <p className="mt-4 text-foreground/80 font-serif leading-relaxed">{t("landing.compare.lead")}</p>
            </div>
            <BeforeAfterSlider
              key={antitezaPair.id}
              beforeSrc={antitezaPair.before_image_url}
              beforeLabel={t("landing.compare.then")}
              beforeCaption={pick(lang, antitezaPair.before_caption, antitezaPair.before_caption_en, antitezaPair.before_caption_fr)}
              afterSrc={antitezaPair.after_image_url}
              afterLabel={t("landing.compare.now")}
              afterCaption={pick(lang, antitezaPair.after_caption, antitezaPair.after_caption_en, antitezaPair.after_caption_fr)}
            />
          </div>
        </section>
      )}
```

- [ ] **Step 4: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Run `bun run dev`, visit `/`, and confirm:
1. With no rows in `antiteza_pairs` yet (before Task 10's seed), the "Ploieștiul atunci și acum" section doesn't render at all (no broken slider, no console error).
2. After creating 2+ pairs via `/admin/antiteza` (Task 8's smoke test), the section appears, shows the first pair with captions under each side, and rotates to the next pair automatically after ~10 seconds.
3. Switching the language switcher changes the displayed captions to the matching language (or falls back to RO if a translation is empty).

- [ ] **Step 6: Commit**

```bash
git add src/routes/index.tsx
git commit -m "$(cat <<'EOF'
Load antiteza pairs from the database on the homepage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Seed the 4 existing pairs and remove the static files

**Files:**
- Create (temporary, not committed): a local Node script to run once against production.
- Delete: `public/images/antiteza/Casa_Socolescu-trecut.jpg`, `Casa_Socolescu-prezent.jpg`, `Corp_Didactic-trecut.jpg`, `Corp_Didactic-prezent.jpg`, `Gara-trecut.jpg`, `Gara-prezent.jpg`, `Scoala_baieti-trecut.jpg`, `Scoala_baieti-prezent.jpg` (all under `public/images/antiteza/`).

**Interfaces:**
- Consumes: the `antiteza-images` bucket and `antiteza_pairs` table (Task 1), a Supabase service-role key (obtained from the user — never commit it).

- [ ] **Step 1: Get the service-role key**

Ask the user for the `service_role` key for project `gxpiixyldoqxvluogziy` (Supabase dashboard → Project Settings → API). Do not store it in any file that gets committed; hold it only in an environment variable for the duration of Step 2.

- [ ] **Step 2: Write and run the seed script**

Write this to a scratch file (e.g. in the session's scratchpad directory, not the repo) as `seed-antiteza.mjs`:

```js
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const SUPABASE_URL = "https://gxpiixyldoqxvluogziy.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PAIRS = ["Casa_Socolescu", "Corp_Didactic", "Gara", "Scoala_baieti"];
const SRC_DIR = "C:/Projects/ploiestiul-istoric-digital-staging/public/images/antiteza";

async function uploadOne(localPath, destName) {
  const bytes = await readFile(localPath);
  const { error } = await supabase.storage
    .from("antiteza-images")
    .upload(destName, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("antiteza-images").getPublicUrl(destName);
  return data.publicUrl;
}

for (let i = 0; i < PAIRS.length; i++) {
  const name = PAIRS[i];
  const beforeUrl = await uploadOne(`${SRC_DIR}/${name}-trecut.jpg`, `${crypto.randomUUID()}.jpg`);
  const afterUrl = await uploadOne(`${SRC_DIR}/${name}-prezent.jpg`, `${crypto.randomUUID()}.jpg`);
  const { error } = await supabase.from("antiteza_pairs").insert({
    before_image_url: beforeUrl,
    after_image_url: afterUrl,
    sort_order: i,
  });
  if (error) throw error;
  console.log(`Seeded ${name} (sort_order ${i})`);
}
console.log("Done.");
```

Run it (adjust `SRC_DIR` if your worktree path differs):

```bash
SUPABASE_SERVICE_ROLE_KEY=<paste the key here, don't save it to a file> node seed-antiteza.mjs
```

Expected output: 4 lines like `Seeded Casa_Socolescu (sort_order 0)`, then `Done.`.

- [ ] **Step 3: Verify on the live site**

Load the production or staging site's homepage and confirm the "Ploieștiul atunci și acum" section shows the same 4 pairs as before, rotating every 10 seconds, with no captions (expected — the original static version had none either; captions can be added later via `/admin/antiteza`).

- [ ] **Step 4: Delete the now-unused static files and script**

```bash
rm -rf public/images/antiteza
```
Also delete the local `seed-antiteza.mjs` scratch file — it's a one-time script, not part of the app.

- [ ] **Step 5: Type-check and build**

Run: `bunx tsc --noEmit && bun run build`
Expected: both succeed (nothing in `src/` references `public/images/antiteza/` anymore after Task 9).

- [ ] **Step 6: Commit**

```bash
git add -A public/images/antiteza
git commit -m "$(cat <<'EOF'
Remove static antiteza images now that pairs are admin-managed

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## After all tasks: promote through the pipeline

Following this repo's established workflow: push the feature branch, open a PR into `staging`, merge, sync the worktree, then open a PR from `staging` into `main`, confirm `mergeStateStatus: "CLEAN"` / `mergeable: "MERGEABLE"`, and merge.
