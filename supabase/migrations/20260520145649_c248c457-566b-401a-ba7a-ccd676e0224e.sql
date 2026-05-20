
-- =========================================================================
-- Phase 2.5B: client_site_access_grants
-- =========================================================================
CREATE TABLE public.client_site_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  provider_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'limited',
  status text NOT NULL DEFAULT 'requested',
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz, approved_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz, rejected_by uuid REFERENCES auth.users(id),
  revoked_at  timestamptz, revoked_by  uuid REFERENCES auth.users(id),
  ignored_at  timestamptz, ignored_by  uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT csag_level_chk CHECK (access_level IN ('limited','quote','service','contract','admin')),
  CONSTRAINT csag_status_chk CHECK (status IN ('requested','approved','rejected','revoked','ignored'))
);

CREATE UNIQUE INDEX csag_active_uniq
  ON public.client_site_access_grants (site_id, provider_business_id)
  WHERE status IN ('requested','approved');

CREATE INDEX csag_site_idx     ON public.client_site_access_grants(site_id);
CREATE INDEX csag_provider_idx ON public.client_site_access_grants(provider_business_id);
CREATE INDEX csag_puser_idx    ON public.client_site_access_grants(provider_user_id);
CREATE INDEX csag_status_idx   ON public.client_site_access_grants(status);
CREATE INDEX csag_req_at_idx   ON public.client_site_access_grants(requested_at DESC);

ALTER TABLE public.client_site_access_grants ENABLE ROW LEVEL SECURITY;

-- Owner/manager/admin can SELECT grants for their site
CREATE POLICY "csag_select_site_managers"
  ON public.client_site_access_grants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_sites cs
      WHERE cs.id = client_site_access_grants.site_id
        AND public.client_site_can_manage(auth.uid(), cs)
    )
  );

-- Provider manager can SELECT their own grants
CREATE POLICY "csag_select_provider_managers"
  ON public.client_site_access_grants FOR SELECT
  USING (
    provider_business_id IS NOT NULL
    AND public.is_business_owner_or_manager(auth.uid(), provider_business_id)
  );

-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER RPCs write.

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_csag_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path='public' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER trg_csag_touch
BEFORE UPDATE ON public.client_site_access_grants
FOR EACH ROW EXECUTE FUNCTION public.tg_csag_touch();

-- =========================================================================
-- Phase 2.5B: client_site_access_audit
-- =========================================================================
CREATE TABLE public.client_site_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid,
  grant_id uuid,
  actor_user_id uuid,
  actor_business_id uuid,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT csaa_event_chk CHECK (event_type IN (
    'access_requested','access_approved','access_rejected',
    'access_revoked','access_ignored','access_level_changed'
  ))
);

CREATE INDEX csaa_site_idx  ON public.client_site_access_audit(site_id, created_at DESC);
CREATE INDEX csaa_grant_idx ON public.client_site_access_audit(grant_id, created_at DESC);

ALTER TABLE public.client_site_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csaa_select_site_managers"
  ON public.client_site_access_audit FOR SELECT
  USING (
    site_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.client_sites cs
      WHERE cs.id = client_site_access_audit.site_id
        AND public.client_site_can_manage(auth.uid(), cs)
    )
  );

