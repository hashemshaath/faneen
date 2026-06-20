
-- OPPORTUNITIES PHASE 9 — admin notifications + operational alerts
-- Adds idempotent admin notification fan-out for opportunity lifecycle
-- events (assigned, bid submitted, awarded, contract created) WITHOUT
-- changing the matching, bidding, awarding, or contract conversion logic.

-- 1) Dedupe log: deterministic idempotency key per event.
CREATE TABLE IF NOT EXISTS public.opportunity_admin_notification_log (
  idempotency_key text PRIMARY KEY,
  event_type      text        NOT NULL,
  opportunity_id  uuid,
  bid_id          uuid,
  contract_id     uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.opportunity_admin_notification_log TO service_role;
GRANT SELECT ON public.opportunity_admin_notification_log TO authenticated;

ALTER TABLE public.opportunity_admin_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read opportunity admin notif log"
  ON public.opportunity_admin_notification_log;
CREATE POLICY "admins read opportunity admin notif log"
  ON public.opportunity_admin_notification_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Fan-out function (SECURITY DEFINER) — idempotent admin notifications.
CREATE OR REPLACE FUNCTION public.notify_admins_opportunity_event(
  p_event_type            text,
  p_opportunity_id        uuid,
  p_bid_id                uuid DEFAULT NULL,
  p_contract_id           uuid DEFAULT NULL,
  p_provider_business_id  uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key       text;
  v_title_ar  text;
  v_title_en  text;
  v_body_ar   text;
  v_body_en   text;
  v_type      text;
  v_url       text;
  v_ref       text;
  v_inserted  boolean := false;
BEGIN
  IF p_event_type IS NULL OR p_opportunity_id IS NULL THEN
    RETURN;
  END IF;

  v_key := p_event_type || ':' || p_opportunity_id::text
        || COALESCE(':b=' || p_bid_id::text, '')
        || COALESCE(':c=' || p_contract_id::text, '');

  INSERT INTO public.opportunity_admin_notification_log
    (idempotency_key, event_type, opportunity_id, bid_id, contract_id)
  VALUES (v_key, p_event_type, p_opportunity_id, p_bid_id, p_contract_id)
  ON CONFLICT (idempotency_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF NOT v_inserted THEN
    RETURN;
  END IF;

  SELECT COALESCE(ref_id, p_opportunity_id::text) INTO v_ref
    FROM public.quote_requests WHERE id = p_opportunity_id;
  v_ref := COALESCE(v_ref, p_opportunity_id::text);
  v_url := '/admin/opportunities/' || v_ref;

  CASE p_event_type
    WHEN 'assigned' THEN
      v_type := 'opportunity_assigned_admin';
      v_title_ar := 'تم إسناد فرصة لمزود';
      v_title_en := 'Opportunity assigned to a provider';
      v_body_ar := 'تم إسناد الفرصة ' || v_ref || ' لمزود.';
      v_body_en := 'Opportunity ' || v_ref || ' was assigned to a provider.';
    WHEN 'bid_submitted' THEN
      v_type := 'opportunity_bid_submitted_admin';
      v_title_ar := 'تم تقديم عرض جديد';
      v_title_en := 'New opportunity bid submitted';
      v_body_ar := 'تم تقديم عرض على الفرصة ' || v_ref || '.';
      v_body_en := 'A new bid was submitted on opportunity ' || v_ref || '.';
    WHEN 'awarded' THEN
      v_type := 'opportunity_awarded_admin';
      v_title_ar := 'تم تعميد عرض على فرصة';
      v_title_en := 'Opportunity awarded';
      v_body_ar := 'تم تعميد عرض فائز على الفرصة ' || v_ref || '.';
      v_body_en := 'A winning bid was awarded on opportunity ' || v_ref || '.';
    WHEN 'contract_created' THEN
      v_type := 'opportunity_contract_created_admin';
      v_title_ar := 'تم إنشاء عقد مبدئي من فرصة';
      v_title_en := 'Draft contract created from opportunity';
      v_body_ar := 'تم إنشاء عقد مبدئي من الفرصة ' || v_ref || '.';
      v_body_en := 'A draft contract was created from opportunity ' || v_ref || '.';
    ELSE
      RETURN;
  END CASE;

  INSERT INTO public.notifications
    (user_id, notification_type, title_ar, title_en, body_ar, body_en,
     reference_id, reference_type, action_url)
  SELECT ur.user_id, v_type, v_title_ar, v_title_en, v_body_ar, v_body_en,
         p_opportunity_id, 'quote_request', v_url
    FROM public.user_roles ur
   WHERE ur.role = 'admin';
EXCEPTION WHEN OTHERS THEN
  -- Never break the originating lifecycle event.
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_opportunity_event(text, uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_admins_opportunity_event(text, uuid, uuid, uuid, uuid) TO service_role;

-- 3) Trigger wrappers — never raise.
CREATE OR REPLACE FUNCTION public.trg_opportunity_lead_assigned_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins_opportunity_event(
    'assigned', NEW.quote_request_id, NULL, NULL, NEW.provider_business_id
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_opportunity_bid_submitted_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins_opportunity_event(
    'bid_submitted', NEW.opportunity_id, NEW.id, NULL, NEW.provider_id
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_opportunity_awarded_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.award_status = 'awarded'
     AND COALESCE(OLD.award_status, '') IS DISTINCT FROM NEW.award_status THEN
    PERFORM public.notify_admins_opportunity_event(
      'awarded', NEW.id, NEW.awarded_bid_id, NULL, NULL
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_opportunity_contract_created_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.opportunity_id IS NOT NULL THEN
    PERFORM public.notify_admins_opportunity_event(
      'contract_created', NEW.opportunity_id, NEW.opportunity_bid_id, NEW.id, NULL
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 4) Wire triggers (idempotent).
DROP TRIGGER IF EXISTS trg_opportunity_lead_assigned_notify ON public.quote_request_leads;
CREATE TRIGGER trg_opportunity_lead_assigned_notify
  AFTER INSERT ON public.quote_request_leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_opportunity_lead_assigned_notify();

DROP TRIGGER IF EXISTS trg_opportunity_bid_submitted_notify ON public.opportunity_bids;
CREATE TRIGGER trg_opportunity_bid_submitted_notify
  AFTER INSERT ON public.opportunity_bids
  FOR EACH ROW EXECUTE FUNCTION public.trg_opportunity_bid_submitted_notify();

DROP TRIGGER IF EXISTS trg_opportunity_awarded_notify ON public.quote_requests;
CREATE TRIGGER trg_opportunity_awarded_notify
  AFTER UPDATE OF award_status ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_opportunity_awarded_notify();

DROP TRIGGER IF EXISTS trg_opportunity_contract_created_notify ON public.contracts;
CREATE TRIGGER trg_opportunity_contract_created_notify
  AFTER INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.trg_opportunity_contract_created_notify();
