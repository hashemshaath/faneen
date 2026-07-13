-- T4.1 — additive columns on rental_orders
ALTER TABLE public.rental_orders
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS extension_daily_rate numeric;

-- Guard against duplicate contracts per rental order
CREATE UNIQUE INDEX IF NOT EXISTS ux_rental_orders_contract_id
  ON public.rental_orders(contract_id) WHERE contract_id IS NOT NULL;

-- T4.2 — create_rental_contract RPC
CREATE OR REPLACE FUNCTION public.create_rental_contract(p_rental_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_order record;
  v_provider_user uuid;
  v_item record;
  v_existing uuid;
  v_new_contract uuid;
  v_title text;
  v_desc text;
  v_terms text;
  v_scope_qty text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin'::public.app_role);

  SELECT id, ref_id, provider_business_id, customer_user_id, rental_item_id,
         start_date, end_date, total_days, unit_price, quantity, total_amount,
         currency, deposit_amount, delivery_required, delivery_fee,
         delivery_address_text, extension_daily_rate, contract_id, status
    INTO v_order
  FROM public.rental_orders
  WHERE id = p_rental_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'rental_order_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency: return existing linked contract if any
  IF v_order.contract_id IS NOT NULL THEN
    RETURN v_order.contract_id;
  END IF;

  -- Only allow after acceptance (active / extended / expiring_soon / expired / overdue / closed)
  IF v_order.status NOT IN ('active','extended','expiring_soon','expired','overdue','closed','renewed') THEN
    RAISE EXCEPTION 'rental_order_not_accepted' USING ERRCODE = '22023';
  END IF;

  SELECT user_id INTO v_provider_user
  FROM public.businesses
  WHERE id = v_order.provider_business_id;

  IF v_provider_user IS NULL THEN
    RAISE EXCEPTION 'provider_user_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Authorization: customer, provider owner, or admin
  IF NOT v_is_admin
     AND (v_order.customer_user_id IS NULL OR v_order.customer_user_id <> v_uid)
     AND v_provider_user <> v_uid THEN
    RAISE EXCEPTION 'not_rental_participant' USING ERRCODE = '42501';
  END IF;

  SELECT id, name_ar, name_en, description_ar, description_en, specifications
    INTO v_item
  FROM public.rental_items
  WHERE id = v_order.rental_item_id;

  v_scope_qty := ' × ' || COALESCE(v_order.quantity::text, '1');

  v_title := 'عقد تأجير ' || COALESCE(NULLIF(v_item.name_ar, ''), NULLIF(v_item.name_en, ''), 'معدّة') ||
             ' (' || COALESCE(v_order.ref_id, '') || ')';

  v_desc := COALESCE(v_item.name_ar, '') ||
    CASE WHEN v_item.description_ar IS NOT NULL AND btrim(v_item.description_ar) <> ''
         THEN E'\n\n' || v_item.description_ar ELSE '' END ||
    E'\n\nالكمية: ' || COALESCE(v_order.quantity::text, '1') ||
    E'\nالفترة: ' || v_order.start_date::text || ' → ' || v_order.end_date::text ||
    ' (' || COALESCE(v_order.total_days::text, '0') || ' يوم)';

  v_terms :=
    'السعر اليومي: ' || COALESCE(v_order.unit_price::text, '0') || ' ' || COALESCE(v_order.currency, 'SAR') ||
    E'\nإجمالي التأجير: ' || COALESCE(v_order.total_amount::text, '0') || ' ' || COALESCE(v_order.currency, 'SAR') ||
    CASE WHEN v_order.deposit_amount IS NOT NULL AND v_order.deposit_amount > 0
         THEN E'\nالتأمين المسترد: ' || v_order.deposit_amount::text || ' ' || COALESCE(v_order.currency, 'SAR')
         ELSE '' END ||
    CASE WHEN v_order.delivery_required THEN
      E'\nالتوصيل: مطلوب' ||
      CASE WHEN v_order.delivery_fee IS NOT NULL
           THEN ' — رسوم: ' || v_order.delivery_fee::text || ' ' || COALESCE(v_order.currency, 'SAR')
           ELSE '' END ||
      CASE WHEN v_order.delivery_address_text IS NOT NULL AND btrim(v_order.delivery_address_text) <> ''
           THEN E'\nعنوان التوصيل: ' || v_order.delivery_address_text ELSE '' END
    ELSE E'\nالتوصيل: غير مطلوب' END ||
    CASE WHEN v_order.extension_daily_rate IS NOT NULL
         THEN E'\nسعر التمديد اليومي: ' || v_order.extension_daily_rate::text || ' ' || COALESCE(v_order.currency, 'SAR')
         ELSE '' END;

  INSERT INTO public.contracts (
    client_id,
    provider_id,
    business_id,
    title_ar,
    description_ar,
    total_amount,
    currency_code,
    status,
    terms_ar,
    start_date,
    end_date,
    vat_inclusive
  ) VALUES (
    v_order.customer_user_id,
    v_provider_user,
    v_order.provider_business_id,
    v_title,
    v_desc,
    COALESCE(v_order.total_amount, 0),
    COALESCE(NULLIF(v_order.currency, ''), 'SAR'),
    'draft'::public.contract_status,
    v_terms,
    v_order.start_date,
    v_order.end_date,
    true
  )
  RETURNING id INTO v_new_contract;

  UPDATE public.rental_orders
    SET contract_id = v_new_contract, updated_at = now()
    WHERE id = p_rental_order_id;

  INSERT INTO public.rental_order_events (rental_order_id, event_type, payload)
  VALUES (
    p_rental_order_id,
    'contract.created',
    jsonb_build_object('contract_id', v_new_contract)
  );

  RETURN v_new_contract;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_rental_contract(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_rental_contract(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_rental_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_rental_contract(uuid) TO service_role;