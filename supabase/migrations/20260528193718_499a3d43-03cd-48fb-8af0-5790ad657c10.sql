-- BUSINESS-WORKFLOW-3 (retry): is_work_order_member takes (_user_id, _business_id).

CREATE TABLE IF NOT EXISTS public.work_order_sla_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL,
  work_order_id   uuid NOT NULL,
  task_id         uuid NULL,
  event_type      text NOT NULL CHECK (event_type IN (
                    'work_order.sla_due_soon',
                    'work_order.sla_overdue',
                    'task.sla_due_soon',
                    'task.sla_overdue'
                  )),
  level           text NOT NULL CHECK (level IN (
                    'due_soon', 'overdue_1', 'overdue_2', 'overdue_3'
                  )),
  idempotency_key text NOT NULL UNIQUE,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.work_order_sla_events TO authenticated;
GRANT ALL    ON public.work_order_sla_events TO service_role;

ALTER TABLE public.work_order_sla_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wo_sla_events_select_member ON public.work_order_sla_events;
CREATE POLICY wo_sla_events_select_member
  ON public.work_order_sla_events
  FOR SELECT
  TO authenticated
  USING (public.is_work_order_member(auth.uid(), business_id));

CREATE INDEX IF NOT EXISTS idx_wo_sla_events_business
  ON public.work_order_sla_events (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wo_sla_events_work_order
  ON public.work_order_sla_events (work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_sla_events_task
  ON public.work_order_sla_events (task_id) WHERE task_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_work_order_sla_due_items()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_scanned int := 0;
  v_created int := 0;
  v_skipped int := 0;
  r record;
  v_level text;
  v_event_type text;
  v_key text;
  v_actionable_wo   text[] := ARRAY['draft','active','on_hold'];
  v_actionable_task text[] := ARRAY['todo','in_progress','blocked'];
  v_inserted boolean;
BEGIN
  FOR r IN
    SELECT id, business_id, due_at, status
    FROM public.work_orders
    WHERE deleted_at IS NULL
      AND due_at IS NOT NULL
      AND status = ANY (v_actionable_wo)
  LOOP
    v_scanned := v_scanned + 1;

    IF (r.due_at - v_now) > interval '72 hours' THEN
      v_level := 'none';
    ELSIF r.due_at >= v_now THEN
      v_level := 'due_soon';
    ELSIF (v_now - r.due_at) >= interval '7 days' THEN
      v_level := 'overdue_3';
    ELSIF (v_now - r.due_at) >= interval '3 days' THEN
      v_level := 'overdue_2';
    ELSE
      v_level := 'overdue_1';
    END IF;

    IF v_level = 'none' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_event_type := CASE WHEN v_level = 'due_soon'
                         THEN 'work_order.sla_due_soon'
                         ELSE 'work_order.sla_overdue' END;
    v_key := 'wo:' || r.id::text || ':' || v_level;

    WITH ins AS (
      INSERT INTO public.work_order_sla_events
        (business_id, work_order_id, event_type, level, idempotency_key)
      VALUES (r.business_id, r.id, v_event_type, v_level, v_key)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING 1
    )
    SELECT EXISTS (SELECT 1 FROM ins) INTO v_inserted;

    IF v_inserted THEN v_created := v_created + 1;
    ELSE v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT t.id, t.work_order_id, w.business_id, t.due_at, t.status
    FROM public.work_order_tasks t
    JOIN public.work_orders w ON w.id = t.work_order_id
    WHERE t.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND t.due_at IS NOT NULL
      AND t.status = ANY (v_actionable_task)
  LOOP
    v_scanned := v_scanned + 1;

    IF (r.due_at - v_now) > interval '72 hours' THEN
      v_level := 'none';
    ELSIF r.due_at >= v_now THEN
      v_level := 'due_soon';
    ELSIF (v_now - r.due_at) >= interval '7 days' THEN
      v_level := 'overdue_3';
    ELSIF (v_now - r.due_at) >= interval '3 days' THEN
      v_level := 'overdue_2';
    ELSE
      v_level := 'overdue_1';
    END IF;

    IF v_level = 'none' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_event_type := CASE WHEN v_level = 'due_soon'
                         THEN 'task.sla_due_soon'
                         ELSE 'task.sla_overdue' END;
    v_key := 'task:' || r.id::text || ':' || v_level;

    WITH ins AS (
      INSERT INTO public.work_order_sla_events
        (business_id, work_order_id, task_id, event_type, level, idempotency_key)
      VALUES (r.business_id, r.work_order_id, r.id, v_event_type, v_level, v_key)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING 1
    )
    SELECT EXISTS (SELECT 1 FROM ins) INTO v_inserted;

    IF v_inserted THEN v_created := v_created + 1;
    ELSE v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'scanned', v_scanned,
    'events_created', v_created,
    'notifications_created', 0,
    'skipped', v_skipped
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_work_order_sla_due_items() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_work_order_sla_due_items() FROM anon;
REVOKE ALL ON FUNCTION public.process_work_order_sla_due_items() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_work_order_sla_due_items() TO service_role;