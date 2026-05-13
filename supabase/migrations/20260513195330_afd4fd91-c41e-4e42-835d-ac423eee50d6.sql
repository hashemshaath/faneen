ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS region_en text,
  ADD COLUMN IF NOT EXISTS district_en text,
  ADD COLUMN IF NOT EXISTS street_name_en text,
  ADD COLUMN IF NOT EXISTS address_en text,
  ADD COLUMN IF NOT EXISTS account_manager_name text,
  ADD COLUMN IF NOT EXISTS account_manager_phone text,
  ADD COLUMN IF NOT EXISTS account_manager_email text,
  ADD COLUMN IF NOT EXISTS account_manager_position text;