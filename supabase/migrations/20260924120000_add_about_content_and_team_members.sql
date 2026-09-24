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
