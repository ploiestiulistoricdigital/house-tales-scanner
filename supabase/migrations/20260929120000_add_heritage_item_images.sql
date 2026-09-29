-- Extra gallery images for heritage_items (articles). The single
-- heritage_items.image_url stays as the cover/list thumbnail.
-- Same RLS/grant pattern as heritage_items: public SELECT, writes only via
-- the service-role client after an application-level assertAdmin() check.
CREATE TABLE public.heritage_item_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heritage_item_id UUID NOT NULL REFERENCES public.heritage_items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.heritage_item_images TO anon, authenticated;
GRANT ALL ON public.heritage_item_images TO service_role;
ALTER TABLE public.heritage_item_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view heritage item images" ON public.heritage_item_images
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert heritage item images" ON public.heritage_item_images
FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update heritage item images" ON public.heritage_item_images
FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete heritage item images" ON public.heritage_item_images
FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX heritage_item_images_item_sort_idx
  ON public.heritage_item_images(heritage_item_id, sort_order, created_at);