-- =========================================================================
-- Helper: site limited summary
-- =========================================================================
CREATE OR REPLACE FUNCTION public.csag_site_summary(_site_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public' AS $$
  SELECT jsonb_build_object(
    'site_ref',  cs.site_ref,
    'site_name', cs.site_name,
    'site_type', cs.site_type,
    'city_name', cs.city_name
  )
  FROM public.client_sites cs
  WHERE cs.id = _site_id;
$$;

-- =========================================================================
-- request_client_site_access
-- =========================================================================
CREATE OR REPLACE FUNCTION public.request_client_site_access(
  _site_ref text,
  _provider_business_id uuid,
  _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_norm text;
  v_site public.client_sites%ROWTYPE;
  v_existing public.client_site_access_grants%ROWTYPE;
  v_new public.client_site_access_grants%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF _provider_business_id IS NULL OR NOT public.is_business_owner_or_manager(v_uid, _provider_business_id) THEN
    RAISE EXCEPTION 'FORBIDDEN_PROVIDER' USING ERRCODE='42501';
  END IF;

  v_norm := upper(btrim(coalesce(_site_ref,'')));
  IF v_norm !~ '^STE-[0-9]{4}-[0-9]{6}$' THEN
    RAISE EXCEPTION 'INVALID_SITE_REF' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_site FROM public.client_sites
    WHERE site_ref = v_norm AND archived_at IS NULL LIMIT 1;
  IF v_site.id IS NULL THEN RAISE EXCEPTION 'SITE_NOT_FOUND' USING ERRCODE='22023'; END IF;

  -- Active duplicate?
  SELECT * INTO v_existing FROM public.client_site_access_grants
    WHERE site_id = v_site.id AND provider_business_id = _provider_business_id
      AND status IN ('requested','approved')
    LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'requested', false,
      'duplicate', true,
      'grant_id', v_existing.id,
      'status', v_existing.status,
      'access_level', v_existing.access_level,
      'requested_at', v_existing.requested_at
    ) || public.csag_site_summary(v_site.id);
  END IF;

  INSERT INTO public.client_site_access_grants
    (site_id, provider_business_id, provider_user_id, access_level, status, reason)
  VALUES (v_site.id, _provider_business_id, v_uid, 'limited', 'requested', _reason)
  RETURNING * INTO v_new;

  -- Visit log (best-effort)
  BEGIN
    PERFORM public.log_site_visit(v_site.id, 'site_ref_search', NULL, 'requested_access', _provider_business_id, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  INSERT INTO public.client_site_access_audit
    (site_id, grant_id, actor_user_id, actor_business_id, event_type, metadata)
  VALUES (v_site.id, v_new.id, v_uid, _provider_business_id, 'access_requested',
          jsonb_build_object('reason_present', _reason IS NOT NULL));

  RETURN jsonb_build_object(
    'requested', true,
    'grant_id', v_new.id,
    'status', v_new.status,
    'access_level', v_new.access_level,
    'requested_at', v_new.requested_at
  ) || public.csag_site_summary(v_site.id);
END $$;

REVOKE ALL ON FUNCTION public.request_client_site_access(text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_client_site_access(text,uuid,text) TO authenticated;

-- =========================================================================
-- Internal helper: authorize site manager and load grant + site
-- =========================================================================
CREATE OR REPLACE FUNCTION public._csag_manage_or_raise(_grant_id uuid)
RETURNS public.client_site_access_grants
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_g public.client_site_access_grants%ROWTYPE;
  v_s public.client_sites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_g FROM public.client_site_access_grants WHERE id = _grant_id LIMIT 1;
  IF v_g.id IS NULL THEN RAISE EXCEPTION 'GRANT_NOT_FOUND' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_s FROM public.client_sites WHERE id = v_g.site_id LIMIT 1;
  IF NOT public.client_site_can_manage(v_uid, v_s) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501';
  END IF;
  RETURN v_g;
END $$;

-- =========================================================================
-- approve / reject / revoke / ignore
-- =========================================================================
CREATE OR REPLACE FUNCTION public.approve_client_site_access(
  _grant_id uuid, _access_level text DEFAULT 'quote', _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_g public.client_site_access_grants%ROWTYPE;
  v_prev text;
BEGIN
  v_g := public._csag_manage_or_raise(_grant_id);
  IF v_g.status NOT IN ('requested','rejected','revoked','ignored') THEN
    RAISE EXCEPTION 'INVALID_STATE' USING ERRCODE='22023';
  END IF;
  IF _access_level NOT IN ('limited','quote','service','contract','admin') THEN
    RAISE EXCEPTION 'INVALID_LEVEL' USING ERRCODE='22023';
  END IF;
  v_prev := v_g.access_level;

  UPDATE public.client_site_access_grants
     SET status='approved', access_level=_access_level,
         approved_at=now(), approved_by=v_uid,
         rejected_at=NULL, rejected_by=NULL,
         revoked_at=NULL,  revoked_by=NULL,
         ignored_at=NULL,  ignored_by=NULL,
         reason = COALESCE(_reason, reason)
   WHERE id = _grant_id
   RETURNING * INTO v_g;

  INSERT INTO public.client_site_access_audit
    (site_id, grant_id, actor_user_id, event_type, metadata)
  VALUES (v_g.site_id, v_g.id, v_uid, 'access_approved',
          jsonb_build_object('access_level', _access_level, 'previous_level', v_prev));

  RETURN jsonb_build_object(
    'grant_id', v_g.id, 'status', v_g.status, 'access_level', v_g.access_level,
    'approved_at', v_g.approved_at
  );
END $$;

CREATE OR REPLACE FUNCTION public.reject_client_site_access(_grant_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE v_uid uuid:=auth.uid(); v_g public.client_site_access_grants%ROWTYPE;
BEGIN
  v_g := public._csag_manage_or_raise(_grant_id);
  IF v_g.status <> 'requested' THEN RAISE EXCEPTION 'INVALID_STATE' USING ERRCODE='22023'; END IF;
  UPDATE public.client_site_access_grants
     SET status='rejected', rejected_at=now(), rejected_by=v_uid,
         reason = COALESCE(_reason, reason)
   WHERE id = _grant_id RETURNING * INTO v_g;
  INSERT INTO public.client_site_access_audit
    (site_id, grant_id, actor_user_id, event_type, metadata)
  VALUES (v_g.site_id, v_g.id, v_uid, 'access_rejected', jsonb_build_object('reason_present', _reason IS NOT NULL));
  RETURN jsonb_build_object('grant_id', v_g.id, 'status', v_g.status, 'rejected_at', v_g.rejected_at);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_client_site_access(_grant_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE v_uid uuid:=auth.uid(); v_g public.client_site_access_grants%ROWTYPE;
BEGIN
  v_g := public._csag_manage_or_raise(_grant_id);
  IF v_g.status NOT IN ('approved','requested') THEN RAISE EXCEPTION 'INVALID_STATE' USING ERRCODE='22023'; END IF;
  UPDATE public.client_site_access_grants
     SET status='revoked', revoked_at=now(), revoked_by=v_uid,
         reason = COALESCE(_reason, reason)
   WHERE id = _grant_id RETURNING * INTO v_g;
  INSERT INTO public.client_site_access_audit
    (site_id, grant_id, actor_user_id, event_type, metadata)
  VALUES (v_g.site_id, v_g.id, v_uid, 'access_revoked', jsonb_build_object('reason_present', _reason IS NOT NULL));
  RETURN jsonb_build_object('grant_id', v_g.id, 'status', v_g.status, 'revoked_at', v_g.revoked_at);
END $$;

CREATE OR REPLACE FUNCTION public.ignore_client_site_access(_grant_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE v_uid uuid:=auth.uid(); v_g public.client_site_access_grants%ROWTYPE;
BEGIN
  v_g := public._csag_manage_or_raise(_grant_id);
  IF v_g.status <> 'requested' THEN RAISE EXCEPTION 'INVALID_STATE' USING ERRCODE='22023'; END IF;
  UPDATE public.client_site_access_grants
     SET status='ignored', ignored_at=now(), ignored_by=v_uid,
         reason = COALESCE(_reason, reason)
   WHERE id = _grant_id RETURNING * INTO v_g;
  INSERT INTO public.client_site_access_audit
    (site_id, grant_id, actor_user_id, event_type, metadata)
  VALUES (v_g.site_id, v_g.id, v_uid, 'access_ignored', jsonb_build_object('reason_present', _reason IS NOT NULL));
  RETURN jsonb_build_object('grant_id', v_g.id, 'status', v_g.status, 'ignored_at', v_g.ignored_at);
END $$;

REVOKE ALL ON FUNCTION public.approve_client_site_access(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_client_site_access(uuid,text)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_client_site_access(uuid,text)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ignore_client_site_access(uuid,text)       FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_client_site_access(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_client_site_access(uuid,text)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_client_site_access(uuid,text)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.ignore_client_site_access(uuid,text)       TO authenticated;

-- =========================================================================
-- list_site_access_requests_for_owner
-- =========================================================================
CREATE OR REPLACE FUNCTION public.list_site_access_requests_for_owner(_site_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE='42501'; END IF;

  SELECT COALESCE(jsonb_agg(row ORDER BY requested_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'grant_id', g.id,
      'site_id', g.site_id,
      'site_ref', cs.site_ref,
      'site_name', cs.site_name,
      'site_type', cs.site_type,
      'provider_business_id', g.provider_business_id,
      'provider_business_name', b.name,
      'status', g.status,
      'access_level', g.access_level,
      'requested_at', g.requested_at,
      'approved_at', g.approved_at,
      'rejected_at', g.rejected_at,
      'revoked_at', g.revoked_at,
      'ignored_at', g.ignored_at,
      'reason', g.reason
    ) AS row, g.requested_at
    FROM public.client_site_access_grants g
    JOIN public.client_sites cs ON cs.id = g.site_id
    LEFT JOIN public.businesses b ON b.id = g.provider_business_id
    WHERE (_site_id IS NULL OR g.site_id = _site_id)
      AND public.client_site_can_manage(v_uid, cs)
  ) t;

  RETURN v_rows;
END $$;

REVOKE ALL ON FUNCTION public.list_site_access_requests_for_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_site_access_requests_for_owner(uuid) TO authenticated;

-- =========================================================================
-- list_my_site_access_grants
-- =========================================================================
CREATE OR REPLACE FUNCTION public.list_my_site_access_grants()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE='42501'; END IF;

  SELECT COALESCE(jsonb_agg(row ORDER BY requested_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'grant_id', g.id,
      'site_ref', cs.site_ref,
      'site_name', cs.site_name,
      'site_type', cs.site_type,
      'city_name', cs.city_name,
      'provider_business_id', g.provider_business_id,
      'status', CASE WHEN g.status='ignored' THEN 'requested' ELSE g.status END,
      'access_level', g.access_level,
      'requested_at', g.requested_at,
      'approved_at', g.approved_at,
      'rejected_at', g.rejected_at,
      'revoked_at', g.revoked_at
    ) AS row, g.requested_at
    FROM public.client_site_access_grants g
    JOIN public.client_sites cs ON cs.id = g.site_id
    WHERE public.is_business_owner_or_manager(v_uid, g.provider_business_id)
  ) t;

  RETURN v_rows;
END $$;

REVOKE ALL ON FUNCTION public.list_my_site_access_grants() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_site_access_grants() TO authenticated;

-- =========================================================================
-- Resolver update: auto-detect caller's highest approved grant
-- =========================================================================
CREATE OR REPLACE FUNCTION public.resolve_site_section_visibility(
  _site_id uuid,
  _viewer_business_id uuid DEFAULT NULL,
  _approved_grant_level text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_site public.client_sites%ROWTYPE;
  v_is_mgr boolean := false;
  v_is_admin boolean := false;
  v_qr_public boolean := false;
  v_result jsonb := '{}'::jsonb;
  v_all_sections text[] := ARRAY[
    'basic_summary','site_ref','site_type','city','district',
    'full_address','map_location','contact_person','contact_phone',
    'project_description','required_services','specifications','measurements',
    'photos','attachments','budget_range','preferred_timeline',
    'contracts','previous_visits','notes'
  ];
  sec text; v_level text; v_state text;
  v_grant text := lower(coalesce(_approved_grant_level,''));
BEGIN
  SELECT * INTO v_site FROM public.client_sites WHERE id=_site_id LIMIT 1;
  IF v_site.id IS NULL OR v_site.archived_at IS NOT NULL THEN
    FOREACH sec IN ARRAY v_all_sections LOOP
      v_result := v_result || jsonb_build_object(sec,'hidden');
    END LOOP;
    RETURN v_result;
  END IF;

  v_is_admin := v_uid IS NOT NULL AND (
    public.has_role(v_uid,'admin'::app_role) OR public.has_role(v_uid,'super_admin'::app_role)
  );
  v_is_mgr := v_uid IS NOT NULL AND public.client_site_can_manage(v_uid, v_site);
  v_qr_public := v_site.qr_enabled=true AND v_site.qr_revoked_at IS NULL
                 AND v_site.visibility IN ('shared_by_qr','public_limited');

  -- Auto-detect caller's highest approved grant when not explicitly supplied
  IF v_grant = '' AND v_uid IS NOT NULL AND NOT v_is_mgr AND NOT v_is_admin THEN
    SELECT g.access_level INTO v_grant
      FROM public.client_site_access_grants g
     WHERE g.site_id=_site_id AND g.status='approved'
       AND public.is_business_owner_or_manager(v_uid, g.provider_business_id)
       AND (_viewer_business_id IS NULL OR g.provider_business_id = _viewer_business_id)
     ORDER BY CASE g.access_level
       WHEN 'admin' THEN 5 WHEN 'contract' THEN 4 WHEN 'service' THEN 3
       WHEN 'quote' THEN 2 WHEN 'limited' THEN 1 ELSE 0 END DESC
     LIMIT 1;
    v_grant := coalesce(v_grant,'');
  END IF;

  FOREACH sec IN ARRAY v_all_sections LOOP
    SELECT visibility_level INTO v_level
      FROM public.client_site_visibility_settings
     WHERE site_id=_site_id AND section_key=sec LIMIT 1;

    IF v_level IS NULL THEN v_state := 'hidden';
    ELSIF v_is_admin OR v_is_mgr THEN v_state := 'visible';
    ELSE
      CASE v_level
        WHEN 'hidden' THEN v_state:='hidden';
        WHEN 'admin_only' THEN v_state:='hidden';
        WHEN 'public_limited' THEN
          v_state := CASE WHEN v_qr_public OR v_grant<>'' THEN 'visible' ELSE 'hidden' END;
        WHEN 'visible_after_request' THEN
          v_state := CASE WHEN v_grant IN ('quote','service','contract','admin') THEN 'visible' ELSE 'locked' END;
        WHEN 'visible_after_approval' THEN
          v_state := CASE WHEN v_grant IN ('service','contract','admin') THEN 'visible' ELSE 'locked' END;
        WHEN 'visible_to_approved_provider' THEN
          v_state := CASE WHEN v_grant IN ('service','contract','admin') THEN 'visible' ELSE 'locked' END;
        ELSE v_state:='hidden';
      END CASE;
    END IF;
    v_result := v_result || jsonb_build_object(sec, v_state);
  END LOOP;
  RETURN v_result;
END $$;
