-- BUSINESS-WORKFLOW-PROCUREMENT-2 — RFQ lifecycle & award

-- ===== Column additions =====
ALTER TABLE public.procurement_rfqs
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS awarded_quote_id uuid;

ALTER TABLE public.procurement_requests
  ADD COLUMN IF NOT EXISTS awarded_at timestamptz;

-- Extend quote status to include 'shortlisted' and 'awarded' (keep 'selected' for back-compat)
ALTER TABLE public.procurement_supplier_quotes
  DROP CONSTRAINT IF EXISTS procurement_supplier_quotes_status_check;
ALTER TABLE public.procurement_supplier_quotes
  ADD CONSTRAINT procurement_supplier_quotes_status_check
  CHECK (status IN ('draft','submitted','shortlisted','selected','awarded','rejected'));

ALTER TABLE public.procurement_supplier_quotes
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- ===== Invitations table =====
CREATE TABLE IF NOT EXISTS public.procurement_rfq_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  rfq_id uuid NOT NULL REFERENCES public.procurement_rfqs(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.procurement_suppliers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','viewed','responded','declined','expired')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_proc_invitations_rfq
  ON public.procurement_rfq_invitations(rfq_id);
CREATE INDEX IF NOT EXISTS idx_proc_invitations_business
  ON public.procurement_rfq_invitations(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_rfq_invitations TO authenticated;
GRANT ALL ON public.procurement_rfq_invitations TO service_role;
ALTER TABLE public.procurement_rfq_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pri_select_member" ON public.procurement_rfq_invitations
  FOR SELECT TO authenticated
  USING (public.is_work_order_member(auth.uid(), business_id));

CREATE POLICY "pri_insert_manager" ON public.procurement_rfq_invitations
  FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid()
              AND public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "pri_update_manager" ON public.procurement_rfq_invitations
  FOR UPDATE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "pri_delete_manager" ON public.procurement_rfq_invitations
  FOR DELETE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_proc_invitations_updated_at ON public.procurement_rfq_invitations;
CREATE TRIGGER trg_proc_invitations_updated_at
  BEFORE UPDATE ON public.procurement_rfq_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Atomic award RPC =====
CREATE OR REPLACE FUNCTION public.procurement_award_quote(_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote public.procurement_supplier_quotes%ROWTYPE;
  v_rfq public.procurement_rfqs%ROWTYPE;
BEGIN
  SELECT * INTO v_quote FROM public.procurement_supplier_quotes WHERE id = _quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'quote_not_found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_rfq FROM public.procurement_rfqs WHERE id = v_quote.rfq_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rfq_not_found' USING ERRCODE = 'P0002';
  END IF;
  -- Authorisation: must be manager/owner of the business
  IF NOT public.is_business_owner_or_manager(auth.uid(), v_quote.business_id) THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;
  IF v_quote.status NOT IN ('submitted','shortlisted') THEN
    RAISE EXCEPTION 'quote_not_eligible' USING ERRCODE = '22023';
  END IF;
  IF v_rfq.status NOT IN ('draft','sent') THEN
    RAISE EXCEPTION 'rfq_not_open' USING ERRCODE = '22023';
  END IF;

  -- Mark winner
  UPDATE public.procurement_supplier_quotes
    SET status = 'awarded'
    WHERE id = _quote_id;
  -- Reject siblings
  UPDATE public.procurement_supplier_quotes
    SET status = 'rejected',
        rejection_reason = COALESCE(rejection_reason, 'not_selected')
    WHERE rfq_id = v_quote.rfq_id
      AND id <> _quote_id
      AND status IN ('submitted','shortlisted');
  -- Close RFQ
  UPDATE public.procurement_rfqs
    SET status = 'closed',
        awarded_quote_id = _quote_id,
        closed_at = now()
    WHERE id = v_quote.rfq_id;
  -- Cascade request to awarded (best-effort: only if currently quoted or rfq_sent)
  UPDATE public.procurement_requests
    SET status = 'awarded',
        awarded_at = now()
    WHERE id = v_rfq.procurement_request_id
      AND status IN ('quoted','rfq_sent');

  RETURN _quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.procurement_award_quote(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.procurement_award_quote(uuid) TO authenticated;