-- 1) TABLE
CREATE TABLE public.rfq_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  bid_id uuid NOT NULL REFERENCES public.opportunity_bids(id) ON DELETE CASCADE,
  provider_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','shipped','received','approved','rejected')),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  shipped_at timestamptz,
  tracking_ref text,
  received_at timestamptz,
  decision_at timestamptz,
  decision_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_notes text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) GRANTS (auth-only; no anon)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_samples TO authenticated;
GRANT ALL ON public.rfq_samples TO service_role;

-- 3) RLS
ALTER TABLE public.rfq_samples ENABLE ROW LEVEL SECURITY;

-- 4) POLICIES
-- Client (RFQ owner) can see all samples on their opportunity.
CREATE POLICY "rfq_samples_select_owner"
ON public.rfq_samples FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quote_requests qr
  WHERE qr.id = rfq_samples.quote_request_id
    AND qr.user_id = auth.uid()
));

-- Provider staff of the awarded business can see their own samples.
CREATE POLICY "rfq_samples_select_provider_staff"
ON public.rfq_samples FOR SELECT TO authenticated
USING (
  provider_business_id IS NOT NULL
  AND public.is_business_staff(provider_business_id, auth.uid())
);

-- Admins: full access.
CREATE POLICY "rfq_samples_all_admin"
ON public.rfq_samples FOR ALL TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

-- Owner (client) creates a sample request on their own opportunity.
CREATE POLICY "rfq_samples_insert_owner"
ON public.rfq_samples FOR INSERT TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id = quote_request_id
      AND qr.user_id = auth.uid()
  )
);

-- Owner updates: decision fields (approve/reject) + can request a re-sample flow.
CREATE POLICY "rfq_samples_update_owner"
ON public.rfq_samples FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quote_requests qr
  WHERE qr.id = rfq_samples.quote_request_id
    AND qr.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quote_requests qr
  WHERE qr.id = rfq_samples.quote_request_id
    AND qr.user_id = auth.uid()
));

-- Provider staff can update shipping fields on their own samples.
CREATE POLICY "rfq_samples_update_provider_staff"
ON public.rfq_samples FOR UPDATE TO authenticated
USING (
  provider_business_id IS NOT NULL
  AND public.is_business_staff(provider_business_id, auth.uid())
)
WITH CHECK (
  provider_business_id IS NOT NULL
  AND public.is_business_staff(provider_business_id, auth.uid())
);

-- 5) Unique partial index — one active (non-rejected) sample per bid.
CREATE UNIQUE INDEX rfq_samples_active_bid_uniq
  ON public.rfq_samples (quote_request_id, bid_id)
  WHERE status <> 'rejected';

CREATE INDEX rfq_samples_provider_business_idx
  ON public.rfq_samples (provider_business_id);
CREATE INDEX rfq_samples_status_idx
  ON public.rfq_samples (status);

-- 6) updated_at trigger (reuse existing shared function)
CREATE TRIGGER rfq_samples_set_updated_at
BEFORE UPDATE ON public.rfq_samples
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) STORAGE POLICIES on rfq-sample-photos bucket
-- Path convention: <sample_id>/<filename>
-- Owner (RFQ client) — read
CREATE POLICY "rfq_sample_photos_read_owner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'rfq-sample-photos'
  AND EXISTS (
    SELECT 1
    FROM public.rfq_samples s
    JOIN public.quote_requests qr ON qr.id = s.quote_request_id
    WHERE s.id::text = (storage.foldername(storage.objects.name))[1]
      AND qr.user_id = auth.uid()
  )
);

-- Provider staff — read
CREATE POLICY "rfq_sample_photos_read_provider"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'rfq-sample-photos'
  AND EXISTS (
    SELECT 1
    FROM public.rfq_samples s
    WHERE s.id::text = (storage.foldername(storage.objects.name))[1]
      AND s.provider_business_id IS NOT NULL
      AND public.is_business_staff(s.provider_business_id, auth.uid())
  )
);

-- Admins — read + delete
CREATE POLICY "rfq_sample_photos_read_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'rfq-sample-photos'
  AND public.has_admin_access(auth.uid())
);

CREATE POLICY "rfq_sample_photos_delete_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'rfq-sample-photos'
  AND public.has_admin_access(auth.uid())
);

-- Provider staff — upload (shipping photos)
CREATE POLICY "rfq_sample_photos_upload_provider"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'rfq-sample-photos'
  AND EXISTS (
    SELECT 1
    FROM public.rfq_samples s
    WHERE s.id::text = (storage.foldername(storage.objects.name))[1]
      AND s.provider_business_id IS NOT NULL
      AND public.is_business_staff(s.provider_business_id, auth.uid())
  )
);

-- Owner — upload (optional evidence photos on receipt/decision)
CREATE POLICY "rfq_sample_photos_upload_owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'rfq-sample-photos'
  AND EXISTS (
    SELECT 1
    FROM public.rfq_samples s
    JOIN public.quote_requests qr ON qr.id = s.quote_request_id
    WHERE s.id::text = (storage.foldername(storage.objects.name))[1]
      AND qr.user_id = auth.uid()
  )
);

-- Provider — delete own uploads
CREATE POLICY "rfq_sample_photos_delete_provider"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'rfq-sample-photos'
  AND EXISTS (
    SELECT 1
    FROM public.rfq_samples s
    WHERE s.id::text = (storage.foldername(storage.objects.name))[1]
      AND s.provider_business_id IS NOT NULL
      AND public.is_business_staff(s.provider_business_id, auth.uid())
  )
);

-- Owner — delete own uploads
CREATE POLICY "rfq_sample_photos_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'rfq-sample-photos'
  AND EXISTS (
    SELECT 1
    FROM public.rfq_samples s
    JOIN public.quote_requests qr ON qr.id = s.quote_request_id
    WHERE s.id::text = (storage.foldername(storage.objects.name))[1]
      AND qr.user_id = auth.uid()
  )
);