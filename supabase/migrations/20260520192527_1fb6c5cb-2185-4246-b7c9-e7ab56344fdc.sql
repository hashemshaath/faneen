
-- Phase 4: Admin Barcode Registry RPCs (read-only, admin-only)

-- =========================================================
-- helper: build safe entity label (no PII)
-- =========================================================
CREATE OR REPLACE FUNCTION public._barcode_entity_label(
  _entity_type text,
  _entity_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
  v_owner_label text;
  v_owner_business_label text;
BEGIN
  IF _entity_type = 'client_site' THEN
    SELECT
      COALESCE(NULLIF(cs.site_name, ''), cs.site_ref, _entity_id::text),
      COALESCE(NULLIF(p.full_name, ''), NULLIF(p.user_ref_id, ''), NULL),
      NULLIF(b.name, '')
    INTO v_label, v_owner_label, v_owner_business_label
    FROM public.client_sites cs
    LEFT JOIN public.profiles p ON p.id = cs.owner_user_id
    LEFT JOIN public.businesses b ON b.id = cs.business_id
    WHERE cs.id = _entity_id;
  ELSIF _entity_type = 'contract' THEN
    SELECT
      COALESCE(NULLIF(c.contract_number, ''), _entity_id::text),
      COALESCE(NULLIF(p.full_name, ''), NULLIF(p.user_ref_id, ''), NULL),
      NULLIF(b.name, '')
    INTO v_label, v_owner_label, v_owner_business_label
    FROM public.contracts c
    LEFT JOIN public.profiles p ON p.id = c.customer_user_id
    LEFT JOIN public.businesses b ON b.id = c.business_id
    WHERE c.id = _entity_id;
  ELSIF _entity_type = 'business' THEN
    SELECT NULLIF(b.name, ''), NULL, NULLIF(b.name, '')
    INTO v_label, v_owner_label, v_owner_business_label
    FROM public.businesses b
    WHERE b.id = _entity_id;
  ELSIF _entity_type = 'customer' THEN
    SELECT
      COALESCE(NULLIF(p.user_ref_id, ''), _entity_id::text),
      COALESCE(NULLIF(p.user_ref_id, ''), NULL),
      NULL
    INTO v_label, v_owner_label, v_owner_business_label
    FROM public.profiles p
    WHERE p.id = _entity_id;
  ELSE
    v_label := _entity_id::text;
  END IF;

  RETURN jsonb_build_object(
    'entity_label', v_label,
    'owner_label', v_owner_label,
    'owner_business_label', v_owner_business_label
  );
END;
$$;

-- =========================================================
-- admin_list_barcodes — paginated, filtered list
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_list_barcodes(
  _search text DEFAULT NULL,
  _entity_type text DEFAULT NULL,
  _status text DEFAULT NULL,
  _visibility text DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total bigint;
  v_rows jsonb;
  v_limit int := LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
  v_offset int := GREATEST(COALESCE(_offset, 0), 0);
  v_search text := NULLIF(TRIM(COALESCE(_search, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH base AS (
    SELECT br.*
    FROM public.barcode_registry br
    WHERE (_entity_type IS NULL OR br.entity_type = _entity_type)
      AND (_status IS NULL OR br.status = _status)
      AND (_visibility IS NULL OR br.visibility = _visibility)
      AND (v_search IS NULL OR br.barcode_code ILIKE '%' || v_search || '%')
  ),
  counted AS (
    SELECT COUNT(*) AS c FROM base
  ),
  paged AS (
    SELECT * FROM base
    ORDER BY created_at DESC
    LIMIT v_limit OFFSET v_offset
  ),
  enriched AS (
    SELECT
      p.id AS barcode_id,
      p.barcode_code,
      p.entity_type,
      p.entity_id,
      p.status,
      p.visibility,
      p.scan_count,
      p.last_scanned_at,
      p.created_at,
      (public._barcode_entity_label(p.entity_type, p.entity_id)) AS lbl,
      (SELECT COUNT(*) FROM public.barcode_entity_links bel WHERE bel.barcode_id = p.id) AS linked_entities_count,
      (SELECT COUNT(*) FROM public.barcode_events be WHERE be.barcode_id = p.id) AS events_count
    FROM paged p
  )
  SELECT
    (SELECT c FROM counted),
    COALESCE(jsonb_agg(jsonb_build_object(
      'barcode_id', e.barcode_id,
      'barcode_code', e.barcode_code,
      'entity_type', e.entity_type,
      'entity_id', e.entity_id,
      'entity_label', e.lbl->>'entity_label',
      'owner_label', e.lbl->>'owner_label',
      'owner_business_label', e.lbl->>'owner_business_label',
      'status', e.status,
      'visibility', e.visibility,
      'scan_count', e.scan_count,
      'last_scanned_at', e.last_scanned_at,
      'created_at', e.created_at,
      'linked_entities_count', e.linked_entities_count,
      'events_count', e.events_count
    )), '[]'::jsonb)
  INTO v_total, v_rows
  FROM enriched e;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'limit', v_limit,
    'offset', v_offset,
    'rows', v_rows
  );
END;
$$;

-- =========================================================
-- admin_barcode_registry_summary
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_barcode_registry_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH s AS (
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE status = 'active')::bigint AS active,
      COUNT(*) FILTER (WHERE status = 'frozen')::bigint AS frozen,
      COUNT(*) FILTER (WHERE status = 'archived')::bigint AS archived,
      COUNT(*) FILTER (WHERE status = 'revoked')::bigint AS revoked,
      COUNT(*) FILTER (WHERE status = 'transferred')::bigint AS transferred,
      COALESCE(SUM(scan_count), 0)::bigint AS total_scans
    FROM public.barcode_registry
  ),
  by_type AS (
    SELECT jsonb_object_agg(entity_type, c) AS j
    FROM (
      SELECT entity_type, COUNT(*) AS c
      FROM public.barcode_registry
      GROUP BY entity_type
    ) t
  ),
  by_vis AS (
    SELECT jsonb_object_agg(visibility, c) AS j
    FROM (
      SELECT visibility, COUNT(*) AS c
      FROM public.barcode_registry
      GROUP BY visibility
    ) t
  ),
  recent_scans AS (
    SELECT COUNT(*)::bigint AS c
    FROM public.barcode_events
    WHERE event_type = 'scanned'
      AND created_at >= now() - interval '7 days'
  ),
  top_scanned AS (
    SELECT jsonb_agg(jsonb_build_object(
      'barcode_code', barcode_code,
      'entity_type', entity_type,
      'scan_count', scan_count,
      'last_scanned_at', last_scanned_at
    ) ORDER BY scan_count DESC) AS j
    FROM (
      SELECT barcode_code, entity_type, scan_count, last_scanned_at
      FROM public.barcode_registry
      WHERE scan_count > 0
      ORDER BY scan_count DESC
      LIMIT 10
    ) t
  )
  SELECT jsonb_build_object(
    'total', s.total,
    'active', s.active,
    'frozen', s.frozen,
    'archived', s.archived,
    'revoked', s.revoked,
    'transferred', s.transferred,
    'total_scans', s.total_scans,
    'scanned_last_7d', (SELECT c FROM recent_scans),
    'by_entity_type', COALESCE((SELECT j FROM by_type), '{}'::jsonb),
    'by_visibility', COALESCE((SELECT j FROM by_vis), '{}'::jsonb),
    'top_scanned', COALESCE((SELECT j FROM top_scanned), '[]'::jsonb)
  )
  INTO v_result
  FROM s;

  RETURN v_result;
END;
$$;

-- =========================================================
-- admin_get_barcode_detail
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_get_barcode_detail(_barcode_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_br public.barcode_registry;
  v_lbl jsonb;
  v_events jsonb;
  v_links jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_br FROM public.barcode_registry WHERE id = _barcode_id;
  IF v_br.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  v_lbl := public._barcode_entity_label(v_br.entity_type, v_br.entity_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', be.id,
    'event_type', be.event_type,
    'actor_role', be.actor_role,
    'created_at', be.created_at,
    'metadata_safe', jsonb_build_object(
      'source', be.metadata->>'source',
      'reason', be.metadata->>'reason',
      'note', be.metadata->>'note'
    )
  ) ORDER BY be.created_at DESC), '[]'::jsonb)
  INTO v_events
  FROM (
    SELECT * FROM public.barcode_events
    WHERE barcode_id = _barcode_id
    ORDER BY created_at DESC
    LIMIT 50
  ) be;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', bel.id,
    'linked_entity_type', bel.linked_entity_type,
    'linked_entity_id', bel.linked_entity_id,
    'relationship_type', bel.relationship_type,
    'created_at', bel.created_at,
    'label', (public._barcode_entity_label(bel.linked_entity_type, bel.linked_entity_id))->>'entity_label'
  )), '[]'::jsonb)
  INTO v_links
  FROM public.barcode_entity_links bel
  WHERE bel.barcode_id = _barcode_id;

  RETURN jsonb_build_object(
    'barcode', jsonb_build_object(
      'barcode_id', v_br.id,
      'barcode_code', v_br.barcode_code,
      'entity_type', v_br.entity_type,
      'entity_id', v_br.entity_id,
      'entity_label', v_lbl->>'entity_label',
      'owner_label', v_lbl->>'owner_label',
      'owner_business_label', v_lbl->>'owner_business_label',
      'status', v_br.status,
      'visibility', v_br.visibility,
      'permanent_public_code', v_br.permanent_public_code,
      'scan_url_path', v_br.scan_url_path,
      'scan_count', v_br.scan_count,
      'last_scanned_at', v_br.last_scanned_at,
      'created_at', v_br.created_at,
      'updated_at', v_br.updated_at,
      'archived_at', v_br.archived_at,
      'frozen_at', v_br.frozen_at,
      'transferred_at', v_br.transferred_at,
      'source', v_br.source
    ),
    'events', v_events,
    'links', v_links,
    'counts', jsonb_build_object(
      'events_count', (SELECT COUNT(*) FROM public.barcode_events WHERE barcode_id = _barcode_id),
      'links_count', (SELECT COUNT(*) FROM public.barcode_entity_links WHERE barcode_id = _barcode_id)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_barcodes(text,text,text,text,int,int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_barcode_registry_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_barcode_detail(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._barcode_entity_label(text,uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_barcodes(text,text,text,text,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_barcode_registry_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_barcode_detail(uuid) TO authenticated;
