-- Quote requests: auto-generate human-friendly sequential reference IDs
-- Pattern: REQ-NNNNNNN (PREFIX-NNNNNNN policy, sequence starts at 1000001)

CREATE SEQUENCE IF NOT EXISTS public.seq_quote_request START WITH 1000001 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.set_quote_request_ref_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    NEW.ref_id := 'REQ-' || nextval('public.seq_quote_request')::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_requests_set_ref_id ON public.quote_requests;
CREATE TRIGGER trg_quote_requests_set_ref_id
  BEFORE INSERT ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_quote_request_ref_id();

-- Backfill any existing rows missing a ref_id (ordered by creation time so the
-- oldest request gets the lowest number).
UPDATE public.quote_requests q
SET ref_id = 'REQ-' || nextval('public.seq_quote_request')::text
WHERE q.ref_id IS NULL OR q.ref_id = '';