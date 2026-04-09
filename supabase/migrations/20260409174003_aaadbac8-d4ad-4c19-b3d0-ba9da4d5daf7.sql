
-- Installment plans table
CREATE TABLE public.installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  total_amount NUMERIC NOT NULL,
  down_payment NUMERIC NOT NULL DEFAULT 0,
  number_of_installments INTEGER NOT NULL DEFAULT 3,
  installment_amount NUMERIC NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'defaulted')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual installment payments
CREATE TABLE public.installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.installment_plans(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Provider installment settings (whether provider offers installments)
CREATE TABLE public.provider_installment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  min_amount NUMERIC DEFAULT 1000,
  max_installments INTEGER DEFAULT 12,
  down_payment_percentage NUMERIC DEFAULT 25,
  description_ar TEXT,
  description_en TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_installment_settings ENABLE ROW LEVEL SECURITY;

-- Installment plans: contract parties can view
CREATE POLICY "Contract parties can view installment plans"
ON public.installment_plans FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = installment_plans.contract_id
    AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

-- Installment plans: provider can insert
CREATE POLICY "Provider can create installment plans"
ON public.installment_plans FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = installment_plans.contract_id
    AND c.provider_id = auth.uid()
  )
);

-- Installment plans: provider can update
CREATE POLICY "Provider can update installment plans"
ON public.installment_plans FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = installment_plans.contract_id
    AND c.provider_id = auth.uid()
  )
);

-- Installment payments: contract parties can view
CREATE POLICY "Contract parties can view installment payments"
ON public.installment_payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.installment_plans ip
    JOIN public.contracts c ON c.id = ip.contract_id
    WHERE ip.id = installment_payments.plan_id
    AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

-- Installment payments: provider can update (mark as paid)
CREATE POLICY "Provider can update installment payments"
ON public.installment_payments FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.installment_plans ip
    JOIN public.contracts c ON c.id = ip.contract_id
    WHERE ip.id = installment_payments.plan_id
    AND c.provider_id = auth.uid()
  )
);

-- Installment payments: provider can insert
CREATE POLICY "Provider can create installment payments"
ON public.installment_payments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.installment_plans ip
    JOIN public.contracts c ON c.id = ip.contract_id
    WHERE ip.id = installment_payments.plan_id
    AND c.provider_id = auth.uid()
  )
);

-- Provider settings: public read
CREATE POLICY "Anyone can view provider installment settings"
ON public.provider_installment_settings FOR SELECT
USING (true);

-- Provider settings: owner can manage
CREATE POLICY "Business owner can manage installment settings"
ON public.provider_installment_settings FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = provider_installment_settings.business_id
    AND b.user_id = auth.uid()
  )
);

-- Updated at trigger
CREATE TRIGGER update_installment_plans_updated_at
  BEFORE UPDATE ON public.installment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_installment_settings_updated_at
  BEFORE UPDATE ON public.provider_installment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
