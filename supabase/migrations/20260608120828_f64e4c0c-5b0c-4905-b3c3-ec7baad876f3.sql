DROP FUNCTION IF EXISTS public.rental_orders_roll_status() CASCADE;

CREATE OR REPLACE FUNCTION public.rental_orders_roll_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_expiring int := 0;
  v_expired int := 0;
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

  v_result := jsonb_build_object(
    'ran_at', now(),
    'today', v_today,
    'transitioned_to_expiring', v_expiring,
    'transitioned_to_expired', v_expired
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
$$;

REVOKE ALL ON FUNCTION public.rental_orders_roll_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rental_orders_roll_status() TO service_role;

CREATE OR REPLACE FUNCTION public.rental_items_missing_data()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'missing_images',  (SELECT count(*) FROM public.rental_items WHERE coalesce(jsonb_array_length(images::jsonb), 0) = 0),
    'missing_category',(SELECT count(*) FROM public.rental_items WHERE category_id IS NULL),
    'missing_slug',    (SELECT count(*) FROM public.rental_items WHERE seo_slug IS NULL OR length(seo_slug) = 0),
    'low_seo',         (SELECT count(*) FROM public.rental_items
                         WHERE (description_ar IS NULL OR length(description_ar) < 60)
                            OR (seo_slug IS NULL OR length(seo_slug) = 0))
  );
$$;

REVOKE ALL ON FUNCTION public.rental_items_missing_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rental_items_missing_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rental_items_missing_data() TO service_role;