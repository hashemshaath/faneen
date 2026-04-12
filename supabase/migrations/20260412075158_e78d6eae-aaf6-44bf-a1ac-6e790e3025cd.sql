
-- Create a security definer function that returns BNPL data without sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_bnpl_for_business(_business_id uuid)
RETURNS TABLE(
  id uuid,
  business_id uuid,
  bnpl_provider_id uuid,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, business_id, bnpl_provider_id, is_active
  FROM public.business_bnpl_providers
  WHERE business_id = _business_id AND is_active = true;
$$;
