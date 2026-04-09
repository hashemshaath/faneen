
-- Contract status enum
CREATE TYPE public.contract_status AS ENUM ('draft', 'pending_approval', 'active', 'completed', 'cancelled', 'disputed');

-- Milestone status enum
CREATE TYPE public.milestone_status AS ENUM ('pending', 'active', 'completed', 'disputed');

-- Warranty type enum
CREATE TYPE public.warranty_type AS ENUM ('comprehensive', 'limited', 'extended');

-- Warranty status enum
CREATE TYPE public.warranty_status AS ENUM ('active', 'expired', 'claimed', 'void');

-- Maintenance priority enum
CREATE TYPE public.maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Maintenance status enum
CREATE TYPE public.maintenance_status AS ENUM ('submitted', 'under_review', 'in_progress', 'completed', 'rejected');

-- ==================== CONTRACTS ====================
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE DEFAULT 'CNT-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  total_amount DECIMAL(12,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'SAR',
  status contract_status NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  terms_ar TEXT,
  terms_en TEXT,
  client_accepted_at TIMESTAMPTZ,
  provider_accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract parties can view their contracts"
  ON public.contracts FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "Clients can create contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Contract parties can update their contracts"
  ON public.contracts FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE INDEX idx_contracts_client ON public.contracts(client_id);
CREATE INDEX idx_contracts_provider ON public.contracts(provider_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== MILESTONES ====================
CREATE TABLE public.contract_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  amount DECIMAL(12,2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status milestone_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Milestone access for contract parties"
  ON public.contract_milestones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  ));

CREATE POLICY "Contract parties can manage milestones"
  ON public.contract_milestones FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  ));

CREATE POLICY "Contract parties can update milestones"
  ON public.contract_milestones FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  ));

CREATE INDEX idx_milestones_contract ON public.contract_milestones(contract_id);

CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.contract_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== WARRANTIES ====================
CREATE TABLE public.warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  warranty_type warranty_type NOT NULL DEFAULT 'comprehensive',
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  coverage_ar TEXT,
  coverage_en TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status warranty_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Warranty access for contract parties"
  ON public.warranties FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  ));

CREATE POLICY "Provider can create warranties"
  ON public.warranties FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id AND c.provider_id = auth.uid()
  ));

CREATE POLICY "Provider can update warranties"
  ON public.warranties FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id AND c.provider_id = auth.uid()
  ));

CREATE INDEX idx_warranties_contract ON public.warranties(contract_id);

CREATE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON public.warranties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== MAINTENANCE REQUESTS ====================
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number TEXT NOT NULL UNIQUE DEFAULT 'MNT-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  warranty_id UUID REFERENCES public.warranties(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  priority maintenance_priority NOT NULL DEFAULT 'medium',
  status maintenance_status NOT NULL DEFAULT 'submitted',
  resolution_notes TEXT,
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maintenance access for parties"
  ON public.maintenance_requests FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "Clients can create maintenance requests"
  ON public.maintenance_requests FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Parties can update maintenance requests"
  ON public.maintenance_requests FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE INDEX idx_maintenance_client ON public.maintenance_requests(client_id);
CREATE INDEX idx_maintenance_provider ON public.maintenance_requests(provider_id);
CREATE INDEX idx_maintenance_contract ON public.maintenance_requests(contract_id);
CREATE INDEX idx_maintenance_status ON public.maintenance_requests(status);

CREATE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
