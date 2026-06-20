-- OPPORTUNITIES PHASE 5B — opportunity_bids security hardening
-- 1) Non-negative price
ALTER TABLE public.opportunity_bids
  ADD CONSTRAINT opp_bids_price_non_negative
  CHECK (price_amount IS NULL OR price_amount >= 0);

-- 2) assignment_id consistency: when set, the lead row must reference
--    the same opportunity AND the same provider_business_id (when present).
CREATE OR REPLACE FUNCTION public.opp_bids_validate_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_qr uuid;
  lead_provider uuid;
BEGIN
  IF NEW.assignment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT quote_request_id, provider_id
    INTO lead_qr, lead_provider
  FROM public.quote_request_leads
  WHERE id = NEW.assignment_id;

  IF lead_qr IS NULL THEN
    RAISE EXCEPTION 'opportunity_bids: assignment_id % not found', NEW.assignment_id;
  END IF;

  IF lead_qr <> NEW.opportunity_id THEN
    RAISE EXCEPTION 'opportunity_bids: assignment_id does not belong to opportunity_id';
  END IF;

  IF NEW.provider_business_id IS NOT NULL
     AND lead_provider IS NOT NULL
     AND lead_provider <> NEW.provider_business_id THEN
    RAISE EXCEPTION 'opportunity_bids: assignment provider does not match provider_business_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER opp_bids_validate_assignment_trg
  BEFORE INSERT OR UPDATE OF assignment_id, opportunity_id, provider_business_id
  ON public.opportunity_bids
  FOR EACH ROW EXECUTE FUNCTION public.opp_bids_validate_assignment();