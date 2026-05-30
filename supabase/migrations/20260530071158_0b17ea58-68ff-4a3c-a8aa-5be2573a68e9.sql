
CREATE TABLE public.contract_expiry_alerts_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  days_before INTEGER NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (contract_id, days_before)
);

GRANT SELECT ON public.contract_expiry_alerts_log TO authenticated;
GRANT ALL ON public.contract_expiry_alerts_log TO service_role;

ALTER TABLE public.contract_expiry_alerts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract parties can view expiry alerts"
ON public.contract_expiry_alerts_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_expiry_alerts_log.contract_id
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid()
           OR public.is_business_owner_or_manager(auth.uid(), c.business_id))
  )
);

CREATE INDEX idx_contract_expiry_alerts_contract ON public.contract_expiry_alerts_log(contract_id);

CREATE TABLE public.contract_counter_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL,
  field_path TEXT NOT NULL,
  field_label_ar TEXT,
  field_label_en TEXT,
  old_value JSONB,
  new_value JSONB NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID,
  response_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.contract_counter_offers TO authenticated;
GRANT ALL ON public.contract_counter_offers TO service_role;

ALTER TABLE public.contract_counter_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view counter offers"
ON public.contract_counter_offers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_counter_offers.contract_id
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid()
           OR public.is_business_owner_or_manager(auth.uid(), c.business_id))
  )
);

CREATE POLICY "Parties can propose counter offers"
ON public.contract_counter_offers
FOR INSERT
TO authenticated
WITH CHECK (
  proposer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_counter_offers.contract_id
      AND c.status IN ('draft', 'pending_approval')
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid()
           OR public.is_business_owner_or_manager(auth.uid(), c.business_id))
  )
);

CREATE POLICY "Counter party can respond"
ON public.contract_counter_offers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_counter_offers.contract_id
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid()
           OR public.is_business_owner_or_manager(auth.uid(), c.business_id))
  )
);

CREATE INDEX idx_counter_offers_contract_status ON public.contract_counter_offers(contract_id, status);

CREATE TRIGGER update_counter_offers_updated_at
BEFORE UPDATE ON public.contract_counter_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
