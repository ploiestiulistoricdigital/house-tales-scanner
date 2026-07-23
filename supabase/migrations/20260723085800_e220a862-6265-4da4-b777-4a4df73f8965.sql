DROP POLICY IF EXISTS "Public read building-images" ON storage.objects;
CREATE POLICY "Public read building-images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'building-images');

DROP POLICY IF EXISTS "Public read qr-codes" ON storage.objects;
CREATE POLICY "Public read qr-codes" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'qr-codes');