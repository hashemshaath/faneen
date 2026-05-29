-- BUSINESS-WORKFLOW-PROCUREMENT-1 — Procurement / RFQ foundation
-- Adds procurement_requests, procurement_rfqs, procurement_suppliers,
-- procurement_supplier_quotes. Business-scoped via existing helpers
-- public.is_work_order_member / public.is_business_owner_or_manager.
-- No inventory, no payments, no storage in this phase.

-- ===== procurement_requests =====
CREATE TABLE IF NOT EXISTS public.procurement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','requested','rfq_sent','quoted','awarded','cancelled')),
  needed_by timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_business
  ON public.procurement_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_work_order
  ON public.procurement_requests(work_order_id);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_status
  ON public.procurement_requests(business_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_requests TO authenticated;
GRANT ALL ON public.procurement_requests TO service_role;
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pr_select_member" ON public.procurement_requests
  FOR SELECT TO authenticated
  USING (public.is_work_order_member(auth.uid(), business_id));

CREATE POLICY "pr_insert_manager" ON public.procurement_requests
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
              AND public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "pr_update_manager" ON public.procurement_requests
  FOR UPDATE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "pr_delete_manager" ON public.procurement_requests
  FOR DELETE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

-- ===== procurement_suppliers =====
CREATE TABLE IF NOT EXISTS public.procurement_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_procurement_suppliers_business
  ON public.procurement_suppliers(business_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_suppliers TO authenticated;
GRANT ALL ON public.procurement_suppliers TO service_role;
ALTER TABLE public.procurement_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps_select_member" ON public.procurement_suppliers
  FOR SELECT TO authenticated
  USING (public.is_work_order_member(auth.uid(), business_id));

CREATE POLICY "ps_insert_manager" ON public.procurement_suppliers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "ps_update_manager" ON public.procurement_suppliers
  FOR UPDATE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "ps_delete_manager" ON public.procurement_suppliers
  FOR DELETE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

-- ===== procurement_rfqs =====
CREATE SEQUENCE IF NOT EXISTS public.procurement_rfqs_number_seq START 1000;

CREATE TABLE IF NOT EXISTS public.procurement_rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  procurement_request_id uuid NOT NULL
    REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
  rfq_number text UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','closed','cancelled')),
  due_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_procurement_rfqs_business
  ON public.procurement_rfqs(business_id, status);
CREATE INDEX IF NOT EXISTS idx_procurement_rfqs_request
  ON public.procurement_rfqs(procurement_request_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_rfqs TO authenticated;
GRANT ALL ON public.procurement_rfqs TO service_role;
ALTER TABLE public.procurement_rfqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfq_select_member" ON public.procurement_rfqs
  FOR SELECT TO authenticated
  USING (public.is_work_order_member(auth.uid(), business_id));

CREATE POLICY "rfq_insert_manager" ON public.procurement_rfqs
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
              AND public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "rfq_update_manager" ON public.procurement_rfqs
  FOR UPDATE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "rfq_delete_manager" ON public.procurement_rfqs
  FOR DELETE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE OR REPLACE FUNCTION public.trg_procurement_rfqs_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.rfq_number IS NULL THEN
    NEW.rfq_number := 'RFQ-' || nextval('public.procurement_rfqs_number_seq')::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_procurement_rfqs_defaults
BEFORE INSERT OR UPDATE ON public.procurement_rfqs
FOR EACH ROW EXECUTE FUNCTION public.trg_procurement_rfqs_defaults();

-- ===== procurement_supplier_quotes =====
CREATE TABLE IF NOT EXISTS public.procurement_supplier_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  rfq_id uuid NOT NULL REFERENCES public.procurement_rfqs(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.procurement_suppliers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','selected','rejected')),
  total_amount numeric(14,2),
  currency text NOT NULL DEFAULT 'SAR',
  lead_time_days integer,
  notes text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, supplier_id)
);
CREATE INDEX IF NOT EXISTS idx_procurement_sq_business
  ON public.procurement_supplier_quotes(business_id, status);
CREATE INDEX IF NOT EXISTS idx_procurement_sq_rfq
  ON public.procurement_supplier_quotes(rfq_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_supplier_quotes TO authenticated;
GRANT ALL ON public.procurement_supplier_quotes TO service_role;
ALTER TABLE public.procurement_supplier_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psq_select_member" ON public.procurement_supplier_quotes
  FOR SELECT TO authenticated
  USING (public.is_work_order_member(auth.uid(), business_id));

CREATE POLICY "psq_insert_manager" ON public.procurement_supplier_quotes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "psq_update_manager" ON public.procurement_supplier_quotes
  FOR UPDATE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "psq_delete_manager" ON public.procurement_supplier_quotes
  FOR DELETE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

-- updated_at triggers reuse generic helper if present, else inline
CREATE OR REPLACE FUNCTION public.trg_procurement_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_procurement_requests_touch
BEFORE UPDATE ON public.procurement_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_procurement_touch_updated_at();
CREATE TRIGGER trg_procurement_suppliers_touch
BEFORE UPDATE ON public.procurement_suppliers
FOR EACH ROW EXECUTE FUNCTION public.trg_procurement_touch_updated_at();
CREATE TRIGGER trg_procurement_supplier_quotes_touch
BEFORE UPDATE ON public.procurement_supplier_quotes
FOR EACH ROW EXECUTE FUNCTION public.trg_procurement_touch_updated_at();
