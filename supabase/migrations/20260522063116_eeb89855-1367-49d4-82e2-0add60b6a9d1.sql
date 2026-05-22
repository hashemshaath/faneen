
-- M1: businesses public SELECT
DROP POLICY IF EXISTS "Active businesses are publicly readable" ON public.businesses;

CREATE POLICY "Public can read published active businesses"
ON public.businesses
FOR SELECT
USING (
  (is_active = true AND approval_status = 'published' AND is_demo = false)
  OR auth.uid() = user_id
  OR is_business_staff(auth.uid(), id)
  OR has_admin_access(auth.uid())
);

-- M2: counterpart RPC + drop broad profile policy
DROP FUNCTION IF EXISTS public.get_contract_counterpart_profile(uuid, uuid);

CREATE FUNCTION public.get_contract_counterpart_profile(
  _user_id uuid,
  _contract_id uuid
)
RETURNS TABLE (
  user_id uuid,
  ref_id text,
  full_name text,
  avatar_url text,
  account_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _caller_is_party boolean;
  _target_is_party boolean;
BEGIN
  IF _caller IS NULL THEN
    RETURN;
  END IF;

  IF has_admin_access(_caller) THEN
    RETURN QUERY
      SELECT p.user_id, p.ref_id, p.full_name, p.avatar_url, p.account_type::text
      FROM public.profiles p
      WHERE p.user_id = _user_id;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = _contract_id
      AND (c.client_id = _caller OR c.provider_id = _caller)
  ) INTO _caller_is_party;

  SELECT EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = _contract_id
      AND (c.client_id = _user_id OR c.provider_id = _user_id)
  ) INTO _target_is_party;

  IF NOT _caller_is_party OR NOT _target_is_party THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT p.user_id, p.ref_id, p.full_name, p.avatar_url, p.account_type::text
    FROM public.profiles p
    WHERE p.user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_contract_counterpart_profile(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_contract_counterpart_profile(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_contract_counterpart_profile(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Contract participants can view counterpart basic info" ON public.profiles;

-- M3: lead_requests INSERT
DROP POLICY IF EXISTS "Anyone can submit lead requests" ON public.lead_requests;

CREATE POLICY "Public and authenticated users can submit lead requests safely"
ON public.lead_requests
FOR INSERT
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR
  (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
);

-- L2: business_staff admin ALL → authenticated
DROP POLICY IF EXISTS "Admins can manage all staff" ON public.business_staff;

CREATE POLICY "Admins can manage all staff"
ON public.business_staff
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));
