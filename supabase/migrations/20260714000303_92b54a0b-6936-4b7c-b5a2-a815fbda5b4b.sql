-- M4.1 — Tier-boosted matcher (score-only change; candidate set unchanged)
CREATE OR REPLACE FUNCTION public.match_quote_to_providers(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote        public.quote_requests%ROWTYPE;
  v_tax_id       uuid;
  v_child_ids    uuid[] := ARRAY[]::uuid[];
  v_candidates   uuid[] := ARRAY[]::uuid[];
  v_match_source text := 'coverage';
  v_inserted     int   := 0;
  v_sector_ar    text;
  v_admin        record;
BEGIN
  SELECT * INTO v_quote FROM public.quote_requests WHERE id = p_quote_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'quote_not_found',
      'matched_count', 0, 'match_source', 'none'
    );
  END IF;

  IF v_quote.status NOT IN ('new', 'under_review', 'matched') THEN
    RETURN jsonb_build_object(
      'success', true, 'matched_count', 0,
      'match_source', 'skipped_status', 'status', v_quote.status
    );
  END IF;

  v_tax_id := v_quote.taxonomy_category_id;
  IF v_tax_id IS NULL THEN
    SELECT id INTO v_tax_id
    FROM public.taxonomy_categories
    WHERE slug = COALESCE(
      NULLIF(v_quote.metadata->>'taxonomy_primary_slug',''),
      v_quote.sector
    )
      AND is_active AND NOT is_archived
    LIMIT 1;
  END IF;

  IF v_tax_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
      INTO v_child_ids
      FROM public.taxonomy_categories
     WHERE parent_id = v_tax_id AND is_active AND NOT is_archived;
  END IF;

  IF v_quote.city_id IS NULL THEN
    v_match_source := 'manual_routing';
  ELSE
    IF v_tax_id IS NOT NULL THEN
      SELECT COALESCE(array_agg(DISTINCT b.id), ARRAY[]::uuid[])
        INTO v_candidates
        FROM public.businesses b
       WHERE b.is_active = true
         AND b.approval_status IN ('approved','published')
         AND EXISTS (
           SELECT 1 FROM public.business_taxonomy_categories btc
            WHERE btc.business_id = b.id
              AND (
                (btc.role = 'primary_activity'   AND btc.category_id = v_tax_id) OR
                (btc.role = 'secondary_activity' AND (
                   btc.category_id = v_tax_id
                   OR btc.category_id = ANY(v_child_ids)
                ))
              )
         )
         AND EXISTS (
           SELECT 1 FROM public.business_service_areas bsa
            WHERE bsa.business_id = b.id
              AND bsa.city_id = v_quote.city_id
              AND (
                cardinality(bsa.district_ids) = 0
                OR v_quote.district_id IS NULL
                OR v_quote.district_id = ANY(bsa.district_ids)
              )
         );
    END IF;

    IF array_length(v_candidates, 1) IS NULL AND v_tax_id IS NOT NULL THEN
      v_match_source := 'city_fallback';
      SELECT COALESCE(array_agg(DISTINCT b.id), ARRAY[]::uuid[])
        INTO v_candidates
        FROM public.businesses b
       WHERE b.is_active = true
         AND b.approval_status IN ('approved','published')
         AND b.city_id = v_quote.city_id
         AND EXISTS (
           SELECT 1 FROM public.business_taxonomy_categories btc
            WHERE btc.business_id = b.id
              AND (
                (btc.role = 'primary_activity'   AND btc.category_id = v_tax_id) OR
                (btc.role = 'secondary_activity' AND (
                   btc.category_id = v_tax_id
                   OR btc.category_id = ANY(v_child_ids)
                ))
              )
         );
    END IF;
  END IF;

  IF array_length(v_candidates, 1) IS NOT NULL THEN
    WITH scored AS (
      SELECT
        b.id AS provider_id,
        b.user_id AS provider_user_id,
        -- Base coverage score preserved verbatim …
        (CASE WHEN v_match_source = 'coverage' THEN 80 ELSE 40 END)
          -- … plus a tier bonus resolved via the shared plan-limits helper.
          -- search_priority defaults to 0 → free providers get +0 (still matched).
          + COALESCE(
              (public._resolve_active_plan_limits(NULL, b.id) ->> 'search_priority')::int,
              0
            ) * 5
          AS score,
        COALESCE(
          (public._resolve_active_plan_limits(NULL, b.id) ->> 'search_priority')::int,
          0
        ) AS tier_bonus_raw
      FROM public.businesses b
      WHERE b.id = ANY(v_candidates)
    ),
    ins AS (
      INSERT INTO public.quote_request_leads
        (quote_request_id, provider_id, provider_user_id,
         match_score, match_reasons, status)
      SELECT
        p_quote_id, s.provider_id, s.provider_user_id,
        s.score,
        jsonb_build_array(
          CASE WHEN v_match_source = 'coverage'
               THEN 'ضمن مناطق الخدمة'
               ELSE 'نفس المدينة (احتياطي)' END
        ) || CASE
               WHEN s.tier_bonus_raw > 0
               THEN jsonb_build_array('أولوية باقة (+' || (s.tier_bonus_raw * 5)::text || ')')
               ELSE '[]'::jsonb
             END,
        'new'
      FROM scored s
      ON CONFLICT (quote_request_id, provider_id) DO NOTHING
      RETURNING id, provider_id, provider_user_id, match_score, match_reasons
    )
    SELECT count(*) INTO v_inserted FROM ins;
  END IF;

  IF v_inserted > 0 THEN
    v_sector_ar := COALESCE(v_quote.sector, '');

    INSERT INTO public.quote_request_lead_events
      (lead_id, quote_request_id, event_type, metadata)
    SELECT
      l.id, p_quote_id, 'lead_created',
      jsonb_build_object(
        'match_source', v_match_source,
        'match_score', l.match_score,
        'match_reasons', l.match_reasons,
        'provider_id', l.provider_id,
        'created_by', 'match_quote_to_providers_rpc'
      )
    FROM public.quote_request_leads l
    WHERE l.quote_request_id = p_quote_id
      AND l.created_at > now() - interval '1 minute';

    INSERT INTO public.notifications
      (user_id, notification_type, title_ar, title_en,
       body_ar, body_en, reference_id, reference_type, action_url)
    SELECT
      l.provider_user_id,
      'quote_lead_assigned',
      'فرصة عرض سعر جديدة',
      'New quote opportunity',
      'لديك طلب جديد في قطاع ' || v_sector_ar ||
        CASE WHEN v_quote.city IS NOT NULL AND length(v_quote.city) > 0
             THEN ' بمدينة ' || v_quote.city ELSE '' END || '.',
      'You have a new quote lead.',
      l.id, 'quote_request_lead',
      '/dashboard/provider/leads/' || l.id::text
    FROM public.quote_request_leads l
    WHERE l.quote_request_id = p_quote_id
      AND l.provider_user_id IS NOT NULL
      AND l.created_at > now() - interval '1 minute';

    UPDATE public.quote_requests
       SET status = 'matched',
           metadata = COALESCE(metadata, '{}'::jsonb)
             || jsonb_build_object(
               'match_source', v_match_source,
               'last_matched_at', to_jsonb(now())
             )
     WHERE id = p_quote_id
       AND status IN ('new','under_review');

    INSERT INTO public.quote_request_events
      (quote_request_id, event_type, metadata)
    VALUES (
      p_quote_id, 'quote_matched',
      jsonb_build_object(
        'matched_count', v_inserted,
        'match_source', v_match_source
      )
    );
  ELSE
    INSERT INTO public.quote_request_events
      (quote_request_id, event_type, metadata)
    VALUES (
      p_quote_id,
      CASE WHEN v_match_source = 'manual_routing'
           THEN 'quote.manual_routing'
           ELSE 'quote.no_coverage' END,
      jsonb_build_object(
        'match_source', v_match_source,
        'city_id', v_quote.city_id,
        'district_id', v_quote.district_id,
        'taxonomy_category_id', v_tax_id
      )
    );

    FOR v_admin IN
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO public.notifications
        (user_id, notification_type, title_ar, title_en,
         body_ar, body_en, reference_id, reference_type, action_url)
      VALUES (
        v_admin.user_id,
        'quote_needs_manual_routing',
        'طلب بدون تغطية — يحتاج توجيهاً يدوياً',
        'Quote needs manual routing',
        'طلب #' || COALESCE(v_quote.ref_id, p_quote_id::text)
          || ' بدون مزود مطابق للتغطية — يرجى المراجعة.',
        'Quote #' || COALESCE(v_quote.ref_id, p_quote_id::text)
          || ' has no matching provider — please review.',
        p_quote_id, 'quote_request',
        '/admin/quote-requests/' || COALESCE(v_quote.ref_id, p_quote_id::text)
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'matched_count', v_inserted,
    'match_source', v_match_source,
    'candidates_evaluated', COALESCE(array_length(v_candidates, 1), 0),
    'taxonomy_category_id', v_tax_id,
    'city_id', v_quote.city_id,
    'district_id', v_quote.district_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.match_quote_to_providers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_quote_to_providers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_quote_to_providers(uuid) TO service_role;

COMMENT ON FUNCTION public.match_quote_to_providers(uuid) IS
  'M4.1: coverage/city_fallback base score (80/40) + search_priority*5 tier bonus. Candidate inclusion unchanged.';


-- M4.3 — Server-verified analytics gate
CREATE OR REPLACE FUNCTION public.assert_provider_analytics_access(
  _business_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ok  boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  -- Admins are never gated.
  IF public.has_role(v_uid, 'admin') THEN
    RETURN true;
  END IF;
  v_ok := public.has_membership_feature(v_uid, 'analytics_enabled', _business_id);
  RETURN COALESCE(v_ok, false);
END;
$$;

REVOKE ALL ON FUNCTION public.assert_provider_analytics_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_provider_analytics_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_provider_analytics_access(uuid) TO service_role;

COMMENT ON FUNCTION public.assert_provider_analytics_access(uuid) IS
  'M4.3: server-verified boolean gate for provider analytics. Admins always true; otherwise checks has_membership_feature(analytics_enabled).';
