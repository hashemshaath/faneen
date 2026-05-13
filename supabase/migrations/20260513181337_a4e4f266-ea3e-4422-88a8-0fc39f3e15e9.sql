-- Audit trail for membership upgrade requests
CREATE TABLE IF NOT EXISTS public.membership_upgrade_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  business_id uuid NOT NULL,
  business_ref_id text,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'status_changed')),
  old_status text,
  new_status text,
  current_tier text,
  requested_tier text,
  billing_cycle text,
  actor_id uuid,
  changed_fields text[] NOT NULL DEFAULT '{}',
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mua_request   ON public.membership_upgrade_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_mua_business  ON public.membership_upgrade_audit(business_id);
CREATE INDEX IF NOT EXISTS idx_mua_ref       ON public.membership_upgrade_audit(business_ref_id);
CREATE INDEX IF NOT EXISTS idx_mua_created   ON public.membership_upgrade_audit(created_at DESC);

ALTER TABLE public.membership_upgrade_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read upgrade audit" ON public.membership_upgrade_audit;
CREATE POLICY "Admins read upgrade audit"
  ON public.membership_upgrade_audit
  FOR SELECT
  TO authenticated
  USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Owners read own upgrade audit" ON public.membership_upgrade_audit;
CREATE POLICY "Owners read own upgrade audit"
  ON public.membership_upgrade_audit
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Writes are trigger-only; no INSERT/UPDATE/DELETE policies for clients.

-- Trigger function: log every insert + meaningful update
CREATE OR REPLACE FUNCTION public.log_membership_upgrade_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed text[] := '{}';
  act text;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.membership_upgrade_audit (
      request_id, business_id, business_ref_id, user_id,
      action, old_status, new_status, current_tier, requested_tier,
      billing_cycle, actor_id, changed_fields, snapshot
    ) VALUES (
      NEW.id, NEW.business_id, NEW.business_ref_id, NEW.user_id,
      'created', NULL, NEW.status, NEW.current_tier, NEW.requested_tier,
      NEW.billing_cycle, auth.uid(), '{}', to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF NEW.status            IS DISTINCT FROM OLD.status            THEN changed := changed || 'status'; END IF;
    IF NEW.requested_tier    IS DISTINCT FROM OLD.requested_tier    THEN changed := changed || 'requested_tier'; END IF;
    IF NEW.requested_plan_id IS DISTINCT FROM OLD.requested_plan_id THEN changed := changed || 'requested_plan_id'; END IF;
    IF NEW.billing_cycle     IS DISTINCT FROM OLD.billing_cycle     THEN changed := changed || 'billing_cycle'; END IF;
    IF NEW.business_id       IS DISTINCT FROM OLD.business_id       THEN changed := changed || 'business_id'; END IF;
    IF NEW.business_ref_id   IS DISTINCT FROM OLD.business_ref_id   THEN changed := changed || 'business_ref_id'; END IF;
    IF NEW.admin_note        IS DISTINCT FROM OLD.admin_note        THEN changed := changed || 'admin_note'; END IF;

    IF array_length(changed, 1) IS NULL THEN
      RETURN NEW; -- no meaningful change
    END IF;

    act := CASE WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'status_changed' ELSE 'updated' END;

    INSERT INTO public.membership_upgrade_audit (
      request_id, business_id, business_ref_id, user_id,
      action, old_status, new_status, current_tier, requested_tier,
      billing_cycle, actor_id, changed_fields, snapshot
    ) VALUES (
      NEW.id, NEW.business_id, NEW.business_ref_id, NEW.user_id,
      act, OLD.status, NEW.status, NEW.current_tier, NEW.requested_tier,
      NEW.billing_cycle, auth.uid(), changed, to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_membership_upgrade_request ON public.membership_upgrade_requests;
CREATE TRIGGER trg_log_membership_upgrade_request
  AFTER INSERT OR UPDATE
  ON public.membership_upgrade_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_membership_upgrade_request();