
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
  v_rows      integer := 0;
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

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
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
  RETURN;
END;
$$;
