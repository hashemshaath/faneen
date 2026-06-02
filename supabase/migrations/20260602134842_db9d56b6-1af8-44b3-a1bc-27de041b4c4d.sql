-- 1) Fix audit trigger: use array_append to avoid ambiguous "text[] || text" parsing as array literal.
CREATE OR REPLACE FUNCTION public.log_membership_upgrade_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  changed text[] := ARRAY[]::text[];
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
      NEW.billing_cycle, auth.uid(), ARRAY[]::text[], to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF NEW.status            IS DISTINCT FROM OLD.status            THEN changed := array_append(changed, 'status'); END IF;
    IF NEW.requested_tier    IS DISTINCT FROM OLD.requested_tier    THEN changed := array_append(changed, 'requested_tier'); END IF;
    IF NEW.requested_plan_id IS DISTINCT FROM OLD.requested_plan_id THEN changed := array_append(changed, 'requested_plan_id'); END IF;
    IF NEW.billing_cycle     IS DISTINCT FROM OLD.billing_cycle     THEN changed := array_append(changed, 'billing_cycle'); END IF;
    IF NEW.business_id       IS DISTINCT FROM OLD.business_id       THEN changed := array_append(changed, 'business_id'); END IF;
    IF NEW.business_ref_id   IS DISTINCT FROM OLD.business_ref_id   THEN changed := array_append(changed, 'business_ref_id'); END IF;
    IF NEW.admin_note        IS DISTINCT FROM OLD.admin_note        THEN changed := array_append(changed, 'admin_note'); END IF;

    IF array_length(changed, 1) IS NULL THEN
      RETURN NEW;
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
$function$;

-- 2) Cancel orphaned pending requests (business or requester no longer exists).
UPDATE public.membership_upgrade_requests r
SET status = 'cancelled',
    admin_note = COALESCE(NULLIF(r.admin_note, ''), '') ||
                 CASE WHEN COALESCE(r.admin_note,'') = '' THEN '' ELSE E'\n' END ||
                 '[auto] Cancelled: referenced business or requester no longer exists.',
    reviewed_at = now()
WHERE r.status = 'pending'
  AND (
    NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = r.business_id)
    OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = r.user_id)
  );