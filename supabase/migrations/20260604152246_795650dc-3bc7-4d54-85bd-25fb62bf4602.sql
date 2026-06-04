
ALTER TABLE public.business_ownership_transfer_requests
  ADD COLUMN IF NOT EXISTS proof_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS requester_phone text,
  ADD COLUMN IF NOT EXISTS requester_email text,
  ADD COLUMN IF NOT EXISTS commercial_registration text,
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin';

CREATE INDEX IF NOT EXISTS idx_botr_business_status
  ON public.business_ownership_transfer_requests (business_id, status);
CREATE INDEX IF NOT EXISTS idx_botr_status_created
  ON public.business_ownership_transfer_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_placeholder
  ON public.businesses (id) WHERE placeholder_owner = true;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'business_ownership_transfer_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.business_ownership_transfer_requests;
  END IF;
END $$;
ALTER TABLE public.business_ownership_transfer_requests REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.submit_ownership_claim(
  p_business_id uuid, p_requester_name text, p_requester_phone text,
  p_requester_email text, p_commercial_registration text, p_message text,
  p_proof_files jsonb DEFAULT '[]'::jsonb
) RETURNS TABLE(request_id uuid, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_placeholder boolean;
  v_recent_count int;
  v_existing_pending uuid;
  v_new_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000'; END IF;
  IF p_business_id IS NULL THEN RAISE EXCEPTION 'business_id_required'; END IF;
  IF coalesce(length(trim(p_requester_name)),0) < 2
     OR coalesce(length(trim(p_requester_phone)),0) < 6
     OR coalesce(length(trim(p_requester_email)),0) < 5 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;
  SELECT placeholder_owner INTO v_is_placeholder FROM public.businesses WHERE id = p_business_id;
  IF v_is_placeholder IS NULL THEN RAISE EXCEPTION 'business_not_found'; END IF;
  IF v_is_placeholder = false THEN RAISE EXCEPTION 'business_not_claimable'; END IF;

  SELECT count(*) INTO v_recent_count FROM public.business_ownership_transfer_requests
  WHERE requester_user_id = v_user AND created_at > now() - interval '1 hour';
  IF v_recent_count >= 3 THEN RAISE EXCEPTION 'rate_limit_exceeded'; END IF;

  SELECT id INTO v_existing_pending FROM public.business_ownership_transfer_requests
  WHERE business_id = p_business_id AND requester_user_id = v_user AND status = 'pending' LIMIT 1;
  IF v_existing_pending IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_pending, 'pending'::text; RETURN;
  END IF;

  INSERT INTO public.business_ownership_transfer_requests(
    business_id, requester_user_id, status, message,
    requester_name, requester_phone, requester_email,
    commercial_registration, proof_files, source
  ) VALUES (
    p_business_id, v_user, 'pending', p_message,
    trim(p_requester_name), trim(p_requester_phone), lower(trim(p_requester_email)),
    nullif(trim(p_commercial_registration),''), coalesce(p_proof_files,'[]'::jsonb), 'public_claim'
  ) RETURNING id INTO v_new_id;

  BEGIN
    INSERT INTO public.admin_activity_log(actor_user_id, action, target_type, target_id, metadata)
    VALUES (v_user, 'ownership_claim_submitted', 'business', p_business_id::text,
      jsonb_build_object('request_id', v_new_id, 'source', 'public_claim'));
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN QUERY SELECT v_new_id, 'pending'::text;
END; $$;
REVOKE ALL ON FUNCTION public.submit_ownership_claim(uuid, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_ownership_claim(uuid, text, text, text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_claimable_business(p_business_id uuid)
RETURNS TABLE(
  id uuid, name_ar text, name_en text, logo_url text,
  region text, sectors jsonb, placeholder_owner boolean, pending_claims_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.name_ar, b.name_en, b.logo_url, b.region,
    to_jsonb(b.sectors), b.placeholder_owner,
    (SELECT count(*) FROM public.business_ownership_transfer_requests r
       WHERE r.business_id = b.id AND r.status = 'pending')
  FROM public.businesses b WHERE b.id = p_business_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_claimable_business(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_placeholder_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_placeholders', (SELECT count(*) FROM public.businesses WHERE placeholder_owner = true),
    'pending_claims', (SELECT count(*) FROM public.business_ownership_transfer_requests WHERE status='pending'),
    'approved_claims', (SELECT count(*) FROM public.business_ownership_transfer_requests WHERE status='approved'),
    'rejected_claims', (SELECT count(*) FROM public.business_ownership_transfer_requests WHERE status='rejected'),
    'avg_review_hours', (
      SELECT round(avg(extract(epoch from (reviewed_at - created_at))/3600)::numeric, 1)
      FROM public.business_ownership_transfer_requests WHERE reviewed_at IS NOT NULL
    ),
    'by_region', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('region', region, 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT region, count(*) c FROM public.businesses
            WHERE placeholder_owner = true AND region IS NOT NULL
            GROUP BY region ORDER BY count(*) DESC LIMIT 10) t
    )
  ) INTO v_result;
  RETURN v_result;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_placeholder_dashboard_stats() TO authenticated;
