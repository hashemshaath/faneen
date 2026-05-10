-- SR-3B: Quote flow on lead_requests

-- 1) Expand status CHECK to include 'quoted'
ALTER TABLE public.lead_requests DROP CONSTRAINT IF EXISTS lead_requests_status_check;
ALTER TABLE public.lead_requests
  ADD CONSTRAINT lead_requests_status_check
  CHECK (status IN ('new','viewed','needs_info','accepted','rejected','closed','cancelled','quoted','contacted','qualified','spam'));

-- 2) Quote fields
ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS quoted_at         timestamptz,
  ADD COLUMN IF NOT EXISTS quoted_by         uuid,
  ADD COLUMN IF NOT EXISTS quote_amount      numeric,
  ADD COLUMN IF NOT EXISTS quote_currency    text DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS quote_note        text,
  ADD COLUMN IF NOT EXISTS quote_valid_until date;

-- 3) Safe constraints
ALTER TABLE public.lead_requests DROP CONSTRAINT IF EXISTS lead_requests_quote_amount_nonneg;
ALTER TABLE public.lead_requests
  ADD CONSTRAINT lead_requests_quote_amount_nonneg
  CHECK (quote_amount IS NULL OR quote_amount >= 0);

ALTER TABLE public.lead_requests DROP CONSTRAINT IF EXISTS lead_requests_quote_currency_check;
ALTER TABLE public.lead_requests
  ADD CONSTRAINT lead_requests_quote_currency_check
  CHECK (quote_currency IS NULL OR quote_currency IN ('SAR'));

ALTER TABLE public.lead_requests DROP CONSTRAINT IF EXISTS lead_requests_quote_note_len;
ALTER TABLE public.lead_requests
  ADD CONSTRAINT lead_requests_quote_note_len
  CHECK (quote_note IS NULL OR char_length(quote_note) <= 1000);

-- 4) State machine: add 'quoted' as a near-terminal state.
--    accepted/needs_info → quoted; quoted → closed only.
--    Provider can edit only quote-related + status + internal_notes + priority.
CREATE OR REPLACE FUNCTION public.lead_requests_state_machine()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _allowed boolean := true;
  _set CONSTANT text[] := ARRAY['new','viewed','needs_info','accepted','rejected','closed','cancelled','quoted'];
  _actor uuid := auth.uid();
  _is_admin boolean := public.has_admin_access(_actor);
  _is_provider boolean := (NEW.business_id IS NOT NULL AND public.is_business_owner_or_manager(_actor, NEW.business_id));
  _is_customer boolean := (OLD.user_id IS NOT NULL AND OLD.user_id = _actor);
