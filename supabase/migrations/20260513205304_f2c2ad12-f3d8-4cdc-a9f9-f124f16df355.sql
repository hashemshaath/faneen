CREATE OR REPLACE FUNCTION public.get_my_staff_invitations()
RETURNS TABLE(
  id uuid,
  business_id uuid,
  business_name_ar text,
  business_name_en text,
  email text,
  role text,
  status text,
  token text,
  expires_at timestamptz,
  created_at timestamptz,
  accepted_at timestamptz,
  is_expired boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    inv.id,
    inv.business_id,
    b.name_ar AS business_name_ar,
    b.name_en AS business_name_en,
    inv.email,
    inv.role::text,
    inv.status::text,
    inv.token,
    inv.expires_at,
    inv.created_at,
    inv.accepted_at,
    (inv.expires_at IS NOT NULL AND inv.expires_at < now()) AS is_expired
  FROM public.business_staff_invitations inv
  LEFT JOIN public.businesses b ON b.id = inv.business_id
  WHERE lower(inv.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  ORDER BY inv.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_staff_invitations() TO authenticated;