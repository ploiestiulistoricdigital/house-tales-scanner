
-- Move has_role out of exposed public schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.has_role(uuid, app_role) SET SCHEMA private;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated, service_role;

-- Recreate policies referencing new location
DROP POLICY IF EXISTS "Admins can delete buildings" ON public.buildings;
DROP POLICY IF EXISTS "Admins can update buildings" ON public.buildings;
DROP POLICY IF EXISTS "Admins can insert buildings" ON public.buildings;
CREATE POLICY "Admins can delete buildings" ON public.buildings FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update buildings" ON public.buildings FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert buildings" ON public.buildings FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete building images" ON public.building_images;
DROP POLICY IF EXISTS "Admins can update building images" ON public.building_images;
DROP POLICY IF EXISTS "Admins can insert building images" ON public.building_images;
CREATE POLICY "Admins can delete building images" ON public.building_images FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update building images" ON public.building_images FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert building images" ON public.building_images FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete qr exports" ON public.qr_code_exports;
DROP POLICY IF EXISTS "Admins can insert qr exports" ON public.qr_code_exports;
CREATE POLICY "Admins can delete qr exports" ON public.qr_code_exports FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert qr exports" ON public.qr_code_exports FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Storage: policies for admin write reference the function
DROP POLICY IF EXISTS "Admins can delete qr-codes" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload qr-codes" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete building images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update building images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload building images" ON storage.objects;
CREATE POLICY "Admins can delete qr-codes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'qr-codes' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload qr-codes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'qr-codes' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete building-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'building-images' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update building-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'building-images' AND private.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'building-images' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload building-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'building-images' AND private.has_role(auth.uid(), 'admin'));

-- Remove broad public SELECT on storage.objects that permits listing.
-- Files remain accessible via their direct public URLs because buckets are public.
DROP POLICY IF EXISTS "Public can read qr-codes" ON storage.objects;
DROP POLICY IF EXISTS "Public can read building images" ON storage.objects;
