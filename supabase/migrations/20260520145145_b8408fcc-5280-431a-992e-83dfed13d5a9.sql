
-- =========================================================================
-- Phase 2.5A: client_site_visibility_settings
-- =========================================================================
CREATE TABLE public.client_site_visibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  visibility_level text NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_site_visibility_settings_uniq UNIQUE (site_id, section_key),
  CONSTRAINT client_site_visibility_settings_section_chk CHECK (section_key IN (
    'basic_summary','site_ref','site_type','city','district',
    'full_address','map_location','contact_person','contact_phone',
    'project_description','required_services','specifications','measurements',
    'photos','attachments','budget_range','preferred_timeline',
    'contracts','previous_visits','notes'
  )),
  CONSTRAINT client_site_visibility_settings_level_chk CHECK (visibility_level IN (
    'hidden','public_limited','visible_after_request','visible_after_approval',
    'visible_to_approved_provider','admin_only'
  )),
  -- Sensitive sections may never be set to public_limited.
  CONSTRAINT client_site_visibility_settings_sensitive_chk CHECK (
    NOT (
      section_key IN ('full_address','map_location','contact_person','contact_phone',
                      'attachments','contracts','previous_visits','notes')
      AND visibility_level = 'public_limited'
    )
  )
);

CREATE INDEX idx_csvs_site ON public.client_site_visibility_settings(site_id);

ALTER TABLE public.client_site_visibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csvs_select_managers"
  ON public.client_site_visibility_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_sites cs
      WHERE cs.id = client_site_visibility_settings.site_id
        AND public.client_site_can_manage(auth.uid(), cs)
    )
  );

CREATE POLICY "csvs_modify_managers"
  ON public.client_site_visibility_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_sites cs
      WHERE cs.id = client_site_visibility_settings.site_id
        AND public.client_site_can_manage(auth.uid(), cs)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_sites cs
      WHERE cs.id = client_site_visibility_settings.site_id
        AND public.client_site_can_manage(auth.uid(), cs)
    )
  );

