-- =========================================================
-- A/B Testing system
-- =========================================================

create table if not exists public.ab_experiments (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  status text not null default 'draft' check (status in ('draft','running','completed','archived')),
  min_sample_per_variant integer not null default 1000 check (min_sample_per_variant > 0),
  confidence_threshold numeric not null default 0.95 check (confidence_threshold > 0.5 and confidence_threshold < 1),
  auto_promote boolean not null default true,
  winner_variant_id uuid,
  promoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ab_variants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.ab_experiments(id) on delete cascade,
  key text not null,
  content jsonb not null default '{}'::jsonb,
  weight integer not null default 1 check (weight >= 0),
  is_control boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (experiment_id, key)
);

alter table public.ab_experiments
  add constraint ab_experiments_winner_fk
  foreign key (winner_variant_id) references public.ab_variants(id) on delete set null;

create table if not exists public.ab_events (
  id bigserial primary key,
  experiment_id uuid not null references public.ab_experiments(id) on delete cascade,
  variant_id uuid not null references public.ab_variants(id) on delete cascade,
  visitor_id text not null,
  event_type text not null check (event_type in ('impression','click')),
  created_at timestamptz not null default now()
);

-- one impression per visitor per experiment, unlimited clicks
create unique index if not exists ab_events_unique_impression
  on public.ab_events (experiment_id, visitor_id)
  where event_type = 'impression';

create index if not exists ab_events_agg_idx
  on public.ab_events (experiment_id, variant_id, event_type);

create index if not exists ab_variants_experiment_idx
  on public.ab_variants (experiment_id, is_active);

-- updated_at triggers
create trigger ab_experiments_set_updated_at
  before update on public.ab_experiments
  for each row execute function public.update_updated_at_column();

create trigger ab_variants_set_updated_at
  before update on public.ab_variants
  for each row execute function public.update_updated_at_column();

-- =========================================================
-- RLS
-- =========================================================
alter table public.ab_experiments enable row level security;
alter table public.ab_variants    enable row level security;
alter table public.ab_events      enable row level security;

-- experiments: public can read running/completed; admins manage
create policy "ab_experiments_public_read"
on public.ab_experiments for select
using (status in ('running','completed'));

create policy "ab_experiments_admin_all"
on public.ab_experiments for all
using (public.has_role(auth.uid(),'super_admin'))
with check (public.has_role(auth.uid(),'super_admin'));

-- variants: public can read those of visible experiments
create policy "ab_variants_public_read"
on public.ab_variants for select
using (exists (
  select 1 from public.ab_experiments e
  where e.id = ab_variants.experiment_id
    and e.status in ('running','completed')
));

create policy "ab_variants_admin_all"
on public.ab_variants for all
using (public.has_role(auth.uid(),'super_admin'))
with check (public.has_role(auth.uid(),'super_admin'));

-- events: only admins can read; nobody inserts/updates/deletes directly
-- (writes happen through SECURITY DEFINER RPCs)
create policy "ab_events_admin_read"
on public.ab_events for select
using (public.has_role(auth.uid(),'super_admin'));

-- =========================================================
-- RPCs
-- =========================================================

