-- DB-GOVERNANCE-2 — Tighten public service exposure + branches public read path.
-- P0: Replace USING (true) on business_services with a strict public-safe filter,
--     plus distinct authenticated owner/staff policies so dashboards keep working.
-- P1: Strengthen business_branches_public to also require parent business approval,
--     and revoke unintended anon write grants on business_services.

-- ===== P0: business_services =====

-- Drop the over-broad public SELECT policy.
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.business_services;

-- Public/anon + non-owner authenticated readers see only fully-active rows.
CREATE POLICY "Public can view active allowed services"
ON public.business_services
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND provider_status = 'active'
  AND admin_status = 'allowed'
);

-- Business owners always see their own services (any status).
CREATE POLICY "Owners can view their services"
ON public.business_services
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_services.business_id
      AND businesses.user_id = auth.uid()
  )
);

-- Business staff can view services on businesses they staff.
CREATE POLICY "Staff can view business services"
ON public.business_services
FOR SELECT
TO authenticated
USING (public.is_business_staff(auth.uid(), business_id));

-- Defense in depth: anon must never write to business_services.
REVOKE INSERT, UPDATE, DELETE ON public.business_services FROM anon;

-- Supportive partial index for the public visibility filter.
CREATE INDEX IF NOT EXISTS business_services_public_visibility_idx
ON public.business_services (business_id)
WHERE is_active = true
  AND provider_status = 'active'
  AND admin_status = 'allowed';

-- ===== P1: business_branches_public — enforce parent approval =====

CREATE OR REPLACE VIEW public.business_branches_public AS
SELECT
  b.id,
  b.business_id,
  b.name_ar,
  b.name_en,
  b.address,
  b.district,
  b.region,
  b.street_name,
  b.latitude,
  b.longitude,
  b.website,
  b.is_active,
  b.is_main,
  b.sort_order,
  b.created_at
FROM public.business_branches b
WHERE b.is_active = true
  AND EXISTS (
    SELECT 1 FROM public.businesses parent
    WHERE parent.id = b.business_id
      AND parent.is_active = true
      AND parent.approval_status = 'published'::business_approval_status
      AND parent.is_demo = false
  );

GRANT SELECT ON public.business_branches_public TO anon, authenticated;
