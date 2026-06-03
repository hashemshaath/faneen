
-- Auto-sync qr_enabled with visibility='shared_by_qr'
CREATE OR REPLACE FUNCTION public.sync_client_site_qr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If visibility is shared_by_qr, force qr_enabled = true
  IF NEW.visibility = 'shared_by_qr' THEN
    NEW.qr_enabled := true;
  END IF;
  -- If qr_enabled toggled on but visibility is 'private', upgrade visibility
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.qr_enabled,false) = false
     AND COALESCE(NEW.qr_enabled,false) = true
     AND NEW.visibility = 'private' THEN
    NEW.visibility := 'shared_by_qr';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_client_site_qr ON public.client_sites;
CREATE TRIGGER trg_sync_client_site_qr
BEFORE INSERT OR UPDATE OF visibility, qr_enabled ON public.client_sites
FOR EACH ROW EXECUTE FUNCTION public.sync_client_site_qr();

-- Backfill: any site currently shared_by_qr should have qr_enabled=true
UPDATE public.client_sites
SET qr_enabled = true
WHERE visibility = 'shared_by_qr' AND COALESCE(qr_enabled,false) = false;
