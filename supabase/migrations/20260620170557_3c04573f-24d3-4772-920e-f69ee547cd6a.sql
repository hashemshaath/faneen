
-- OPPORTUNITIES PHASE 15: full-stakeholder notification fan-out (in-app)
-- Extends notify_admins_opportunity_event to also notify:
--   - the requesting client (quote_requests.user_id)
--   - the relevant provider business owner(s)
--   - all assigned providers (for cancel/expire events)
-- Adds new event types: created, provider_matched, bid_revised, award_lost,
-- opportunity_cancelled, opportunity_expired.
-- No change to existing trigger signatures or downstream business logic.

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
  v_type      text;
  v_title_ar  text;
  v_title_en  text;
  v_body_ar   text;
  v_body_en   text;
  v_url_admin text;
  v_url_user  text;
  v_ref       text;
  v_client_id uuid;
  v_inserted  integer := 0;
BEGIN
  IF p_event_type IS NULL OR p_opportunity_id IS NULL THEN
    RETURN;
  END IF;

  v_key := p_event_type || ':' || p_opportunity_id::text
        || COALESCE(':b=' || p_bid_id::text, '')
        || COALESCE(':c=' || p_contract_id::text, '')
        || COALESCE(':p=' || p_provider_business_id::text, '');

  INSERT INTO public.opportunity_admin_notification_log
    (idempotency_key, event_type, opportunity_id, bid_id, contract_id)
  VALUES (v_key, p_event_type, p_opportunity_id, p_bid_id, p_contract_id)
  ON CONFLICT (idempotency_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN;
  END IF;

  SELECT COALESCE(ref_id, p_opportunity_id::text), user_id
    INTO v_ref, v_client_id
    FROM public.quote_requests WHERE id = p_opportunity_id;
  v_ref := COALESCE(v_ref, p_opportunity_id::text);
  v_url_admin := '/admin/opportunities/' || v_ref;
  v_url_user  := '/opportunities/' || v_ref;

  CASE p_event_type
    WHEN 'created' THEN
      v_type := 'opportunity_created';
      v_title_ar := 'تم استلام طلب فرصة جديد';
      v_title_en := 'Opportunity request received';
      v_body_ar  := 'تم استلام الفرصة ' || v_ref || ' وجاري مطابقتها مع المزودين.';
      v_body_en  := 'Opportunity ' || v_ref || ' was received and is being matched with providers.';
    WHEN 'provider_matched' THEN
      v_type := 'opportunity_provider_matched';
      v_title_ar := 'فرصة جديدة مطابقة لنشاطك';
      v_title_en := 'A new opportunity matched your business';
      v_body_ar  := 'تمت إضافتك كمزود مرشح للفرصة ' || v_ref || '. سارع بتقديم عرضك.';
      v_body_en  := 'You were matched on opportunity ' || v_ref || '. Submit your bid soon.';
    WHEN 'assigned' THEN
      v_type := 'opportunity_assigned';
      v_title_ar := 'تم إسناد فرصة لمزود';
      v_title_en := 'Opportunity assigned to a provider';
      v_body_ar  := 'تم إسناد الفرصة ' || v_ref || ' لمزود.';
      v_body_en  := 'Opportunity ' || v_ref || ' was assigned to a provider.';
    WHEN 'bid_submitted' THEN
      v_type := 'opportunity_bid_submitted';
      v_title_ar := 'تم تقديم عرض جديد على فرصتك';
      v_title_en := 'A new bid was submitted on your opportunity';
      v_body_ar  := 'تم تقديم عرض على الفرصة ' || v_ref || '.';
      v_body_en  := 'A new bid was submitted on opportunity ' || v_ref || '.';
    WHEN 'bid_revised' THEN
      v_type := 'opportunity_bid_revised';
      v_title_ar := 'تم تحديث عرض على فرصتك';
      v_title_en := 'A bid on your opportunity was revised';
      v_body_ar  := 'تم تحديث عرض مقدَّم على الفرصة ' || v_ref || '.';
      v_body_en  := 'A bid on opportunity ' || v_ref || ' was revised.';
    WHEN 'awarded' THEN
      v_type := 'opportunity_awarded';
      v_title_ar := 'مبروك! تم تعميد عرضك';
      v_title_en := 'Congratulations — your bid was awarded';
      v_body_ar  := 'تم تعميد عرض فائز على الفرصة ' || v_ref || '.';
      v_body_en  := 'A winning bid was awarded on opportunity ' || v_ref || '.';
    WHEN 'award_lost' THEN
      v_type := 'opportunity_award_lost';
      v_title_ar := 'تم اختيار مزود آخر للفرصة';
      v_title_en := 'Another provider was awarded the opportunity';
      v_body_ar  := 'لم يقع الاختيار على عرضك في الفرصة ' || v_ref || '. شكراً لمشاركتك.';
      v_body_en  := 'Your bid was not selected for opportunity ' || v_ref || '. Thank you for participating.';
    WHEN 'contract_created' THEN
      v_type := 'opportunity_contract_created';
      v_title_ar := 'تم إنشاء عقد مبدئي من الفرصة';
      v_title_en := 'Draft contract created from the opportunity';
      v_body_ar  := 'تم إنشاء عقد مبدئي من الفرصة ' || v_ref || '.';
      v_body_en  := 'A draft contract was created from opportunity ' || v_ref || '.';
    WHEN 'opportunity_cancelled' THEN
      v_type := 'opportunity_cancelled';
      v_title_ar := 'تم إلغاء الفرصة';
      v_title_en := 'Opportunity cancelled';
      v_body_ar  := 'تم إلغاء الفرصة ' || v_ref || '.';
      v_body_en  := 'Opportunity ' || v_ref || ' was cancelled.';
    WHEN 'opportunity_expired' THEN
      v_type := 'opportunity_expired';
      v_title_ar := 'انتهت صلاحية الفرصة';
      v_title_en := 'Opportunity expired';
      v_body_ar  := 'انتهت صلاحية الفرصة ' || v_ref || ' دون تعميد.';
      v_body_en  := 'Opportunity ' || v_ref || ' expired without an award.';
    ELSE
      RETURN;
  END CASE;

  -- Recipient set per event type (UNION ALL of user_ids).
  WITH recipients AS (
    -- Admins (always, except award_lost which is provider-only)
    SELECT ur.user_id, 'admin'::text AS role
      FROM public.user_roles ur
     WHERE ur.role = 'admin'
       AND p_event_type <> 'award_lost'
    UNION
    -- Client (owner of the opportunity)
    SELECT v_client_id, 'client'::text
     WHERE v_client_id IS NOT NULL
       AND p_event_type IN ('created','bid_submitted','bid_revised','awarded',
                            'contract_created','opportunity_cancelled','opportunity_expired')
    UNION
    -- The specific provider tied to this event (assigned / matched / bid / award / contract)
    SELECT b.user_id, 'provider'::text
      FROM public.businesses b
     WHERE p_provider_business_id IS NOT NULL
       AND b.id = p_provider_business_id
       AND b.user_id IS NOT NULL
       AND p_event_type IN ('assigned','provider_matched','awarded',
                            'contract_created')
    UNION
    -- Losing providers (award_lost) — all assigned providers except the winner
    SELECT b.user_id, 'provider'::text
      FROM public.quote_request_leads qrl
      JOIN public.businesses b ON b.id = qrl.provider_id
     WHERE p_event_type = 'award_lost'
       AND qrl.quote_request_id = p_opportunity_id
       AND b.user_id IS NOT NULL
       AND (p_provider_business_id IS NULL OR b.id <> p_provider_business_id)
    UNION
    -- All assigned providers (cancellation / expiry fan-out)
    SELECT b.user_id, 'provider'::text
      FROM public.quote_request_leads qrl
      JOIN public.businesses b ON b.id = qrl.provider_id
     WHERE p_event_type IN ('opportunity_cancelled','opportunity_expired')
       AND qrl.quote_request_id = p_opportunity_id
       AND b.user_id IS NOT NULL
  )
  INSERT INTO public.notifications
    (user_id, notification_type, title_ar, title_en, body_ar, body_en,
     reference_id, reference_type, action_url)
  SELECT DISTINCT r.user_id,
         v_type, v_title_ar, v_title_en, v_body_ar, v_body_en,
         p_opportunity_id, 'quote_request',
         CASE WHEN r.role = 'admin' THEN v_url_admin ELSE v_url_user END
    FROM recipients r
   WHERE r.user_id IS NOT NULL;

EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_opportunity_event(text, uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_admins_opportunity_event(text, uuid, uuid, uuid, uuid) TO service_role;

-- New triggers ----------------------------------------------------------------

-- 'created' on quote_requests INSERT
CREATE OR REPLACE FUNCTION public.trg_opportunity_created_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins_opportunity_event('created', NEW.id, NULL, NULL, NULL);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_requests_notify_created ON public.quote_requests;
CREATE TRIGGER trg_quote_requests_notify_created
AFTER INSERT ON public.quote_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_opportunity_created_notify();

-- 'provider_matched' on quote_request_leads INSERT
CREATE OR REPLACE FUNCTION public.trg_opportunity_provider_matched_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins_opportunity_event(
    'provider_matched', NEW.quote_request_id, NULL, NULL, NEW.provider_id
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qrl_notify_provider_matched ON public.quote_request_leads;
CREATE TRIGGER trg_qrl_notify_provider_matched
AFTER INSERT ON public.quote_request_leads
FOR EACH ROW EXECUTE FUNCTION public.trg_opportunity_provider_matched_notify();

-- 'bid_revised' on opportunity_bids UPDATE → status becomes 'revised'
CREATE OR REPLACE FUNCTION public.trg_opportunity_bid_revised_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'revised'
     AND COALESCE(OLD.status, '') IS DISTINCT FROM NEW.status THEN
    PERFORM public.notify_admins_opportunity_event(
      'bid_revised', NEW.opportunity_id, NEW.id, NULL, NEW.provider_business_id
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunity_bids_notify_revised ON public.opportunity_bids;
CREATE TRIGGER trg_opportunity_bids_notify_revised
AFTER UPDATE ON public.opportunity_bids
FOR EACH ROW EXECUTE FUNCTION public.trg_opportunity_bid_revised_notify();

-- 'opportunity_cancelled' on quote_requests UPDATE → status becomes 'cancelled'
CREATE OR REPLACE FUNCTION public.trg_opportunity_cancelled_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled'
     AND COALESCE(OLD.status, '') IS DISTINCT FROM NEW.status THEN
    PERFORM public.notify_admins_opportunity_event(
      'opportunity_cancelled', NEW.id, NULL, NULL, NULL
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_requests_notify_cancelled ON public.quote_requests;
CREATE TRIGGER trg_quote_requests_notify_cancelled
AFTER UPDATE ON public.quote_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_opportunity_cancelled_notify();
