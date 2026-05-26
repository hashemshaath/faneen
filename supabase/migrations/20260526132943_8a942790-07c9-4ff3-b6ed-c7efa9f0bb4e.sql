ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS phone_country_code text,
  ADD COLUMN IF NOT EXISTS phone_national text;

-- Auto-reassemble phone from parts when inserted/updated, to keep legacy `phone` in sync
CREATE OR REPLACE FUNCTION public.lead_requests_sync_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_country_code IS NOT NULL AND NEW.phone_national IS NOT NULL
     AND length(btrim(NEW.phone_national)) > 0 THEN
    NEW.phone := NEW.phone_country_code || NEW.phone_national;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_requests_sync_phone ON public.lead_requests;
CREATE TRIGGER trg_lead_requests_sync_phone
BEFORE INSERT OR UPDATE ON public.lead_requests
FOR EACH ROW EXECUTE FUNCTION public.lead_requests_sync_phone();