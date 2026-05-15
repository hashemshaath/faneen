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
  v_processed integer := 0;
  v_promoted integer := 0;
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'super_admin') then
    raise exception 'forbidden';
  end if;

  for v_exp in
    select * from public.ab_experiments where status = 'running' and auto_promote = true
  loop
    v_processed := v_processed + 1;

    select v.id, v.key, v.is_control,
           coalesce(sum(case when e.event_type='impression' then 1 else 0 end),0)::bigint as imp,
           coalesce(sum(case when e.event_type='click'      then 1 else 0 end),0)::bigint as clk
      into v_control
    from public.ab_variants v
    left join public.ab_events e on e.variant_id = v.id
    where v.experiment_id = v_exp.id and v.is_active = true and v.is_control = true
    group by v.id, v.key, v.is_control
    limit 1;

    if not found then
      v_results := v_results || jsonb_build_object('experiment', v_exp.key, 'status', 'no_control');
      continue;
    end if;

    select sub.id, sub.key, sub.imp, sub.clk,
           case when sub.imp = 0 then 0 else sub.clk::numeric / sub.imp::numeric end as ctr
      into v_best
    from (
      select v.id, v.key,
             coalesce(sum(case when e.event_type='impression' then 1 else 0 end),0)::bigint as imp,
             coalesce(sum(case when e.event_type='click'      then 1 else 0 end),0)::bigint as clk
      from public.ab_variants v
      left join public.ab_events e on e.variant_id = v.id
      where v.experiment_id = v_exp.id and v.is_active = true and v.is_control = false
      group by v.id, v.key
    ) sub
    order by (case when sub.imp = 0 then 0 else sub.clk::numeric / sub.imp::numeric end) desc
    limit 1;

    if not found then
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
    v_pval := public.ab_two_tailed_p(v_z);

    if v_p2 > v_p1 and v_pval < (1 - v_exp.confidence_threshold) then
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