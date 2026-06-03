-- Tighten business_profile_visibility: drop the broad public_safe SELECT policy.
-- The public path uses the SECURITY DEFINER RPC `get_business_visibility`,
-- which only returns section_key + visibility_level. Direct SELECT was exposing
-- updated_by (user UUID) and updated_at to every authenticated user.
DROP POLICY IF EXISTS "bpv_select_public_safe" ON public.business_profile_visibility;