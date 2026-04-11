
-- Create contract_measurements table
CREATE TABLE public.contract_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  piece_number TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  name_en TEXT,
  location_ar TEXT,
  location_en TEXT,
  floor_label TEXT,
  length_mm NUMERIC DEFAULT 0,
  width_mm NUMERIC DEFAULT 0,
  area_sqm NUMERIC GENERATED ALWAYS AS (ROUND((length_mm * width_mm) / 1000000.0, 3)) STORED,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (ROUND((length_mm * width_mm / 1000000.0) * unit_price, 2)) STORED,
  currency_code VARCHAR NOT NULL DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_measurements ENABLE ROW LEVEL SECURITY;

-- Contract parties can view measurements
CREATE POLICY "Contract parties can view measurements"
ON public.contract_measurements FOR SELECT
USING (EXISTS (
  SELECT 1 FROM contracts c
  WHERE c.id = contract_measurements.contract_id
  AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
));

-- Contract parties can add measurements
CREATE POLICY "Contract parties can add measurements"
ON public.contract_measurements FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM contracts c
  WHERE c.id = contract_measurements.contract_id
  AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
));

-- Contract parties can update measurements
CREATE POLICY "Contract parties can update measurements"
ON public.contract_measurements FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM contracts c
  WHERE c.id = contract_measurements.contract_id
  AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
));

-- Contract parties can delete measurements
CREATE POLICY "Contract parties can delete measurements"
ON public.contract_measurements FOR DELETE
USING (EXISTS (
  SELECT 1 FROM contracts c
  WHERE c.id = contract_measurements.contract_id
  AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
));

-- Trigger for updated_at
CREATE TRIGGER update_contract_measurements_updated_at
BEFORE UPDATE ON public.contract_measurements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
