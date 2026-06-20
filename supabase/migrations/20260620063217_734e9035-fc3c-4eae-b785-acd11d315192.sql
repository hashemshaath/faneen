-- Fix 1: site:% Realtime topic authorization — use client_site_can_manage()
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

  IF _topic LIKE 'typing:%' OR _topic LIKE 'conversation:%' THEN
    _suffix := split_part(_topic, ':', 2);
    BEGIN _conv_id := _suffix::uuid; EXCEPTION WHEN others THEN RETURN false; END;
    RETURN EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = _conv_id
        AND (c.participant_1 = _uid OR c.participant_2 = _uid)
    );
  END IF;

  IF _topic LIKE 'notification:%'
     OR _topic LIKE 'user:%'
     OR _topic LIKE 'presence:user:%' THEN
    _suffix := regexp_replace(_topic, '^[^:]+:(.*)$', '\1');
    IF _topic LIKE 'presence:user:%' THEN
      _suffix := split_part(_topic, ':', 3);
    END IF;
    BEGIN _entity_uid := _suffix::uuid; EXCEPTION WHEN others THEN RETURN false; END;
    RETURN _entity_uid = _uid;
  END IF;

  IF _topic LIKE 'lead:%' OR _topic LIKE 'business:%' THEN
    _suffix := split_part(_topic, ':', 2);
    BEGIN _entity_uid := _suffix::uuid; EXCEPTION WHEN others THEN RETURN false; END;
    RETURN EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = _entity_uid AND b.user_id = _uid
    ) OR EXISTS (
      SELECT 1 FROM public.business_staff s
      WHERE s.business_id = _entity_uid AND s.user_id = _uid AND s.is_active = true
    );
  END IF;

  -- Client-site scoped channels — owner, client, business managers, or admins.
  IF _topic LIKE 'site:%' THEN
    _suffix := split_part(_topic, ':', 2);
    BEGIN _entity_uid := _suffix::uuid; EXCEPTION WHEN others THEN RETURN false; END;
    RETURN EXISTS (
      SELECT 1 FROM public.client_sites cs
      WHERE cs.id = _entity_uid
        AND public.client_site_can_manage(_uid, cs.*)
    );
  END IF;

  IF _topic LIKE 'admin:%' THEN
    RETURN public.has_role(_uid, 'admin');
  END IF;

  RETURN false;
END;
$function$;

-- Fix 2: password_reset_log — tighten the anon INSERT policy so it cannot be
-- abused to flood arbitrary email rows. Keep auditing functional for the real
-- recovery edge function (which sets sensible values).
DROP POLICY IF EXISTS "Anyone can insert password reset logs" ON public.password_reset_log;

CREATE POLICY "Constrained password reset log insert"
  ON public.password_reset_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Email must be syntactically valid and bounded.
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 254
    AND email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
    -- Status must come from the allowed set used by the recovery flow.
    AND status IN (
      'requested', 'sent', 'failed', 'rate_limited',
      'invalid_email', 'user_not_found', 'completed', 'expired'
    )
    -- IP / metadata bounded to keep the log compact and non-abusive.
    AND (ip_address IS NULL OR length(ip_address::text) <= 64)
    AND (request_id IS NULL OR length(request_id) <= 128)
    AND (metadata IS NULL OR pg_column_size(metadata) <= 2048)
  );