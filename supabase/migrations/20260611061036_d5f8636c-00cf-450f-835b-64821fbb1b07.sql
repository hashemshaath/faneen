ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS complex_name TEXT,
  ADD COLUMN IF NOT EXISTS complex_name_en TEXT,
  ADD COLUMN IF NOT EXISTS site_number TEXT;

ALTER TABLE public.business_branches
  ADD COLUMN IF NOT EXISTS complex_name TEXT,
  ADD COLUMN IF NOT EXISTS complex_name_en TEXT,
  ADD COLUMN IF NOT EXISTS site_number TEXT,
  ADD COLUMN IF NOT EXISTS district_en TEXT,
  ADD COLUMN IF NOT EXISTS street_name_en TEXT,
  ADD COLUMN IF NOT EXISTS region_en TEXT,
  ADD COLUMN IF NOT EXISTS address_en TEXT;