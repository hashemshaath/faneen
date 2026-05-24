-- R4F-8H: Admin manual refund / credit-note marker for membership payment intents.
-- Admin-gated, idempotent, SECURITY DEFINER. Does NOT call any payment provider
-- API — this only records that an already-paid intent has been refunded or
-- credited manually by an admin.

CREATE OR REPLACE FUNCTION public.admin_mark_membership_payment_refunded_manually(
  p_payment_intent_id uuid,
  p_admin_user_id uuid,
  p_refund_reference text DEFAULT NULL,
  p_refunded_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent      public.membership_payment_intents%ROWTYPE;
  v_caller      uuid := auth.uid();
  v_now         timestamptz := now();
  v_refunded_at timestamptz := COALESCE(p_refunded_at, now());
  v_event_id    text;
BEGIN
  -- 1) Admin gate
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

  -- 3) Idempotent replay: already refunded
  IF v_intent.status = 'refunded' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'payment_intent_id', v_intent.id,
      'subscription_id', v_intent.subscription_id,
      'status', 'refunded',
      'refunded_at', COALESCE(
        (v_intent.metadata->'manual_refund'->>'refunded_at')::timestamptz,
        v_intent.updated_at
      )
    );
  END IF;

  -- 4) Must be in a paid state to refund
  IF v_intent.status <> 'succeeded' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'payment_not_paid');
  END IF;

  -- 5) Update intent → refunded, record refund metadata
  UPDATE public.membership_payment_intents
     SET status     = 'refunded',
         metadata   = COALESCE(metadata, '{}'::jsonb)
                        || jsonb_build_object(
                             'manual_refund', jsonb_build_object(
                               'admin_user_id', v_caller,
                               'marked_at', v_now,
                               'refunded_at', v_refunded_at,
                               'refund_reference', p_refund_reference,
                               'notes', p_notes
                             )
                           ),
         updated_at = v_now
   WHERE id = v_intent.id;

  -- 6) Mirror refunded status onto subscription (tier/approval untouched)
  UPDATE public.membership_subscriptions
     SET payment_status = 'refunded',
         updated_at     = v_now
   WHERE id = v_intent.subscription_id;

  -- 7) Audit row in webhook events table (idempotent via unique (provider, event_id))
  v_event_id := 'manual-refund-' || v_intent.id::text;
  INSERT INTO public.membership_payment_webhook_events
    (provider, event_id, event_type, payload, processed_at, received_at)
  VALUES (
    'manual',
    v_event_id,
    'manual_refund_marked',
    jsonb_build_object(
      'admin_user_id', v_caller,
      'payment_intent_id', v_intent.id,
      'subscription_id', v_intent.subscription_id,
      'refund_reference', p_refund_reference,
      'refunded_at', v_refunded_at,
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
    'status', 'refunded',
    'refunded_at', v_refunded_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_membership_payment_refunded_manually(
  uuid, uuid, text, timestamptz, text
) FROM public;
REVOKE ALL ON FUNCTION public.admin_mark_membership_payment_refunded_manually(
  uuid, uuid, text, timestamptz, text
) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_membership_payment_refunded_manually(
  uuid, uuid, text, timestamptz, text
) TO authenticated;

COMMENT ON FUNCTION public.admin_mark_membership_payment_refunded_manually(
  uuid, uuid, text, timestamptz, text
) IS
  'R4F-8H: Admin-only manual refund / credit-note marker for a membership_payment_intent. Records that an already-paid intent was manually refunded or credited. Idempotent on replay. Mirrors payment_status=refunded onto membership_subscriptions and writes an audit row to membership_payment_webhook_events. Does NOT call a payment provider, does NOT change membership tier, and does NOT bypass the admin approval flow.';
