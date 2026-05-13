
CREATE OR REPLACE FUNCTION public.quick_resolve_contract_client(
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL
)
RETURNS TABLE(
  matched_user_id  uuid,
  ref_id           text,
  full_name        text,
  email_masked     text,
  phone_masked     text,
  matched_on       text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller  uuid := auth.uid();
  v_email_n text := nullif(lower(btrim(coalesce(_email, ''))), '');
  v_phone_d text := nullif(regexp_replace(coalesce(_phone, ''), '\D', '', 'g'), '');
BEGIN
  IF v_caller IS NULL THEN RETURN; END IF;
  IF v_email_n IS NULL AND v_phone_d IS NULL THEN RETURN; END IF;

  RETURN QUERY
    SELECT p.user_id, p.ref_id, p.full_name,
      CASE WHEN p.email IS NULL THEN NULL ELSE regexp_replace(p.email, '(^.).*(@.*$)', '\1•••\2') END,
      CASE WHEN p.phone IS NULL THEN NULL ELSE regexp_replace(p.phone::text, '(.{0,3}).*(.{3}$)', '\1•••\2') END,
      CASE
        WHEN v_email_n IS NOT NULL AND lower(p.email) = v_email_n THEN 'email'
        WHEN v_phone_d IS NOT NULL AND regexp_replace(p.phone::text, '\D', '', 'g') = v_phone_d THEN 'phone'
      END
    FROM public.profiles p
    WHERE p.is_banned IS NOT TRUE
      AND (
        (v_email_n IS NOT NULL AND lower(p.email) = v_email_n)
        OR (v_phone_d IS NOT NULL AND regexp_replace(p.phone::text, '\D', '', 'g') = v_phone_d)
      )
    LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_contract_from_template(
  _payload              jsonb,
  _template_version_id  uuid,
  _pricing_method       text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract_id         uuid;
  v_snapshot_id         uuid;
  v_template_id         uuid;
  v_service_category_id uuid;
  v_status              text;
  v_provider_id         uuid;
  v_client_id           uuid;
  v_guest_email         text;
  v_guest_phone         text;
  v_guest_name          text;
  v_payload             jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF _template_version_id IS NULL THEN
    RAISE EXCEPTION 'template_version_id_required';
  END IF;

  SELECT v.status, v.template_id, t.service_category_id
    INTO v_status, v_template_id, v_service_category_id
  FROM contract_template_versions v
  JOIN contract_templates t ON t.id = v.template_id
  WHERE v.id = _template_version_id;

  IF v_status IS NULL THEN RAISE EXCEPTION 'template_version_not_found'; END IF;
  IF v_status <> 'published' THEN RAISE EXCEPTION 'template_version_not_published'; END IF;

  v_provider_id := NULLIF(_payload->>'provider_id','')::uuid;
  v_client_id   := NULLIF(_payload->>'client_id','')::uuid;
  v_guest_email := NULLIF(btrim(_payload->>'guest_client_email'), '');
  v_guest_phone := NULLIF(btrim(_payload->>'guest_client_phone'), '');
  v_guest_name  := NULLIF(btrim(_payload->>'guest_client_name'),  '');

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'provider_required';
  END IF;
  IF v_client_id IS NULL AND v_guest_email IS NULL AND v_guest_phone IS NULL THEN
    RAISE EXCEPTION 'client_or_guest_required';
  END IF;
  IF v_provider_id <> auth.uid()
     AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden_provider_mismatch';
  END IF;

  v_payload := _payload || jsonb_build_object(
    'template_version_id', _template_version_id,
    'service_category_id', COALESCE(NULLIF(_payload->>'service_category_id','')::uuid, v_service_category_id),
    'pricing_method',      _pricing_method,
    'status',              COALESCE(NULLIF(_payload->>'status',''), 'draft')
  );

  INSERT INTO contracts (
    provider_id, client_id, business_id,
    title_ar, title_en, description_ar, description_en,
    total_amount, currency_code, start_date, end_date,
    terms_ar, terms_en,
    supervisor_name, supervisor_phone, supervisor_email,
    status, vat_inclusive, vat_rate,
    template_version_id, service_category_id, pricing_method,
    guest_client_name, guest_client_email, guest_client_phone
  ) VALUES (
    v_provider_id, v_client_id, NULLIF(v_payload->>'business_id','')::uuid,
    v_payload->>'title_ar', NULLIF(v_payload->>'title_en',''),
    NULLIF(v_payload->>'description_ar',''), NULLIF(v_payload->>'description_en',''),
    COALESCE((v_payload->>'total_amount')::numeric, 0),
    COALESCE(v_payload->>'currency_code', 'SAR'),
    NULLIF(v_payload->>'start_date','')::date,
    NULLIF(v_payload->>'end_date','')::date,
    NULLIF(v_payload->>'terms_ar',''), NULLIF(v_payload->>'terms_en',''),
    NULLIF(v_payload->>'supervisor_name',''),
    NULLIF(v_payload->>'supervisor_phone',''),
    NULLIF(v_payload->>'supervisor_email',''),
    v_payload->>'status',
    COALESCE((v_payload->>'vat_inclusive')::boolean, false),
    COALESCE((v_payload->>'vat_rate')::numeric, 15),
    _template_version_id,
    NULLIF(v_payload->>'service_category_id','')::uuid,
    _pricing_method,
    v_guest_name, v_guest_email, v_guest_phone
  ) RETURNING id INTO v_contract_id;

  INSERT INTO contract_template_snapshots (contract_id, version_id, frozen_payload, created_by)
  VALUES (v_contract_id, _template_version_id, public._build_template_snapshot_payload(_template_version_id), auth.uid())
  RETURNING id INTO v_snapshot_id;

  UPDATE contracts SET template_snapshot_id = v_snapshot_id WHERE id = v_contract_id;
  RETURN v_contract_id;
END;
$function$;

-- Auto-link guest contracts when a profile with matching email/phone appears
CREATE OR REPLACE FUNCTION public.link_guest_contracts_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email_n text := nullif(lower(btrim(NEW.email)), '');
  v_phone_d text := nullif(regexp_replace(coalesce(NEW.phone::text, ''), '\D', '', 'g'), '');
  r record;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF v_email_n IS NULL AND v_phone_d IS NULL THEN RETURN NEW; END IF;

  FOR r IN
    SELECT id, provider_id, contract_number, title_ar, title_en
      FROM public.contracts
     WHERE client_id IS NULL
       AND (
         (v_email_n IS NOT NULL AND lower(guest_client_email) = v_email_n)
         OR (v_phone_d IS NOT NULL AND regexp_replace(coalesce(guest_client_phone, ''), '\D', '', 'g') = v_phone_d)
       )
  LOOP
    UPDATE public.contracts
       SET client_id = NEW.user_id,
           guest_client_email = NULL,
           guest_client_phone = NULL,
           guest_client_name  = NULL,
           updated_at = now()
     WHERE id = r.id;

    INSERT INTO public.notifications (
      user_id, title_ar, title_en, body_ar, body_en,
      notification_type, reference_id, reference_type, action_url
    ) VALUES (
      NEW.user_id,
      'تم ربط عقد بحسابك',
      'A contract was linked to your account',
      'تم ربط العقد ' || r.contract_number || ' بحسابك. يمكنك الآن مراجعته.',
      'Contract ' || r.contract_number || ' is now linked to your account. You can review it.',
      'contract_linked',
      r.id, 'contract',
      '/contracts/' || r.id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_guest_contracts_for_profile ON public.profiles;
CREATE TRIGGER trg_link_guest_contracts_for_profile
AFTER INSERT OR UPDATE OF email, phone ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.link_guest_contracts_for_profile();
