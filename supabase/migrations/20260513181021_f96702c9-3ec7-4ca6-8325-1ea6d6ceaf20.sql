-- Add business_ref_id column for cross-validation
ALTER TABLE public.membership_upgrade_requests
  ADD COLUMN IF NOT EXISTS business_ref_id text;

-- Server-side guard: business must exist, be owned by the requesting user,
-- and its ref_id must match the supplied business_ref_id (if provided).
CREATE OR REPLACE FUNCTION public.validate_membership_upgrade_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_owner uuid;
  biz_ref text;
BEGIN
  SELECT user_id, ref_id INTO biz_owner, biz_ref
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF biz_owner IS NULL THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0001';
  END IF;

  IF biz_owner <> NEW.user_id THEN
    RAISE EXCEPTION 'Business does not belong to requesting user' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.business_ref_id IS NULL OR length(trim(NEW.business_ref_id)) = 0 THEN
    RAISE EXCEPTION 'business_ref_id is required for upgrade requests' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.business_ref_id <> biz_ref THEN
    RAISE EXCEPTION 'business_ref_id (%) does not match business ref_id (%)', NEW.business_ref_id, biz_ref USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_membership_upgrade_request ON public.membership_upgrade_requests;
CREATE TRIGGER trg_validate_membership_upgrade_request
  BEFORE INSERT OR UPDATE OF business_id, business_ref_id, user_id
  ON public.membership_upgrade_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_membership_upgrade_request();

-- Backfill business_ref_id for existing rows so the new NOT-NULL-ish guard
-- does not break future updates on legacy data.
UPDATE public.membership_upgrade_requests m
SET business_ref_id = b.ref_id
FROM public.businesses b
WHERE m.business_id = b.id
  AND (m.business_ref_id IS NULL OR m.business_ref_id = '');