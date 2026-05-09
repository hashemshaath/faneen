-- Contact Inbox: SLA settings + notification preferences
CREATE TABLE IF NOT EXISTS public.contact_inbox_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  stale_hours integer NOT NULL DEFAULT 24 CHECK (stale_hours BETWEEN 1 AND 720),
  target_response_hours integer NOT NULL DEFAULT 24 CHECK (target_response_hours BETWEEN 1 AND 720),
  target_resolution_hours integer NOT NULL DEFAULT 72 CHECK (target_resolution_hours BETWEEN 1 AND 2160),
  notify_email_on_assign boolean NOT NULL DEFAULT true,
  notify_email_on_status_change boolean NOT NULL DEFAULT true,
  notify_email_on_priority_change boolean NOT NULL DEFAULT false,
  notify_webhook_on_assign boolean NOT NULL DEFAULT false,
  notify_webhook_on_status_change boolean NOT NULL DEFAULT false,
  notify_webhook_on_priority_change boolean NOT NULL DEFAULT false,
  webhook_url text,
  webhook_secret text,
  role_subscriptions jsonb NOT NULL DEFAULT '{
    "super_admin": ["assignee_changed","status_changed","priority_changed","ai_triaged"],
    "admin": ["assignee_changed","status_changed"]
  }'::jsonb,
  muted_user_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  weekly_report_recipients text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.contact_inbox_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.contact_inbox_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read inbox settings"
  ON public.contact_inbox_settings FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins update inbox settings"
  ON public.contact_inbox_settings FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_contact_inbox_settings()
RETURNS public.contact_inbox_settings
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT * FROM public.contact_inbox_settings WHERE id = 1
$$;

