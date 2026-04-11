
-- Fix infinite recursion in business_staff RLS policies
-- The SELECT policy references business_staff itself causing recursion

-- Drop problematic policies
DROP POLICY IF EXISTS "Staff can view their business team" ON public.business_staff;
DROP POLICY IF EXISTS "Business owner can add staff" ON public.business_staff;
DROP POLICY IF EXISTS "Business owner can update staff" ON public.business_staff;
DROP POLICY IF EXISTS "Business owner can delete staff" ON public.business_staff;

-- Create a SECURITY DEFINER function to check staff membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_business_staff(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_staff
    WHERE user_id = _user_id
      AND business_id = _business_id
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_business_owner_or_manager(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id AND user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.business_staff
    WHERE user_id = _user_id
      AND business_id = _business_id
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
$$;

-- Recreate policies using SECURITY DEFINER functions (no recursion)
CREATE POLICY "Staff can view their business team"
ON public.business_staff FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR is_business_staff(auth.uid(), business_id)
  OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())
);

CREATE POLICY "Business owner can add staff"
ON public.business_staff FOR INSERT TO authenticated
WITH CHECK (
  is_business_owner_or_manager(auth.uid(), business_id)
);

CREATE POLICY "Business owner can update staff"
ON public.business_staff FOR UPDATE TO authenticated
USING (
  is_business_owner_or_manager(auth.uid(), business_id)
);

CREATE POLICY "Business owner can delete staff"
ON public.business_staff FOR DELETE TO authenticated
USING (
  is_business_owner_or_manager(auth.uid(), business_id)
);
