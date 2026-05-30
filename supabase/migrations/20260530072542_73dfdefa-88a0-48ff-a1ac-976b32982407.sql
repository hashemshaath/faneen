-- RFQ system
CREATE TABLE public.rfq_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_id TEXT UNIQUE,
  buyer_user_id UUID NOT NULL,
  industry TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  currency TEXT NOT NULL DEFAULT 'SAR',
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.rfq_ref_seq START 1000;
CREATE OR REPLACE FUNCTION public.set_rfq_ref_id()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN
    NEW.ref_id := 'RFQ-' || lpad(nextval('public.rfq_ref_seq')::text, 7, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rfq_ref BEFORE INSERT ON public.rfq_requests
FOR EACH ROW EXECUTE FUNCTION public.set_rfq_ref_id();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_requests TO authenticated;
GRANT ALL ON public.rfq_requests TO service_role;
ALTER TABLE public.rfq_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open RFQs visible to authenticated"
  ON public.rfq_requests FOR SELECT TO authenticated
  USING (status = 'open' OR buyer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyer can create RFQ"
  ON public.rfq_requests FOR INSERT TO authenticated
  WITH CHECK (buyer_user_id = auth.uid());
CREATE POLICY "Buyer or admin can update"
  ON public.rfq_requests FOR UPDATE TO authenticated
  USING (buyer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyer or admin can delete"
  ON public.rfq_requests FOR DELETE TO authenticated
  USING (buyer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.rfq_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.rfq_requests(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL,
  business_id UUID,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  delivery_days INTEGER,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_quotes TO authenticated;
GRANT ALL ON public.rfq_quotes TO service_role;
ALTER TABLE public.rfq_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quote visible to provider buyer or admin"
  ON public.rfq_quotes FOR SELECT TO authenticated
  USING (
    provider_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.rfq_requests r WHERE r.id = rfq_id AND r.buyer_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Provider creates own quote"
  ON public.rfq_quotes FOR INSERT TO authenticated
  WITH CHECK (provider_user_id = auth.uid());
CREATE POLICY "Provider or admin updates quote"
  ON public.rfq_quotes FOR UPDATE TO authenticated
  USING (provider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Provider or admin deletes quote"
  ON public.rfq_quotes FOR DELETE TO authenticated
  USING (provider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_rfq_quotes_rfq ON public.rfq_quotes(rfq_id);
CREATE INDEX idx_rfq_requests_status ON public.rfq_requests(status);

-- Loyalty Points
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.loyalty_points TO authenticated;
GRANT ALL ON public.loyalty_points TO service_role;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own loyalty"
  ON public.loyalty_points FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service writes loyalty"
  ON public.loyalty_points FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_loyalty_user ON public.loyalty_points(user_id);

CREATE OR REPLACE FUNCTION public.get_loyalty_summary(_user_id UUID)
RETURNS TABLE(total_points INTEGER, level TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(SUM(points), 0)::INTEGER AS total_points,
    CASE
      WHEN COALESCE(SUM(points), 0) >= 5000 THEN 'platinum'
      WHEN COALESCE(SUM(points), 0) >= 2000 THEN 'gold'
      WHEN COALESCE(SUM(points), 0) >= 500 THEN 'silver'
      ELSE 'bronze'
    END AS level
  FROM public.loyalty_points WHERE user_id = _user_id;
$$;