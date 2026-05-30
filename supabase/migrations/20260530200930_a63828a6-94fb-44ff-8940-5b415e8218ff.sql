
-- 1. Add source_sub_service_id to business_services
ALTER TABLE public.business_services
  ADD COLUMN IF NOT EXISTS source_sub_service_id text;

CREATE INDEX IF NOT EXISTS idx_business_services_sub_service
  ON public.business_services(business_id, source_sub_service_id);

-- 2. Sequence + ref id helper for service addition requests
CREATE SEQUENCE IF NOT EXISTS public.seq_service_request START 1000;

CREATE OR REPLACE FUNCTION public.set_service_request_ref_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    NEW.ref_id := 'REQ-' || lpad(nextval('public.seq_service_request')::text, 7, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Status enum
DO $$ BEGIN
  CREATE TYPE public.service_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. service_addition_requests table
CREATE TABLE IF NOT EXISTS public.service_addition_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sector_id text NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  description text,
  status public.service_request_status NOT NULL DEFAULT 'pending',
  reject_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  ticket_ref_id text,
  approved_sub_service_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.service_addition_requests TO authenticated;
GRANT ALL ON public.service_addition_requests TO service_role;

ALTER TABLE public.service_addition_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sar_insert_owner" ON public.service_addition_requests;
CREATE POLICY "sar_insert_owner"
  ON public.service_addition_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "sar_select_own_or_admin" ON public.service_addition_requests;
CREATE POLICY "sar_select_own_or_admin"
  ON public.service_addition_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "sar_update_admin" ON public.service_addition_requests;
CREATE POLICY "sar_update_admin"
  ON public.service_addition_requests
  FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP TRIGGER IF EXISTS trg_sar_ref_id ON public.service_addition_requests;
CREATE TRIGGER trg_sar_ref_id
  BEFORE INSERT ON public.service_addition_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_service_request_ref_id();

DROP TRIGGER IF EXISTS trg_sar_updated_at ON public.service_addition_requests;
CREATE TRIGGER trg_sar_updated_at
  BEFORE UPDATE ON public.service_addition_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sar_business ON public.service_addition_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_sar_status ON public.service_addition_requests(status);
CREATE INDEX IF NOT EXISTS idx_sar_user ON public.service_addition_requests(user_id);

-- 5. Approve / Reject functions (SECURITY DEFINER, admin-only)
CREATE OR REPLACE FUNCTION public.approve_service_addition_request(
  p_request_id uuid,
  p_admin_note text DEFAULT NULL
)
RETURNS public.service_addition_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.service_addition_requests;
  v_sub_id text;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_req FROM public.service_addition_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request already %', v_req.status; END IF;

  v_sub_id := 'custom:' || replace(gen_random_uuid()::text, '-', '');

  -- Append the custom sub-service to the business
  UPDATE public.businesses
     SET sub_services = array_append(coalesce(sub_services, '{}'), v_sub_id),
         sectors = CASE WHEN v_req.sector_id = ANY(coalesce(sectors, '{}'))
                        THEN sectors
                        ELSE array_append(coalesce(sectors, '{}'), v_req.sector_id) END
   WHERE id = v_req.business_id;

  -- Create the matching business_services row
  INSERT INTO public.business_services(business_id, name_ar, name_en, source_sub_service_id, is_active, sort_order)
  VALUES (
    v_req.business_id,
    v_req.name_ar,
    coalesce(v_req.name_en, v_req.name_ar),
    v_sub_id,
    true,
    (SELECT coalesce(max(sort_order), 0) + 1 FROM public.business_services WHERE business_id = v_req.business_id)
  );

  -- Close the help ticket if any
  IF v_req.ticket_ref_id IS NOT NULL THEN
    UPDATE public.help_feature_requests
       SET status = 'completed',
           updated_at = now()
     WHERE ref_id = v_req.ticket_ref_id
       AND status::text <> 'completed';
  END IF;

  UPDATE public.service_addition_requests
     SET status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         approved_sub_service_id = v_sub_id,
         reject_reason = NULLIF(p_admin_note, '')
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_service_addition_request(
  p_request_id uuid,
  p_reason text
)
RETURNS public.service_addition_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.service_addition_requests;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'rejection reason is required';
  END IF;

  SELECT * INTO v_req FROM public.service_addition_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request already %', v_req.status; END IF;

  IF v_req.ticket_ref_id IS NOT NULL THEN
    UPDATE public.help_feature_requests
       SET status = 'declined',
           updated_at = now()
     WHERE ref_id = v_req.ticket_ref_id
       AND status::text <> 'declined';
  END IF;

  UPDATE public.service_addition_requests
     SET status = 'rejected',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         reject_reason = p_reason
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  RETURN v_req;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_service_addition_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_service_addition_request(uuid, text) TO authenticated;
