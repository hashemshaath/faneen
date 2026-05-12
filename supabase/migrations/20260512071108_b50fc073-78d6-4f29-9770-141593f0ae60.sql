-- C6.4a — Safe contract update RPCs (no lock trigger, behavior-compatible)

-- Helper: verify caller is party or admin
CREATE OR REPLACE FUNCTION public.contract_caller_can_act(_contract_id uuid)
RETURNS TABLE(is_client boolean, is_provider boolean, is_admin boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (c.client_id   = auth.uid()) AS is_client,
    (c.provider_id = auth.uid()) AS is_provider,
    public.has_role(auth.uid(), 'admin'::app_role) AS is_admin
  FROM public.contracts c
  WHERE c.id = _contract_id;
$$;

-- 1. send_contract_for_approval
CREATE OR REPLACE FUNCTION public.send_contract_for_approval(_contract_id uuid)
RETURNS public.contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contracts;
  perms record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO c FROM public.contracts WHERE id = _contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO perms FROM public.contract_caller_can_act(_contract_id);
  IF NOT (perms.is_client OR perms.is_provider OR perms.is_admin) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF c.status <> 'draft' THEN
    -- Idempotent: already pending/active/etc — just return current row
    RETURN c;
  END IF;
  UPDATE public.contracts
     SET status = 'pending_approval', updated_at = now()
   WHERE id = _contract_id
   RETURNING * INTO c;
  RETURN c;
END;
$$;

-- 2. accept_contract
CREATE OR REPLACE FUNCTION public.accept_contract(_contract_id uuid)
RETURNS public.contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contracts;
  perms record;
  now_ts timestamptz := now();
  new_status public.contract_status;
  new_client_at timestamptz;
  new_provider_at timestamptz;
  other_accepted timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  SELECT * INTO c FROM public.contracts WHERE id = _contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO perms FROM public.contract_caller_can_act(_contract_id);
  IF NOT (perms.is_client OR perms.is_provider) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  new_client_at   := c.client_accepted_at;
  new_provider_at := c.provider_accepted_at;

  IF perms.is_client AND new_client_at IS NULL THEN
    new_client_at := now_ts;
    other_accepted := c.provider_accepted_at;
  ELSIF perms.is_provider AND new_provider_at IS NULL THEN
    new_provider_at := now_ts;
    other_accepted := c.client_accepted_at;
  ELSE
    -- Already accepted by this side — return unchanged
    RETURN c;
  END IF;

  IF other_accepted IS NOT NULL THEN
    new_status := 'active';
  ELSIF c.status = 'draft' THEN
    new_status := 'pending_approval';
  ELSE
    new_status := c.status;
  END IF;

  UPDATE public.contracts
     SET client_accepted_at   = new_client_at,
         provider_accepted_at = new_provider_at,
         status               = new_status,
         updated_at           = now_ts
   WHERE id = _contract_id
   RETURNING * INTO c;
  RETURN c;
END;
$$;

-- 3. complete_contract
CREATE OR REPLACE FUNCTION public.complete_contract(_contract_id uuid)
RETURNS public.contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contracts;
  perms record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  SELECT * INTO c FROM public.contracts WHERE id = _contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO perms FROM public.contract_caller_can_act(_contract_id);
  IF NOT (perms.is_provider OR perms.is_admin) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF c.status NOT IN ('active') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.contracts
     SET status = 'completed', completed_at = now(), updated_at = now()
   WHERE id = _contract_id
   RETURNING * INTO c;
  RETURN c;
END;
$$;

-- 4. cancel_contract
CREATE OR REPLACE FUNCTION public.cancel_contract(_contract_id uuid, _reason text DEFAULT NULL)
RETURNS public.contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contracts;
  perms record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  SELECT * INTO c FROM public.contracts WHERE id = _contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO perms FROM public.contract_caller_can_act(_contract_id);
  IF NOT (perms.is_client OR perms.is_provider OR perms.is_admin) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF c.status IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.contracts
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = COALESCE(_reason, cancellation_reason),
         updated_at = now()
   WHERE id = _contract_id
   RETURNING * INTO c;
  RETURN c;
END;
$$;

-- 5. recalc_contract_total — sums measurements + line items
CREATE OR REPLACE FUNCTION public.recalc_contract_total(_contract_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perms record;
  ms_total numeric := 0;
  li_total numeric := 0;
  grand numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  SELECT * INTO perms FROM public.contract_caller_can_act(_contract_id);
  IF NOT (perms.is_client OR perms.is_provider OR perms.is_admin) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(SUM(total_cost), 0) INTO ms_total FROM public.contract_measurements WHERE contract_id = _contract_id;
  SELECT COALESCE(SUM(total_cost), 0) INTO li_total FROM public.contract_line_items WHERE contract_id = _contract_id;
  grand := ms_total + li_total;
  IF grand > 0 THEN
    UPDATE public.contracts SET total_amount = grand, updated_at = now() WHERE id = _contract_id;
  END IF;
  RETURN grand;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.send_contract_for_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_contract(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_contract_total(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contract_caller_can_act(uuid) TO authenticated;