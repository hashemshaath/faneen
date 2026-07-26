-- Guard business_services governance columns from provider self-edit
CREATE OR REPLACE FUNCTION public.guard_business_services_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  is_admin := public.has_role(auth.uid(), 'admin'::app_role)
           OR public.has_role(auth.uid(), 'super_admin'::app_role);
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.admin_status IS DISTINCT FROM OLD.admin_status
     OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
     OR NEW.is_premium_service IS DISTINCT FROM OLD.is_premium_service
     OR NEW.requires_admin_review IS DISTINCT FROM OLD.requires_admin_review
     OR NEW.required_plan_tier IS DISTINCT FROM OLD.required_plan_tier
  THEN
    RAISE EXCEPTION 'Only admins can modify service governance fields (admin_status, is_featured, is_premium_service, requires_admin_review, required_plan_tier)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_business_services_admin_fields ON public.business_services;
CREATE TRIGGER trg_guard_business_services_admin_fields
BEFORE UPDATE ON public.business_services
FOR EACH ROW EXECUTE FUNCTION public.guard_business_services_admin_fields();

-- Guard quote_request_leads contact_revealed* columns from direct provider edit
CREATE OR REPLACE FUNCTION public.guard_quote_request_leads_contact_reveal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  is_admin := public.has_role(auth.uid(), 'admin'::app_role)
           OR public.has_role(auth.uid(), 'super_admin'::app_role);
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Allow SECURITY DEFINER RPCs (which run as postgres/service role) to bypass.
  -- Non-admin authenticated callers cannot flip these fields.
  IF NEW.contact_revealed IS DISTINCT FROM OLD.contact_revealed
     OR NEW.contact_revealed_at IS DISTINCT FROM OLD.contact_revealed_at
     OR NEW.contact_revealed_by IS DISTINCT FROM OLD.contact_revealed_by
  THEN
    RAISE EXCEPTION 'Contact reveal fields can only be set via the dedicated reveal RPC'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_quote_request_leads_contact_reveal ON public.quote_request_leads;
CREATE TRIGGER trg_guard_quote_request_leads_contact_reveal
BEFORE UPDATE ON public.quote_request_leads
FOR EACH ROW EXECUTE FUNCTION public.guard_quote_request_leads_contact_reveal();