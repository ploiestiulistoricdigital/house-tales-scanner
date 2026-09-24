-- Team member names were RO-only; the admin form needs the same
-- trilingual RO/EN/FR pattern already used for role/role_en/role_fr.
ALTER TABLE public.team_members
  ADD COLUMN name_en TEXT,
  ADD COLUMN name_fr TEXT;
