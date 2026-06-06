
-- ========== 1. business_rfqs (Request for Quote) ==========
CREATE TABLE public.business_rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requester_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  requester_email text,
  requester_phone text,
  title text NOT NULL,
  description text NOT NULL,
  budget_min numeric,
  budget_max numeric,
  currency_code text DEFAULT 'SAR',
  deadline date,
  attachments jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','viewed','quoted','accepted','rejected','closed')),
  provider_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_rfqs_business ON public.business_rfqs(business_id, created_at DESC);
CREATE INDEX idx_business_rfqs_requester ON public.business_rfqs(requester_user_id) WHERE requester_user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.business_rfqs TO authenticated;
GRANT INSERT ON public.business_rfqs TO anon;
GRANT ALL ON public.business_rfqs TO service_role;

ALTER TABLE public.business_rfqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an RFQ"
  ON public.business_rfqs FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Requesters see their RFQs"
  ON public.business_rfqs FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid());

CREATE POLICY "Business owner sees RFQs"
  ON public.business_rfqs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE POLICY "Business owner updates RFQs"
  ON public.business_rfqs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE TRIGGER trg_business_rfqs_updated_at
  BEFORE UPDATE ON public.business_rfqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== 2. business_qa (Public Q&A) ==========
CREATE TABLE public.business_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  asker_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  asker_name text,
  question text NOT NULL,
  answer text,
  is_published boolean NOT NULL DEFAULT false,
  asked_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_qa_business_pub ON public.business_qa(business_id, is_published, answered_at DESC);

GRANT SELECT, INSERT ON public.business_qa TO authenticated;
GRANT SELECT, INSERT ON public.business_qa TO anon;
GRANT ALL ON public.business_qa TO service_role;

ALTER TABLE public.business_qa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published Q&A"
  ON public.business_qa FOR SELECT TO anon, authenticated
  USING (is_published = true AND answer IS NOT NULL);

CREATE POLICY "Owner reads all Q&A"
  ON public.business_qa FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE POLICY "Asker reads their own Q&A"
  ON public.business_qa FOR SELECT TO authenticated
  USING (asker_user_id = auth.uid());

CREATE POLICY "Anyone asks question"
  ON public.business_qa FOR INSERT TO anon, authenticated
  WITH CHECK (answer IS NULL AND is_published = false);

CREATE POLICY "Owner answers/publishes Q&A"
  ON public.business_qa FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE POLICY "Owner deletes Q&A"
  ON public.business_qa FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE TRIGGER trg_business_qa_updated_at
  BEFORE UPDATE ON public.business_qa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== 3. user_favorites ==========
CREATE TABLE public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

CREATE INDEX idx_user_favorites_user ON public.user_favorites(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_favorites TO service_role;

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their favorites"
  ON public.user_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========== 4. Public Q&A FAQ count (for tab badges) — convenience view ==========
CREATE OR REPLACE VIEW public.business_qa_public AS
  SELECT id, business_id, question, answer, asked_at, answered_at
  FROM public.business_qa
  WHERE is_published = true AND answer IS NOT NULL;

GRANT SELECT ON public.business_qa_public TO anon, authenticated;
