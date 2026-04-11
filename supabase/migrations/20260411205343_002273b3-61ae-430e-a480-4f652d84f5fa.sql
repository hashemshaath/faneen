
-- Contract amendments table for post-approval modifications
CREATE TABLE public.contract_amendments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  amendment_type TEXT NOT NULL DEFAULT 'scope_change',
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  new_amount NUMERIC,
  new_end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  client_approved_at TIMESTAMPTZ,
  provider_approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;

-- RLS: contract parties can view their amendments
CREATE POLICY "Contract parties can view amendments"
ON public.contract_amendments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

-- RLS: contract parties can create amendments
CREATE POLICY "Contract parties can create amendments"
ON public.contract_amendments FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

-- RLS: contract parties can update amendments
CREATE POLICY "Contract parties can update amendments"
ON public.contract_amendments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_contract_amendments_updated_at
BEFORE UPDATE ON public.contract_amendments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_amendments;
