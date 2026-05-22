
-- Part A — defaults
ALTER TABLE public.lead_requests          ALTER COLUMN country_id SET DEFAULT '4e37871f-3211-4484-935e-cf8c387cbf80'::uuid;
ALTER TABLE public.contracts              ALTER COLUMN country_id SET DEFAULT '4e37871f-3211-4484-935e-cf8c387cbf80'::uuid;
ALTER TABLE public.client_sites           ALTER COLUMN country_id SET DEFAULT '4e37871f-3211-4484-935e-cf8c387cbf80'::uuid;
ALTER TABLE public.business_service_areas ALTER COLUMN country_id SET DEFAULT '4e37871f-3211-4484-935e-cf8c387cbf80'::uuid;

-- Part B — Saudi-beta lock trigger function
CREATE OR REPLACE FUNCTION public.force_saudi_country_beta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- TEMPORARY SAUDI-BETA LOCK
  -- Always stamp Saudi Arabia on new rows during Saudi-only beta.
  -- Drop these triggers when the international/GCC country selector launches.
  NEW.country_id := '4e37871f-3211-4484-935e-cf8c387cbf80'::uuid;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.force_saudi_country_beta() IS
  'Temporary Saudi-beta lock: forces country_id = SA on every insert. Drop the per-table triggers when the international country selector is enabled.';

-- Attach triggers (idempotent)
DROP TRIGGER IF EXISTS trg_force_saudi_country_lead_requests ON public.lead_requests;
CREATE TRIGGER trg_force_saudi_country_lead_requests
  BEFORE INSERT ON public.lead_requests
  FOR EACH ROW EXECUTE FUNCTION public.force_saudi_country_beta();

DROP TRIGGER IF EXISTS trg_force_saudi_country_contracts ON public.contracts;
CREATE TRIGGER trg_force_saudi_country_contracts
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.force_saudi_country_beta();

DROP TRIGGER IF EXISTS trg_force_saudi_country_client_sites ON public.client_sites;
CREATE TRIGGER trg_force_saudi_country_client_sites
  BEFORE INSERT ON public.client_sites
  FOR EACH ROW EXECUTE FUNCTION public.force_saudi_country_beta();

DROP TRIGGER IF EXISTS trg_force_saudi_country_business_service_areas ON public.business_service_areas;
CREATE TRIGGER trg_force_saudi_country_business_service_areas
  BEFORE INSERT ON public.business_service_areas
  FOR EACH ROW EXECUTE FUNCTION public.force_saudi_country_beta();
