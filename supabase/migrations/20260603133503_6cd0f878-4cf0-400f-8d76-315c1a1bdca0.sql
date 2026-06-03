
-- Security fix #1: business_branches — tighten staff SELECT to managers/owners
DROP POLICY IF EXISTS "Staff can view full branch details" ON public.business_branches;
CREATE POLICY "Managers can view full branch details"
  ON public.business_branches
  FOR SELECT
  TO authenticated
  USING (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.has_admin_access(auth.uid())
  );

-- Security fix #3: procurement_suppliers — tighten SELECT from any staff member to managers/owners
DROP POLICY IF EXISTS "ps_select_member" ON public.procurement_suppliers;
CREATE POLICY "ps_select_manager"
  ON public.procurement_suppliers
  FOR SELECT
  TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

-- Security fix #2: client_sites — restrict access to sensitive owner PII to business owners only.
-- Add an owner-only helper and a SELECT policy that excludes managers from rows containing
-- highly sensitive fields. Managers retain access to client sites they themselves created
-- (created_by = auth.uid()); business owners retain full access; clients see their own.
CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id AND user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "client_sites_select_business_manager" ON public.client_sites;

-- Business owners: full access
CREATE POLICY "client_sites_select_business_owner"
  ON public.client_sites
  FOR SELECT
  TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

-- Managers (non-owner): can see only sites they created themselves.
-- For sites they didn't create, sensitive owner PII stays hidden from them.
CREATE POLICY "client_sites_select_business_manager_created"
  ON public.client_sites
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    AND public.is_business_owner_or_manager(auth.uid(), business_id)
  );

-- Security fix #4: csi_user_can_manage_site — delegate to client_site_can_manage so storage
-- access matches client_sites RLS (business managers/admins can manage images).
CREATE OR REPLACE FUNCTION public.csi_user_can_manage_site(_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_sites cs
    WHERE cs.id = _site_id
      AND public.client_site_can_manage(auth.uid(), cs)
  );
$$;
