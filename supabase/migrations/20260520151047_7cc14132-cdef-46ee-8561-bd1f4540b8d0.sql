
-- =========================================================
-- Phase 2.7 — Lead request extension + submit_site_interest
-- =========================================================

-- 1. Extend lead_requests
ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS source_site_id uuid REFERENCES public.client_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS initiated_by text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS site_access_grant_id uuid REFERENCES public.client_site_access_grants(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lead_requests_initiated_by_check'
      AND conrelid = 'public.lead_requests'::regclass
  ) THEN
    ALTER TABLE public.lead_requests
      ADD CONSTRAINT lead_requests_initiated_by_check
      CHECK (initiated_by IN ('customer','provider','admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_requests_source_site
  ON public.lead_requests(source_site_id, created_at DESC)
  WHERE source_site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_requests_initiated_by
  ON public.lead_requests(initiated_by);

-- 2. submit_site_interest RPC
CREATE OR REPLACE FUNCTION public.submit_site_interest(
  _site_ref text,
  _provider_business_id uuid,
  _message text,
  _service_category text DEFAULT NULL,
  _estimated_budget_min numeric DEFAULT NULL,
  _estimated_budget_max numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_norm text;
  v_site public.client_sites%ROWTYPE;
  v_owner_business_id uuid;
  v_grant public.client_site_access_grants%ROWTYPE;
  v_grant_created boolean := false;
  v_lead public.lead_requests%ROWTYPE;
  v_profile_name text;
  v_profile_email text;
  v_subject text;
  v_msg text;
  v_budget_range text;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  -- Provider authorization
  IF _provider_business_id IS NULL
     OR NOT public.is_business_owner_or_manager(v_uid, _provider_business_id) THEN
    RAISE EXCEPTION 'FORBIDDEN_PROVIDER' USING ERRCODE = '42501';
  END IF;

  -- Message validation
  v_msg := btrim(coalesce(_message, ''));
  IF length(v_msg) < 5 THEN
    RAISE EXCEPTION 'MESSAGE_TOO_SHORT' USING ERRCODE = '22023';
  END IF;
  IF length(v_msg) > 5000 THEN
    RAISE EXCEPTION 'MESSAGE_TOO_LONG' USING ERRCODE = '22023';
  END IF;

  -- Budget validation
  IF _estimated_budget_min IS NOT NULL AND _estimated_budget_min < 0 THEN
    RAISE EXCEPTION 'INVALID_BUDGET_MIN' USING ERRCODE = '22023';
  END IF;
  IF _estimated_budget_max IS NOT NULL AND _estimated_budget_max < 0 THEN
    RAISE EXCEPTION 'INVALID_BUDGET_MAX' USING ERRCODE = '22023';
  END IF;
  IF _estimated_budget_min IS NOT NULL AND _estimated_budget_max IS NOT NULL
     AND _estimated_budget_max < _estimated_budget_min THEN
    RAISE EXCEPTION 'INVALID_BUDGET_RANGE' USING ERRCODE = '22023';
  END IF;

  -- Site lookup
  v_norm := upper(btrim(coalesce(_site_ref,'')));
  IF v_norm !~ '^STE-[0-9]{4}-[0-9]{6}$' THEN
    RAISE EXCEPTION 'INVALID_SITE_REF' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_site FROM public.client_sites
    WHERE site_ref = v_norm AND archived_at IS NULL LIMIT 1;
  IF v_site.id IS NULL THEN
    RAISE EXCEPTION 'SITE_NOT_FOUND' USING ERRCODE = '22023';
  END IF;

  -- Resolve owner business for the lead (must be a business_id since lead_requests.business_id NOT NULL).
  -- Prefer linked business via the customer's owned business; fall back to provider business
  -- so the row remains insertable. The semantic "to whom" is owner_user_id of the site.
  -- For Qitaat we route owner-facing leads via owner_user_id-driven inbox; but lead_requests.business_id
  -- represents the receiving business — for site interests, the receiver is the site owner's primary business if any.
  SELECT b.id INTO v_owner_business_id
  FROM public.businesses b
  WHERE b.user_id = v_site.owner_user_id
  ORDER BY b.created_at ASC
  LIMIT 1;

  -- If site owner has no business, store under provider business as fallback (still tagged as provider-initiated)
  IF v_owner_business_id IS NULL THEN
    v_owner_business_id := _provider_business_id;
  END IF;

  -- Find existing active grant; if none, create one (requested)
  SELECT * INTO v_grant FROM public.client_site_access_grants
    WHERE site_id = v_site.id
      AND provider_business_id = _provider_business_id
      AND status IN ('requested','approved')
    LIMIT 1;

  IF v_grant.id IS NULL THEN
    INSERT INTO public.client_site_access_grants
      (site_id, provider_business_id, provider_user_id, access_level, status, reason)
    VALUES (v_site.id, _provider_business_id, v_uid, 'limited', 'requested',
            left(v_msg, 500))
    RETURNING * INTO v_grant;
    v_grant_created := true;

    INSERT INTO public.client_site_access_audit
      (site_id, grant_id, actor_user_id, actor_business_id, event_type, metadata)
    VALUES (v_site.id, v_grant.id, v_uid, _provider_business_id, 'access_requested',
            jsonb_build_object('via','submit_site_interest'));
  END IF;

  -- Provider profile (used for required lead_requests.name/email)
  SELECT full_name, email INTO v_profile_name, v_profile_email
  FROM public.profiles WHERE user_id = v_uid LIMIT 1;

  IF v_profile_name IS NULL OR length(btrim(v_profile_name)) = 0 THEN
    v_profile_name := 'Provider';
  END IF;
  IF v_profile_email IS NULL OR length(v_profile_email) < 3 THEN
    v_profile_email := 'noreply@qitaat.com';
  END IF;

  v_subject := 'Interest for site ' || v_site.site_ref;

  IF _estimated_budget_min IS NOT NULL OR _estimated_budget_max IS NOT NULL THEN
    v_budget_range := concat(
      coalesce(_estimated_budget_min::text, ''),
      ' - ',
      coalesce(_estimated_budget_max::text, '')
    );
  END IF;

  -- Insert lead
  INSERT INTO public.lead_requests
    (business_id, user_id, name, email, subject, message,
     status, priority, source,
     source_site_id, initiated_by, site_access_grant_id,
     project_scope, budget_range)
  VALUES
    (v_owner_business_id, v_uid, v_profile_name, v_profile_email,
     v_subject, v_msg,
     'new', 'normal', 'site_qr',
     v_site.id, 'provider', v_grant.id,
     _service_category, v_budget_range)
  RETURNING * INTO v_lead;

  -- Visit log
  BEGIN
    PERFORM public.log_site_visit(
      v_site.id, 'site_ref_search', NULL,
      'submitted_interest', _provider_business_id,
      jsonb_build_object(
        'lead_ref_id', v_lead.ref_id,
        'grant_created', v_grant_created,
        'has_budget', (_estimated_budget_min IS NOT NULL OR _estimated_budget_max IS NOT NULL),
        'has_category', _service_category IS NOT NULL
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object(
    'submitted', true,
    'site_ref', v_site.site_ref,
    'status', v_lead.status,
    'interest_ref', v_lead.ref_id,
    'grant_status', v_grant.status,
    'grant_created', v_grant_created
  );
END
$function$;

REVOKE ALL ON FUNCTION public.submit_site_interest(text, uuid, text, text, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_site_interest(text, uuid, text, text, numeric, numeric) TO authenticated;
