
-- =========================================================================
-- Admin Client Sites Monitoring — privacy-minimized read-only RPCs
-- =========================================================================
-- These RPCs power the new /admin/client-sites monitoring page.
-- They are SECURITY DEFINER + admin-gated, but DO NOT expose:
--   qr_token_hash, raw token, contact_phone, contact_name, map_url,
--   latitude/longitude, access_notes, owner email/phone, attachments,
--   signed URLs, internal notes, raw site UUID is included only as
--   admin-action handle (admins already see UUIDs across the system).
-- =========================================================================

-- 1) Monitoring list (paginated, filtered)
CREATE OR REPLACE FUNCTION public.admin_list_client_sites_monitoring(
  _status     text    DEFAULT 'active',      -- 'active' | 'archived' | 'all'
  _city       text    DEFAULT NULL,
  _visibility text    DEFAULT NULL,
  _qr_status  text    DEFAULT NULL,          -- 'enabled' | 'disabled' | 'revoked'
  _search     text    DEFAULT NULL,          -- site_ref / name partial match
  _site_type  text    DEFAULT NULL,
  _limit      integer DEFAULT 50,
  _offset     integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_rows  jsonb;
BEGIN
  -- Admin guard
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  WITH filtered AS (
    SELECT
      cs.id,
      cs.site_ref,
      cs.site_name,
      cs.label,
      cs.site_type,
      cs.city_name,
      cs.visibility,
      cs.qr_enabled,
      cs.qr_revoked_at,
      cs.archived_at,
      cs.scan_count,
      cs.last_scanned_at,
      cs.created_at,
      cs.updated_at,
      cs.business_id,
      b.name_ar  AS business_name_ar,
      b.name_en  AS business_name_en,
      (SELECT count(*) FROM public.client_site_access_grants g
         WHERE g.site_id = cs.id)                             AS access_requests_count,
      (SELECT count(*) FROM public.client_site_access_grants g
         WHERE g.site_id = cs.id AND g.status = 'requested')  AS pending_requests_count,
      (SELECT count(*) FROM public.client_site_access_grants g
         WHERE g.site_id = cs.id AND g.status = 'approved')   AS approved_access_count,
      (SELECT count(*) FROM public.lead_requests lr
         WHERE lr.source_site_id = cs.id AND lr.initiated_by = 'provider') AS provider_interests_count,
      (SELECT count(*) FROM public.contracts c
         WHERE c.execution_site_id = cs.id)                   AS contracts_count,
      GREATEST(
        cs.updated_at,
        COALESCE(cs.last_scanned_at, cs.created_at),
        COALESCE((SELECT max(g.updated_at) FROM public.client_site_access_grants g WHERE g.site_id = cs.id), cs.created_at),
        COALESCE((SELECT max(lr.created_at) FROM public.lead_requests lr WHERE lr.source_site_id = cs.id), cs.created_at)
      ) AS latest_activity_at
    FROM public.client_sites cs
    LEFT JOIN public.businesses b ON b.id = cs.business_id
    WHERE
      (_status = 'all'
        OR (_status = 'archived' AND cs.archived_at IS NOT NULL)
        OR (_status = 'active'   AND cs.archived_at IS NULL))
      AND (_city IS NULL OR cs.city_name ILIKE '%' || _city || '%')
      AND (_visibility IS NULL OR cs.visibility = _visibility)
      AND (_site_type IS NULL OR cs.site_type = _site_type)
      AND (
        _qr_status IS NULL
        OR (_qr_status = 'enabled'  AND cs.qr_enabled = true  AND cs.qr_revoked_at IS NULL)
        OR (_qr_status = 'disabled' AND cs.qr_enabled = false AND cs.qr_revoked_at IS NULL)
        OR (_qr_status = 'revoked'  AND cs.qr_revoked_at IS NOT NULL)
      )
      AND (
        _search IS NULL OR _search = ''
        OR cs.site_ref ILIKE '%' || _search || '%'
        OR COALESCE(cs.site_name, '') ILIKE '%' || _search || '%'
        OR cs.label ILIKE '%' || _search || '%'
      )
  )
  SELECT
    (SELECT count(*) FROM filtered),
    COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.latest_activity_at DESC), '[]'::jsonb)
  INTO v_total, v_rows
  FROM (SELECT * FROM filtered ORDER BY latest_activity_at DESC
        LIMIT GREATEST(_limit, 0) OFFSET GREATEST(_offset, 0)) f;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', _limit,
    'offset', _offset,
    'rows', v_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_client_sites_monitoring(text,text,text,text,text,text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_client_sites_monitoring(text,text,text,text,text,text,integer,integer) TO authenticated;


-- 2) Aggregate KPIs
CREATE OR REPLACE FUNCTION public.admin_client_sites_monitoring_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total_sites',                  (SELECT count(*) FROM client_sites),
    'active_sites',                 (SELECT count(*) FROM client_sites WHERE archived_at IS NULL),
    'archived_sites',               (SELECT count(*) FROM client_sites WHERE archived_at IS NOT NULL),
    'qr_enabled_sites',             (SELECT count(*) FROM client_sites WHERE qr_enabled = true AND qr_revoked_at IS NULL),
    'qr_revoked_sites',             (SELECT count(*) FROM client_sites WHERE qr_revoked_at IS NOT NULL),
    'qr_disabled_sites',            (SELECT count(*) FROM client_sites WHERE qr_enabled = false AND qr_revoked_at IS NULL),
    'shared_by_qr_sites',           (SELECT count(*) FROM client_sites WHERE visibility = 'shared_by_qr'),
    'public_limited_sites',         (SELECT count(*) FROM client_sites WHERE visibility = 'public_limited'),
    'total_scans',                  (SELECT COALESCE(sum(scan_count),0) FROM client_sites),
    'sites_with_access_requests',   (SELECT count(DISTINCT site_id) FROM client_site_access_grants),
    'pending_access_requests',      (SELECT count(*) FROM client_site_access_grants WHERE status = 'requested'),
    'approved_access_grants',       (SELECT count(*) FROM client_site_access_grants WHERE status = 'approved'),
    'rejected_access_grants',       (SELECT count(*) FROM client_site_access_grants WHERE status = 'rejected'),
    'revoked_access_grants',        (SELECT count(*) FROM client_site_access_grants WHERE status = 'revoked'),
    'provider_interests',           (SELECT count(*) FROM lead_requests WHERE source_site_id IS NOT NULL AND initiated_by = 'provider'),
    'sites_linked_to_contracts',    (SELECT count(DISTINCT execution_site_id) FROM contracts WHERE execution_site_id IS NOT NULL),
    'total_contracts_with_site',    (SELECT count(*) FROM contracts WHERE execution_site_id IS NOT NULL),
    'visits_last_7d',               (SELECT count(*) FROM client_site_visit_logs WHERE created_at >= now() - interval '7 days')
  ) INTO r;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_client_sites_monitoring_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_client_sites_monitoring_summary() TO authenticated;


