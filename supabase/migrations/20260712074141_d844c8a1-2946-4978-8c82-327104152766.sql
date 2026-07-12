-- R4.1 — Clarifications (Q&A) thread per RFQ / per bid
CREATE TABLE IF NOT EXISTS public.rfq_clarifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  bid_id uuid REFERENCES public.opportunity_bids(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('client','provider','admin')),
  body text NOT NULL CHECK (length(btrim(body)) > 0 AND length(body) <= 4000),
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rfq_clarifications TO authenticated;
GRANT ALL ON public.rfq_clarifications TO service_role;

ALTER TABLE public.rfq_clarifications ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY rfq_clar_all_admin ON public.rfq_clarifications
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Client (RFQ owner): SELECT all rows on their RFQ
CREATE POLICY rfq_clar_select_owner ON public.rfq_clarifications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id = rfq_clarifications.quote_request_id
      AND qr.user_id = auth.uid()
  ));

-- Client (RFQ owner): INSERT as author_role='client'
CREATE POLICY rfq_clar_insert_owner ON public.rfq_clarifications
  FOR INSERT TO authenticated
  WITH CHECK (
    author_role = 'client'
    AND author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = rfq_clarifications.quote_request_id
        AND qr.user_id = auth.uid()
    )
  );

-- Provider staff: SELECT clarifications attached to their own bid
-- (strict isolation — a provider can never see another provider's bid thread)
CREATE POLICY rfq_clar_select_provider_bid ON public.rfq_clarifications
  FOR SELECT TO authenticated
  USING (
    bid_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.opportunity_bids b
      WHERE b.id = rfq_clarifications.bid_id
        AND b.provider_business_id IS NOT NULL
        AND is_business_staff(b.provider_business_id, auth.uid())
    )
  );

-- Provider staff: SELECT general (bid_id IS NULL) clarifications on RFQs
-- they have a lead / assignment on
CREATE POLICY rfq_clar_select_provider_general ON public.rfq_clarifications
  FOR SELECT TO authenticated
  USING (
    bid_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.quote_request_leads l
      WHERE l.quote_request_id = rfq_clarifications.quote_request_id
        AND (
          l.provider_user_id = auth.uid()
          OR (l.provider_id IS NOT NULL AND is_business_staff(l.provider_id, auth.uid()))
        )
    )
  );

-- Provider staff: INSERT on their own bid thread
CREATE POLICY rfq_clar_insert_provider_bid ON public.rfq_clarifications
  FOR INSERT TO authenticated
  WITH CHECK (
    author_role = 'provider'
    AND author_user_id = auth.uid()
    AND bid_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.opportunity_bids b
      WHERE b.id = rfq_clarifications.bid_id
        AND b.provider_business_id IS NOT NULL
        AND is_business_staff(b.provider_business_id, auth.uid())
    )
  );

-- Provider staff: INSERT on the general thread of an RFQ they were invited to
CREATE POLICY rfq_clar_insert_provider_general ON public.rfq_clarifications
  FOR INSERT TO authenticated
  WITH CHECK (
    author_role = 'provider'
    AND author_user_id = auth.uid()
    AND bid_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.quote_request_leads l
      WHERE l.quote_request_id = rfq_clarifications.quote_request_id
        AND (
          l.provider_user_id = auth.uid()
          OR (l.provider_id IS NOT NULL AND is_business_staff(l.provider_id, auth.uid()))
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_rfq_clar_qr_bid_created
  ON public.rfq_clarifications (quote_request_id, bid_id, created_at);

-- R4.1 — Bid revision fields
ALTER TABLE public.opportunity_bids
  ADD COLUMN IF NOT EXISTS revision_of uuid REFERENCES public.opportunity_bids(id),
  ADD COLUMN IF NOT EXISTS revision_reason text,
  ADD COLUMN IF NOT EXISTS revision_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision_requested_by uuid;
