
CREATE OR REPLACE FUNCTION public.get_contract_analytics_dashboard(
  _business_id uuid DEFAULT NULL,
  _period text DEFAULT '30d',
  _scope text DEFAULT 'provider'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_from timestamptz;
  v_to timestamptz := now();
  v_period_key text := COALESCE(_period, '30d');
  v_allowed_business_ids uuid[];
  v_contract_ids uuid[];
  v_result jsonb;
  v_summary jsonb;
  v_actions jsonb;
  v_lead jsonb;
  v_sites jsonb;
  v_templates jsonb;
  v_pricing jsonb;
  v_pdf jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_ANALYTICS:UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(_scope, 'provider') = 'admin' THEN
    RAISE EXCEPTION 'CONTRACT_ANALYTICS:ADMIN_SCOPE_NOT_IMPLEMENTED' USING ERRCODE = '0A000';
  END IF;

  IF COALESCE(_scope, 'provider') <> 'provider' THEN
    RAISE EXCEPTION 'CONTRACT_ANALYTICS:INVALID_SCOPE' USING ERRCODE = '22023';
  END IF;

  -- Period
  v_from := CASE v_period_key
    WHEN '7d'  THEN v_to - INTERVAL '7 days'
    WHEN '30d' THEN v_to - INTERVAL '30 days'
    WHEN '90d' THEN v_to - INTERVAL '90 days'
    WHEN 'all' THEN NULL
    ELSE v_to - INTERVAL '30 days'
  END;
  IF v_period_key NOT IN ('7d','30d','90d','all') THEN
    v_period_key := '30d';
  END IF;

  -- Authorization: resolve allowed businesses for caller
  IF _business_id IS NOT NULL THEN
    IF NOT public.is_business_owner_or_manager(v_uid, _business_id) THEN
      RAISE EXCEPTION 'CONTRACT_ANALYTICS:FORBIDDEN' USING ERRCODE = '42501';
    END IF;
    v_allowed_business_ids := ARRAY[_business_id];
  ELSE
    SELECT COALESCE(array_agg(DISTINCT b.id), ARRAY[]::uuid[])
    INTO v_allowed_business_ids
    FROM public.businesses b
    WHERE b.user_id = v_uid
       OR EXISTS (
         SELECT 1 FROM public.business_staff bs
         WHERE bs.business_id = b.id
           AND bs.user_id = v_uid
           AND bs.role IN ('owner','manager')
           AND bs.is_active = true
       );
  END IF;

  -- Resolve allowed contract ids (provider scope: own contracts OR contracts of allowed businesses), excluding demos
  SELECT COALESCE(array_agg(c.id), ARRAY[]::uuid[])
  INTO v_contract_ids
  FROM public.contracts c
  WHERE c.is_demo = false
    AND (
      c.provider_id = v_uid
      OR (c.business_id IS NOT NULL AND c.business_id = ANY(v_allowed_business_ids))
    )
    AND (_business_id IS NULL OR c.business_id = _business_id);

  -- If no business AND no contracts AND user has no business -> forbidden (client-only)
  IF _business_id IS NULL
     AND array_length(v_allowed_business_ids, 1) IS NULL
     AND array_length(v_contract_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_ANALYTICS:FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Summary
  WITH c AS (
    SELECT * FROM public.contracts WHERE id = ANY(v_contract_ids)
  ),
  totals AS (
    SELECT currency_code, COALESCE(SUM(total_amount),0)::numeric AS total
    FROM c GROUP BY currency_code
  ),
  actives AS (
    SELECT currency_code, COALESCE(SUM(total_amount),0)::numeric AS total
    FROM c WHERE status = 'active' GROUP BY currency_code
  ),
  avgs AS (
    SELECT currency_code, COALESCE(AVG(total_amount),0)::numeric AS amount
    FROM c GROUP BY currency_code
  )
  SELECT jsonb_build_object(
    'total_contracts', (SELECT count(*) FROM c),
    'draft', (SELECT count(*) FROM c WHERE status = 'draft'),
    'pending_approval', (SELECT count(*) FROM c WHERE status = 'pending_approval'),
    'active', (SELECT count(*) FROM c WHERE status = 'active'),
    'completed', (SELECT count(*) FROM c WHERE status = 'completed'),
    'cancelled', (SELECT count(*) FROM c WHERE status = 'cancelled'),
    'disputed', (SELECT count(*) FROM c WHERE status = 'disputed'),
    'created_this_period', (
      SELECT count(*) FROM c
      WHERE (v_from IS NULL OR created_at >= v_from) AND created_at <= v_to
    ),
    'completed_this_period', (
      SELECT count(*) FROM c
      WHERE completed_at IS NOT NULL
        AND (v_from IS NULL OR completed_at >= v_from)
        AND completed_at <= v_to
    ),
    'total_value_by_currency', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('currency', currency_code, 'amount', total) ORDER BY currency_code) FROM totals), '[]'::jsonb
    ),
    'active_value_by_currency', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('currency', currency_code, 'amount', total) ORDER BY currency_code) FROM actives), '[]'::jsonb
    ),
    'average_value_by_currency', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('currency', currency_code, 'amount', amount) ORDER BY currency_code) FROM avgs), '[]'::jsonb
    )
  ) INTO v_summary;

  -- Actions required
  SELECT jsonb_build_object(
    'drafts_missing_site', (
      SELECT count(*) FROM public.contracts c
      WHERE c.id = ANY(v_contract_ids)
        AND c.status = 'draft'
        AND c.execution_site_id IS NULL
        AND c.execution_address_snapshot IS NULL
    ),
    'drafts_missing_pricing', (
      SELECT count(*) FROM public.contracts c
      WHERE c.id = ANY(v_contract_ids)
        AND c.status = 'draft'
        AND COALESCE(c.total_amount, 0) = 0
        AND NOT EXISTS (SELECT 1 FROM public.contract_line_items li WHERE li.contract_id = c.id)
    ),
    'pending_client_approval', (
      SELECT count(*) FROM public.contracts c
      WHERE c.id = ANY(v_contract_ids)
        AND c.status = 'pending_approval'
        AND c.client_accepted_at IS NULL
    ),
    'pending_provider_approval', (
      SELECT count(*) FROM public.contracts c
      WHERE c.id = ANY(v_contract_ids)
        AND c.status = 'pending_approval'
        AND c.provider_accepted_at IS NULL
    )
  ) INTO v_actions;

  -- Lead conversion
  WITH leads AS (
    SELECT lr.*
    FROM public.lead_requests lr
    WHERE lr.is_demo = false
      AND lr.business_id = ANY(v_allowed_business_ids)
      AND (v_from IS NULL OR lr.created_at >= v_from)
      AND lr.created_at <= v_to
  ),
  conv AS (
    SELECT count(*) AS converted
    FROM leads l
    WHERE l.converted_contract_id IS NOT NULL
       OR EXISTS (
         SELECT 1 FROM public.contracts c2
         WHERE c2.source_lead_id = l.id AND c2.id = ANY(v_contract_ids)
       )
  ),
  elig AS (SELECT count(*) AS eligible FROM leads)
  SELECT jsonb_build_object(
    'eligible_leads', (SELECT eligible FROM elig),
    'converted_leads', (SELECT converted FROM conv),
    'conversion_rate', CASE
      WHEN (SELECT eligible FROM elig) > 0
      THEN ROUND(((SELECT converted FROM conv)::numeric * 100.0 / (SELECT eligible FROM elig)::numeric), 2)
      ELSE 0
    END
  ) INTO v_lead;

  -- Sites
  SELECT jsonb_build_object(
    'with_execution_site', (
      SELECT count(*) FROM public.contracts c
      WHERE c.id = ANY(v_contract_ids)
        AND (c.execution_site_id IS NOT NULL OR c.execution_address_snapshot IS NOT NULL)
    ),
    'missing_execution_site', (
      SELECT count(*) FROM public.contracts c
      WHERE c.id = ANY(v_contract_ids)
        AND c.execution_site_id IS NULL
        AND c.execution_address_snapshot IS NULL
    ),
    'top_cities', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('city', city, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT (c.execution_address_snapshot->>'city_name') AS city, count(*) AS cnt
        FROM public.contracts c
        WHERE c.id = ANY(v_contract_ids)
          AND c.execution_address_snapshot IS NOT NULL
          AND COALESCE(c.execution_address_snapshot->>'city_name','') <> ''
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 5
      ) t
    ), '[]'::jsonb)
  ) INTO v_sites;

  -- Templates by category (via contract_template_versions -> contract_templates.category)
  SELECT jsonb_build_object(
    'by_template_category', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('category', category, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT COALESCE(t.category, 'general') AS category, count(*) AS cnt
        FROM public.contracts c
        LEFT JOIN public.contract_template_versions ctv ON ctv.id = c.template_version_id
        LEFT JOIN public.contract_templates t ON t.id = ctv.template_id
        WHERE c.id = ANY(v_contract_ids)
          AND c.template_version_id IS NOT NULL
        GROUP BY 1
      ) t
    ), '[]'::jsonb)
  ) INTO v_templates;

  -- Pricing
  SELECT jsonb_build_object(
    'by_pricing_method', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('method', method, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT COALESCE(c.pricing_method, 'unspecified') AS method, count(*) AS cnt
        FROM public.contracts c
        WHERE c.id = ANY(v_contract_ids)
        GROUP BY 1
      ) t
    ), '[]'::jsonb),
    'boq_group_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('group', grp, 'count', cnt, 'total', total) ORDER BY cnt DESC)
      FROM (
        SELECT COALESCE(li.boq_group_key, 'ungrouped') AS grp,
               count(*) AS cnt,
               COALESCE(SUM(li.total_cost), 0)::numeric AS total
        FROM public.contract_line_items li
        WHERE li.contract_id = ANY(v_contract_ids)
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb)
  ) INTO v_pricing;

  -- PDF exports
  SELECT jsonb_build_object(
    'exports_count', (
      SELECT count(*) FROM public.contract_pdf_exports e
      WHERE e.contract_id = ANY(v_contract_ids)
        AND e.archived_at IS NULL
        AND (v_from IS NULL OR e.exported_at >= v_from)
        AND e.exported_at <= v_to
    ),
    'last_exported_at', (
      SELECT MAX(e.exported_at) FROM public.contract_pdf_exports e
      WHERE e.contract_id = ANY(v_contract_ids)
        AND e.archived_at IS NULL
    )
  ) INTO v_pdf;

  v_result := jsonb_build_object(
    'scope', 'provider',
    'business_id', _business_id,
    'period', jsonb_build_object(
      'key', v_period_key,
      'from', v_from,
      'to', v_to
    ),
    'notes', jsonb_build_object(
      'status_counts', 'lifetime within scope',
      'created_completed', 'period-scoped',
      'currency_handling', 'grouped by currency_code; never summed across currencies',
      'demo_excluded', true
    ),
    'summary', v_summary,
    'actions', v_actions,
    'lead_conversion', v_lead,
    'sites', v_sites,
    'templates', v_templates,
    'pricing', v_pricing,
    'pdf', v_pdf
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_contract_analytics_dashboard(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_contract_analytics_dashboard(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_contract_analytics_dashboard(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contract_analytics_dashboard(uuid, text, text) TO service_role;