CREATE OR REPLACE FUNCTION public.update_contact_inbox_settings(_patch jsonb)
RETURNS public.contact_inbox_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _row public.contact_inbox_settings;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  UPDATE public.contact_inbox_settings SET
    stale_hours                       = COALESCE((_patch->>'stale_hours')::int, stale_hours),
    target_response_hours             = COALESCE((_patch->>'target_response_hours')::int, target_response_hours),
    target_resolution_hours           = COALESCE((_patch->>'target_resolution_hours')::int, target_resolution_hours),
    notify_email_on_assign            = COALESCE((_patch->>'notify_email_on_assign')::boolean, notify_email_on_assign),
    notify_email_on_status_change     = COALESCE((_patch->>'notify_email_on_status_change')::boolean, notify_email_on_status_change),
    notify_email_on_priority_change   = COALESCE((_patch->>'notify_email_on_priority_change')::boolean, notify_email_on_priority_change),
    notify_webhook_on_assign          = COALESCE((_patch->>'notify_webhook_on_assign')::boolean, notify_webhook_on_assign),
    notify_webhook_on_status_change   = COALESCE((_patch->>'notify_webhook_on_status_change')::boolean, notify_webhook_on_status_change),
    notify_webhook_on_priority_change = COALESCE((_patch->>'notify_webhook_on_priority_change')::boolean, notify_webhook_on_priority_change),
    webhook_url                       = CASE WHEN _patch ? 'webhook_url' THEN NULLIF(_patch->>'webhook_url','') ELSE webhook_url END,
    webhook_secret                    = CASE WHEN _patch ? 'webhook_secret' THEN NULLIF(_patch->>'webhook_secret','') ELSE webhook_secret END,
    role_subscriptions                = CASE WHEN _patch ? 'role_subscriptions' THEN _patch->'role_subscriptions' ELSE role_subscriptions END,
    muted_user_ids                    = CASE WHEN _patch ? 'muted_user_ids'
                                              THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'muted_user_ids'))::uuid[]
                                              ELSE muted_user_ids END,
    weekly_report_recipients          = CASE WHEN _patch ? 'weekly_report_recipients'
                                              THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'weekly_report_recipients'))
                                              ELSE weekly_report_recipients END,
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = 1
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contact_inbox_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_contact_inbox_settings(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_my_inbox_notification_mute(_muted boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _muted THEN
    UPDATE public.contact_inbox_settings
       SET muted_user_ids = (SELECT ARRAY(SELECT DISTINCT unnest(muted_user_ids || _uid)))
     WHERE id = 1;
  ELSE
    UPDATE public.contact_inbox_settings
       SET muted_user_ids = ARRAY(SELECT u FROM unnest(muted_user_ids) AS t(u) WHERE u <> _uid)
     WHERE id = 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_my_inbox_notification_mute(boolean) TO authenticated;

-- Update weekly SLA function to use settings
CREATE OR REPLACE FUNCTION public.get_contact_sla_weekly()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _from timestamptz := now() - interval '7 days';
  _prev_from timestamptz := now() - interval '14 days';
  _prev_to timestamptz := now() - interval '7 days';
  _total int; _replied int; _closed int;
  _avg_response numeric; _avg_resolution numeric;
  _stale int; _by_priority jsonb; _by_category jsonb; _by_assignee jsonb;
  _prev_total int;
  _settings public.contact_inbox_settings%ROWTYPE;
  _stale_hours int; _target_response int; _target_resolution int;
  _within_response int; _within_resolution int;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT * INTO _settings FROM public.contact_inbox_settings WHERE id = 1;
  _stale_hours       := COALESCE(_settings.stale_hours, 24);
  _target_response   := COALESCE(_settings.target_response_hours, 24);
  _target_resolution := COALESCE(_settings.target_resolution_hours, 72);

  SELECT COUNT(*) INTO _total FROM contact_messages WHERE created_at >= _from;
  SELECT COUNT(*) INTO _prev_total FROM contact_messages
    WHERE created_at >= _prev_from AND created_at < _prev_to;
  SELECT COUNT(*) INTO _replied FROM contact_messages
    WHERE created_at >= _from AND replied_at IS NOT NULL;
  SELECT COUNT(*) INTO _closed FROM contact_messages
    WHERE created_at >= _from AND status = 'closed';
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (replied_at - created_at))/3600)::numeric, 2)
    INTO _avg_response FROM contact_messages
    WHERE created_at >= _from AND replied_at IS NOT NULL;
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/3600)::numeric, 2)
    INTO _avg_resolution FROM contact_messages
    WHERE created_at >= _from AND closed_at IS NOT NULL;
  SELECT COUNT(*) INTO _stale FROM contact_messages
    WHERE status IN ('new','read','under_review')
      AND created_at < now() - make_interval(hours => _stale_hours);

  SELECT COUNT(*) INTO _within_response FROM contact_messages
    WHERE created_at >= _from AND replied_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (replied_at - created_at))/3600 <= _target_response;
  SELECT COUNT(*) INTO _within_resolution FROM contact_messages
    WHERE created_at >= _from AND closed_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (closed_at - created_at))/3600 <= _target_resolution;

  SELECT jsonb_object_agg(priority, n) INTO _by_priority FROM (
    SELECT priority, COUNT(*) n FROM contact_messages WHERE created_at >= _from GROUP BY priority
  ) x;
  SELECT jsonb_object_agg(COALESCE(ai_category,'uncategorized'), n) INTO _by_category FROM (
    SELECT ai_category, COUNT(*) n FROM contact_messages WHERE created_at >= _from GROUP BY ai_category
  ) x;
  SELECT jsonb_agg(jsonb_build_object(
    'user_id', a.assigned_to, 'name', p.full_name,
    'total', a.n, 'replied', a.r
  )) INTO _by_assignee
  FROM (
    SELECT assigned_to, COUNT(*) n,
           COUNT(*) FILTER (WHERE replied_at IS NOT NULL) r
    FROM contact_messages WHERE created_at >= _from AND assigned_to IS NOT NULL
    GROUP BY assigned_to
  ) a
  LEFT JOIN profiles p ON p.user_id = a.assigned_to;

  RETURN jsonb_build_object(
    'window_start', _from, 'window_end', now(),
    'total', _total, 'previous_total', _prev_total,
    'replied', _replied, 'closed', _closed,
    'response_rate_pct', CASE WHEN _total > 0 THEN ROUND((_replied::numeric/_total)*100, 1) ELSE 0 END,
    'closure_rate_pct',  CASE WHEN _total > 0 THEN ROUND((_closed::numeric/_total)*100, 1) ELSE 0 END,
    'avg_response_hours', COALESCE(_avg_response, 0),
    'avg_resolution_hours', COALESCE(_avg_resolution, 0),
    'stale_open', _stale,
    'thresholds', jsonb_build_object(
      'stale_hours', _stale_hours,
      'target_response_hours', _target_response,
      'target_resolution_hours', _target_resolution
    ),
    'sla_response_within_target', _within_response,
    'sla_resolution_within_target', _within_resolution,
    'sla_response_compliance_pct', CASE WHEN _replied > 0 THEN ROUND((_within_response::numeric/_replied)*100, 1) ELSE 0 END,
    'sla_resolution_compliance_pct', CASE WHEN _closed > 0 THEN ROUND((_within_resolution::numeric/_closed)*100, 1) ELSE 0 END,
    'by_priority', COALESCE(_by_priority, '{}'::jsonb),
    'by_category', COALESCE(_by_category, '{}'::jsonb),
    'by_assignee', COALESCE(_by_assignee, '[]'::jsonb)
  );
END;
$$;

-- Audit log RPC for export (uses profiles.email)
CREATE OR REPLACE FUNCTION public.list_contact_audit_events(
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _event_types text[] DEFAULT NULL,
  _actor uuid DEFAULT NULL,
  _message_id uuid DEFAULT NULL,
  _limit int DEFAULT 500
)
RETURNS TABLE (
  id uuid, message_id uuid, ticket_number text,
  event_type text, from_value text, to_value text, note text, metadata jsonb,
  actor_id uuid, actor_name text, actor_email text,
  message_subject text, message_name text, message_email text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    e.id, e.message_id, m.ticket_number,
    e.event_type, e.from_value, e.to_value, e.note, e.metadata,
    e.actor_id, p.full_name AS actor_name, p.email AS actor_email,
    m.subject AS message_subject, m.name AS message_name, m.email AS message_email,
    e.created_at
  FROM public.contact_message_events e
  LEFT JOIN public.contact_messages m ON m.id = e.message_id
  LEFT JOIN public.profiles p ON p.user_id = e.actor_id
  WHERE public.has_admin_access(auth.uid())
    AND (_from IS NULL OR e.created_at >= _from)
    AND (_to IS NULL OR e.created_at <= _to)
    AND (_event_types IS NULL OR e.event_type = ANY (_event_types))
    AND (_actor IS NULL OR e.actor_id = _actor)
    AND (_message_id IS NULL OR e.message_id = _message_id)
  ORDER BY e.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 500), 5000));
$$;

GRANT EXECUTE ON FUNCTION public.list_contact_audit_events(timestamptz, timestamptz, text[], uuid, uuid, int) TO authenticated;