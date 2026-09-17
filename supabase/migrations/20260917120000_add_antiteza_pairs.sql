-- Applied directly via the Supabase SQL Editor against production
-- (gxpiixyldoqxvluogziy) on 2026-09-17 -- CLI access was unavailable at
-- the time, so `supabase_migrations.schema_migrations` doesn't know this
-- ran. Before the next `supabase db push` against that project, run
-- `supabase migration repair --status applied 20260917120000` first, or
-- this will fail trying to recreate an already-existing table/policies.

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
