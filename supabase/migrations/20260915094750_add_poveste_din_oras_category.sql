-- Adds a fourth heritage_items category dedicated to the homepage's
-- "O poveste din oraș" spotlight section. Unlike the other three
-- categories, items in this one have no public listing page -- they
-- only ever surface as the single featured story on the homepage
-- (see src/routes/index.tsx), via the shared /poveste/$slug detail page.
ALTER TYPE public.heritage_category ADD VALUE IF NOT EXISTS 'poveste_din_oras';
