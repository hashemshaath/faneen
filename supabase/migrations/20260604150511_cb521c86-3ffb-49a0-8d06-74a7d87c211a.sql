-- Add placeholder_owner flag to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS placeholder_owner boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_businesses_placeholder_owner
  ON public.businesses (placeholder_owner)
  WHERE placeholder_owner = true;

-- Ownership transfer requests
CREATE TABLE IF NOT EXISTS public.business_ownership_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  message text,
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_botr_business ON public.business_ownership_transfer_requests (business_id);
CREATE INDEX IF NOT EXISTS idx_botr_requester ON public.business_ownership_transfer_requests (requester_user_id);
CREATE INDEX IF NOT EXISTS idx_botr_status ON public.business_ownership_transfer_requests (status);

-- One open request per (business, requester)
CREATE UNIQUE INDEX IF NOT EXISTS uq_botr_open_per_user_biz
  ON public.business_ownership_transfer_requests (business_id, requester_user_id)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.business_ownership_transfer_requests TO authenticated;
GRANT ALL ON public.business_ownership_transfer_requests TO service_role;

ALTER TABLE public.business_ownership_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Requester can view own
CREATE POLICY "botr_select_own"
  ON public.business_ownership_transfer_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_user_id);

-- Admin/super_admin can view all
CREATE POLICY "botr_select_admin"
  ON public.business_ownership_transfer_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Requester can insert request
CREATE POLICY "botr_insert_own"
  ON public.business_ownership_transfer_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_user_id);

-- Requester can cancel own pending
CREATE POLICY "botr_update_own_cancel"
  ON public.business_ownership_transfer_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_user_id AND status = 'pending')
  WITH CHECK (auth.uid() = requester_user_id AND status IN ('pending','cancelled'));

-- Admin can update (approve/reject) anything
CREATE POLICY "botr_update_admin"
  ON public.business_ownership_transfer_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_botr_updated_at ON public.business_ownership_transfer_requests;
CREATE TRIGGER trg_botr_updated_at
  BEFORE UPDATE ON public.business_ownership_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin RPC: transfer a placeholder-owned business to a real user and mark request approved
CREATE OR REPLACE FUNCTION public.admin_transfer_business_ownership(
  _request_id uuid,
  _admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_req record;
  v_biz record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden_admin_only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req
  FROM public.business_ownership_transfer_requests
  WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request_not_pending'; END IF;

  SELECT * INTO v_biz FROM public.businesses WHERE id = v_req.business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'business_not_found'; END IF;
  IF NOT v_biz.placeholder_owner THEN RAISE EXCEPTION 'business_not_placeholder'; END IF;

  -- Cannot transfer to super_admin
  IF public.has_role(v_req.requester_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'owner_cannot_be_super_admin';
  END IF;

  UPDATE public.businesses
    SET user_id = v_req.requester_user_id,
        placeholder_owner = false,
        updated_at = now()
    WHERE id = v_req.business_id;

  UPDATE public.business_ownership_transfer_requests
    SET status = 'approved',
        reviewed_by = v_caller,
        reviewed_at = now(),
        admin_note = COALESCE(_admin_note, admin_note)
    WHERE id = _request_id;

  -- Reject any other pending requests for the same business
  UPDATE public.business_ownership_transfer_requests
    SET status = 'rejected',
        reviewed_by = v_caller,
        reviewed_at = now(),
        admin_note = COALESCE(admin_note, 'auto-rejected: another request approved')
    WHERE business_id = v_req.business_id
      AND id <> _request_id
      AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'business_id', v_req.business_id,
    'new_owner_user_id', v_req.requester_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_transfer_business_ownership(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_transfer_business_ownership(uuid, text) TO authenticated;