
-- Phase E — RFQ expiry + cancellation
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;

ALTER TABLE public.quote_requests
  DROP CONSTRAINT IF EXISTS quote_requests_status_chk;
ALTER TABLE public.quote_requests
  ADD CONSTRAINT quote_requests_status_chk
  CHECK (status = ANY (ARRAY['new','under_review','matched','contacted','completed','cancelled','expired']));

CREATE INDEX IF NOT EXISTS quote_requests_valid_until_idx
  ON public.quote_requests (valid_until)
  WHERE valid_until IS NOT NULL;

-- Seed platform setting (bypass audit trigger which requires auth.uid()).
ALTER TABLE public.platform_settings DISABLE TRIGGER USER;
INSERT INTO public.platform_settings (setting_key, setting_value, setting_label_ar, setting_label_en, category, is_secret, is_active, description_ar, description_en)
VALUES ('rfq_max_validity_days', '90',
        'أقصى مدة صلاحية لطلبات عروض الأسعار (أيام)',
        'Maximum RFQ validity duration (days)',
        'rfq', false, true,
        'الحد الأعلى لعدد الأيام الذي يمكن للعميل اختياره كمدة صلاحية لطلبه.',
        'The upper bound on the validity period a client can pick for their RFQ.')
ON CONFLICT (setting_key) DO NOTHING;
ALTER TABLE public.platform_settings ENABLE TRIGGER USER;

-- Post-award cancellation request table.
CREATE TABLE IF NOT EXISTS public.rfq_cancellation_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  provider_response text,
  penalty_note text,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.rfq_cancellation_requests TO authenticated;
GRANT ALL ON public.rfq_cancellation_requests TO service_role;

ALTER TABLE public.rfq_cancellation_requests ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS rfq_cancellation_requests_one_pending_per_rfq_idx
  ON public.rfq_cancellation_requests (quote_request_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS rfq_cancellation_requests_quote_idx
  ON public.rfq_cancellation_requests (quote_request_id);

CREATE POLICY "Client can insert own cancellation requests"
  ON public.rfq_cancellation_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    )
  );

CREATE POLICY "Client can view own cancellation requests"
  ON public.rfq_cancellation_requests
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    )
  );

CREATE POLICY "Awarded provider staff can view cancellation requests"
  ON public.rfq_cancellation_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id
        AND qr.awarded_provider_business_id IS NOT NULL
        AND public.is_business_staff(auth.uid(), qr.awarded_provider_business_id)
    )
  );

CREATE POLICY "Awarded provider staff can respond to cancellation requests"
  ON public.rfq_cancellation_requests
  FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id
        AND qr.awarded_provider_business_id IS NOT NULL
        AND public.is_business_staff(auth.uid(), qr.awarded_provider_business_id)
    )
  )
  WITH CHECK (
    status IN ('accepted','rejected')
    AND EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id
        AND qr.awarded_provider_business_id IS NOT NULL
        AND public.is_business_staff(auth.uid(), qr.awarded_provider_business_id)
    )
  );

CREATE POLICY "Admins manage all cancellation requests"
  ON public.rfq_cancellation_requests
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));