BEGIN
  -- Only admins may mutate PII / ownership fields. Provider + customer get those locked.
  IF NOT _is_admin THEN
    NEW.name              := OLD.name;
    NEW.email             := OLD.email;
    NEW.phone             := OLD.phone;
    NEW.message           := OLD.message;
    NEW.subject           := OLD.subject;
    NEW.budget_range      := OLD.budget_range;
    NEW.project_scope     := OLD.project_scope;
    NEW.contact_preference:= OLD.contact_preference;
    NEW.business_id       := OLD.business_id;
    NEW.user_id           := OLD.user_id;
    NEW.source            := OLD.source;
  END IF;

  -- Customer (non-admin, non-provider): only allowed change is status -> 'cancelled'.
  -- Quote fields and provider-only fields are locked.
  IF NOT _is_admin AND NOT _is_provider AND _is_customer THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Customers may only cancel their own service requests'
        USING ERRCODE = '42501';
    END IF;
    NEW.priority         := OLD.priority;
    NEW.internal_notes   := OLD.internal_notes;
    NEW.responded_at     := OLD.responded_at;
    NEW.responded_by     := OLD.responded_by;
    NEW.viewed_at        := OLD.viewed_at;
    NEW.accepted_at      := OLD.accepted_at;
    NEW.rejected_at      := OLD.rejected_at;
    NEW.needs_info_at    := OLD.needs_info_at;
    NEW.closed_at        := OLD.closed_at;
    NEW.quoted_at        := OLD.quoted_at;
    NEW.quoted_by        := OLD.quoted_by;
    NEW.quote_amount     := OLD.quote_amount;
    NEW.quote_currency   := OLD.quote_currency;
    NEW.quote_note       := OLD.quote_note;
    NEW.quote_valid_until:= OLD.quote_valid_until;
  END IF;

  -- Provider (non-admin) cannot edit ownership/PII (already locked above) and cannot
  -- alter system audit fields they don't own.
  IF _is_provider AND NOT _is_admin THEN
    -- Lock quote provenance — only the trigger sets quoted_at/quoted_by.
    IF NEW.status = 'quoted' AND OLD.status <> 'quoted' THEN
      NEW.quoted_at := NULL; -- will be stamped below
      NEW.quoted_by := NULL;
    ELSIF OLD.status = 'quoted' THEN
      -- After quote is set, provider cannot rewrite quote fields by direct UPDATE.
      NEW.quoted_at        := OLD.quoted_at;
      NEW.quoted_by        := OLD.quoted_by;
      NEW.quote_amount     := OLD.quote_amount;
      NEW.quote_currency   := OLD.quote_currency;
      NEW.quote_note       := OLD.quote_note;
      NEW.quote_valid_until:= OLD.quote_valid_until;
    END IF;
  END IF;

  -- State machine — only enforce when both old and new are part of the SR vocabulary.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND OLD.status = ANY(_set) AND NEW.status = ANY(_set) THEN
    _allowed := CASE OLD.status
      WHEN 'new'        THEN NEW.status IN ('viewed','accepted','rejected','needs_info','closed','cancelled')
      WHEN 'viewed'     THEN NEW.status IN ('accepted','rejected','needs_info','closed','cancelled')
      WHEN 'needs_info' THEN NEW.status IN ('accepted','rejected','closed','viewed','cancelled','quoted')
      WHEN 'accepted'   THEN NEW.status IN ('closed','quoted')
      WHEN 'rejected'   THEN NEW.status IN ('closed')
      WHEN 'closed'     THEN false
      WHEN 'cancelled'  THEN false
      WHEN 'quoted'     THEN NEW.status IN ('closed')
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
      NEW.accepted_at  := COALESCE(NEW.accepted_at, now());
      NEW.responded_at := COALESCE(NEW.responded_at, now());
      NEW.responded_by := COALESCE(NEW.responded_by, _actor);
    END IF;
    IF NEW.status = 'rejected'   THEN
      NEW.rejected_at  := COALESCE(NEW.rejected_at, now());
      NEW.responded_at := COALESCE(NEW.responded_at, now());
      NEW.responded_by := COALESCE(NEW.responded_by, _actor);
    END IF;
    IF NEW.status = 'needs_info' THEN
      NEW.needs_info_at:= COALESCE(NEW.needs_info_at, now());
      NEW.responded_at := COALESCE(NEW.responded_at, now());
      NEW.responded_by := COALESCE(NEW.responded_by, _actor);
    END IF;
    IF NEW.status = 'closed'     AND NEW.closed_at     IS NULL THEN NEW.closed_at     := now(); END IF;
    IF NEW.status = 'cancelled'  AND NEW.cancelled_at  IS NULL THEN NEW.cancelled_at  := now(); END IF;
    IF NEW.status = 'quoted' THEN
      NEW.quoted_at    := COALESCE(NEW.quoted_at, now());
      NEW.quoted_by    := COALESCE(NEW.quoted_by, _actor);
      NEW.responded_at := COALESCE(NEW.responded_at, now());
      NEW.responded_by := COALESCE(NEW.responded_by, _actor);
      -- Require an amount on transition to quoted
      IF NEW.quote_amount IS NULL OR NEW.quote_amount <= 0 THEN
        RAISE EXCEPTION 'A positive quote_amount is required when moving to quoted'
          USING ERRCODE = '22023';
      END IF;
      -- Validate valid_until is today or future
      IF NEW.quote_valid_until IS NOT NULL AND NEW.quote_valid_until < CURRENT_DATE THEN
        RAISE EXCEPTION 'quote_valid_until must be today or later'
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- 5) Audit logger: emit specific event_type for quote.
CREATE OR REPLACE FUNCTION public.lead_requests_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _actor uuid := auth.uid();
  _role text;
  _evt text;
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
    _evt := CASE WHEN NEW.status = 'quoted' THEN 'quote_sent' ELSE 'status_changed' END;
    INSERT INTO public.lead_request_events
      (lead_request_id, actor_id, actor_role, from_status, to_status, event_type, note)
    VALUES (NEW.id, _actor, _role, OLD.status, NEW.status, _evt, NULL);
  END IF;
  RETURN NEW;
END $$;