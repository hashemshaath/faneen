-- 1. Lookup helper: find a user by ref_id (returns minimal public-safe fields).
CREATE OR REPLACE FUNCTION public.find_user_by_ref_id(_ref_id text)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  ref_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.email, p.phone, p.avatar_url, p.ref_id
  FROM public.profiles p
  WHERE p.ref_id = upper(trim(_ref_id))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_by_ref_id(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_user_by_ref_id(text) TO authenticated;

-- 2. Staff roster + profiles for a single business (owner / manager / admin only).
CREATE OR REPLACE FUNCTION public.get_business_staff_with_profiles(_business_id uuid)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  user_id uuid,
  role business_staff_role,
  is_active boolean,
  created_at timestamptz,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  ref_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_business_owner_or_manager(auth.uid(), _business_id)
    OR public.has_admin_access(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.id, s.business_id, s.user_id, s.role, s.is_active, s.created_at,
         p.full_name, p.email, p.phone, p.avatar_url, p.ref_id
  FROM public.business_staff s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.business_id = _business_id
  ORDER BY
    CASE s.role
      WHEN 'owner'::business_staff_role THEN 0
      WHEN 'manager'::business_staff_role THEN 1
      WHEN 'editor'::business_staff_role THEN 2
      ELSE 3
    END,
    s.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_staff_with_profiles(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_business_staff_with_profiles(uuid) TO authenticated;