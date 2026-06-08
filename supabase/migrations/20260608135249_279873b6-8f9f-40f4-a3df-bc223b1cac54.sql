
-- ─────────────────────────────────────────────────────────────────────────────
-- RENTAL-ASSET-FINAL-POLISH-3
-- Two read-only JSON RPCs. No new tables, no policy changes, no scope creep.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Per-asset utilization summary (90-day window by default).
--    Returns ONLY operational fields. No customer names, no prices, no PII.
CREATE OR REPLACE FUNCTION public.asset_utilization_summary(
  _asset_id uuid,
  _window_days integer DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window int := GREATEST(COALESCE(_window_days, 90), 1);
  v_from   date := (current_date - v_window);
  v_to     date := current_date;
  v_status text;
  v_days_rented int := 0;
  v_days_idle int := 0;
  v_pct numeric := 0;
  v_last_ref text;
  v_next date;
BEGIN
  IF _asset_id IS NULL THEN
    RETURN jsonb_build_object('error','asset_required');
  END IF;

  SELECT status INTO v_status FROM public.assets WHERE id = _asset_id;
  IF v_status IS NULL THEN
    RETURN jsonb_build_object('error','asset_not_found');
  END IF;

  -- Sum days rented inside window from active/returned assignments.
  SELECT COALESCE(
    SUM(
      GREATEST(
        0,
        LEAST(end_date::date, v_to) - GREATEST(start_date::date, v_from) + 1
      )
    ), 0)::int
  INTO v_days_rented
  FROM public.asset_rental_assignments
  WHERE asset_id = _asset_id
    AND status IN ('active','returned')
    AND end_date::date   >= v_from
    AND start_date::date <= v_to;

  v_days_rented := LEAST(v_days_rented, v_window);
  v_days_idle   := GREATEST(v_window - v_days_rented, 0);
  v_pct := CASE WHEN v_window > 0
                THEN ROUND((v_days_rented::numeric / v_window) * 100, 2)
                ELSE 0 END;

  -- Latest rental ref this asset has touched.
  SELECT ro.ref_id
  INTO v_last_ref
  FROM public.asset_rental_assignments ara
  JOIN public.rental_orders ro ON ro.id = ara.rental_order_id
  WHERE ara.asset_id = _asset_id
  ORDER BY ara.end_date DESC NULLS LAST, ara.created_at DESC
  LIMIT 1;

  -- Next availability date: earliest day after current active/reserved blocks.
  IF v_status IN ('available') THEN
    v_next := current_date;
  ELSE
    SELECT MIN(end_date::date + 1)
    INTO v_next
    FROM public.asset_rental_assignments
    WHERE asset_id = _asset_id
      AND status IN ('active','reserved')
      AND end_date::date >= current_date;
    IF v_next IS NULL THEN
      v_next := current_date;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'asset_id',           _asset_id,
    'window_days',        v_window,
    'days_rented',        v_days_rented,
    'days_idle',          v_days_idle,
    'utilization_pct',    v_pct,
    'current_status',     v_status,
    'last_rental_ref',    v_last_ref,
    'next_available_date', v_next
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.asset_utilization_summary(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.asset_utilization_summary(uuid, integer) TO service_role;

-- 2) Final-polish operations counts.
CREATE OR REPLACE FUNCTION public.rental_asset_polish_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_low int; v_no_qr int; v_overdue int; v_pri_queue int; v_repeated int;
BEGIN
  -- Low utilization (<25% on latest snapshot)
  SELECT COUNT(DISTINCT asset_id)
  INTO v_low
  FROM public.asset_utilization
  WHERE utilization_rate < 25;

  -- Assets without QR/physical identity (no serial number)
  SELECT COUNT(*)
  INTO v_no_qr
  FROM public.assets
  WHERE COALESCE(serial_number,'') = ''
    AND is_active = true
    AND status <> 'retired';

  -- Overdue inspections (next_inspection_at in the past)
  SELECT COUNT(*)
  INTO v_overdue
  FROM public.assets
  WHERE next_inspection_at IS NOT NULL
    AND next_inspection_at < current_date
    AND status <> 'retired';

  -- Post-rental inspection queue
  SELECT COUNT(*)
  INTO v_pri_queue
  FROM public.asset_rental_assignments ara
  JOIN public.rental_orders ro ON ro.id = ara.rental_order_id
  WHERE ara.post_rental_inspection_required = true
    AND ro.status = 'closed'
    AND ara.status IN ('returned','active');

  -- Assets repeatedly overridden (3+ override events)
  SELECT COUNT(*)
  INTO v_repeated
  FROM (
    SELECT asset_id, COUNT(*) AS n
    FROM public.asset_override_log
    WHERE asset_id IS NOT NULL
    GROUP BY asset_id
    HAVING COUNT(*) >= 3
  ) t;

  RETURN jsonb_build_object(
    'low_utilization_assets',      COALESCE(v_low,0),
    'assets_without_qr',           COALESCE(v_no_qr,0),
    'inspections_overdue',         COALESCE(v_overdue,0),
    'post_rental_inspection_queue',COALESCE(v_pri_queue,0),
    'repeated_overrides',          COALESCE(v_repeated,0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rental_asset_polish_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rental_asset_polish_counts() TO service_role;