-- =========================================================================
-- Default visibility seeder + trigger + backfill
-- =========================================================================
CREATE OR REPLACE FUNCTION public.seed_client_site_default_visibility(_site_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  INSERT INTO public.client_site_visibility_settings (site_id, section_key, visibility_level)
  SELECT _site_id, sec.k, sec.v
  FROM (VALUES
    ('basic_summary','public_limited'),
    ('site_ref','public_limited'),
    ('site_type','public_limited'),
    ('city','public_limited'),
    ('district','hidden'),
    ('full_address','visible_to_approved_provider'),
    ('map_location','visible_to_approved_provider'),
    ('contact_person','visible_to_approved_provider'),
    ('contact_phone','visible_to_approved_provider'),
    ('specifications','visible_after_approval'),
    ('measurements','visible_after_approval'),
    ('attachments','visible_after_approval'),
    ('photos','visible_after_approval'),
    ('project_description','visible_after_request'),
    ('required_services','visible_after_request'),
    ('budget_range','visible_after_request'),
    ('preferred_timeline','visible_after_request'),
    ('contracts','admin_only'),
    ('previous_visits','admin_only'),
    ('notes','admin_only')
  ) AS sec(k,v)
  ON CONFLICT (site_id, section_key) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.tg_seed_client_site_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.seed_client_site_default_visibility(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_client_sites_seed_visibility
AFTER INSERT ON public.client_sites
FOR EACH ROW EXECUTE FUNCTION public.tg_seed_client_site_visibility();

-- Backfill existing sites
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.client_sites LOOP
    PERFORM public.seed_client_site_default_visibility(r.id);
  END LOOP;
END $$;

-- =========================================================================
-- Phase 2.5A: client_site_visit_logs
-- =========================================================================
CREATE TABLE public.client_site_visit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.client_sites(id) ON DELETE CASCADE,
  visitor_user_id uuid REFERENCES auth.users(id),
  provider_business_id uuid REFERENCES public.businesses(id),
  visit_source text NOT NULL CHECK (visit_source IN ('qr_scan','site_ref_search','direct_link')),
  attempted_section text,
  action text NOT NULL CHECK (action IN (
    'viewed_limited_summary','requested_access','attempted_locked_section','submitted_interest'
  )),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_csvl_site ON public.client_site_visit_logs(site_id, created_at DESC);
CREATE INDEX idx_csvl_provider ON public.client_site_visit_logs(provider_business_id, created_at DESC);

ALTER TABLE public.client_site_visit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csvl_select_managers"
  ON public.client_site_visit_logs FOR SELECT
  USING (
    site_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.client_sites cs
      WHERE cs.id = client_site_visit_logs.site_id
        AND public.client_site_can_manage(auth.uid(), cs)
    )
  );

CREATE POLICY "csvl_select_own_provider_requests"
  ON public.client_site_visit_logs FOR SELECT
  USING (
    provider_business_id IS NOT NULL
    AND action IN ('requested_access','submitted_interest')
    AND public.is_business_owner_or_manager(auth.uid(), provider_business_id)
  );

-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER RPCs may write.

-- Metadata sanitizer
CREATE OR REPLACE FUNCTION public.tg_sanitize_visit_log_metadata()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  banned text[] := ARRAY['token','phone','address','email','lat','lng',
                         'map_url','qr_token_hash','signed_url','file_url','storage_path'];
  k text;
BEGIN
  IF NEW.metadata IS NULL THEN
    RETURN NEW;
  END IF;
  IF jsonb_typeof(NEW.metadata) <> 'object' THEN
    NEW.metadata := NULL;
    RETURN NEW;
  END IF;
  FOREACH k IN ARRAY banned LOOP
    IF NEW.metadata ? k THEN
      RAISE EXCEPTION 'METADATA_FORBIDDEN_KEY: %', k USING ERRCODE = '22023';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_csvl_sanitize_metadata
BEFORE INSERT OR UPDATE ON public.client_site_visit_logs
FOR EACH ROW EXECUTE FUNCTION public.tg_sanitize_visit_log_metadata();

-- =========================================================================
-- Resolver: resolve_site_section_visibility
-- =========================================================================
CREATE OR REPLACE FUNCTION public.resolve_site_section_visibility(
  _site_id uuid,
  _viewer_business_id uuid DEFAULT NULL,
  _approved_grant_level text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_site      public.client_sites%ROWTYPE;
  v_is_mgr    boolean := false;
  v_is_admin  boolean := false;
  v_qr_public boolean := false;
  v_result    jsonb := '{}'::jsonb;
  v_all_sections text[] := ARRAY[
    'basic_summary','site_ref','site_type','city','district',
    'full_address','map_location','contact_person','contact_phone',
    'project_description','required_services','specifications','measurements',
    'photos','attachments','budget_range','preferred_timeline',
    'contracts','previous_visits','notes'
  ];
  sec text;
  v_level text;
  v_state text;
  v_grant text := lower(coalesce(_approved_grant_level,''));
BEGIN
  SELECT * INTO v_site FROM public.client_sites WHERE id = _site_id LIMIT 1;
  IF v_site.id IS NULL OR v_site.archived_at IS NOT NULL THEN
    -- everything hidden
    FOREACH sec IN ARRAY v_all_sections LOOP
      v_result := v_result || jsonb_build_object(sec, 'hidden');
    END LOOP;
    RETURN v_result;
  END IF;

  v_is_admin := v_uid IS NOT NULL AND (
    public.has_role(v_uid, 'admin'::app_role) OR public.has_role(v_uid, 'super_admin'::app_role)
  );
  v_is_mgr := v_uid IS NOT NULL AND public.client_site_can_manage(v_uid, v_site);
  v_qr_public := v_site.qr_enabled = true
                 AND v_site.qr_revoked_at IS NULL
                 AND v_site.visibility IN ('shared_by_qr','public_limited');

  FOREACH sec IN ARRAY v_all_sections LOOP
    SELECT visibility_level INTO v_level
      FROM public.client_site_visibility_settings
     WHERE site_id = _site_id AND section_key = sec
     LIMIT 1;

    IF v_level IS NULL THEN
      v_state := 'hidden';  -- missing row = hidden
    ELSIF v_is_admin OR v_is_mgr THEN
      v_state := 'visible';
    ELSE
      CASE v_level
        WHEN 'hidden' THEN v_state := 'hidden';
        WHEN 'admin_only' THEN v_state := 'hidden';
        WHEN 'public_limited' THEN
          v_state := CASE WHEN v_qr_public THEN 'visible' ELSE 'hidden' END;
        WHEN 'visible_after_request' THEN
          v_state := CASE
            WHEN v_grant IN ('quote','service','contract','admin') THEN 'visible'
            ELSE 'locked'
          END;
        WHEN 'visible_after_approval' THEN
          v_state := CASE
            WHEN v_grant IN ('service','contract','admin') THEN 'visible'
            ELSE 'locked'
          END;
        WHEN 'visible_to_approved_provider' THEN
          v_state := CASE
            WHEN v_grant IN ('service','contract','admin') THEN 'visible'
            ELSE 'locked'
          END;
        ELSE v_state := 'hidden';
      END CASE;
    END IF;

    v_result := v_result || jsonb_build_object(sec, v_state);
  END LOOP;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_site_section_visibility(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_site_section_visibility(uuid, uuid, text) TO authenticated;

-- =========================================================================
-- update_site_section_visibility
-- =========================================================================
CREATE OR REPLACE FUNCTION public.update_site_section_visibility(
  _site_id uuid,
  _section_key text,
  _visibility_level text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_site public.client_sites%ROWTYPE;
  v_row  public.client_site_visibility_settings%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_site FROM public.client_sites WHERE id = _site_id LIMIT 1;
  IF v_site.id IS NULL THEN
    RAISE EXCEPTION 'SITE_NOT_FOUND' USING ERRCODE='22023';
  END IF;
  IF NOT public.client_site_can_manage(v_uid, v_site) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.client_site_visibility_settings
    (site_id, section_key, visibility_level, updated_by, updated_at)
  VALUES (_site_id, _section_key, _visibility_level, v_uid, now())
  ON CONFLICT (site_id, section_key) DO UPDATE
    SET visibility_level = EXCLUDED.visibility_level,
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'site_ref', v_site.site_ref,
    'section_key', v_row.section_key,
    'visibility_level', v_row.visibility_level,
    'updated_at', v_row.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_site_section_visibility(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_site_section_visibility(uuid, text, text) TO authenticated;

-- =========================================================================
-- log_site_visit
-- =========================================================================
CREATE OR REPLACE FUNCTION public.log_site_visit(
  _site_id uuid,
  _visit_source text,
  _attempted_section text DEFAULT NULL,
  _action text DEFAULT 'viewed_limited_summary',
  _provider_business_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_provider uuid := _provider_business_id;
BEGIN
  IF _site_id IS NULL THEN RETURN jsonb_build_object('logged', false); END IF;
  IF _visit_source NOT IN ('qr_scan','site_ref_search','direct_link') THEN
    RAISE EXCEPTION 'INVALID_SOURCE' USING ERRCODE='22023';
  END IF;
  IF _action NOT IN ('viewed_limited_summary','requested_access','attempted_locked_section','submitted_interest') THEN
    RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE='22023';
  END IF;

  IF v_provider IS NOT NULL THEN
    IF v_uid IS NULL OR NOT public.is_business_owner_or_manager(v_uid, v_provider) THEN
      v_provider := NULL;  -- silently drop unverified claim
    END IF;
  END IF;

  INSERT INTO public.client_site_visit_logs
    (site_id, visitor_user_id, provider_business_id, visit_source, attempted_section, action, metadata)
  VALUES
    (_site_id, v_uid, v_provider, _visit_source, _attempted_section, _action,
     CASE WHEN _metadata IS NULL OR jsonb_typeof(_metadata) <> 'object' THEN NULL ELSE _metadata END);

  RETURN jsonb_build_object('logged', true);
END;
$$;

REVOKE ALL ON FUNCTION public.log_site_visit(uuid, text, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_site_visit(uuid, text, text, text, uuid, jsonb) TO anon, authenticated;

-- =========================================================================
-- Update 2.3 RPCs to use visibility resolver + log visits
-- =========================================================================
CREATE OR REPLACE FUNCTION public.search_site_by_ref(_site_ref text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_norm   text;
  v_row    public.client_sites%ROWTYPE;
  v_vis    jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  v_norm := upper(btrim(coalesce(_site_ref,'')));
  IF v_norm = '' THEN
    RETURN NULL;
  END IF;

  IF v_norm !~ '^STE-[0-9]{4}-[0-9]{6}$' THEN
    INSERT INTO public.client_site_lookup_audit (lookup_type, user_id, site_ref, found)
      VALUES ('site_ref', v_uid, v_norm, false);
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
    FROM public.client_sites
   WHERE site_ref = v_norm
     AND archived_at IS NULL
   LIMIT 1;

  INSERT INTO public.client_site_lookup_audit (lookup_type, user_id, site_ref, site_id, found)
    VALUES ('site_ref', v_uid, v_norm, v_row.id, v_row.id IS NOT NULL);

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Log visit (best-effort; never block)
  BEGIN
    PERFORM public.log_site_visit(v_row.id, 'site_ref_search', NULL, 'viewed_limited_summary', NULL, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  v_vis := public.resolve_site_section_visibility(v_row.id, NULL, NULL);

  RETURN jsonb_build_object(
    'site_ref',   CASE WHEN v_vis->>'site_ref'  = 'visible' THEN v_row.site_ref  ELSE NULL END,
    'site_name',  CASE WHEN v_vis->>'basic_summary' = 'visible' THEN v_row.site_name ELSE NULL END,
    'site_type',  CASE WHEN v_vis->>'site_type' = 'visible' THEN v_row.site_type ELSE NULL END,
    'city_name',  CASE WHEN v_vis->>'city'      = 'visible' THEN v_row.city_name ELSE NULL END,
    'visibility', v_row.visibility,
    'status',     'available'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_site_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_hash  text;
  v_row   public.client_sites%ROWTYPE;
  v_vis   jsonb;
BEGIN
  IF _token IS NULL OR length(btrim(_token)) = 0 THEN
    RETURN NULL;
  END IF;

  v_hash := encode(extensions.digest(btrim(_token), 'sha256'), 'hex');

  SELECT * INTO v_row
    FROM public.client_sites
   WHERE qr_token_hash = v_hash
     AND qr_enabled    = true
     AND qr_revoked_at IS NULL
     AND archived_at   IS NULL
     AND visibility    IN ('shared_by_qr','public_limited')
   LIMIT 1;

  INSERT INTO public.client_site_lookup_audit (lookup_type, user_id, site_id, found)
    VALUES ('qr_token', v_uid, v_row.id, v_row.id IS NOT NULL);

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.client_sites
     SET scan_count      = scan_count + 1,
         last_scanned_at = now()
   WHERE id = v_row.id;

  BEGIN
    PERFORM public.log_site_visit(v_row.id, 'qr_scan', NULL, 'viewed_limited_summary', NULL, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  v_vis := public.resolve_site_section_visibility(v_row.id, NULL, NULL);

  RETURN jsonb_build_object(
    'site_ref',   CASE WHEN v_vis->>'site_ref'  = 'visible' THEN v_row.site_ref  ELSE NULL END,
    'site_name',  CASE WHEN v_vis->>'basic_summary' = 'visible' THEN v_row.site_name ELSE NULL END,
    'site_type',  CASE WHEN v_vis->>'site_type' = 'visible' THEN v_row.site_type ELSE NULL END,
    'city_name',  CASE WHEN v_vis->>'city'      = 'visible' THEN v_row.city_name ELSE NULL END,
    'visibility', v_row.visibility,
    'status',     'available'
  );
END;
$function$;
