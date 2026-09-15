-- Applied directly via the Supabase SQL Editor against production
-- (gxpiixyldoqxvluogziy) on 2026-09-15 -- CLI access was unavailable at
-- the time, so `supabase_migrations.schema_migrations` doesn't know this
-- ran. Before the next `supabase db push` against that project, run
-- `supabase migration repair --status applied 20260915065524` first, or
-- this will fail trying to recreate an already-existing table.
CREATE TYPE public.heritage_category AS ENUM (
  'locuri_disparute', 'oameni_povesti', 'documente_arhiva'
);

CREATE TABLE public.heritage_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.heritage_category NOT NULL,
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

-- Writes go exclusively through the service-role client after an
-- application-level assertAdmin() check (see 20260827180000_...sql) --
-- authenticated only gets SELECT at the grant level, RLS policies below
-- are the belt to that suspenders for anything queried via the caller's
-- own RLS-bound client.
GRANT SELECT ON public.heritage_items TO anon, authenticated;
GRANT ALL ON public.heritage_items TO service_role;
ALTER TABLE public.heritage_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view heritage items" ON public.heritage_items
FOR SELECT TO anon, authenticated USING (true);

-- has_role lives in the `private` schema (not `public`, despite the
-- original buildings migration creating it there) -- verified directly
-- against production, where every other admin-gated policy already calls
-- private.has_role. Match that, not the original migration file.
CREATE POLICY "Admins can insert heritage items" ON public.heritage_items
FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update heritage items" ON public.heritage_items
FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete heritage items" ON public.heritage_items
FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER heritage_items_updated_at BEFORE UPDATE ON public.heritage_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX heritage_items_category_sort_idx ON public.heritage_items(category, sort_order, created_at);
