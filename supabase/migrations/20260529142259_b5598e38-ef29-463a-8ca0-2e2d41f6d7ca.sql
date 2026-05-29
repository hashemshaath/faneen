
-- PROCUREMENT-RFQ-ENGINE-1 — BOQ → RFQ source linkage + Purchase Order drafts
-- No inventory, no goods receipt, no supplier payments, no public supplier portal.

-- 1) Link RFQs back to the BOQ that seeded them (idempotency key).
ALTER TABLE public.procurement_rfqs
  ADD COLUMN IF NOT EXISTS source_boq_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_procurement_rfqs_source_boq
  ON public.procurement_rfqs(source_boq_id)
  WHERE source_boq_id IS NOT NULL;

-- 2) procurement_purchase_orders — DRAFT only. No financial side-effects.
CREATE SEQUENCE IF NOT EXISTS public.procurement_purchase_orders_number_seq START 1000;

CREATE TABLE IF NOT EXISTS public.procurement_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  rfq_id uuid NOT NULL REFERENCES public.procurement_rfqs(id) ON DELETE CASCADE,
  supplier_quote_id uuid NOT NULL
    REFERENCES public.procurement_supplier_quotes(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL
    REFERENCES public.procurement_suppliers(id) ON DELETE RESTRICT,
  supplier_name text NOT NULL,
  po_number text UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','cancelled')),
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  currency text NOT NULL DEFAULT 'SAR',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_quote_id)
);

CREATE INDEX IF NOT EXISTS idx_proc_po_business
  ON public.procurement_purchase_orders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_proc_po_rfq
  ON public.procurement_purchase_orders(rfq_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_purchase_orders TO authenticated;
GRANT ALL ON public.procurement_purchase_orders TO service_role;
ALTER TABLE public.procurement_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "po_select_member" ON public.procurement_purchase_orders
  FOR SELECT TO authenticated
  USING (public.is_work_order_member(auth.uid(), business_id));

CREATE POLICY "po_insert_manager" ON public.procurement_purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
              AND public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "po_update_manager" ON public.procurement_purchase_orders
  FOR UPDATE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "po_delete_manager" ON public.procurement_purchase_orders
  FOR DELETE TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE OR REPLACE FUNCTION public.trg_procurement_po_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.po_number IS NULL THEN
    NEW.po_number := 'PO-' || nextval('public.procurement_purchase_orders_number_seq')::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_procurement_po_defaults ON public.procurement_purchase_orders;
CREATE TRIGGER trg_procurement_po_defaults
BEFORE INSERT OR UPDATE ON public.procurement_purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_procurement_po_defaults();
