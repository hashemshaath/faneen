-- Phase 6C.2 — Admin Contract Analytics RPC
-- Aggregate-only, admin-gated. No PII, no raw rows.

-- Supporting indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_contracts_business_status
  ON public.contracts (business_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at
  ON public.contracts (created_at);

CREATE OR REPLACE FUNCTION public.get_admin_contract_analytics_dashboard(
  _period text DEFAULT '30d',
  _business_id uuid DEFAULT NULL,
  _include_demo boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_to timestamptz := now();
  v_from timestamptz;
  v_period_key text := COALESCE(_period, '30d');
  v_trend_months int;
  v_summary jsonb;
  v_value_by_currency jsonb;
  v_active_value_by_currency jsonb;
  v_monthly_trend jsonb;
  v_leaderboard_count jsonb;
  v_leaderboard_value jsonb;
  v_lead_conv jsonb;
  v_templates jsonb;
  v_pricing jsonb;
  v_sites jsonb;
  v_pdf jsonb;
  v_amendments jsonb;
  v_risk jsonb;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ADMIN_CONTRACT_ANALYTICS:UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_admin_access(v_uid) THEN
    RAISE EXCEPTION 'ADMIN_CONTRACT_ANALYTICS:FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Period (default 30d on invalid input for UI resilience)
  IF v_period_key NOT IN ('7d','30d','90d','12m','all') THEN
    v_period_key := '30d';
  END IF;
  v_from := CASE v_period_key
    WHEN '7d'  THEN v_to - INTERVAL '7 days'
    WHEN '30d' THEN v_to - INTERVAL '30 days'
    WHEN '90d' THEN v_to - INTERVAL '90 days'
    WHEN '12m' THEN v_to - INTERVAL '12 months'
    WHEN 'all' THEN NULL
    ELSE v_to - INTERVAL '30 days'
  END;
  v_trend_months := CASE v_period_key
    WHEN '7d'  THEN 1
    WHEN '30d' THEN 2
    WHEN '90d' THEN 4
    WHEN '12m' THEN 12
    WHEN 'all' THEN 24
    ELSE 2
  END;

  -- Scoped contract universe (CTE-style via temp table for reuse)
  CREATE TEMP TABLE IF NOT EXISTS _adm_c (
    id uuid, business_id uuid, provider_id uuid, status text,
    currency_code text, total_amount numeric,
    created_at timestamptz, completed_at timestamptz,
    pricing_method text, template_version_id uuid,
    execution_site_id uuid, has_addr_snapshot boolean,
    city_name text
  ) ON COMMIT DROP;
  TRUNCATE _adm_c;

  INSERT INTO _adm_c
  SELECT c.id, c.business_id, c.provider_id, c.status::text,
         c.currency_code::text, c.total_amount,
         c.created_at, c.completed_at,
         c.pricing_method, c.template_version_id,
         c.execution_site_id,
         (c.execution_address_snapshot IS NOT NULL),
         NULLIF(c.execution_address_snapshot->>'city_name','')
  FROM public.contracts c
  WHERE (_include_demo OR c.is_demo = false)
    AND (_business_id IS NULL OR c.business_id = _business_id);

  -- Summary
  WITH per AS (
    SELECT * FROM _adm_c
    WHERE (v_from IS NULL OR created_at >= v_from)
      AND created_at <= v_to
  )
  SELECT jsonb_build_object(
    'contracts_total', (SELECT count(*) FROM _adm_c),
    'by_status', jsonb_build_object(
      'draft',            (SELECT count(*) FROM _adm_c WHERE status='draft'),
      'pending_approval', (SELECT count(*) FROM _adm_c WHERE status='pending_approval'),
      'active',           (SELECT count(*) FROM _adm_c WHERE status='active'),
      'completed',        (SELECT count(*) FROM _adm_c WHERE status='completed'),
      'cancelled',        (SELECT count(*) FROM _adm_c WHERE status='cancelled'),
      'disputed',         (SELECT count(*) FROM _adm_c WHERE status='disputed')
    ),
    'created_this_period', (SELECT count(*) FROM per),
    'completed_this_period', (
      SELECT count(*) FROM _adm_c
      WHERE completed_at IS NOT NULL
        AND (v_from IS NULL OR completed_at >= v_from)
        AND completed_at <= v_to
    ),
    'providers_active', (
      SELECT count(DISTINCT provider_id) FROM _adm_c WHERE provider_id IS NOT NULL
    ),
    'businesses_with_contracts', (
      SELECT count(DISTINCT business_id) FROM _adm_c WHERE business_id IS NOT NULL
    )
  ) INTO v_summary;

  -- Value by currency (lifetime within scope)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'currency_code', currency_code, 'total', total
  ) ORDER BY currency_code), '[]'::jsonb)
  INTO v_value_by_currency
  FROM (
    SELECT currency_code, COALESCE(SUM(total_amount),0)::numeric AS total
    FROM _adm_c GROUP BY currency_code
  ) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'currency_code', currency_code, 'total', total
  ) ORDER BY currency_code), '[]'::jsonb)
  INTO v_active_value_by_currency
  FROM (
    SELECT currency_code, COALESCE(SUM(total_amount),0)::numeric AS total
    FROM _adm_c WHERE status='active' GROUP BY currency_code
  ) t;

  -- Monthly trend (cap 24 months)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'month', to_char(m, 'YYYY-MM'),
    'created', created_cnt,
    'completed', completed_cnt
  ) ORDER BY m), '[]'::jsonb)
  INTO v_monthly_trend
  FROM (
    SELECT m,
      (SELECT count(*) FROM _adm_c WHERE date_trunc('month', created_at) = m) AS created_cnt,
      (SELECT count(*) FROM _adm_c WHERE completed_at IS NOT NULL
        AND date_trunc('month', completed_at) = m) AS completed_cnt
    FROM generate_series(
      date_trunc('month', v_to) - ((LEAST(v_trend_months, 24) - 1) || ' months')::interval,
      date_trunc('month', v_to),
      INTERVAL '1 month'
    ) AS m
  ) s;

  -- Leaderboard by count (top 20)
  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
  INTO v_leaderboard_count
  FROM (
    SELECT jsonb_build_object(
      'business_id', c.business_id,
      'business_name', COALESCE(b.name_en, b.name_ar, ''),
      'contracts', count(*)
    ) AS row
    FROM _adm_c c
    LEFT JOIN public.businesses b ON b.id = c.business_id
    WHERE c.business_id IS NOT NULL
    GROUP BY c.business_id, b.name_en, b.name_ar
    ORDER BY count(*) DESC
    LIMIT 20
  ) t;

  -- Leaderboard by value (top 20 by sum across currencies for ordering only;
  -- payload still emits per-currency breakdown)
  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
  INTO v_leaderboard_value
  FROM (
    SELECT jsonb_build_object(
      'business_id', x.business_id,
      'business_name', COALESCE(b.name_en, b.name_ar, ''),
      'value_by_currency', x.value_by_currency
    ) AS row, x.ord
    FROM (
      SELECT business_id,
             SUM(total_amount) AS ord,
             jsonb_agg(jsonb_build_object('currency_code', currency_code, 'total', total)
                       ORDER BY currency_code) AS value_by_currency
      FROM (
        SELECT business_id, currency_code, COALESCE(SUM(total_amount),0)::numeric AS total
        FROM _adm_c
        WHERE business_id IS NOT NULL
        GROUP BY business_id, currency_code
      ) g
      GROUP BY business_id
    ) x
    LEFT JOIN public.businesses b ON b.id = x.business_id
    ORDER BY x.ord DESC NULLS LAST
    LIMIT 20
  ) t;

  -- Lead conversion by business (top 20 by leads)
  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
  INTO v_lead_conv
  FROM (
    SELECT jsonb_build_object(
      'business_id', lr.business_id,
      'business_name', COALESCE(b.name_en, b.name_ar, ''),
      'leads', count(*),
      'contracts_from_leads', count(*) FILTER (WHERE lr.converted_contract_id IS NOT NULL),
      'rate', CASE WHEN count(*)>0
        THEN ROUND((count(*) FILTER (WHERE lr.converted_contract_id IS NOT NULL))::numeric * 100.0 / count(*)::numeric, 2)
        ELSE 0 END
    ) AS row,
    count(*) AS ord
    FROM public.lead_requests lr
    LEFT JOIN public.businesses b ON b.id = lr.business_id
    WHERE (_include_demo OR lr.is_demo = false)
      AND (_business_id IS NULL OR lr.business_id = _business_id)
      AND lr.business_id IS NOT NULL
      AND (v_from IS NULL OR lr.created_at >= v_from)
      AND lr.created_at <= v_to
    GROUP BY lr.business_id, b.name_en, b.name_ar
    ORDER BY count(*) DESC
    LIMIT 20
  ) t;

  -- Template adoption
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'template_id', template_id,
    'template_name', template_name,
    'count', cnt
  ) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_templates
  FROM (
    SELECT t.id AS template_id,
           COALESCE(t.name_en, t.name_ar, '') AS template_name,
           count(*) AS cnt
    FROM _adm_c c
    JOIN public.contract_template_versions ctv ON ctv.id = c.template_version_id
    JOIN public.contract_templates t ON t.id = ctv.template_id
    WHERE c.template_version_id IS NOT NULL
    GROUP BY t.id, t.name_en, t.name_ar
    ORDER BY count(*) DESC
    LIMIT 20
  ) s;

  -- Pricing method distribution
  SELECT COALESCE(jsonb_agg(jsonb_build_object('method', method, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_pricing
  FROM (
    SELECT COALESCE(pricing_method,'unspecified') AS method, count(*) AS cnt
    FROM _adm_c GROUP BY 1
  ) s;

  -- Execution site coverage
  SELECT jsonb_build_object(
    'with_sites', (SELECT count(*) FROM _adm_c WHERE execution_site_id IS NOT NULL OR has_addr_snapshot),
    'without_sites', (SELECT count(*) FROM _adm_c WHERE execution_site_id IS NULL AND NOT has_addr_snapshot),
    'top_cities', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('city_name', city_name, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT city_name, count(*) AS cnt
        FROM _adm_c
        WHERE city_name IS NOT NULL
        GROUP BY city_name
        ORDER BY count(*) DESC
        LIMIT 20
      ) s
    ), '[]'::jsonb)
  ) INTO v_sites;

  -- PDF exports (period-scoped count, lifetime last_exported_at)
  SELECT jsonb_build_object(
    'exports_count', (
      SELECT count(*) FROM public.contract_pdf_exports e
      JOIN _adm_c c ON c.id = e.contract_id
      WHERE e.archived_at IS NULL
        AND (v_from IS NULL OR e.exported_at >= v_from)
        AND e.exported_at <= v_to
    ),
    'last_exported_at', (
      SELECT MAX(e.exported_at) FROM public.contract_pdf_exports e
      JOIN _adm_c c ON c.id = e.contract_id
      WHERE e.archived_at IS NULL
    )
  ) INTO v_pdf;

  -- Amendments (use contract_amendments.status as event)
  SELECT jsonb_build_object(
    'total', (
      SELECT count(*) FROM public.contract_amendments a
      JOIN _adm_c c ON c.id = a.contract_id
      WHERE (v_from IS NULL OR a.created_at >= v_from)
        AND a.created_at <= v_to
    ),
    'by_event', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('event', evt, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT COALESCE(a.status,'unknown') AS evt, count(*) AS cnt
        FROM public.contract_amendments a
        JOIN _adm_c c ON c.id = a.contract_id
        WHERE (v_from IS NULL OR a.created_at >= v_from)
          AND a.created_at <= v_to
        GROUP BY 1
      ) s
    ), '[]'::jsonb)
  ) INTO v_amendments;

  -- Risk indicators
  WITH drafts_missing_sites AS (
    SELECT business_id FROM _adm_c
    WHERE status='draft' AND execution_site_id IS NULL AND NOT has_addr_snapshot
  )
  SELECT jsonb_build_object(
    'drafts_missing_sites', (SELECT count(*) FROM drafts_missing_sites),
    'drafts_missing_pricing', (
      SELECT count(*) FROM _adm_c c
      WHERE c.status='draft'
        AND COALESCE(c.total_amount,0) = 0
        AND NOT EXISTS (SELECT 1 FROM public.contract_line_items li WHERE li.contract_id = c.id)
    ),
    'active_without_recent_pdf', (
      -- active contracts with no PDF export in last 90 days
      SELECT count(*) FROM _adm_c c
      WHERE c.status='active'
        AND NOT EXISTS (
          SELECT 1 FROM public.contract_pdf_exports e
          WHERE e.contract_id = c.id
            AND e.archived_at IS NULL
            AND e.exported_at >= v_to - INTERVAL '90 days'
        )
    ),
    'businesses_with_missing_sites', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'business_id', s.business_id,
        'business_name', COALESCE(b.name_en, b.name_ar, ''),
        'drafts_missing_sites', s.cnt
      ) ORDER BY s.cnt DESC)
      FROM (
        SELECT business_id, count(*) AS cnt
        FROM drafts_missing_sites
        WHERE business_id IS NOT NULL
        GROUP BY business_id
        ORDER BY count(*) DESC
        LIMIT 20
      ) s
      LEFT JOIN public.businesses b ON b.id = s.business_id
    ), '[]'::jsonb)
  ) INTO v_risk;

  RETURN jsonb_build_object(
    'generated_at', v_to,
    'period', jsonb_build_object('key', v_period_key, 'from', v_from, 'to', v_to),
    'scope', jsonb_build_object('business_id', _business_id, 'include_demo', _include_demo),
    'notes', jsonb_build_object(
      'currency_handling', 'grouped by currency_code; never summed across currencies',
      'demo_excluded', NOT _include_demo,
      'archived_pdf_excluded', true,
      'leaderboards_capped', 20,
      'active_without_recent_pdf_threshold_days', 90
    ),
    'summary', v_summary,
    'value_by_currency', v_value_by_currency,
    'active_value_by_currency', v_active_value_by_currency,
    'monthly_trend', v_monthly_trend,
    'leaderboard_by_count', v_leaderboard_count,
    'leaderboard_by_value', v_leaderboard_value,
    'lead_conversion_by_business', v_lead_conv,
    'template_adoption', v_templates,
    'pricing_method_distribution', v_pricing,
    'execution_site_coverage', v_sites,
    'pdf_exports', v_pdf,
    'amendments', v_amendments,
    'risk_indicators', v_risk
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_contract_analytics_dashboard(text, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_contract_analytics_dashboard(text, uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_contract_analytics_dashboard(text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_contract_analytics_dashboard(text, uuid, boolean) TO service_role;

COMMENT ON FUNCTION public.get_admin_contract_analytics_dashboard(text, uuid, boolean) IS
'Admin-only contract analytics. Aggregate-only payload. Excludes demo data and archived PDF exports by default. No PII (client/supervisor/email/phone/address) ever returned.';