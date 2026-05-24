-- R4F-8D: Admin manual mark-paid RPC for membership payment intents.
-- Admin-gated, idempotent, SECURITY DEFINER. Does NOT bypass admin approval
-- for membership tier changes — only marks an existing payment intent as paid
-- and mirrors payment fields onto membership_subscriptions.

CREATE OR REPLACE FUNCTION public.admin_mark_membership_paid_manually(
  p_payment_intent_id uuid,
  p_admin_user_id uuid,
  p_external_payment_id text DEFAULT NULL,
  p_invoice_id text DEFAULT NULL,
  p_paid_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent       public.membership_payment_intents%ROWTYPE;
  v_caller       uuid := auth.uid();
  v_dup_count    int;
  v_now          timestamptz := now();
  v_paid_at      timestamptz := COALESCE(p_paid_at, now());
  v_event_id     text;
BEGIN
  -- 1) Admin gate (caller must be admin; p_admin_user_id, if passed, must match caller)
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;
  IF p_admin_user_id IS NOT NULL AND p_admin_user_id <> v_caller THEN
    RAISE EXCEPTION 'forbidden: admin user id mismatch' USING ERRCODE = '42501';
  END IF;

  -- 2) Lock the intent row
  SELECT * INTO v_intent
    FROM public.membership_payment_intents
   WHERE id = p_payment_intent_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'payment_intent_not_found');
  END IF;

  -- 3) Idempotent replay: already succeeded
  IF v_intent.status = 'succeeded' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'payment_intent_id', v_intent.id,
      'subscription_id', v_intent.subscription_id,
      'status', 'paid',
      'paid_at', v_intent.confirmed_at
    );
  END IF;

  -- 4) Duplicate-reference guard: another succeeded intent with same external ref/invoice
  IF p_external_payment_id IS NOT NULL THEN
    SELECT count(*) INTO v_dup_count
      FROM public.membership_payment_intents
     WHERE status = 'succeeded'
       AND id <> v_intent.id
       AND provider_intent_id = p_external_payment_id;
    IF v_dup_count > 0 THEN
      RETURN jsonb_build_object('ok', false, 'code', 'duplicate_payment_reference');
    END IF;
  END IF;

  IF p_invoice_id IS NOT NULL THEN
    SELECT count(*) INTO v_dup_count
      FROM public.membership_payment_intents
     WHERE status = 'succeeded'
       AND id <> v_intent.id
       AND invoice_id = p_invoice_id;
    IF v_dup_count > 0 THEN
      RETURN jsonb_build_object('ok', false, 'code', 'duplicate_payment_reference');
    END IF;
  END IF;

  -- 5) Update the intent
  UPDATE public.membership_payment_intents
     SET status              = 'succeeded',
         confirmed_at        = v_paid_at,
         provider_intent_id  = COALESCE(p_external_payment_id, provider_intent_id),
         invoice_id          = COALESCE(p_invoice_id, invoice_id),
         metadata            = COALESCE(metadata, '{}'::jsonb)
                                 || jsonb_build_object(
                                      'manual_mark_paid', jsonb_build_object(
                                        'admin_user_id', v_caller,
                                        'marked_at', v_now,
                                        'notes', p_notes
                                      )
                                    ),
         updated_at          = v_now
   WHERE id = v_intent.id;

  -- 6) Mirror onto membership_subscriptions (admin approval / tier logic untouched)
  UPDATE public.membership_subscriptions
     SET payment_provider          = COALESCE(payment_provider, 'manual'),
         payment_status            = 'paid',
         last_paid_at              = v_paid_at,
         last_invoice_id           = COALESCE(p_invoice_id, last_invoice_id),
         last_external_payment_id  = COALESCE(p_external_payment_id, last_external_payment_id),
         last_paid_amount          = v_intent.amount,
         last_paid_currency        = v_intent.currency,
         updated_at                = v_now
   WHERE id = v_intent.subscription_id;

  -- 7) Audit row in webhook events table (idempotent via unique (provider, event_id))
  v_event_id := 'manual-' || v_intent.id::text;
  INSERT INTO public.membership_payment_webhook_events
    (provider, event_id, event_type, payload, processed_at, received_at)
  VALUES (
    'manual',
    v_event_id,
    'manual_mark_paid',
    jsonb_build_object(
      'admin_user_id', v_caller,
      'payment_intent_id', v_intent.id,
      'subscription_id', v_intent.subscription_id,
      'external_payment_id', p_external_payment_id,
      'invoice_id', p_invoice_id,
      'paid_at', v_paid_at,
      'notes', p_notes,
      'amount', v_intent.amount,
      'currency', v_intent.currency
    ),
    v_now,
    v_now
  )
  ON CONFLICT (provider, event_id) DO NOTHING;

  -- 8) Return success
  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'payment_intent_id', v_intent.id,
    'subscription_id', v_intent.subscription_id,
    'status', 'paid',
    'paid_at', v_paid_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_membership_paid_manually(
  uuid, uuid, text, text, timestamptz, text
) FROM public;
REVOKE ALL ON FUNCTION public.admin_mark_membership_paid_manually(
  uuid, uuid, text, text, timestamptz, text
) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_membership_paid_manually(
  uuid, uuid, text, text, timestamptz, text
) TO authenticated;

COMMENT ON FUNCTION public.admin_mark_membership_paid_manually(
  uuid, uuid, text, text, timestamptz, text
) IS
  'R4F-8D: Admin-only manual mark-paid for a membership_payment_intent. Idempotent on replay and on duplicate external payment / invoice references. Mirrors last_paid_* fields onto membership_subscriptions and writes an audit row to membership_payment_webhook_events. Does NOT change membership tier or bypass admin approval flow.';