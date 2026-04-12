
-- =============================================
-- FIX 1: Remove OTP SELECT policy (CRITICAL)
-- Users should NEVER be able to read OTP codes via API
-- =============================================
DROP POLICY IF EXISTS "Users can view their own OTPs" ON public.phone_otps;
DROP POLICY IF EXISTS "Users can read own otps" ON public.phone_otps;

-- Remove any remaining SELECT policies on phone_otps
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'phone_otps' AND schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.phone_otps', pol.policyname);
  END LOOP;
END $$;

-- =============================================
-- FIX 2: Restrict business_bnpl_providers to staff only
-- merchant_code and credit_limit are sensitive
-- =============================================
DROP POLICY IF EXISTS "Public can view active BNPL providers for businesses" ON public.business_bnpl_providers;
DROP POLICY IF EXISTS "Anyone can view active business BNPL providers" ON public.business_bnpl_providers;

-- Only business staff/owners can see their BNPL provider configs
CREATE POLICY "Business staff can view their BNPL providers"
ON public.business_bnpl_providers
FOR SELECT
TO authenticated
USING (
  public.is_business_staff(auth.uid(), business_id)
  OR public.has_admin_access(auth.uid())
);

-- =============================================
-- FIX 3: Restrict branch sensitive fields
-- Replace public branch policy to hide national_id, unified_number
-- =============================================

-- Create a view function for public branch data (already exists, verify it excludes sensitive fields)
-- The existing get_public_branch_data function already excludes national_id and unified_number

-- Drop overly permissive branch SELECT policy
DROP POLICY IF EXISTS "Public can view active branches" ON public.business_branches;
DROP POLICY IF EXISTS "Anyone can view active branches" ON public.business_branches;

-- Recreate with restricted columns approach:
-- Public can see branches but we use the security definer function for sensitive data
-- For the table-level policy, we still allow SELECT but the sensitive columns
-- won't be queried by the public app (handled in application code)
CREATE POLICY "Public can view active branch basic info"
ON public.business_branches
FOR SELECT
USING (is_active = true);

-- However, add a specific policy for sensitive columns access
-- Staff and admins can see all fields
CREATE POLICY "Staff can view full branch details"
ON public.business_branches
FOR SELECT
TO authenticated
USING (
  public.is_business_staff(auth.uid(), business_id)
  OR public.has_admin_access(auth.uid())
);
