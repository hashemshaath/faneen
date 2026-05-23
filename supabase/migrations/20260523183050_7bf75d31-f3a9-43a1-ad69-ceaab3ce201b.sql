-- EDGE-2: idempotency + atomic credit RPCs

-- 1. Idempotency column + partial unique index
alter table public.provider_lead_credit_transactions
  add column if not exists idempotency_key text;

create unique index if not exists provider_lead_credit_transactions_idempotency_key_uidx
  on public.provider_lead_credit_transactions (idempotency_key)
  where idempotency_key is not null;

-- 2. consume_provider_lead_credit
create or replace function public.consume_provider_lead_credit(
  p_business_id uuid,
  p_cost integer,
  p_reason text,
  p_quote_request_lead_id uuid default null,
  p_created_by uuid default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub_id uuid;
  v_provider_user_id uuid;
  v_balance integer;
  v_new_balance integer;
  v_existing_ledger record;
  v_ledger_id uuid;
begin
  -- Idempotency short-circuit before locking
  if p_idempotency_key is not null then
    select id, balance_after into v_existing_ledger
      from public.provider_lead_credit_transactions
      where idempotency_key = p_idempotency_key
      limit 1;
    if found then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'balance_after', v_existing_ledger.balance_after,
        'ledger_id', v_existing_ledger.id
      );
    end if;
  end if;

  -- Lock subscription row
  select id, provider_user_id, lead_credits_balance
    into v_sub_id, v_provider_user_id, v_balance
  from public.provider_subscriptions
  where business_id = p_business_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'subscription_not_found');
  end if;

  if p_cost is null or p_cost < 0 then
    return jsonb_build_object('ok', false, 'code', 'invalid_cost');
  end if;

  if p_cost > v_balance then
    return jsonb_build_object('ok', false, 'code', 'insufficient', 'balance', v_balance);
  end if;

  v_new_balance := v_balance - p_cost;

  update public.provider_subscriptions
    set lead_credits_balance = v_new_balance,
        updated_at = now()
    where id = v_sub_id;

  begin
    insert into public.provider_lead_credit_transactions (
      business_id, provider_user_id, quote_request_lead_id,
      type, amount, balance_after, reason, created_by, idempotency_key
    ) values (
      p_business_id, v_provider_user_id, p_quote_request_lead_id,
      'consume', -p_cost, v_new_balance, p_reason, p_created_by, p_idempotency_key
    )
    returning id into v_ledger_id;
  exception when unique_violation then
    -- Race: another transaction inserted the same idempotency_key.
    -- Roll back the balance change by raising so the whole txn aborts,
    -- then re-read existing ledger row in a fresh call.
    raise exception 'idempotency_race' using errcode = '40001';
  end;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'balance_after', v_new_balance,
    'ledger_id', v_ledger_id
  );
end;
$$;

comment on function public.consume_provider_lead_credit(uuid, integer, text, uuid, uuid, text) is
  'EDGE-2: Atomic provider credit debit. Locks provider_subscriptions row FOR UPDATE, checks balance, decrements, and inserts a consume ledger row in a single transaction. Idempotency: if p_idempotency_key matches an existing ledger row, returns { ok:true, idempotent:true, balance_after, ledger_id } without re-debiting. Unique-violation races are surfaced as serialization_failure so the caller can retry. Returns jsonb { ok, idempotent, balance_after, ledger_id } on success or { ok:false, code:''subscription_not_found''|''insufficient''|''invalid_cost'' }. Service-role only.';

-- 3. grant_monthly_provider_credit
create or replace function public.grant_monthly_provider_credit(
  p_subscription_id uuid,
  p_amount integer,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_plan_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_provider_user_id uuid;
  v_balance integer;
  v_new_balance integer;
  v_idem text;
  v_existing record;
  v_ledger_id uuid;
begin
  v_idem := 'monthly:' || p_subscription_id::text || ':'
            || to_char((p_period_start at time zone 'UTC')::date, 'YYYY-MM');

  -- Idempotency short-circuit
  select id, balance_after into v_existing
    from public.provider_lead_credit_transactions
    where idempotency_key = v_idem
    limit 1;
  if found then
    return jsonb_build_object(
      'ok', true,
      'granted', false,
      'idempotent', true,
      'balance_after', v_existing.balance_after,
      'ledger_id', v_existing.id
    );
  end if;

  -- Lock subscription
  select business_id, provider_user_id, lead_credits_balance
    into v_business_id, v_provider_user_id, v_balance
  from public.provider_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'subscription_not_found');
  end if;

  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('ok', false, 'code', 'invalid_amount');
  end if;

  v_new_balance := v_balance + p_amount;

  update public.provider_subscriptions
    set lead_credits_balance = v_new_balance,
        current_period_start = p_period_start,
        current_period_end = p_period_end,
        updated_at = now()
    where id = p_subscription_id;

  begin
    insert into public.provider_lead_credit_transactions (
      business_id, provider_user_id, type, amount, balance_after,
      reason, metadata, idempotency_key
    ) values (
      v_business_id, v_provider_user_id, 'grant', p_amount, v_new_balance,
      'monthly_grant',
      jsonb_build_object(
        'plan_code', p_plan_code,
        'period_start', p_period_start,
        'period_end', p_period_end
      ),
      v_idem
    )
    returning id into v_ledger_id;
  exception when unique_violation then
    raise exception 'idempotency_race' using errcode = '40001';
  end;

  return jsonb_build_object(
    'ok', true,
    'granted', true,
    'idempotent', false,
    'balance_after', v_new_balance,
    'ledger_id', v_ledger_id
  );
end;
$$;

comment on function public.grant_monthly_provider_credit(uuid, integer, timestamptz, timestamptz, text) is
  'EDGE-2: Atomic monthly provider credit grant. Locks provider_subscriptions row FOR UPDATE, increments lead_credits_balance, rolls current_period_start/end, and inserts a grant ledger row in a single transaction. Idempotency key format: monthly:<subscription_id>:YYYY-MM (UTC). Returns jsonb { ok, granted, idempotent, balance_after, ledger_id }. Service-role only.';

-- 4. Permissions
revoke all on function public.consume_provider_lead_credit(uuid, integer, text, uuid, uuid, text) from public;
revoke all on function public.grant_monthly_provider_credit(uuid, integer, timestamptz, timestamptz, text) from public;
grant execute on function public.consume_provider_lead_credit(uuid, integer, text, uuid, uuid, text) to service_role;
grant execute on function public.grant_monthly_provider_credit(uuid, integer, timestamptz, timestamptz, text) to service_role;