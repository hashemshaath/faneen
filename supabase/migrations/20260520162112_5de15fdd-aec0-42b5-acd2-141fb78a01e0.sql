
-- =========================================================================
-- Admin Client Sites Phase 2: sensitive reveal + ops notes + contact log
-- =========================================================================

-- 1) Admin audit table (append-only)
CREATE TABLE IF NOT EXISTS public.admin_client_site_access_audit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action        text NOT NULL,
  reason        text NOT NULL,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acsaa_action_chk CHECK (action IN (
    'sensitive_detail_revealed',
    'contact_action_started',
    'operations_note_added',
    'status_reviewed'
  )),
  CONSTRAINT acsaa_reason_min CHECK (length(btrim(reason)) >= 5)
);

CREATE INDEX IF NOT EXISTS acsaa_site_idx  ON public.admin_client_site_access_audit (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS acsaa_admin_idx ON public.admin_client_site_access_audit (admin_user_id, created_at DESC);

ALTER TABLE public.admin_client_site_access_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS acsaa_admin_select ON public.admin_client_site_access_audit;
CREATE POLICY acsaa_admin_select
  ON public.admin_client_site_access_audit
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- No INSERT/UPDATE/DELETE policies → writes only via SECURITY DEFINER RPCs.


-- 2) Admin operations notes
CREATE TABLE IF NOT EXISTS public.admin_client_site_operations_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  note          text NOT NULL,
  category      text NOT NULL DEFAULT 'general',
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz,
  CONSTRAINT acson_category_chk CHECK (category IN (
    'general','follow_up','data_quality','customer_contact',
    'provider_issue','security_review','conversion_opportunity'
  )),
  CONSTRAINT acson_note_nonempty CHECK (length(btrim(note)) > 0)
);

CREATE INDEX IF NOT EXISTS acson_site_idx ON public.admin_client_site_operations_notes (site_id, created_at DESC);

ALTER TABLE public.admin_client_site_operations_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS acson_admin_select ON public.admin_client_site_operations_notes;
CREATE POLICY acson_admin_select
  ON public.admin_client_site_operations_notes
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- All inserts/updates go through SECURITY DEFINER RPCs.


-- 3) Admin sensitive reveal RPC
CREATE OR REPLACE FUNCTION public.admin_get_client_site_sensitive_detail(
  _site_id uuid,
  _reason  text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_data jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin'::public.app_role)
       OR public.has_role(v_uid, 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '22023';
  END IF;

  SELECT to_jsonb(x) INTO v_data FROM (
    SELECT
      cs.id,
      cs.site_ref,
      cs.site_name,
      cs.label,
      cs.site_type,
      cs.city_name,
      cs.district,
      cs.address_line1,
      cs.address_line2,
      cs.contact_name,
      cs.contact_phone,
      cs.map_url,
      cs.latitude,
      cs.longitude,
      cs.access_notes,
      cs.owner_user_id,
      cs.client_user_id,
      cs.business_id,
      b.name_ar AS business_name_ar,
      b.name_en AS business_name_en
    FROM client_sites cs
    LEFT JOIN businesses b ON b.id = cs.business_id
    WHERE cs.id = _site_id
  ) x;

  IF v_data IS NULL THEN
    RAISE EXCEPTION 'site_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.admin_client_site_access_audit (site_id, admin_user_id, action, reason, metadata)
  VALUES (_site_id, v_uid, 'sensitive_detail_revealed', btrim(_reason), NULL);

  RETURN v_data;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_client_site_sensitive_detail(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_client_site_sensitive_detail(uuid, text) TO authenticated;


-- 4) Add operations note
CREATE OR REPLACE FUNCTION public.admin_add_client_site_operations_note(
  _site_id  uuid,
  _category text,
  _note     text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_cat text := COALESCE(_category, 'general');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin'::public.app_role)
       OR public.has_role(v_uid, 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;
  IF _note IS NULL OR length(btrim(_note)) = 0 THEN
    RAISE EXCEPTION 'note_required' USING ERRCODE = '22023';
  END IF;
  IF v_cat NOT IN ('general','follow_up','data_quality','customer_contact',
                   'provider_issue','security_review','conversion_opportunity') THEN
    RAISE EXCEPTION 'invalid_category' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM client_sites WHERE id = _site_id) THEN
    RAISE EXCEPTION 'site_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.admin_client_site_operations_notes (site_id, admin_user_id, note, category)
  VALUES (_site_id, v_uid, btrim(_note), v_cat)
  RETURNING id INTO v_id;

  INSERT INTO public.admin_client_site_access_audit (site_id, admin_user_id, action, reason, metadata)
  VALUES (_site_id, v_uid, 'operations_note_added',
          'note_added:' || v_cat,
          jsonb_build_object('note_id', v_id, 'category', v_cat));

  RETURN jsonb_build_object('id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_add_client_site_operations_note(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_client_site_operations_note(uuid, text, text) TO authenticated;


-- 5) List operations notes
CREATE OR REPLACE FUNCTION public.admin_list_client_site_operations_notes(_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin'::public.app_role)
       OR public.has_role(v_uid, 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC), '[]'::jsonb)
  INTO r
  FROM (
    SELECT id, admin_user_id, note, category, created_at, archived_at
    FROM admin_client_site_operations_notes
    WHERE site_id = _site_id
    ORDER BY created_at DESC
    LIMIT 100
  ) n;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_client_site_operations_notes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_client_site_operations_notes(uuid) TO authenticated;


-- 6) Log contact action (no message is sent)
CREATE OR REPLACE FUNCTION public.admin_log_client_site_contact_action(
  _site_id uuid,
  _channel text,
  _purpose text,
  _notes   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin'::public.app_role)
       OR public.has_role(v_uid, 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;
  IF _channel NOT IN ('phone','whatsapp','email','internal_note','other') THEN
    RAISE EXCEPTION 'invalid_channel' USING ERRCODE = '22023';
  END IF;
  IF _purpose IS NULL OR length(btrim(_purpose)) < 3 THEN
    RAISE EXCEPTION 'purpose_required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM client_sites WHERE id = _site_id) THEN
    RAISE EXCEPTION 'site_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.admin_client_site_access_audit (site_id, admin_user_id, action, reason, metadata)
  VALUES (
    _site_id, v_uid, 'contact_action_started',
    'contact:' || _channel || ':' || btrim(_purpose),
    jsonb_build_object(
      'channel', _channel,
      'purpose', btrim(_purpose),
      'notes',   NULLIF(btrim(COALESCE(_notes,'')), '')
    )
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_log_client_site_contact_action(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_log_client_site_contact_action(uuid, text, text, text) TO authenticated;
