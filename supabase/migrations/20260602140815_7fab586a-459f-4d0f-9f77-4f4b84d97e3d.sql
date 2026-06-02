
-- 1) Visibility settings table
CREATE TABLE IF NOT EXISTS public.business_profile_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  visibility_level text NOT NULL DEFAULT 'public',
  locked_by_admin boolean NOT NULL DEFAULT false,
  admin_note text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bpv_section_chk CHECK (section_key = ANY (ARRAY[
    'overview','services','projects','portfolio','branches','reviews',
    'contact','phone','email','address','map',
    'requests_as_beneficiary','requests_as_provider',
    'ratings','social'
  ])),
  CONSTRAINT bpv_level_chk CHECK (visibility_level = ANY (ARRAY[
    'public','members_only','after_request','hidden'
  ])),
  CONSTRAINT bpv_unique UNIQUE (business_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_bpv_business ON public.business_profile_visibility(business_id);

GRANT SELECT ON public.business_profile_visibility TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profile_visibility TO authenticated;
GRANT ALL ON public.business_profile_visibility TO service_role;

ALTER TABLE public.business_profile_visibility ENABLE ROW LEVEL SECURITY;

-- Public can read all visibility rows (needed to know which sections to render)
CREATE POLICY "bpv_select_all" ON public.business_profile_visibility
  FOR SELECT
  USING (true);

-- Owner or admin can insert
CREATE POLICY "bpv_insert_owner_or_admin" ON public.business_profile_visibility
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_profile_visibility.business_id
        AND b.user_id = auth.uid()
    )
  );

-- Owner can update only if NOT locked; admin always
CREATE POLICY "bpv_update_owner_or_admin" ON public.business_profile_visibility
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      NOT locked_by_admin
      AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = business_profile_visibility.business_id
          AND b.user_id = auth.uid()
      )
    )
  );

-- Only admin can delete
CREATE POLICY "bpv_delete_admin" ON public.business_profile_visibility
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Trigger: prevent owners from flipping locked_by_admin / admin_note
CREATE OR REPLACE FUNCTION public.fn_bpv_guard_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role)
                   OR public.has_role(auth.uid(), 'super_admin'::app_role);
BEGIN
  IF NOT is_admin THEN
    NEW.locked_by_admin := COALESCE(OLD.locked_by_admin, false);
    NEW.admin_note := OLD.admin_note;
  END IF;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bpv_guard ON public.business_profile_visibility;
CREATE TRIGGER trg_bpv_guard
BEFORE UPDATE ON public.business_profile_visibility
FOR EACH ROW EXECUTE FUNCTION public.fn_bpv_guard_admin_fields();

-- 2) RPC: read effective visibility map (with defaults)
CREATE OR REPLACE FUNCTION public.get_business_visibility(_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  defaults jsonb := jsonb_build_object(
    'overview','public','services','public','projects','public','portfolio','public',
    'branches','public','reviews','public','contact','public','phone','public',
    'email','public','address','public','map','public',
    'requests_as_beneficiary','public','requests_as_provider','public',
    'ratings','public','social','public'
  );
  overrides jsonb;
  locks jsonb;
BEGIN
  SELECT jsonb_object_agg(section_key, visibility_level),
         jsonb_object_agg(section_key, locked_by_admin)
    INTO overrides, locks
  FROM public.business_profile_visibility
  WHERE business_id = _business_id;

  RETURN jsonb_build_object(
    'levels', COALESCE(defaults || COALESCE(overrides,'{}'::jsonb), defaults),
    'locks',  COALESCE(locks,'{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_visibility(uuid) TO anon, authenticated;

-- 3) RPC: list public RFQs created by the business owner (as beneficiary)
CREATE OR REPLACE FUNCTION public.list_business_public_rfqs(_business_id uuid)
RETURNS TABLE (
  id uuid,
  ref_id text,
  title text,
  industry text,
  budget_min numeric,
  budget_max numeric,
  currency text,
  deadline date,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.ref_id, r.title, r.industry,
         r.budget_min, r.budget_max, r.currency, r.deadline,
         r.status, r.created_at
  FROM public.rfq_requests r
  JOIN public.businesses b ON b.user_id = r.buyer_user_id
  WHERE b.id = _business_id
    AND r.status IN ('open','active')
  ORDER BY r.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.list_business_public_rfqs(uuid) TO anon, authenticated;
