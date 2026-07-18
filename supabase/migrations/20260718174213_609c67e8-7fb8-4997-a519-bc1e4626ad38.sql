
CREATE POLICY "Public can read building images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'building-images');
CREATE POLICY "Admins can upload building images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'building-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update building images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'building-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete building images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'building-images' AND public.has_role(auth.uid(), 'admin'));
