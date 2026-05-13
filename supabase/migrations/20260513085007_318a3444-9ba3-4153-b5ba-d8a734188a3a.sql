
CREATE OR REPLACE FUNCTION public.prepare_contract_prefill_from_lead(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_lead public.lead_requests%ROWTYPE;
  v_is_admin boolean;
  v_is_owner boolean;
  v_can_see_email boolean := false;
  v_subject text;
  v_message text;
  v_haystack text;
  v_work_type text := 'general';
  v_template_category text := 'general';
  v_template_version_id uuid;
  v_client jsonb := NULL;
  v_email text;
  v_currency text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'LEAD_PREFILL:UNAUTHENTICATED';
  END IF;

  SELECT * INTO v_lead FROM public.lead_requests WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_PREFILL:NOT_FOUND';
  END IF;

  IF v_lead.is_demo THEN
    RAISE EXCEPTION 'LEAD_PREFILL:DEMO_LEAD';
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin');
  v_is_owner := public.is_business_owner_or_manager(v_uid, v_lead.business_id);

  IF NOT (v_is_admin OR v_is_owner) THEN
    RAISE EXCEPTION 'LEAD_PREFILL:FORBIDDEN';
  END IF;

  -- Provider/admin already see lead row under RLS, so email is OK to surface.
  v_can_see_email := true;
  v_email := CASE WHEN v_can_see_email THEN v_lead.email ELSE NULL END;

  -- Work-type heuristic (conservative).
  v_subject := COALESCE(v_lead.subject, '');
  v_message := COALESCE(v_lead.message, '');
  v_haystack := lower(v_subject || ' ' || v_message);

  IF v_haystack ~ '(مطبخ|مطابخ|kitchen|cabinet|wardrobe|خزائن|دولاب)' THEN
    v_work_type := 'kitchens'; v_template_category := 'kitchens';
  ELSIF v_haystack ~ '(واجه|كلادينج|cladding|facade|facades)' THEN
    v_work_type := 'facades'; v_template_category := 'facades';
  ELSIF v_haystack ~ '(زجاج|سيكوريت|سكوريت|glass|securit|tempered|mirror|مراي)' THEN
    v_work_type := 'glass_securit'; v_template_category := 'glass_securit';
  ELSIF v_haystack ~ '(ألمنيوم|المنيوم|aluminum|aluminium|window|شبا?بيك|نافذ)' THEN
    v_work_type := 'aluminum_doors_windows'; v_template_category := 'aluminum_doors_windows';
  ELSIF v_haystack ~ '(حديد|بواب|gate|metal|steel|iron|هنجر|هناجر)' THEN
    v_work_type := 'gates_structures'; v_template_category := 'gates_structures';
  ELSIF v_haystack ~ '(upvc|يو ?بي ?في ?سي)' THEN
    v_work_type := 'upvc'; v_template_category := 'upvc';
  ELSIF v_haystack ~ '(خشب|نجار|wood|carpentry|باركيه|parquet)' THEN
    v_work_type := 'wood_doors'; v_template_category := 'wood_doors';
  ELSIF v_haystack ~ '(fire|حريق)' THEN
    v_work_type := 'fire_doors'; v_template_category := 'fire_doors';
  ELSE
    v_work_type := 'general'; v_template_category := 'general';
  END IF;

  -- Template suggestion: only published current version; fall back to general.
  SELECT ctv.id INTO v_template_version_id
  FROM public.contract_template_versions ctv
  JOIN public.contract_templates ct ON ct.id = ctv.template_id
  WHERE ctv.status = 'published'
    AND ct.is_active = true
    AND ct.archived_at IS NULL
    AND ct.category = v_template_category
    AND (ct.current_version_id IS NULL OR ct.current_version_id = ctv.id)
  ORDER BY ctv.published_at DESC NULLS LAST
  LIMIT 1;

  IF v_template_version_id IS NULL AND v_template_category <> 'general' THEN
    SELECT ctv.id INTO v_template_version_id
    FROM public.contract_template_versions ctv
    JOIN public.contract_templates ct ON ct.id = ctv.template_id
    WHERE ctv.status = 'published'
      AND ct.is_active = true
      AND ct.archived_at IS NULL
      AND ct.category = 'general'
      AND (ct.current_version_id IS NULL OR ct.current_version_id = ctv.id)
    ORDER BY ctv.published_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  -- Client profile match by email (no auto-link).
  IF v_email IS NOT NULL THEN
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'display_name', COALESCE(p.full_name, NULL),
      'verified', COALESCE(p.is_verified, false)
    )
    INTO v_client
    FROM public.profiles p
    WHERE lower(p.email) = lower(v_email)
      AND COALESCE(p.is_banned, false) = false
    LIMIT 1;
  END IF;

  v_currency := COALESCE(NULLIF(v_lead.quote_currency, ''), 'SAR');

  RETURN jsonb_build_object(
    'lead_id', v_lead.id,
    'lead_ref_id', v_lead.ref_id,
    'business_id', v_lead.business_id,
    'suggested_title', NULLIF(left(COALESCE(v_subject, ''), 120), ''),
    'suggested_description', NULLIF(left(COALESCE(v_message, ''), 4000), ''),
    'suggested_work_type', v_work_type,
    'suggested_template_version_id', v_template_version_id,
    'suggested_currency_code', v_currency,
    'customer_name', v_lead.name,
    'customer_email', v_email,
    'client_profile_match', v_client,
    'existing_contract_id', v_lead.converted_contract_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_contract_prefill_from_lead(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_contract_prefill_from_lead(uuid) TO authenticated, service_role;
