
-- Remove duplicate branch SELECT policy
DROP POLICY IF EXISTS "Active branches viewable by everyone" ON public.business_branches;

-- Remove the remaining public BNPL policy that exposes merchant_code/credit_limit
DROP POLICY IF EXISTS "Public can see active BNPL links" ON public.business_bnpl_providers;
