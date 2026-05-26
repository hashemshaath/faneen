-- Add bilingual name, Saudi identity fields, VAT, and detailed national address to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name_ar text,
  ADD COLUMN IF NOT EXISTS full_name_en text,
  ADD COLUMN IF NOT EXISTS national_id_type text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS short_national_address text,
  ADD COLUMN IF NOT EXISTS region_name text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS building_number text,
  ADD COLUMN IF NOT EXISTS additional_number text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS address_line text;

-- Validation trigger (no CHECK constraints, to allow nulls & flexibility)
CREATE OR REPLACE FUNCTION public.validate_profile_identity_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- National ID: 10 digits, starts with 1 (Saudi) or 2 (Iqama)
  IF NEW.national_id IS NOT NULL AND NEW.national_id <> '' THEN
    IF NEW.national_id !~ '^[12][0-9]{9}$' THEN
      RAISE EXCEPTION 'INVALID_NATIONAL_ID' USING ERRCODE = '22000';
    END IF;
    IF NEW.national_id_type IS NULL THEN
      NEW.national_id_type := CASE WHEN left(NEW.national_id, 1) = '1' THEN 'saudi' ELSE 'iqama' END;
    END IF;
  END IF;

  -- VAT: exactly 15 digits, starts and ends with 3, 11th digit = 3 (ZATCA spec)
  IF NEW.vat_number IS NOT NULL AND NEW.vat_number <> '' THEN
    IF NEW.vat_number !~ '^3[0-9]{9}3[0-9]{4}$' OR right(NEW.vat_number, 1) <> '3' THEN
      RAISE EXCEPTION 'INVALID_VAT_NUMBER' USING ERRCODE = '22000';
    END IF;
  END IF;

  -- Short national address: 4 uppercase letters + 4 digits
  IF NEW.short_national_address IS NOT NULL AND NEW.short_national_address <> '' THEN
    NEW.short_national_address := upper(regexp_replace(NEW.short_national_address, '\s+', '', 'g'));
    IF NEW.short_national_address !~ '^[A-Z]{4}[0-9]{4}$' THEN
      RAISE EXCEPTION 'INVALID_SHORT_NATIONAL_ADDRESS' USING ERRCODE = '22000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_identity_fields ON public.profiles;
CREATE TRIGGER trg_validate_profile_identity_fields
  BEFORE INSERT OR UPDATE OF national_id, vat_number, short_national_address
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_identity_fields();

-- Uniqueness (when present) on national_id and vat_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_national_id_unique
  ON public.profiles (national_id) WHERE national_id IS NOT NULL AND national_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_vat_number_unique
  ON public.profiles (vat_number) WHERE vat_number IS NOT NULL AND vat_number <> '';
