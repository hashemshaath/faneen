ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_state text NOT NULL DEFAULT 'ready' CHECK (work_state IN ('ready','in_progress','done','blocked')),
  ADD COLUMN IF NOT EXISTS work_state_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_priority text CHECK (ai_priority IN ('low','normal','high','urgent')),
  ADD COLUMN IF NOT EXISTS ai_category text,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_suggested_reply text,
  ADD COLUMN IF NOT EXISTS ai_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric(3,2);

DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
  WHERE conrelid = 'public.contact_messages'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.contact_messages DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_messages_status_check
  CHECK (status IN ('new','read','under_review','replied','closed','archived'));

CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1000000;

CREATE OR REPLACE FUNCTION public.contact_messages_assign_ticket_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || (nextval('public.ticket_number_seq') + 1)::text;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_contact_messages_ticket_number ON public.contact_messages;
CREATE TRIGGER trg_contact_messages_ticket_number
BEFORE INSERT ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.contact_messages_assign_ticket_number();

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.contact_messages WHERE ticket_number IS NULL
)
UPDATE public.contact_messages cm
SET ticket_number = 'TKT-' || (1000000 + ranked.rn)::text
FROM ranked WHERE cm.id = ranked.id;

CREATE TABLE IF NOT EXISTS public.contact_message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  from_value text, to_value text, note text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cme_message_id_created ON public.contact_message_events(message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_assigned_to ON public.contact_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cm_status_priority ON public.contact_messages(status, priority);

ALTER TABLE public.contact_message_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read events" ON public.contact_message_events;
CREATE POLICY "Admins read events" ON public.contact_message_events
  FOR SELECT TO authenticated USING (public.has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins write events" ON public.contact_message_events;
CREATE POLICY "Admins write events" ON public.contact_message_events
  FOR INSERT TO authenticated WITH CHECK (public.has_admin_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_contact_message_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.contact_message_events (message_id, actor_id, event_type, to_value)
    VALUES (NEW.id, NEW.user_id, 'created', NEW.status);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.contact_message_events (message_id, actor_id, event_type, from_value, to_value)
    VALUES (NEW.id, _actor, 'status_changed', OLD.status, NEW.status);
    IF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
      NEW.closed_at := now(); NEW.closed_by := _actor;
    END IF;
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.contact_message_events (message_id, actor_id, event_type, from_value, to_value)
    VALUES (NEW.id, _actor, 'assignee_changed',
            COALESCE(OLD.assigned_to::text,''), COALESCE(NEW.assigned_to::text,''));
    NEW.assigned_at := now(); NEW.assigned_by := _actor;
  END IF;

  IF NEW.work_state IS DISTINCT FROM OLD.work_state THEN
    INSERT INTO public.contact_message_events (message_id, actor_id, event_type, from_value, to_value)
    VALUES (NEW.id, _actor, 'work_state_changed', OLD.work_state, NEW.work_state);
    NEW.work_state_updated_at := now();
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.contact_message_events (message_id, actor_id, event_type, from_value, to_value)
    VALUES (NEW.id, _actor, 'priority_changed', OLD.priority, NEW.priority);
  END IF;

  IF NEW.ai_processed_at IS DISTINCT FROM OLD.ai_processed_at AND NEW.ai_processed_at IS NOT NULL THEN
    INSERT INTO public.contact_message_events (message_id, actor_id, event_type, to_value, metadata)
    VALUES (NEW.id, _actor, 'ai_triaged', NEW.ai_priority,
            jsonb_build_object('category', NEW.ai_category, 'confidence', NEW.ai_confidence));
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_contact_messages_log_changes ON public.contact_messages;
CREATE TRIGGER trg_contact_messages_log_changes
BEFORE INSERT OR UPDATE ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.log_contact_message_changes();

CREATE OR REPLACE FUNCTION public.get_contact_sla_weekly()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _from timestamptz := now() - interval '7 days';
  _prev_from timestamptz := now() - interval '14 days';
  _prev_to timestamptz := now() - interval '7 days';
  _total int; _replied int; _closed int;
  _avg_response numeric; _avg_resolution numeric;
  _stale int; _by_priority jsonb; _by_category jsonb; _by_assignee jsonb;
  _prev_total int;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

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
      AND created_at < now() - interval '24 hours';

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
    'response_rate_pct', CASE WHEN _total>0 THEN ROUND((_replied::numeric/_total)*100,1) ELSE 0 END,
    'closure_rate_pct',  CASE WHEN _total>0 THEN ROUND((_closed::numeric /_total)*100,1) ELSE 0 END,
    'avg_response_hours', COALESCE(_avg_response, 0),
    'avg_resolution_hours', COALESCE(_avg_resolution, 0),
    'stale_open', _stale,
    'by_priority', COALESCE(_by_priority, '{}'::jsonb),
    'by_category', COALESCE(_by_category, '{}'::jsonb),
    'by_assignee', COALESCE(_by_assignee, '[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.list_admin_assignees()
RETURNS TABLE(user_id uuid, full_name text, email text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id,
         COALESCE(p.full_name, '')         AS full_name,
         COALESCE(p.email, '')             AS email,
         ur.role::text
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('admin', 'super_admin')
    AND public.has_admin_access(auth.uid())
  ORDER BY p.full_name;
$$;