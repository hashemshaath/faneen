
-- 1) Sequence + ref_id
CREATE SEQUENCE IF NOT EXISTS public.lead_requests_ref_seq START WITH 1000000;

ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS ref_id text,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS needs_info_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Backfill ref_id for any existing rows
UPDATE public.lead_requests
SET ref_id = 'LR-' || LPAD(nextval('public.lead_requests_ref_seq')::text, 7, '0')
WHERE ref_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lead_requests_ref_id_uidx ON public.lead_requests(ref_id);

CREATE OR REPLACE FUNCTION public.lead_requests_set_ref_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN
    NEW.ref_id := 'LR-' || LPAD(nextval('public.lead_requests_ref_seq')::text, 7, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lead_requests_set_ref_id ON public.lead_requests;
CREATE TRIGGER trg_lead_requests_set_ref_id
  BEFORE INSERT ON public.lead_requests
  FOR EACH ROW EXECUTE FUNCTION public.lead_requests_set_ref_id();

-- 2) Status check constraint (allow new SR-1 vocabulary AND keep legacy values to avoid breaking admin UI)
ALTER TABLE public.lead_requests DROP CONSTRAINT IF EXISTS lead_requests_status_check;
ALTER TABLE public.lead_requests
  ADD CONSTRAINT lead_requests_status_check
  CHECK (status IN ('new','viewed','needs_info','accepted','rejected','closed','contacted','qualified','spam'));

-- 3) Audit table
CREATE TABLE IF NOT EXISTS public.lead_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_request_id uuid NOT NULL REFERENCES public.lead_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text,
  from_status text,
  to_status text,
  event_type text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_request_events_lr_idx ON public.lead_request_events(lead_request_id, created_at DESC);

ALTER TABLE public.lead_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view lead events" ON public.lead_request_events;
CREATE POLICY "Members can view lead events"
ON public.lead_request_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lead_requests lr
    WHERE lr.id = lead_request_events.lead_request_id
      AND (
        public.has_admin_access(auth.uid())
        OR public.is_business_owner_or_manager(auth.uid(), lr.business_id)
        OR public.is_business_staff(auth.uid(), lr.business_id)
        OR (lr.user_id IS NOT NULL AND lr.user_id = auth.uid())
      )
  )
);

-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER triggers can write.

-- 4) Tighten provider UPDATE policy: staff (non-manager) MUST NOT update.
DROP POLICY IF EXISTS "Business managers can update their leads" ON public.lead_requests;
CREATE POLICY "Business managers can update their leads"
ON public.lead_requests FOR UPDATE
USING (public.is_business_owner_or_manager(auth.uid(), business_id))
WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

-- 5) State machine + timestamp trigger
CREATE OR REPLACE FUNCTION public.lead_requests_state_machine()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _allowed boolean := true;
  _new_set CONSTANT text[] := ARRAY['new','viewed','needs_info','accepted','rejected','closed'];
  _actor uuid := auth.uid();
  _actor_role text;
BEGIN
  -- Prevent provider UI from mutating PII fields when updating status
  IF NOT public.has_admin_access(_actor) THEN
    NEW.name  := OLD.name;
    NEW.email := OLD.email;
    NEW.phone := OLD.phone;
    NEW.message := OLD.message;
    NEW.subject := OLD.subject;
    NEW.budget_range := OLD.budget_range;
    NEW.project_scope := OLD.project_scope;
    NEW.contact_preference := OLD.contact_preference;
    NEW.business_id := OLD.business_id;
    NEW.user_id := OLD.user_id;
    NEW.source := OLD.source;
  END IF;

  -- State machine — only enforce when both old and new are part of the SR-1 vocabulary
  IF NEW.status IS DISTINCT FROM OLD.status
     AND OLD.status = ANY(_new_set) AND NEW.status = ANY(_new_set) THEN
    _allowed := CASE OLD.status
      WHEN 'new'        THEN NEW.status IN ('viewed','accepted','rejected','needs_info','closed')
      WHEN 'viewed'     THEN NEW.status IN ('accepted','rejected','needs_info','closed')
      WHEN 'needs_info' THEN NEW.status IN ('accepted','rejected','closed','viewed')
      WHEN 'accepted'   THEN NEW.status IN ('closed')
      WHEN 'rejected'   THEN NEW.status IN ('closed')
      WHEN 'closed'     THEN false
      ELSE true
    END;
    IF NOT _allowed THEN
      RAISE EXCEPTION 'Invalid lead status transition: % → %', OLD.status, NEW.status
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Stamp lifecycle timestamps
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'viewed'     AND NEW.viewed_at     IS NULL THEN NEW.viewed_at     := now(); END IF;
    IF NEW.status = 'accepted'   THEN
      NEW.accepted_at := COALESCE(NEW.accepted_at, now());
      NEW.responded_at := COALESCE(NEW.responded_at, now());
      NEW.responded_by := COALESCE(NEW.responded_by, _actor);
    END IF;
    IF NEW.status = 'rejected'   THEN
      NEW.rejected_at := COALESCE(NEW.rejected_at, now());
      NEW.responded_at := COALESCE(NEW.responded_at, now());
      NEW.responded_by := COALESCE(NEW.responded_by, _actor);
    END IF;
    IF NEW.status = 'needs_info' THEN
      NEW.needs_info_at := COALESCE(NEW.needs_info_at, now());
      NEW.responded_at := COALESCE(NEW.responded_at, now());
      NEW.responded_by := COALESCE(NEW.responded_by, _actor);
    END IF;
    IF NEW.status = 'closed'     AND NEW.closed_at     IS NULL THEN NEW.closed_at     := now(); END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lead_requests_state_machine ON public.lead_requests;
CREATE TRIGGER trg_lead_requests_state_machine
  BEFORE UPDATE ON public.lead_requests
  FOR EACH ROW EXECUTE FUNCTION public.lead_requests_state_machine();

-- 6) Audit logger trigger
CREATE OR REPLACE FUNCTION public.lead_requests_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _actor uuid := auth.uid();
  _role text;
BEGIN
  IF public.has_admin_access(_actor) THEN
    _role := 'admin';
  ELSIF NEW.business_id IS NOT NULL AND public.is_business_owner_or_manager(_actor, NEW.business_id) THEN
    _role := 'provider';
  ELSE
    _role := 'system';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_request_events
      (lead_request_id, actor_id, actor_role, from_status, to_status, event_type)
    VALUES (NEW.id, NEW.user_id, COALESCE(_role,'customer'), NULL, NEW.status, 'created');
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_request_events
      (lead_request_id, actor_id, actor_role, from_status, to_status, event_type, note)
    VALUES (NEW.id, _actor, _role, OLD.status, NEW.status, 'status_changed', NULL);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lead_requests_audit_ins ON public.lead_requests;
CREATE TRIGGER trg_lead_requests_audit_ins
  AFTER INSERT ON public.lead_requests
  FOR EACH ROW EXECUTE FUNCTION public.lead_requests_audit();

DROP TRIGGER IF EXISTS trg_lead_requests_audit_upd ON public.lead_requests;
CREATE TRIGGER trg_lead_requests_audit_upd
  AFTER UPDATE ON public.lead_requests
  FOR EACH ROW EXECUTE FUNCTION public.lead_requests_audit();
