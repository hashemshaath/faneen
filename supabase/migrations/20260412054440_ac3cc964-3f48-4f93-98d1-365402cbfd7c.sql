
-- Contract line items for additional services/materials
CREATE TABLE public.contract_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  item_type TEXT NOT NULL DEFAULT 'service' CHECK (item_type IN ('service', 'material', 'installation', 'other')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract parties can view line items"
  ON public.contract_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

CREATE POLICY "Contract provider can manage line items"
  ON public.contract_line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND c.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND c.provider_id = auth.uid()
    )
  );

CREATE TRIGGER update_contract_line_items_updated_at
  BEFORE UPDATE ON public.contract_line_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add VAT fields to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS vat_inclusive BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC NOT NULL DEFAULT 15;
