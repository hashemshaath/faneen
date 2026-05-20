
CREATE TABLE IF NOT EXISTS public.client_site_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL UNIQUE REFERENCES public.client_sites(id) ON DELETE CASCADE,
  notify_on_qr_scan boolean NOT NULL DEFAULT false,
  notify_on_access_request boolean NOT NULL DEFAULT true,
  notify_on_locked_section_attempt boolean NOT NULL DEFAULT false,
  notify_on_provider_interest boolean NOT NULL DEFAULT true,
  auto_ignore_anonymous_visits boolean NOT NULL DEFAULT true,
  auto_ignore_repeated_visits boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.client_site_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_csnp_updated_at
BEFORE UPDATE ON public.client_site_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.client_site_notification_preferences (site_id)
SELECT cs.id FROM public.client_sites cs
LEFT JOIN public.client_site_notification_preferences p ON p.site_id = cs.id
WHERE p.id IS NULL;

CREATE OR REPLACE FUNCTION public.tg_seed_client_site_notif_prefs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.client_site_notification_preferences (site_id) VALUES (NEW.id)
  ON CONFLICT (site_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_seed_client_site_notif_prefs ON public.client_sites;
CREATE TRIGGER trg_seed_client_site_notif_prefs
AFTER INSERT ON public.client_sites
FOR EACH ROW EXECUTE FUNCTION public.tg_seed_client_site_notif_prefs();

CREATE OR REPLACE FUNCTION public._csnp_can_manage(_uid uuid, _site_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_sites cs
    WHERE cs.id = _site_id AND public.client_site_can_manage(_uid, cs.*)
  );
$$;

CREATE POLICY "csnp_select_manage" ON public.client_site_notification_preferences
FOR SELECT TO authenticated USING (public._csnp_can_manage(auth.uid(), site_id));

CREATE POLICY "csnp_update_manage" ON public.client_site_notification_preferences
FOR UPDATE TO authenticated
USING (public._csnp_can_manage(auth.uid(), site_id))
WITH CHECK (public._csnp_can_manage(auth.uid(), site_id));

CREATE OR REPLACE FUNCTION public.get_client_site_notification_preferences(_site_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.client_site_notification_preferences;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
  IF NOT public._csnp_can_manage(v_uid, _site_id) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  INSERT INTO public.client_site_notification_preferences (site_id) VALUES (_site_id) ON CONFLICT (site_id) DO NOTHING;
  SELECT * INTO v_row FROM public.client_site_notification_preferences WHERE site_id = _site_id;
  RETURN jsonb_build_object(
    'site_id', v_row.site_id,
    'notify_on_qr_scan', v_row.notify_on_qr_scan,
    'notify_on_access_request', v_row.notify_on_access_request,
    'notify_on_locked_section_attempt', v_row.notify_on_locked_section_attempt,
    'notify_on_provider_interest', v_row.notify_on_provider_interest,
    'auto_ignore_anonymous_visits', v_row.auto_ignore_anonymous_visits,
    'auto_ignore_repeated_visits', v_row.auto_ignore_repeated_visits,
    'updated_at', v_row.updated_at
  );
END; $$;

CREATE OR REPLACE FUNCTION public.update_client_site_notification_preferences(_site_id uuid, _patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
  IF NOT public._csnp_can_manage(v_uid, _site_id) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  INSERT INTO public.client_site_notification_preferences (site_id) VALUES (_site_id) ON CONFLICT (site_id) DO NOTHING;
  UPDATE public.client_site_notification_preferences SET
    notify_on_qr_scan = COALESCE((_patch->>'notify_on_qr_scan')::boolean, notify_on_qr_scan),
    notify_on_access_request = COALESCE((_patch->>'notify_on_access_request')::boolean, notify_on_access_request),
    notify_on_locked_section_attempt = COALESCE((_patch->>'notify_on_locked_section_attempt')::boolean, notify_on_locked_section_attempt),
    notify_on_provider_interest = COALESCE((_patch->>'notify_on_provider_interest')::boolean, notify_on_provider_interest),
    auto_ignore_anonymous_visits = COALESCE((_patch->>'auto_ignore_anonymous_visits')::boolean, auto_ignore_anonymous_visits),
    auto_ignore_repeated_visits = COALESCE((_patch->>'auto_ignore_repeated_visits')::boolean, auto_ignore_repeated_visits),
    updated_by = v_uid, updated_at = now()
  WHERE site_id = _site_id;
  RETURN public.get_client_site_notification_preferences(_site_id);
END; $$;

REVOKE ALL ON FUNCTION public.get_client_site_notification_preferences(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_client_site_notification_preferences(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_site_notification_preferences(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_site_notification_preferences(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public._csnp_recipient(_site_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(cs.owner_user_id, cs.client_user_id, b.user_id)
  FROM public.client_sites cs
  LEFT JOIN public.businesses b ON b.id = cs.business_id
  WHERE cs.id = _site_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.tg_csnp_notify_access_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pref public.client_site_notification_preferences; v_site public.client_sites; v_recipient uuid; v_biz_name text;
BEGIN
  IF NEW.status <> 'requested' THEN RETURN NEW; END IF;
  SELECT * INTO v_pref FROM public.client_site_notification_preferences WHERE site_id = NEW.site_id;
  IF NOT FOUND OR NOT v_pref.notify_on_access_request THEN RETURN NEW; END IF;
  SELECT * INTO v_site FROM public.client_sites WHERE id = NEW.site_id;
  v_recipient := public._csnp_recipient(NEW.site_id);
  IF v_recipient IS NULL THEN RETURN NEW; END IF;
  SELECT name_ar INTO v_biz_name FROM public.businesses WHERE id = NEW.provider_business_id;
  PERFORM public.create_notification(
    v_recipient,
    'طلب وصول جديد إلى موقعك',
    'New access request for your site',
    format('طلب %s الوصول إلى %s (%s).', COALESCE(v_biz_name,'مزود'), COALESCE(v_site.site_name, v_site.site_ref), v_site.site_ref),
    format('%s requested access to %s (%s).', COALESCE(v_biz_name,'A provider'), COALESCE(v_site.site_name, v_site.site_ref), v_site.site_ref),
    'site_access_request', NEW.id, 'client_site_access_grant', NULL
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_csnp_notify_access_request ON public.client_site_access_grants;
CREATE TRIGGER trg_csnp_notify_access_request
AFTER INSERT ON public.client_site_access_grants
FOR EACH ROW EXECUTE FUNCTION public.tg_csnp_notify_access_request();

CREATE OR REPLACE FUNCTION public.tg_csnp_notify_provider_interest()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pref public.client_site_notification_preferences; v_site public.client_sites; v_recipient uuid; v_biz_id uuid; v_biz_name text;
BEGIN
  IF NEW.source_site_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_pref FROM public.client_site_notification_preferences WHERE site_id = NEW.source_site_id;
  IF NOT FOUND OR NOT v_pref.notify_on_provider_interest THEN RETURN NEW; END IF;
  SELECT * INTO v_site FROM public.client_sites WHERE id = NEW.source_site_id;
  v_recipient := public._csnp_recipient(NEW.source_site_id);
  IF v_recipient IS NULL THEN RETURN NEW; END IF;
  SELECT provider_business_id INTO v_biz_id FROM public.client_site_access_grants WHERE id = NEW.site_access_grant_id;
  IF v_biz_id IS NOT NULL THEN SELECT name_ar INTO v_biz_name FROM public.businesses WHERE id = v_biz_id; END IF;
  PERFORM public.create_notification(
    v_recipient,
    'اهتمام جديد من مزود لموقعك',
    'New provider interest for your site',
    format('استلمت اهتماماً جديداً من %s مرتبطاً بـ %s (%s).', COALESCE(v_biz_name,'مزود'), COALESCE(v_site.site_name, v_site.site_ref), v_site.site_ref),
    format('You received a new interest from %s related to %s (%s).', COALESCE(v_biz_name,'a provider'), COALESCE(v_site.site_name, v_site.site_ref), v_site.site_ref),
    'site_provider_interest', NEW.id, 'lead_request', NULL
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_csnp_notify_provider_interest ON public.lead_requests;
CREATE TRIGGER trg_csnp_notify_provider_interest
AFTER INSERT ON public.lead_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_csnp_notify_provider_interest();

CREATE OR REPLACE FUNCTION public.tg_csnp_notify_qr_scan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pref public.client_site_notification_preferences; v_site public.client_sites; v_recipient uuid; v_recent int;
BEGIN
  IF NEW.visit_source <> 'qr_scan' OR NEW.action <> 'viewed_limited_summary' THEN RETURN NEW; END IF;
  IF NEW.site_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_pref FROM public.client_site_notification_preferences WHERE site_id = NEW.site_id;
  IF NOT FOUND OR NOT v_pref.notify_on_qr_scan THEN RETURN NEW; END IF;
  IF v_pref.auto_ignore_anonymous_visits AND NEW.visitor_user_id IS NULL THEN RETURN NEW; END IF;
  IF v_pref.auto_ignore_repeated_visits AND NEW.visitor_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_recent FROM public.client_site_visit_logs
    WHERE site_id = NEW.site_id AND visit_source = 'qr_scan'
      AND visitor_user_id = NEW.visitor_user_id
      AND created_at > (now() - interval '1 hour') AND id <> NEW.id;
    IF v_recent > 0 THEN RETURN NEW; END IF;
  END IF;
  SELECT * INTO v_site FROM public.client_sites WHERE id = NEW.site_id;
  v_recipient := public._csnp_recipient(NEW.site_id);
  IF v_recipient IS NULL THEN RETURN NEW; END IF;
  PERFORM public.create_notification(
    v_recipient,
    'تم مسح رمز QR لموقعك',
    'Your site QR was scanned',
    format('تم مسح رمز QR للموقع %s (%s).', COALESCE(v_site.site_name, v_site.site_ref), v_site.site_ref),
    format('QR was scanned for %s (%s).', COALESCE(v_site.site_name, v_site.site_ref), v_site.site_ref),
    'site_qr_scan', NEW.site_id, 'client_site', NULL
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_csnp_notify_qr_scan ON public.client_site_visit_logs;
CREATE TRIGGER trg_csnp_notify_qr_scan
AFTER INSERT ON public.client_site_visit_logs
FOR EACH ROW EXECUTE FUNCTION public.tg_csnp_notify_qr_scan();