-- 3) Site detail (default-safe; sensitive fields excluded)
CREATE OR REPLACE FUNCTION public.admin_get_client_site_monitoring_detail(_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'site', (
      SELECT to_jsonb(x) FROM (
        SELECT
          cs.id, cs.site_ref, cs.site_name, cs.label, cs.site_type,
          cs.city_name, cs.district, cs.visibility,
          cs.qr_enabled, (cs.qr_revoked_at IS NOT NULL) AS qr_revoked,
          cs.qr_revoked_at, cs.scan_count, cs.last_scanned_at,
          cs.archived_at, cs.created_at, cs.updated_at,
          cs.business_id, b.name_ar AS business_name_ar, b.name_en AS business_name_en
        FROM client_sites cs
        LEFT JOIN businesses b ON b.id = cs.business_id
        WHERE cs.id = _site_id
      ) x
    ),
    'recent_visits', (
      SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v.created_at DESC), '[]'::jsonb) FROM (
        SELECT vl.created_at, vl.visit_source, vl.action, vl.attempted_section,
               vl.provider_business_id,
               pb.name_ar AS provider_name_ar, pb.name_en AS provider_name_en
        FROM client_site_visit_logs vl
        LEFT JOIN businesses pb ON pb.id = vl.provider_business_id
        WHERE vl.site_id = _site_id
        ORDER BY vl.created_at DESC
        LIMIT 30
      ) v
    ),
    'recent_grants', (
      SELECT COALESCE(jsonb_agg(to_jsonb(g) ORDER BY g.requested_at DESC), '[]'::jsonb) FROM (
        SELECT g.id, g.status, g.access_level, g.requested_at, g.approved_at,
               g.rejected_at, g.revoked_at, g.ignored_at, g.reason,
               g.provider_business_id,
               pb.name_ar AS provider_name_ar, pb.name_en AS provider_name_en
        FROM client_site_access_grants g
        LEFT JOIN businesses pb ON pb.id = g.provider_business_id
        WHERE g.site_id = _site_id
        ORDER BY g.requested_at DESC
        LIMIT 30
      ) g
    ),
    'recent_interests', (
      SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC), '[]'::jsonb) FROM (
        SELECT lr.id, lr.ref_id AS lead_ref_id, lr.subject, lr.status, lr.created_at,
               lr.initiated_by, (lr.converted_contract_id IS NOT NULL) AS converted,
               lr.business_id, b.name_ar AS provider_name_ar, b.name_en AS provider_name_en
        FROM lead_requests lr
        LEFT JOIN businesses b ON b.id = lr.business_id
        WHERE lr.source_site_id = _site_id
        ORDER BY lr.created_at DESC
        LIMIT 30
      ) i
    ),
    'related_contracts', (
      SELECT jsonb_build_object(
        'total', count(*),
        'active', count(*) FILTER (WHERE status = 'active'),
        'last_created_at', max(created_at)
      )
      FROM contracts WHERE execution_site_id = _site_id
    )
  ) INTO r;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_client_site_monitoring_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_client_site_monitoring_detail(uuid) TO authenticated;
