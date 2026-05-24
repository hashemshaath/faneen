-- EDGE-CRON-OBSERVABILITY-2: retention helper for cron_run_log
CREATE OR REPLACE FUNCTION public.prune_cron_run_log(_older_than_days integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_cutoff timestamptz;
  v_deleted integer := 0;
  v_is_service boolean := (current_setting('request.jwt.claim.role', true) = 'service_role');
  v_uid uuid := auth.uid();
BEGIN
  IF NOT v_is_service THEN
    IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_days := GREATEST(COALESCE(_older_than_days, 90), 30);
  v_cutoff := now() - make_interval(days => v_days);

  WITH del AS (
    DELETE FROM public.cron_run_log WHERE started_at < v_cutoff RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM del;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted', v_deleted,
    'older_than_days', v_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prune_cron_run_log(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_cron_run_log(integer) TO service_role, authenticated;
