-- Singleton "Istoria Ploieștiului" article shown above the "Locuri care au
-- dispărut" list on /istoria-ploiestiului, plus its gallery images.
-- Mirrors about_content's RLS/grant pattern (20260924120000_...sql): writes
-- go only through the service-role client after an application-level
-- assertAdmin() check.
CREATE TABLE public.istoria_content (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title TEXT NOT NULL DEFAULT '',
  title_en TEXT,
  title_fr TEXT,
  description TEXT NOT NULL DEFAULT '',
  description_en TEXT,
  description_fr TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.istoria_content (id) VALUES (1);

GRANT SELECT ON public.istoria_content TO anon, authenticated;
GRANT ALL ON public.istoria_content TO service_role;
ALTER TABLE public.istoria_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view istoria content" ON public.istoria_content
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can update istoria content" ON public.istoria_content
FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.istoria_content_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.istoria_content_images TO anon, authenticated;
GRANT ALL ON public.istoria_content_images TO service_role;
ALTER TABLE public.istoria_content_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view istoria content images" ON public.istoria_content_images
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert istoria content images" ON public.istoria_content_images
FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update istoria content images" ON public.istoria_content_images
FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete istoria content images" ON public.istoria_content_images
FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX istoria_content_images_sort_idx ON public.istoria_content_images(sort_order, created_at);
