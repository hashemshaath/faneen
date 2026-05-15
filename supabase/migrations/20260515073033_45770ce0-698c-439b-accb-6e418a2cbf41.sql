
-- =========================================================
-- quote_request_leads: provider matching & lead routing
-- =========================================================

CREATE TABLE public.quote_request_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new',
  match_score NUMERIC NOT NULL DEFAULT 0,
  match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_notes TEXT,
  provider_notes TEXT,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quote_request_leads_status_chk
    CHECK (status IN ('new','viewed','interested','not_interested','contacted','expired','cancelled')),
  CONSTRAINT quote_request_leads_unique_pair
    UNIQUE (quote_request_id, provider_id)
);

CREATE INDEX idx_qrl_quote_request_id ON public.quote_request_leads (quote_request_id);
CREATE INDEX idx_qrl_provider_id ON public.quote_request_leads (provider_id);
CREATE INDEX idx_qrl_provider_user_id ON public.quote_request_leads (provider_user_id);
CREATE INDEX idx_qrl_status ON public.quote_request_leads (status);
CREATE INDEX idx_qrl_created_at ON public.quote_request_leads (created_at DESC);

-- updated_at trigger (reuse generic function)
CREATE TRIGGER trg_qrl_set_updated_at
BEFORE UPDATE ON public.quote_request_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Helper: is provider owner of a business
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id AND user_id = _user_id
  );
$$;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.quote_request_leads ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins can view all quote leads"
ON public.quote_request_leads FOR SELECT TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can insert quote leads"
ON public.quote_request_leads FOR INSERT TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can update quote leads"
ON public.quote_request_leads FOR UPDATE TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete quote leads"
ON public.quote_request_leads FOR DELETE TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Providers: see own leads
CREATE POLICY "Providers can view their own leads"
ON public.quote_request_leads FOR SELECT TO authenticated
USING (
  provider_user_id = auth.uid()
  OR public.is_business_owner(auth.uid(), provider_id)
);

-- Providers: update only allowed fields. Enforced via trigger below.
CREATE POLICY "Providers can update their own leads"
ON public.quote_request_leads FOR UPDATE TO authenticated
USING (
  provider_user_id = auth.uid()
  OR public.is_business_owner(auth.uid(), provider_id)
)
WITH CHECK (
  provider_user_id = auth.uid()
  OR public.is_business_owner(auth.uid(), provider_id)
);

-- =========================================================
-- Field-level guard for providers
-- =========================================================
CREATE OR REPLACE FUNCTION public.quote_request_leads_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass
  IF public.has_admin_access(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- For non-admins (providers), forbid changes to protected fields
  IF NEW.quote_request_id IS DISTINCT FROM OLD.quote_request_id
     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
     OR NEW.provider_user_id IS DISTINCT FROM OLD.provider_user_id
     OR NEW.match_score IS DISTINCT FROM OLD.match_score
     OR NEW.match_reasons IS DISTINCT FROM OLD.match_reasons
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    RAISE EXCEPTION 'providers cannot modify protected fields on quote_request_leads';
  END IF;

  -- Restrict status transitions for providers
  IF NEW.status NOT IN ('new','viewed','interested','not_interested') THEN
    RAISE EXCEPTION 'providers cannot set status %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qrl_guard
BEFORE UPDATE ON public.quote_request_leads
FOR EACH ROW EXECUTE FUNCTION public.quote_request_leads_guard();
