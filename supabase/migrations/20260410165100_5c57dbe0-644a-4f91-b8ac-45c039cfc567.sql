
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS unified_number text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS customer_service_phone text;
