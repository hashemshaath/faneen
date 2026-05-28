-- BUSINESS-WORKFLOW-6 — Production & Fabrication Pipeline.
-- Adds canonical production stages, stage assignments, and checklists
-- (fabrication / installation / qc / delivery). No payments, no procurement
-- accounting, no inventory, no realtime, no notifications.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend work_orders with non-breaking pipeline_stage column.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_pipeline_stage_chk'
  ) THEN
    ALTER TABLE public.work_orders
      ADD CONSTRAINT work_orders_pipeline_stage_chk
      CHECK (pipeline_stage IN (
        'draft','measured','quoted','approved','engineering',
        'procurement','fabrication','qc','ready','installation',
        'completed','cancelled'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_orders_pipeline_stage
  ON public.work_orders (pipeline_stage) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Sequences for human-readable refs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.work_order_pipeline_events_ref_seq START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS public.work_order_stage_assignments_ref_seq START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS public.work_order_checklists_ref_seq START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS public.work_order_checklist_items_ref_seq START WITH 1000;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. work_order_pipeline_events — append-only stage transition history.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.work_order_pipeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  from_stage text NULL,
  to_stage text NOT NULL,
  actor_id uuid NOT NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (to_stage IN (
    'draft','measured','quoted','approved','engineering',
    'procurement','fabrication','qc','ready','installation',
    'completed','cancelled'
  )),
  CHECK (from_stage IS NULL OR from_stage IN (
    'draft','measured','quoted','approved','engineering',
    'procurement','fabrication','qc','ready','installation',
    'completed','cancelled'
  )),
  CHECK (notes IS NULL OR char_length(notes) <= 1000)
);

CREATE INDEX idx_wo_pevents_wo ON public.work_order_pipeline_events (work_order_id);
CREATE INDEX idx_wo_pevents_business ON public.work_order_pipeline_events (business_id);
CREATE INDEX idx_wo_pevents_created ON public.work_order_pipeline_events (work_order_id, created_at);

GRANT SELECT, INSERT ON public.work_order_pipeline_events TO authenticated;
GRANT ALL ON public.work_order_pipeline_events TO service_role;

ALTER TABLE public.work_order_pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_pevents_select_member" ON public.work_order_pipeline_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.deleted_at IS NULL
      AND public.is_work_order_member(auth.uid(), w.business_id)
  )
);

-- Inserts come from the transition RPC (security definer), so deny direct inserts.
CREATE POLICY "wo_pevents_insert_manager" ON public.work_order_pipeline_events
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.business_id = work_order_pipeline_events.business_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE OR REPLACE FUNCTION public.trg_work_order_pipeline_events_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ref_id IS NULL THEN
    NEW.ref_id := 'WOPE-' || nextval('public.work_order_pipeline_events_ref_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_pipeline_events_defaults
BEFORE INSERT ON public.work_order_pipeline_events
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_pipeline_events_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. work_order_stage_assignments — who is assigned to which stage.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.work_order_stage_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  stage_key text NOT NULL,
  assigned_to_user_id uuid NOT NULL,
  assigned_by_user_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (stage_key IN (
    'draft','measured','quoted','approved','engineering',
    'procurement','fabrication','qc','ready','installation',
    'completed','cancelled'
  )),
  CHECK (notes IS NULL OR char_length(notes) <= 500)
);

CREATE INDEX idx_wo_stage_assn_wo ON public.work_order_stage_assignments (work_order_id) WHERE unassigned_at IS NULL;
CREATE INDEX idx_wo_stage_assn_business ON public.work_order_stage_assignments (business_id);
CREATE INDEX idx_wo_stage_assn_user ON public.work_order_stage_assignments (assigned_to_user_id) WHERE unassigned_at IS NULL;
CREATE UNIQUE INDEX uq_wo_stage_assn_active
  ON public.work_order_stage_assignments (work_order_id, stage_key)
  WHERE unassigned_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.work_order_stage_assignments TO authenticated;
GRANT ALL ON public.work_order_stage_assignments TO service_role;

