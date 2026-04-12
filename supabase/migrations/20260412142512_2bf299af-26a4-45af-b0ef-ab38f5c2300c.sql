
-- Fix: authenticated users also need to see active businesses for directory browsing
-- The businesses_public view already strips sensitive fields (email, phone, mobile, national_id, etc.)
-- We keep the base table accessible but the view is what public-facing code should use
DROP POLICY IF EXISTS "Public can view active businesses via view" ON public.businesses;
DROP POLICY IF EXISTS "Owner or staff can view their business" ON public.businesses;

-- Simplified: everyone can see active businesses (view strips sensitive fields)
-- Owners/staff/admins can see their own inactive businesses too
CREATE POLICY "Active businesses are publicly readable"
  ON public.businesses FOR SELECT
  USING (
    is_active = true
    OR auth.uid() = user_id
    OR is_business_staff(auth.uid(), id)
    OR has_admin_access(auth.uid())
  );

-- Same fix for branches
DROP POLICY IF EXISTS "Public can view active branches via view" ON public.business_branches;

CREATE POLICY "Active branches are publicly readable"
  ON public.business_branches FOR SELECT
  USING (
    is_active = true
    OR has_admin_access(auth.uid())
    OR is_business_staff(auth.uid(), business_id)
  );
