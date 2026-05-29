
-- BUSINESS-WORKFLOW-PROCUREMENT-3 — Line items + idempotent award
-- Adds:
--   * procurement_rfq_items
--   * procurement_supplier_quote_items
-- Updates:
--   * procurement_award_quote — idempotent re-award of same quote.

-- ===== procurement_rfq_items =====
CREATE TABLE IF NOT EXISTS public.procurement_rfq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  rfq_id uuid NOT NULL REFERENCES public.procurement_rfqs(id) ON DELETE CASCADE,
  procurement_request_id uuid REFERENCES public.procurement_requests(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit text,
  target_price numeric CHECK (target_price IS NULL OR target_price >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proc_rfq_items_rfq
  ON public.procurement_rfq_items(rfq_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_proc_rfq_items_business
  ON public.procurement_rfq_items(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_rfq_items TO authenticated;
GRANT ALL ON public.procurement_rfq_items TO service_role;
ALTER TABLE public.procurement_rfq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pri_items_select_member" ON public.procurement_rfq_items
  FOR SELECT TO authenticated
  USING (public.is_work_order_member(auth.uid(), business_id));

CREATE POLICY "pri_items_insert_manager" ON public.procurement_rfq_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "pri_items_update_manager" ON public.procurement_rfq_items
  FOR UPDATE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "pri_items_delete_manager" ON public.procurement_rfq_items
  FOR DELETE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

DROP TRIGGER IF EXISTS trg_proc_rfq_items_touch ON public.procurement_rfq_items;
CREATE TRIGGER trg_proc_rfq_items_touch
  BEFORE UPDATE ON public.procurement_rfq_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== procurement_supplier_quote_items =====
CREATE TABLE IF NOT EXISTS public.procurement_supplier_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  quote_id uuid NOT NULL REFERENCES public.procurement_supplier_quotes(id) ON DELETE CASCADE,
  rfq_item_id uuid NOT NULL REFERENCES public.procurement_rfq_items(id) ON DELETE CASCADE,
  unit_price numeric CHECK (unit_price IS NULL OR unit_price >= 0),
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_price numeric CHECK (total_price IS NULL OR total_price >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, rfq_item_id)
);
CREATE INDEX IF NOT EXISTS idx_proc_sq_items_quote
  ON public.procurement_supplier_quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_proc_sq_items_business
  ON public.procurement_supplier_quote_items(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_supplier_quote_items TO authenticated;
GRANT ALL ON public.procurement_supplier_quote_items TO service_role;
ALTER TABLE public.procurement_supplier_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psqi_select_member" ON public.procurement_supplier_quote_items
  FOR SELECT TO authenticated
  USING (public.is_work_order_member(auth.uid(), business_id));

CREATE POLICY "psqi_insert_manager" ON public.procurement_supplier_quote_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "psqi_update_manager" ON public.procurement_supplier_quote_items
  FOR UPDATE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "psqi_delete_manager" ON public.procurement_supplier_quote_items
  FOR DELETE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

DROP TRIGGER IF EXISTS trg_proc_sq_items_touch ON public.procurement_supplier_quote_items;
CREATE TRIGGER trg_proc_sq_items_touch
  BEFORE UPDATE ON public.procurement_supplier_quote_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Idempotent award RPC =====
-- Re-awarding the SAME quote (already winner of its RFQ) returns the quote
-- id without raising. Awarding a different quote after one is awarded still
-- fails with 'rfq_already_awarded'.
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
  IF NOT public.is_business_owner_or_manager(auth.uid(), v_quote.business_id) THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;

  -- Idempotency: re-awarding the SAME quote is a no-op success.
  IF v_rfq.awarded_quote_id = _quote_id AND v_quote.status = 'awarded' THEN
    RETURN _quote_id;
  END IF;

  -- A different quote is already the winner — refuse.
  IF v_rfq.awarded_quote_id IS NOT NULL AND v_rfq.awarded_quote_id <> _quote_id THEN
    RAISE EXCEPTION 'rfq_already_awarded' USING ERRCODE = '22023';
  END IF;

  IF v_quote.status NOT IN ('submitted','shortlisted') THEN
    RAISE EXCEPTION 'quote_not_eligible' USING ERRCODE = '22023';
  END IF;
  IF v_rfq.status NOT IN ('draft','sent') THEN
    RAISE EXCEPTION 'rfq_not_open' USING ERRCODE = '22023';
  END IF;

  UPDATE public.procurement_supplier_quotes
    SET status = 'awarded'
    WHERE id = _quote_id;
  UPDATE public.procurement_supplier_quotes
    SET status = 'rejected',
        rejection_reason = COALESCE(rejection_reason, 'not_selected')
    WHERE rfq_id = v_quote.rfq_id
      AND id <> _quote_id
      AND status IN ('submitted','shortlisted');
  UPDATE public.procurement_rfqs
    SET status = 'closed',
        awarded_quote_id = _quote_id,
        closed_at = now()
    WHERE id = v_quote.rfq_id;
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