-- Deterministic, weighted assignment + impression logging.
create or replace function public.ab_assign_variant(
  p_experiment_key text,
  p_visitor_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exp public.ab_experiments;
  v_total_weight integer;
  v_bucket integer;
  v_running integer;
  v_chosen public.ab_variants;
  v_v public.ab_variants;
begin
  if p_experiment_key is null or length(p_experiment_key) = 0 then
    return null;
  end if;
  if p_visitor_id is null or length(p_visitor_id) < 8 or length(p_visitor_id) > 128 then
    return null;
  end if;

  select * into v_exp
  from public.ab_experiments
  where key = p_experiment_key
    and status in ('running','completed')
  limit 1;

  if not found then
    return null;
  end if;

  -- If experiment completed and has a winner, always serve the winner
  if v_exp.status = 'completed' and v_exp.winner_variant_id is not null then
    select * into v_chosen
    from public.ab_variants
    where id = v_exp.winner_variant_id;
    if found then
      return jsonb_build_object(
        'experiment_id', v_exp.id,
        'variant_id', v_chosen.id,
        'variant_key', v_chosen.key,
        'content', v_chosen.content,
        'is_winner', true
      );
    end if;
  end if;

  -- Pick deterministically across active variants weighted by weight
  select coalesce(sum(weight), 0) into v_total_weight
  from public.ab_variants
  where experiment_id = v_exp.id and is_active = true and weight > 0;

  if v_total_weight = 0 then
    return null;
  end if;

  v_bucket := (abs(hashtextextended(p_visitor_id || ':' || v_exp.key, 0)) % v_total_weight)::integer;

  v_running := 0;
  for v_v in
    select * from public.ab_variants
    where experiment_id = v_exp.id and is_active = true and weight > 0
    order by key
  loop
    v_running := v_running + v_v.weight;
    if v_bucket < v_running then
      v_chosen := v_v;
      exit;
    end if;
  end loop;

  if v_chosen.id is null then
    return null;
  end if;

  -- Log impression (one per visitor per experiment)
  begin
    insert into public.ab_events (experiment_id, variant_id, visitor_id, event_type)
    values (v_exp.id, v_chosen.id, p_visitor_id, 'impression')
    on conflict do nothing;
  exception when others then
    -- never fail assignment due to logging issues
    null;
  end;

  return jsonb_build_object(
    'experiment_id', v_exp.id,
    'variant_id', v_chosen.id,
    'variant_key', v_chosen.key,
    'content', v_chosen.content,
    'is_winner', false
  );
end;
$$;

grant execute on function public.ab_assign_variant(text, text) to anon, authenticated;

-- Track click for the visitor's currently assigned variant.
create or replace function public.ab_track_click(
  p_experiment_key text,
  p_visitor_id text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment jsonb;
  v_exp_id uuid;
  v_variant_id uuid;
begin
  v_assignment := public.ab_assign_variant(p_experiment_key, p_visitor_id);
  if v_assignment is null then
    return false;
  end if;
  v_exp_id := (v_assignment->>'experiment_id')::uuid;
  v_variant_id := (v_assignment->>'variant_id')::uuid;

  insert into public.ab_events (experiment_id, variant_id, visitor_id, event_type)
  values (v_exp_id, v_variant_id, p_visitor_id, 'click');
  return true;
exception when others then
  return false;
end;
$$;

grant execute on function public.ab_track_click(text, text) to anon, authenticated;

-- Stats per experiment (admin)
create or replace function public.ab_experiment_stats(p_key text)
returns table (
  variant_id uuid,
  variant_key text,
  is_control boolean,
  is_active boolean,
  impressions bigint,
  clicks bigint,
  ctr numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exp_id uuid;
begin
  if not public.has_role(auth.uid(),'super_admin') then
    raise exception 'forbidden';
  end if;

  select id into v_exp_id from public.ab_experiments where key = p_key;
  if v_exp_id is null then
    return;
  end if;

  return query
  select
    v.id, v.key, v.is_control, v.is_active,
    coalesce(sum(case when e.event_type='impression' then 1 else 0 end), 0)::bigint as impressions,
    coalesce(sum(case when e.event_type='click'      then 1 else 0 end), 0)::bigint as clicks,
    case
      when coalesce(sum(case when e.event_type='impression' then 1 else 0 end), 0) = 0 then 0
      else round(
        coalesce(sum(case when e.event_type='click' then 1 else 0 end), 0)::numeric
        / sum(case when e.event_type='impression' then 1 else 0 end)::numeric,
        6
      )
    end as ctr
  from public.ab_variants v
  left join public.ab_events e on e.variant_id = v.id
  where v.experiment_id = v_exp_id
  group by v.id, v.key, v.is_control, v.is_active
  order by v.key;
end;
$$;

grant execute on function public.ab_experiment_stats(text) to authenticated;

-- Evaluate experiments and auto-promote winner using a two-proportion z-test
create or replace function public.ab_evaluate_experiments()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exp record;
  v_control record;
  v_best record;
  v_results jsonb := '[]'::jsonb;
  v_min integer;
  v_p1 numeric; v_p2 numeric; v_p numeric;
  v_se numeric; v_z numeric; v_pval numeric;
  v_min_z numeric;
  v_processed integer := 0;
  v_promoted integer := 0;
begin
  -- caller must be admin OR called with service role (no auth.uid())
  if auth.uid() is not null and not public.has_role(auth.uid(),'super_admin') then
    raise exception 'forbidden';
  end if;

  for v_exp in
    select * from public.ab_experiments where status = 'running' and auto_promote = true
  loop
    v_processed := v_processed + 1;

    -- aggregate per variant for this experiment (active variants only)
    with agg as (
      select
        v.id, v.key, v.is_control,
        coalesce(sum(case when e.event_type='impression' then 1 else 0 end), 0)::bigint as imp,
        coalesce(sum(case when e.event_type='click'      then 1 else 0 end), 0)::bigint as clk
      from public.ab_variants v
      left join public.ab_events e on e.variant_id = v.id
      where v.experiment_id = v_exp.id and v.is_active = true
      group by v.id, v.key, v.is_control
    )
    select * into v_control from agg where is_control = true limit 1;

    if v_control is null then
      v_results := v_results || jsonb_build_object('experiment', v_exp.key, 'status', 'no_control');
      continue;
    end if;

    -- best non-control variant by CTR
    select * into v_best
    from (
      select id, key, imp, clk,
        case when imp = 0 then 0 else clk::numeric / imp::numeric end as ctr
      from (
        with agg as (
          select
            v.id, v.key, v.is_control,
            coalesce(sum(case when e.event_type='impression' then 1 else 0 end), 0)::bigint as imp,
            coalesce(sum(case when e.event_type='click'      then 1 else 0 end), 0)::bigint as clk
          from public.ab_variants v
          left join public.ab_events e on e.variant_id = v.id
          where v.experiment_id = v_exp.id and v.is_active = true
          group by v.id, v.key, v.is_control
        )
        select * from agg where is_control = false
      ) sub
    ) ranked
    order by ctr desc
    limit 1;

    if v_best is null then
      v_results := v_results || jsonb_build_object('experiment', v_exp.key, 'status', 'no_challenger');
      continue;
    end if;

    v_min := v_exp.min_sample_per_variant;
    if v_control.imp < v_min or v_best.imp < v_min then
      v_results := v_results || jsonb_build_object(
        'experiment', v_exp.key, 'status', 'insufficient_sample',
        'control_imp', v_control.imp, 'best_imp', v_best.imp, 'min', v_min
      );
      continue;
    end if;

    v_p1 := v_control.clk::numeric / v_control.imp::numeric;
    v_p2 := v_best.clk::numeric    / v_best.imp::numeric;
    v_p  := (v_control.clk + v_best.clk)::numeric / (v_control.imp + v_best.imp)::numeric;

    if v_p = 0 or v_p = 1 then
      v_results := v_results || jsonb_build_object('experiment', v_exp.key, 'status', 'degenerate');
      continue;
    end if;

    v_se := sqrt(v_p * (1 - v_p) * (1.0/v_control.imp + 1.0/v_best.imp));
    if v_se = 0 then
      continue;
    end if;
    v_z := (v_p2 - v_p1) / v_se;

    -- approximate two-tailed p-value using erf
    -- p = erfc(|z|/sqrt(2))
    -- Postgres lacks erf; use Abramowitz & Stegun approximation
    v_pval := public.ab_two_tailed_p(v_z);

    -- Determine threshold: confidence_threshold e.g. 0.95 -> alpha=0.05
    if v_p2 > v_p1 and v_pval < (1 - v_exp.confidence_threshold) then
      -- promote v_best
      update public.ab_experiments
        set status = 'completed',
            winner_variant_id = v_best.id,
            promoted_at = now()
        where id = v_exp.id;

      update public.ab_variants
        set is_active = (id = v_best.id)
        where experiment_id = v_exp.id;

      v_promoted := v_promoted + 1;
      v_results := v_results || jsonb_build_object(
        'experiment', v_exp.key, 'status', 'promoted',
        'winner', v_best.key, 'p_value', v_pval, 'z', v_z,
        'control_ctr', v_p1, 'winner_ctr', v_p2
      );
    else
      v_results := v_results || jsonb_build_object(
        'experiment', v_exp.key, 'status', 'no_winner_yet',
        'p_value', v_pval, 'z', v_z,
        'control_ctr', v_p1, 'best_ctr', v_p2
      );
    end if;
  end loop;

  return jsonb_build_object('processed', v_processed, 'promoted', v_promoted, 'results', v_results);
end;
$$;

-- Two-tailed p-value approximation for normal distribution.
create or replace function public.ab_two_tailed_p(z numeric)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  x numeric;
  t numeric;
  erf numeric;
  -- Abramowitz & Stegun 7.1.26 constants
  a1 numeric := 0.254829592;
  a2 numeric := -0.284496736;
  a3 numeric := 1.421413741;
  a4 numeric := -1.453152027;
  a5 numeric := 1.061405429;
  p  numeric := 0.3275911;
  sign_x integer;
begin
  x := abs(z) / sqrt(2);
  sign_x := 1;
  t := 1.0 / (1.0 + p * x);
  erf := 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * exp(-x*x);
  -- two-tailed p = 1 - erf(|z|/sqrt(2))
  return greatest(0, least(1, 1 - erf));
end;
$$;

grant execute on function public.ab_evaluate_experiments() to authenticated;
grant execute on function public.ab_two_tailed_p(numeric) to authenticated;
