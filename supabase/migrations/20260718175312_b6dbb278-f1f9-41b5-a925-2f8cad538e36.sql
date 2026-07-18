
CREATE TABLE public.qr_code_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('png','pdf')),
  file_url text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.qr_code_exports TO anon, authenticated;
GRANT INSERT, DELETE ON public.qr_code_exports TO authenticated;
GRANT ALL ON public.qr_code_exports TO service_role;

ALTER TABLE public.qr_code_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view qr exports" ON public.qr_code_exports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert qr exports" ON public.qr_code_exports FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete qr exports" ON public.qr_code_exports FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX qr_code_exports_building_id_idx ON public.qr_code_exports(building_id, created_at DESC);

-- Storage policies for qr-codes bucket
CREATE POLICY "Public can read qr-codes" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'qr-codes');
CREATE POLICY "Admins can upload qr-codes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'qr-codes' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete qr-codes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'qr-codes' AND has_role(auth.uid(), 'admin'::app_role));
