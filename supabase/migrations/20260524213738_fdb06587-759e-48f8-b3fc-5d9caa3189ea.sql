
-- EDGE-CRON-OBSERVABILITY-1: lightweight cron run log

CREATE TABLE IF NOT EXISTS public.cron_run_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  function_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  ok boolean,
  status text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cron_run_log_job_name_started_at_idx
  ON public.cron_run_log (job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS cron_run_log_started_at_idx
  ON public.cron_run_log (started_at DESC);

ALTER TABLE public.cron_run_log ENABLE ROW LEVEL SECURITY;

-- Admin / super_admin read access. No public write — service role bypasses RLS;
-- application calls flow through the SECURITY DEFINER helper below.
DROP POLICY IF EXISTS "cron_run_log admin read" ON public.cron_run_log;
CREATE POLICY "cron_run_log admin read"
  ON public.cron_run_log
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'super_admin'
    )
  );

-- Centralized sanitizing insert helper. Truncates error_message and
-- forbids any obviously-secret keys in summary.
CREATE OR REPLACE FUNCTION public.log_cron_run(
  _job_name text,
  _function_name text,
  _started_at timestamptz,
  _finished_at timestamptz,
  _ok boolean,
  _status text,
  _summary jsonb,
  _error_code text DEFAULT NULL,
  _error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_summary jsonb;
  v_message text;
  v_duration integer;
  v_key text;
  v_forbidden text[] := ARRAY[
    'authorization','apikey','api_key','secret','password','token',
    'service_role','service_role_key','bearer','provider_payload',
    'raw_payload','payload'
  ];
BEGIN
  v_summary := COALESCE(_summary, '{}'::jsonb);
  IF jsonb_typeof(v_summary) <> 'object' THEN
    v_summary := jsonb_build_object('value', v_summary);
  END IF;

  -- strip any top-level keys that look like secrets / raw payloads
  FOR v_key IN SELECT unnest(v_forbidden) LOOP
    IF v_summary ? v_key THEN
      v_summary := v_summary - v_key;
    END IF;
  END LOOP;

  v_message := left(COALESCE(_error_message, ''), 500);
  IF v_message = '' THEN v_message := NULL; END IF;

  IF _finished_at IS NOT NULL AND _started_at IS NOT NULL THEN
    v_duration := GREATEST(0, (EXTRACT(EPOCH FROM (_finished_at - _started_at)) * 1000)::integer);
  END IF;

  INSERT INTO public.cron_run_log (
    job_name, function_name, started_at, finished_at,
    ok, status, summary, error_code, error_message, duration_ms
  )
  VALUES (
    _job_name, _function_name, _started_at, _finished_at,
    _ok, _status, v_summary, _error_code, v_message, v_duration
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_cron_run(
  text, text, timestamptz, timestamptz, boolean, text, jsonb, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_cron_run(
  text, text, timestamptz, timestamptz, boolean, text, jsonb, text, text
) TO service_role;
