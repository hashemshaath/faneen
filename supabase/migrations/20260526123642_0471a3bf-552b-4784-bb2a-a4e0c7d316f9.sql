
CREATE OR REPLACE FUNCTION public.split_phone(_phone text)
RETURNS TABLE(cc_out text, nat_out text)
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
DECLARE digits text; v_cc text; v_nat text;
BEGIN
  IF _phone IS NULL OR length(btrim(_phone)) = 0 THEN
    RETURN QUERY SELECT NULL::text, NULL::text; RETURN;
  END IF;
  digits := regexp_replace(_phone, '[^0-9+]', '', 'g');
  IF digits LIKE '00%' THEN digits := '+' || substring(digits from 3); END IF;
  IF position('+' IN digits) = 0 THEN
    v_nat := regexp_replace(digits, '^0+', '');
    RETURN QUERY SELECT '+966'::text, v_nat; RETURN;
  END IF;
  digits := regexp_replace(digits, '^\+', '');
  FOR v_cc IN SELECT unnest(ARRAY['966','971','965','973','968','974','962','964','961','20']) LOOP
    IF digits LIKE v_cc || '%' THEN
      v_nat := substring(digits from length(v_cc) + 1);
      RETURN QUERY SELECT '+' || v_cc, v_nat; RETURN;
    END IF;
  END LOOP;
  RETURN QUERY SELECT '+' || substring(digits from 1 for 3), substring(digits from 4);
END; $fn$;

CREATE OR REPLACE FUNCTION public.split_phone_cc(_phone text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT cc_out FROM public.split_phone(_phone)
$$;

CREATE OR REPLACE FUNCTION public.split_phone_nat(_phone text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT nat_out FROM public.split_phone(_phone)
$$;

CREATE OR REPLACE FUNCTION public.sync_phone_parts()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE v_cc text; v_nat text;
BEGIN
  v_cc := NEW.phone_country_code;
  v_nat := NEW.phone_national;
  IF (TG_OP = 'INSERT')
     OR NEW.phone_country_code IS DISTINCT FROM OLD.phone_country_code
     OR NEW.phone_national IS DISTINCT FROM OLD.phone_national THEN
    IF v_cc IS NOT NULL AND v_nat IS NOT NULL AND length(btrim(v_nat)) > 0 THEN
      v_nat := regexp_replace(v_nat, '\D', '', 'g');
      v_nat := regexp_replace(v_nat, '^0+', '');
      NEW.phone_national := v_nat;
      NEW.phone := v_cc || v_nat;
    ELSIF v_cc IS NULL AND v_nat IS NULL THEN
      IF TG_OP = 'UPDATE' AND OLD.phone_country_code IS NOT NULL THEN
        NEW.phone := NULL;
      END IF;
    END IF;
  ELSIF (TG_OP = 'UPDATE') AND NEW.phone IS DISTINCT FROM OLD.phone
        AND NEW.phone_country_code IS NOT DISTINCT FROM OLD.phone_country_code
        AND NEW.phone_national IS NOT DISTINCT FROM OLD.phone_national THEN
    NEW.phone_country_code := public.split_phone_cc(NEW.phone::text);
    NEW.phone_national := public.split_phone_nat(NEW.phone::text);
  END IF;
  RETURN NEW;
END; $fn$;

-- profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_country_code text,
  ADD COLUMN IF NOT EXISTS phone_national text;
UPDATE public.profiles
SET phone_country_code = public.split_phone_cc(phone::text),
    phone_national = public.split_phone_nat(phone::text)
WHERE phone IS NOT NULL AND (phone_country_code IS NULL OR phone_national IS NULL);
DROP TRIGGER IF EXISTS trg_profiles_sync_phone_parts ON public.profiles;
CREATE TRIGGER trg_profiles_sync_phone_parts
  BEFORE INSERT OR UPDATE OF phone, phone_country_code, phone_national
  ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_phone_parts();

CREATE OR REPLACE FUNCTION public.sync_profile_full_name()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF NEW.full_name IS NULL OR length(btrim(NEW.full_name)) = 0 THEN
    NEW.full_name := COALESCE(NEW.full_name_ar, NEW.full_name_en);
  END IF;
  RETURN NEW;
END; $fn$;
DROP TRIGGER IF EXISTS trg_profiles_sync_full_name ON public.profiles;
CREATE TRIGGER trg_profiles_sync_full_name
  BEFORE INSERT OR UPDATE OF full_name, full_name_ar, full_name_en
  ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_full_name();

-- businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS phone_country_code text,
  ADD COLUMN IF NOT EXISTS phone_national text;
UPDATE public.businesses
SET phone_country_code = public.split_phone_cc(phone::text),
    phone_national = public.split_phone_nat(phone::text)
WHERE phone IS NOT NULL AND (phone_country_code IS NULL OR phone_national IS NULL);
DROP TRIGGER IF EXISTS trg_businesses_sync_phone_parts ON public.businesses;
CREATE TRIGGER trg_businesses_sync_phone_parts
  BEFORE INSERT OR UPDATE OF phone, phone_country_code, phone_national
  ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.sync_phone_parts();

-- business_branches
ALTER TABLE public.business_branches
  ADD COLUMN IF NOT EXISTS phone_country_code text,
  ADD COLUMN IF NOT EXISTS phone_national text;
UPDATE public.business_branches
SET phone_country_code = public.split_phone_cc(phone::text),
    phone_national = public.split_phone_nat(phone::text)
WHERE phone IS NOT NULL AND (phone_country_code IS NULL OR phone_national IS NULL);
DROP TRIGGER IF EXISTS trg_branches_sync_phone_parts ON public.business_branches;
CREATE TRIGGER trg_branches_sync_phone_parts
  BEFORE INSERT OR UPDATE OF phone, phone_country_code, phone_national
  ON public.business_branches FOR EACH ROW EXECUTE FUNCTION public.sync_phone_parts();

-- lead_requests
ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS phone_country_code text,
  ADD COLUMN IF NOT EXISTS phone_national text;
UPDATE public.lead_requests
SET phone_country_code = public.split_phone_cc(phone::text),
    phone_national = public.split_phone_nat(phone::text)
WHERE phone IS NOT NULL AND (phone_country_code IS NULL OR phone_national IS NULL);
DROP TRIGGER IF EXISTS trg_leads_sync_phone_parts ON public.lead_requests;
CREATE TRIGGER trg_leads_sync_phone_parts
  BEFORE INSERT OR UPDATE OF phone, phone_country_code, phone_national
  ON public.lead_requests FOR EACH ROW EXECUTE FUNCTION public.sync_phone_parts();
