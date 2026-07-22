ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS name_fr text,
  ADD COLUMN IF NOT EXISTS address_fr text,
  ADD COLUMN IF NOT EXISTS short_description_fr text,
  ADD COLUMN IF NOT EXISTS history_fr text;