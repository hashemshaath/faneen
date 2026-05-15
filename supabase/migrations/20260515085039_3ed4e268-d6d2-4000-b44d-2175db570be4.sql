-- 1) Prevent negative balances
ALTER TABLE public.provider_subscriptions
  DROP CONSTRAINT IF EXISTS provider_subscriptions_balance_nonneg;
ALTER TABLE public.provider_subscriptions
  ADD CONSTRAINT provider_subscriptions_balance_nonneg CHECK (lead_credits_balance >= 0);

-- 2) Admin RPC for grant / refund / adjustment
CREATE OR REPLACE FUNCTION public.admin_adjust_provider_credits(
  p_subscription_id uuid,
  p_action text,
  p_amount integer,
  p_reason text,
  p_note text DEFAULT NULL,
  p_quote_request_lead_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.provider_subscriptions%ROWTYPE;
  v_new_balance integer;
  v_delta integer;
  v_tx_type text;
  v_allowed_reasons text[] := ARRAY['admin_manual_grant','admin_refund','admin_adjustment'];
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN ('grant','refund','adjustment') THEN
    RAISE EXCEPTION 'invalid action';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason required';
  END IF;
  IF NOT (p_reason = ANY(v_allowed_reasons)) THEN
    RAISE EXCEPTION 'reason not allowed';
  END IF;

  SELECT * INTO v_sub FROM public.provider_subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'subscription not found'; END IF;

  IF p_action = 'grant' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'amount must be > 0'; END IF;
    v_delta := p_amount;
    v_new_balance := v_sub.lead_credits_balance + p_amount;
    v_tx_type := 'grant';
  ELSIF p_action = 'refund' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'amount must be > 0'; END IF;
    v_delta := p_amount;
    v_new_balance := v_sub.lead_credits_balance + p_amount;
    v_tx_type := 'refund';
  ELSE -- adjustment: p_amount = target balance
    IF p_amount IS NULL OR p_amount < 0 THEN RAISE EXCEPTION 'target must be >= 0'; END IF;
    v_new_balance := p_amount;
    v_delta := p_amount - v_sub.lead_credits_balance;
    IF v_delta = 0 THEN RAISE EXCEPTION 'no change'; END IF;
    v_tx_type := 'adjustment';
  END IF;

  IF v_new_balance < 0 THEN RAISE EXCEPTION 'balance cannot be negative'; END IF;

  UPDATE public.provider_subscriptions
     SET lead_credits_balance = v_new_balance, updated_at = now()
   WHERE id = v_sub.id;

  INSERT INTO public.provider_lead_credit_transactions(
    business_id, provider_user_id, quote_request_lead_id,
    type, amount, balance_after, reason, metadata, created_by
  ) VALUES (
    v_sub.business_id, v_sub.provider_user_id, p_quote_request_lead_id,
    v_tx_type, v_delta, v_new_balance, p_reason,
    jsonb_build_object('note', p_note),
    auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'balance_after', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_provider_credits(uuid, text, integer, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_provider_credits(uuid, text, integer, text, text, uuid) TO authenticated;