ALTER TABLE public.work_order_stage_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_stage_assn_select_member" ON public.work_order_stage_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.deleted_at IS NULL
      AND public.is_work_order_member(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_stage_assn_insert_manager" ON public.work_order_stage_assignments
FOR INSERT TO authenticated
WITH CHECK (
  assigned_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.business_id = work_order_stage_assignments.business_id
      AND w.deleted_at IS NULL
      AND w.status NOT IN ('completed','cancelled')
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_stage_assn_update_manager" ON public.work_order_stage_assignments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.status NOT IN ('completed','cancelled')
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE OR REPLACE FUNCTION public.trg_work_order_stage_assignments_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ref_id IS NULL THEN
    NEW.ref_id := 'WOSA-' || nextval('public.work_order_stage_assignments_ref_seq')::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_stage_assignments_defaults
BEFORE INSERT OR UPDATE ON public.work_order_stage_assignments
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_stage_assignments_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. work_order_checklists — fabrication / installation / qc / delivery.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.work_order_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  checklist_type text NOT NULL
    CHECK (checklist_type IN ('fabrication','installation','qc','delivery')),
  sector_key text NULL
    CHECK (sector_key IS NULL OR sector_key IN ('kitchen','aluminum','glass','steel','wood','generic')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','completed','cancelled')),
  assigned_to_user_id uuid NULL,
  created_by uuid NOT NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CHECK (char_length(title) BETWEEN 1 AND 200)
);

CREATE INDEX idx_wo_checklists_wo ON public.work_order_checklists (work_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_checklists_business ON public.work_order_checklists (business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_checklists_type ON public.work_order_checklists (checklist_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_checklists_assignee ON public.work_order_checklists (assigned_to_user_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_checklists TO authenticated;
GRANT ALL ON public.work_order_checklists TO service_role;

ALTER TABLE public.work_order_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_checklists_select_member" ON public.work_order_checklists
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.deleted_at IS NULL
      AND public.is_work_order_member(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_checklists_insert_manager" ON public.work_order_checklists
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.business_id = work_order_checklists.business_id
      AND w.deleted_at IS NULL
      AND w.status NOT IN ('completed','cancelled')
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_checklists_update_manager" ON public.work_order_checklists
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.status NOT IN ('completed','cancelled')
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_checklists_delete_manager" ON public.work_order_checklists
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.status NOT IN ('completed','cancelled')
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE OR REPLACE FUNCTION public.trg_work_order_checklists_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ref_id IS NULL THEN
    NEW.ref_id := 'WOCL-' || nextval('public.work_order_checklists_ref_seq')::text;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('completed','cancelled')
       AND NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'checklist_locked';
    END IF;
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
      NEW.completed_at := now();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_checklists_defaults
BEFORE INSERT OR UPDATE ON public.work_order_checklists
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_checklists_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. work_order_checklist_items — label/completed/completed_by/completed_at/notes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.work_order_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  checklist_id uuid NOT NULL REFERENCES public.work_order_checklists(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_by uuid NULL,
  completed_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(label) BETWEEN 1 AND 200),
  CHECK (notes IS NULL OR char_length(notes) <= 1000)
);

CREATE INDEX idx_wo_checklist_items_checklist ON public.work_order_checklist_items (checklist_id);
CREATE INDEX idx_wo_checklist_items_sort ON public.work_order_checklist_items (checklist_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_checklist_items TO authenticated;
GRANT ALL ON public.work_order_checklist_items TO service_role;

ALTER TABLE public.work_order_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_checklist_items_select_member" ON public.work_order_checklist_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_order_checklists c
    JOIN public.work_orders w ON w.id = c.work_order_id
    WHERE c.id = checklist_id
      AND c.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND public.is_work_order_member(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_checklist_items_insert_manager" ON public.work_order_checklist_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_order_checklists c
    JOIN public.work_orders w ON w.id = c.work_order_id
    WHERE c.id = checklist_id
      AND c.deleted_at IS NULL
      AND c.status = 'open'
      AND w.status NOT IN ('completed','cancelled')
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

-- Updates allowed for managers OR for the assigned user on their own checklist.
CREATE POLICY "wo_checklist_items_update_manager_or_assignee" ON public.work_order_checklist_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_order_checklists c
    JOIN public.work_orders w ON w.id = c.work_order_id
    WHERE c.id = checklist_id
      AND c.deleted_at IS NULL
      AND c.status = 'open'
      AND w.status NOT IN ('completed','cancelled')
      AND (
        public.is_business_owner_or_manager(auth.uid(), w.business_id)
        OR c.assigned_to_user_id = auth.uid()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_order_checklists c
    JOIN public.work_orders w ON w.id = c.work_order_id
    WHERE c.id = checklist_id
      AND c.status = 'open'
      AND (
        public.is_business_owner_or_manager(auth.uid(), w.business_id)
        OR c.assigned_to_user_id = auth.uid()
      )
  )
);

CREATE POLICY "wo_checklist_items_delete_manager" ON public.work_order_checklist_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_order_checklists c
    JOIN public.work_orders w ON w.id = c.work_order_id
    WHERE c.id = checklist_id
      AND c.status = 'open'
      AND w.status NOT IN ('completed','cancelled')
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE OR REPLACE FUNCTION public.trg_work_order_checklist_items_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ref_id IS NULL THEN
    NEW.ref_id := 'WOCLI-' || nextval('public.work_order_checklist_items_ref_seq')::text;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Auto-stamp completed_by/at when ticking; clear on un-tick.
    IF NEW.completed = true AND OLD.completed = false THEN
      NEW.completed_at := now();
      NEW.completed_by := coalesce(NEW.completed_by, auth.uid());
    ELSIF NEW.completed = false AND OLD.completed = true THEN
      NEW.completed_at := NULL;
      NEW.completed_by := NULL;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_checklist_items_defaults
BEFORE INSERT OR UPDATE ON public.work_order_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_checklist_items_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC: transition_work_order_pipeline_stage
--   Enforces forward-only progression. Completed/cancelled are terminal.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.transition_work_order_pipeline_stage(
  _work_order_id uuid,
  _to_stage text,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wo record;
  v_order int;
  v_to_order int;
  v_stage_orders constant jsonb := jsonb_build_object(
    'draft', 0, 'measured', 1, 'quoted', 2, 'approved', 3, 'engineering', 4,
    'procurement', 5, 'fabrication', 6, 'qc', 7, 'ready', 8, 'installation', 9,
    'completed', 10, 'cancelled', 99
  );
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT id, business_id, status, pipeline_stage, deleted_at
    INTO v_wo
    FROM public.work_orders
   WHERE id = _work_order_id;

  IF NOT FOUND OR v_wo.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'work_order_not_found';
  END IF;

  IF NOT public.is_business_owner_or_manager(auth.uid(), v_wo.business_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_wo.status IN ('completed','cancelled')
     OR v_wo.pipeline_stage IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'work_order_locked';
  END IF;

  IF NOT (v_stage_orders ? _to_stage) THEN
    RAISE EXCEPTION 'invalid_stage';
  END IF;

  v_order := (v_stage_orders ->> v_wo.pipeline_stage)::int;
  v_to_order := (v_stage_orders ->> _to_stage)::int;

  -- Cancelled allowed from any non-terminal stage. Otherwise enforce forward-only and no skipping to completed.
  IF _to_stage = 'cancelled' THEN
    -- allowed
    NULL;
  ELSIF _to_stage = 'completed' THEN
    IF v_wo.pipeline_stage <> 'installation' THEN
      RAISE EXCEPTION 'cannot_skip_to_completed';
    END IF;
  ELSIF v_to_order <= v_order THEN
    RAISE EXCEPTION 'forward_only';
  END IF;

  UPDATE public.work_orders
     SET pipeline_stage = _to_stage,
         updated_at = now(),
         status = CASE
           WHEN _to_stage = 'completed' THEN 'completed'
           WHEN _to_stage = 'cancelled' THEN 'cancelled'
           ELSE status
         END
   WHERE id = v_wo.id;

  INSERT INTO public.work_order_pipeline_events
    (work_order_id, business_id, from_stage, to_stage, actor_id, notes)
  VALUES
    (v_wo.id, v_wo.business_id, v_wo.pipeline_stage, _to_stage, auth.uid(), _notes);

  INSERT INTO public.business_audit_log
    (business_id, actor_id, entity_type, entity_id, action, metadata)
  VALUES (
    v_wo.business_id, auth.uid(), 'work_order', v_wo.id,
    'work_order.stage_changed',
    jsonb_build_object('from', v_wo.pipeline_stage, 'to', _to_stage)
  );

  RETURN jsonb_build_object('ok', true, 'from', v_wo.pipeline_stage, 'to', _to_stage);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_work_order_pipeline_stage(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.transition_work_order_pipeline_stage(uuid, text, text) FROM anon;
