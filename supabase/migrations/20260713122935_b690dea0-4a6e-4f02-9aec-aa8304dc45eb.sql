-- Add 'overdue' enum value if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'rental_order_status' AND e.enumlabel = 'overdue'
  ) THEN
    ALTER TYPE public.rental_order_status ADD VALUE 'overdue';
  END IF;
END $$;

-- Extend roll function with overdue transition
CREATE OR REPLACE FUNCTION public.rental_orders_roll_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_expiring int := 0;
  v_expired int := 0;
  v_overdue int := 0;
  v_result jsonb;
BEGIN
  WITH upd AS (
    UPDATE public.rental_orders
       SET status = 'expiring_soon', updated_at = now()
     WHERE status = 'active'
       AND end_date <= (v_today + INTERVAL '3 days')::date
       AND end_date >= v_today
    RETURNING id
  ) SELECT count(*) INTO v_expiring FROM upd;

  WITH upd AS (
    UPDATE public.rental_orders
       SET status = 'expired', updated_at = now()
     WHERE status IN ('active','expiring_soon')
       AND end_date < v_today
    RETURNING id
  ) SELECT count(*) INTO v_expired FROM upd;

  -- Overdue: expired for more than 1 day (grace = 1 day)
  WITH upd AS (
    UPDATE public.rental_orders
       SET status = 'overdue', updated_at = now()
     WHERE status = 'expired'
       AND end_date < (v_today - INTERVAL '1 day')::date
    RETURNING id
  ) SELECT count(*) INTO v_overdue FROM upd;

  v_result := jsonb_build_object(
    'ran_at', now(),
    'today', v_today,
    'transitioned_to_expiring', v_expiring,
    'transitioned_to_expired', v_expired,
    'transitioned_to_overdue', v_overdue
  );

  INSERT INTO public.cron_run_log (job_name, status, result, started_at, finished_at)
  VALUES ('rental_orders_roll_status', 'success', v_result, now(), now());

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_run_log (job_name, status, result, started_at, finished_at)
  VALUES ('rental_orders_roll_status', 'error',
          jsonb_build_object('error', SQLERRM), now(), now());
  RAISE;
END;
$function$;