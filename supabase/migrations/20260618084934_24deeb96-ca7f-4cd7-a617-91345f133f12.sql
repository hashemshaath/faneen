-- 1) directory_sync_events — restrict SELECT to admins only.
DROP POLICY IF EXISTS "Authenticated can read directory sync events" ON public.directory_sync_events;
CREATE POLICY "Admins can read directory sync events"
  ON public.directory_sync_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Tighten Realtime Broadcast topic authorization.
--    Default-deny unknown topics, and add membership checks for the
--    entity-scoped channels the app uses today.
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _suffix text;
  _conv_id uuid;
  _entity_uid uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  -- Conversation / typing: participants only.
  IF _topic LIKE 'typing:%' OR _topic LIKE 'conversation:%' THEN
    _suffix := split_part(_topic, ':', 2);
    BEGIN
      _conv_id := _suffix::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = _conv_id
        AND (c.participant_1 = _uid OR c.participant_2 = _uid)
    );
  END IF;

  -- User-scoped channels (notifications, presence). Owner only.
  IF _topic LIKE 'notification:%'
     OR _topic LIKE 'user:%'
     OR _topic LIKE 'presence:user:%' THEN
    _suffix := regexp_replace(_topic, '^[^:]+:(.*)$', '\1');
    -- presence:user:<uid> has an extra prefix to strip
    IF _topic LIKE 'presence:user:%' THEN
      _suffix := split_part(_topic, ':', 3);
    END IF;
    BEGIN
      _entity_uid := _suffix::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN _entity_uid = _uid;
  END IF;

  -- Business-scoped channels (leads, work orders). Owner / staff only.
  IF _topic LIKE 'lead:%' OR _topic LIKE 'business:%' THEN
    _suffix := split_part(_topic, ':', 2);
    BEGIN
      _entity_uid := _suffix::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = _entity_uid AND b.user_id = _uid
    ) OR EXISTS (
      SELECT 1 FROM public.business_staff s
      WHERE s.business_id = _entity_uid AND s.user_id = _uid AND s.is_active = true
    );
  END IF;

  -- Client-site scoped channels.
  IF _topic LIKE 'site:%' THEN
    _suffix := split_part(_topic, ':', 2);
    BEGIN
      _entity_uid := _suffix::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.client_sites cs
      WHERE cs.id = _entity_uid AND cs.user_id = _uid
    );
  END IF;

  -- Admin-only broadcast topics.
  IF _topic LIKE 'admin:%' THEN
    RETURN public.has_role(_uid, 'admin');
  END IF;

  -- Default deny: unknown / unscoped topics are not allowed on Broadcast.
  -- Postgres-changes channels do not go through realtime.messages policies
  -- and remain governed by each source table's RLS, so this does not affect
  -- the app's `postgres_changes` subscriptions.
  RETURN false;
END;
$function$;