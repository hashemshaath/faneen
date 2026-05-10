-- Expand status CHECK to include cancelled
ALTER TABLE public.lead_requests DROP CONSTRAINT IF EXISTS lead_requests_status_check;
ALTER TABLE public.lead_requests
  ADD CONSTRAINT lead_requests_status_check
  CHECK (status IN ('new','viewed','needs_info','accepted','rejected','closed','cancelled','contacted','qualified','spam'));

-- Add cancelled_at timestamp
ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Update state machine: support customer cancel + cancelled is terminal.
CREATE OR REPLACE FUNCTION public.lead_requests_state_machine()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _allowed boolean := true;
  _set CONSTANT text[] := ARRAY['new','viewed','needs_info','accepted','rejected','closed','cancelled'];
  _actor uuid := auth.uid();
  _is_admin boolean := public.has_admin_access(_actor);
  _is_provider boolean := (NEW.business_id IS NOT NULL AND public.is_business_owner_or_manager(_actor, NEW.business_id));
  _is_customer boolean := (OLD.user_id IS NOT NULL AND OLD.user_id = _actor);
BEGIN
  -- Only admins can mutate PII and ownership fields. Provider + customer get fields locked.
  IF NOT _is_admin THEN
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
    NEW.internal_notes := OLD.internal_notes;
  END IF;

  -- Customer (non-admin, non-provider) may ONLY change status to 'cancelled'
  IF NOT _is_admin AND NOT _is_provider AND _is_customer THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Customers may only cancel their own service requests'
        USING ERRCODE = '42501';
    END IF;
    -- Strip provider-only fields
    NEW.priority := OLD.priority;
    NEW.responded_at := OLD.responded_at;
    NEW.responded_by := OLD.responded_by;
    NEW.viewed_at := OLD.viewed_at;
    NEW.accepted_at := OLD.accepted_at;
    NEW.rejected_at := OLD.rejected_at;
    NEW.needs_info_at := OLD.needs_info_at;
    NEW.closed_at := OLD.closed_at;
  END IF;

  -- State machine — only enforce when both old and new are part of the SR vocabulary
  IF NEW.status IS DISTINCT FROM OLD.status
     AND OLD.status = ANY(_set) AND NEW.status = ANY(_set) THEN
    _allowed := CASE OLD.status
      WHEN 'new'        THEN NEW.status IN ('viewed','accepted','rejected','needs_info','closed','cancelled')
      WHEN 'viewed'     THEN NEW.status IN ('accepted','rejected','needs_info','closed','cancelled')
      WHEN 'needs_info' THEN NEW.status IN ('accepted','rejected','closed','viewed','cancelled')
      WHEN 'accepted'   THEN NEW.status IN ('closed')
      WHEN 'rejected'   THEN NEW.status IN ('closed')
      WHEN 'closed'     THEN false
      WHEN 'cancelled'  THEN false
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
    IF NEW.status = 'cancelled'  AND NEW.cancelled_at  IS NULL THEN NEW.cancelled_at  := now(); END IF;
  END IF;

  RETURN NEW;
END $$;

-- Update audit logger to label customer/provider/admin actor roles correctly
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
  ELSIF NEW.user_id IS NOT NULL AND NEW.user_id = _actor THEN
    _role := 'customer';
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

-- Customer UPDATE policy: own row, only when status is in cancellable set
DROP POLICY IF EXISTS "Customers can cancel their own leads" ON public.lead_requests;
CREATE POLICY "Customers can cancel their own leads"
ON public.lead_requests FOR UPDATE
USING (
  user_id IS NOT NULL
  AND user_id = auth.uid()
  AND status IN ('new','viewed','needs_info')
)
WITH CHECK (
  user_id IS NOT NULL
  AND user_id = auth.uid()
  AND status = 'cancelled'
);