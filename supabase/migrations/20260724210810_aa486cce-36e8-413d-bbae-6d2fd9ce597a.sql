
-- 1) Guard trigger: businesses sensitive fields (non-admin can't change)
CREATE OR REPLACE FUNCTION public.guard_businesses_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_admin_access(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.membership_tier IS DISTINCT FROM OLD.membership_tier
     OR NEW.rating_avg IS DISTINCT FROM OLD.rating_avg
     OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.is_demo IS DISTINCT FROM OLD.is_demo THEN
    RAISE EXCEPTION 'Not allowed to modify privileged business fields'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_businesses_sensitive_fields ON public.businesses;
CREATE TRIGGER guard_businesses_sensitive_fields
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.guard_businesses_sensitive_fields();

-- 2) Guard trigger: profiles sensitive fields (non-admin can't change)
CREATE OR REPLACE FUNCTION public.guard_profiles_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_admin_access(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.membership_tier IS DISTINCT FROM OLD.membership_tier
     OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
     OR NEW.banned_until IS DISTINCT FROM OLD.banned_until
     OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason THEN
    RAISE EXCEPTION 'Not allowed to modify privileged profile fields'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_sensitive_fields ON public.profiles;
CREATE TRIGGER guard_profiles_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_sensitive_fields();

-- 3) Align public visibility for promotions, awards, certifications
DROP POLICY IF EXISTS "Public can view active promotions of approved businesses" ON public.promotions;
CREATE POLICY "Public can view active promotions of published businesses"
ON public.promotions
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = promotions.business_id
      AND b.approval_status = 'published'::business_approval_status
      AND b.is_active = true
      AND COALESCE(b.is_demo, false) = false
  )
);

DROP POLICY IF EXISTS "Anyone can view awards of approved businesses" ON public.business_awards;
CREATE POLICY "Anyone can view awards of published businesses"
ON public.business_awards
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_awards.business_id
      AND b.approval_status = 'published'::business_approval_status
      AND b.is_active = true
      AND COALESCE(b.is_demo, false) = false
  )
);

DROP POLICY IF EXISTS "Anyone can view certifications of approved businesses" ON public.business_certifications;
CREATE POLICY "Anyone can view certifications of published businesses"
ON public.business_certifications
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_certifications.business_id
      AND b.approval_status = 'published'::business_approval_status
      AND b.is_active = true
      AND COALESCE(b.is_demo, false) = false
  )
);
