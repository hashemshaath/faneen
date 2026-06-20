-- OPPORTUNITIES PHASE 6 — awarding columns on quote_requests
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS awarded_bid_id uuid REFERENCES public.opportunity_bids(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS awarded_provider_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS awarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS awarded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS award_status text NOT NULL DEFAULT 'none';

ALTER TABLE public.quote_requests
  DROP CONSTRAINT IF EXISTS quote_requests_award_status_chk;
ALTER TABLE public.quote_requests
  ADD CONSTRAINT quote_requests_award_status_chk
  CHECK (award_status IN ('none','awarded','cancelled'));

CREATE INDEX IF NOT EXISTS idx_quote_requests_awarded_bid ON public.quote_requests(awarded_bid_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_award_status ON public.quote_requests(award_status);

-- award_opportunity_bid: only opportunity owner or admin. Providers cannot execute (gated inside).
CREATE OR REPLACE FUNCTION public.award_opportunity_bid(
  p_opportunity_id uuid,
  p_bid_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_qr_user uuid;
  v_qr_status text;
  v_award_status text;
  v_awarded_bid uuid;
  v_bid_opp uuid;
  v_bid_status text;
  v_bid_provider uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin'::public.app_role);

  SELECT user_id, status, award_status, awarded_bid_id
    INTO v_qr_user, v_qr_status, v_award_status, v_awarded_bid
  FROM public.quote_requests
  WHERE id = p_opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'opportunity_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_is_admin AND (v_qr_user IS NULL OR v_qr_user <> v_uid) THEN
    RAISE EXCEPTION 'not_opportunity_owner' USING ERRCODE = '42501';
  END IF;

  IF v_qr_status IN ('cancelled','completed') THEN
    RAISE EXCEPTION 'opportunity_not_awardable_status' USING ERRCODE = '22023';
  END IF;

  -- Idempotency: same bid already awarded → no-op
  IF v_award_status = 'awarded' AND v_awarded_bid = p_bid_id THEN
    RETURN p_bid_id;
  END IF;

  IF v_award_status = 'awarded' AND v_awarded_bid IS DISTINCT FROM p_bid_id THEN
    RAISE EXCEPTION 'opportunity_already_awarded' USING ERRCODE = '22023';
  END IF;

  SELECT opportunity_id, status, provider_business_id
    INTO v_bid_opp, v_bid_status, v_bid_provider
  FROM public.opportunity_bids
  WHERE id = p_bid_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bid_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_bid_opp <> p_opportunity_id THEN
    RAISE EXCEPTION 'bid_opportunity_mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_bid_status NOT IN ('submitted','under_review','shortlisted','revised') THEN
    RAISE EXCEPTION 'bid_not_in_awardable_status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.opportunity_bids
     SET status = 'awarded'
   WHERE id = p_bid_id;

  UPDATE public.opportunity_bids
     SET status = 'rejected'
   WHERE opportunity_id = p_opportunity_id
     AND id <> p_bid_id
     AND status IN ('draft','submitted','under_review','shortlisted','revised');

  UPDATE public.quote_requests
     SET awarded_bid_id = p_bid_id,
         awarded_provider_business_id = v_bid_provider,
         awarded_at = now(),
         awarded_by = v_uid,
         award_status = 'awarded'
   WHERE id = p_opportunity_id;

  INSERT INTO public.quote_request_events (quote_request_id, event_type, actor_user_id, metadata)
  VALUES (
    p_opportunity_id,
    'opportunity_awarded',
    v_uid,
    jsonb_build_object('bid_id', p_bid_id, 'provider_business_id', v_bid_provider)
  );

  -- Best-effort notifications (failures do not roll back the award)
  BEGIN
    INSERT INTO public.notifications
      (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id)
    SELECT b.submitted_by,
           'تم تعميد عرضك',
           'Your bid was awarded',
           'تهانينا، تم اختيار عرضك على الفرصة.',
           'Congratulations, your bid has been selected.',
           'opportunity_bid_awarded',
           'opportunity_bid',
           p_bid_id
      FROM public.opportunity_bids b
     WHERE b.id = p_bid_id AND b.submitted_by IS NOT NULL;

    IF v_qr_user IS NOT NULL THEN
      INSERT INTO public.notifications
        (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id)
      VALUES
        (v_qr_user,
         'تم التعميد بنجاح',
         'Award completed',
         'تم تعميد العرض الفائز على فرصتك.',
         'The winning bid has been awarded on your opportunity.',
         'opportunity_awarded',
         'opportunity',
         p_opportunity_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- swallow notification errors
    NULL;
  END;

  RETURN p_bid_id;
END;
$$;

REVOKE ALL ON FUNCTION public.award_opportunity_bid(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_opportunity_bid(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_opportunity_bid(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_opportunity_bid(uuid, uuid) TO service_role;