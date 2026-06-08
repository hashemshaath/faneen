
-- RENTAL-ASSET-INTEGRATION-2

-- 1) Override reason enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_override_reason') THEN
    CREATE TYPE public.asset_override_reason AS ENUM (
      'emergency_release','manual_correction','legacy_data_fix','migration_repair'
    );
  END IF;
END $$;

-- 2) Sequence for override refs
CREATE SEQUENCE IF NOT EXISTS public.seq_aovr START 1000000;

-- 3) Audit table
CREATE TABLE IF NOT EXISTS public.asset_override_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE DEFAULT generate_ref_id('AOVR','seq_aovr'),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  rental_order_id uuid REFERENCES public.rental_orders(id) ON DELETE SET NULL,
  assignment_id uuid REFERENCES public.asset_rental_assignments(id) ON DELETE SET NULL,
  reason public.asset_override_reason NOT NULL,
  note text NOT NULL CHECK (length(btrim(note)) >= 5),
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aovr_asset ON public.asset_override_log(asset_id);
CREATE INDEX IF NOT EXISTS idx_aovr_order ON public.asset_override_log(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_aovr_created ON public.asset_override_log(created_at DESC);

-- 4) GRANTs
GRANT SELECT ON public.asset_override_log TO authenticated;
GRANT ALL ON public.asset_override_log TO service_role;
GRANT USAGE ON SEQUENCE public.seq_aovr TO authenticated, service_role;

-- 5) RLS — admin only; append-only (no UPDATE/DELETE policies)
ALTER TABLE public.asset_override_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aovr admin read"
ON public.asset_override_log FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "aovr admin insert"
ON public.asset_override_log FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role) AND actor_user_id = auth.uid());

-- 6) Apply override RPC
CREATE OR REPLACE FUNCTION public.asset_apply_override(
  _asset_id uuid,
  _reason public.asset_override_reason,
  _note text,
  _new_asset_status public.asset_status DEFAULT NULL,
  _assignment_id uuid DEFAULT NULL,
  _new_assignment_status public.asset_rental_assignment_status DEFAULT NULL,
  _rental_order_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_before jsonb := '{}'::jsonb;
  v_after  jsonb := '{}'::jsonb;
  v_asset assets%ROWTYPE;
  v_assn asset_rental_assignments%ROWTYPE;
  v_log_id uuid;
  v_ref text;
BEGIN
  IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;
  IF _note IS NULL OR length(btrim(_note)) < 5 THEN
    RAISE EXCEPTION 'note_required';
  END IF;

  SELECT * INTO v_asset FROM public.assets WHERE id = _asset_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'asset_not_found'; END IF;

  v_before := jsonb_build_object('asset_status', v_asset.status);

  IF _assignment_id IS NOT NULL THEN
    SELECT * INTO v_assn FROM public.asset_rental_assignments WHERE id = _assignment_id;
    IF FOUND THEN
      v_before := v_before || jsonb_build_object('assignment_status', v_assn.status);
    END IF;
  END IF;

  IF _new_asset_status IS NOT NULL THEN
    UPDATE public.assets SET status = _new_asset_status WHERE id = _asset_id;
    v_after := v_after || jsonb_build_object('asset_status', _new_asset_status);
  END IF;

  IF _assignment_id IS NOT NULL AND _new_assignment_status IS NOT NULL THEN
    UPDATE public.asset_rental_assignments
       SET status = _new_assignment_status
     WHERE id = _assignment_id;
    v_after := v_after || jsonb_build_object('assignment_status', _new_assignment_status);
  END IF;

  INSERT INTO public.asset_override_log(
    asset_id, rental_order_id, assignment_id, reason, note,
    before_state, after_state, actor_user_id
  ) VALUES (
    _asset_id, _rental_order_id, _assignment_id, _reason, _note,
    v_before, v_after, v_actor
  ) RETURNING id, ref_id INTO v_log_id, v_ref;

  INSERT INTO public.cron_run_log(job_name, payload)
  VALUES ('asset_override_applied', jsonb_build_object(
    'override_ref', v_ref,
    'asset_ref', v_asset.ref_id,
    'reason', _reason
  ));

  RETURN jsonb_build_object('ok', true, 'override_ref', v_ref, 'id', v_log_id);
END $$;

GRANT EXECUTE ON FUNCTION public.asset_apply_override(
  uuid, public.asset_override_reason, text, public.asset_status,
  uuid, public.asset_rental_assignment_status, uuid
) TO authenticated, service_role;

-- 7) Extended ops counts (replace earlier definition with additions)
CREATE OR REPLACE FUNCTION public.rental_asset_ops_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'orders_without_assets',(
      SELECT COUNT(*) FROM rental_orders ro
      WHERE ro.status IN ('active','expiring_soon','expired')
        AND NOT EXISTS (SELECT 1 FROM asset_rental_assignments a WHERE a.rental_order_id = ro.id)
    ),
    'orders_active_asset_not_rented',(
      SELECT COUNT(DISTINCT arasn.rental_order_id) FROM asset_rental_assignments arasn
      JOIN rental_orders ro ON ro.id = arasn.rental_order_id
      JOIN assets a ON a.id = arasn.asset_id
      WHERE ro.status = 'active' AND arasn.status = 'active' AND a.status <> 'rented'
    ),
    'orders_closed_asset_still_rented',(
      SELECT COUNT(DISTINCT arasn.rental_order_id) FROM asset_rental_assignments arasn
      JOIN rental_orders ro ON ro.id = arasn.rental_order_id
      JOIN assets a ON a.id = arasn.asset_id
      WHERE ro.status IN ('closed','cancelled') AND a.status = 'rented'
    ),
    'overdue_with_assets',(
      SELECT COUNT(DISTINCT arasn.rental_order_id) FROM asset_rental_assignments arasn
      JOIN rental_orders ro ON ro.id = arasn.rental_order_id
      WHERE ro.status = 'expired' AND arasn.status = 'active'
    ),
    'post_rental_inspections_pending',(
      SELECT COUNT(*) FROM assets a
      WHERE a.status = 'inspection'
        AND EXISTS (SELECT 1 FROM asset_rental_assignments arasn
                    WHERE arasn.asset_id = a.id AND arasn.status = 'returned')
    ),
    'overlapping_assignments',(
      SELECT COUNT(*) FROM (
        SELECT a1.id FROM asset_rental_assignments a1
        JOIN asset_rental_assignments a2
          ON a1.asset_id = a2.asset_id AND a1.id < a2.id
        WHERE a1.status IN ('reserved','active')
          AND a2.status IN ('reserved','active')
          AND a1.start_date <= a2.end_date
          AND a1.end_date   >= a2.start_date
      ) s
    ),
    'overrides_last_24h',(
      SELECT COUNT(*) FROM asset_override_log
      WHERE created_at >= now() - interval '24 hours'
    ),
    'overrides_total',(
      SELECT COUNT(*) FROM asset_override_log
    ),
    'blocked_assignments_today',(
      SELECT COUNT(*) FROM cron_run_log
      WHERE job_name = 'asset_assignment_blocked'
        AND created_at >= date_trunc('day', now())
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.rental_asset_ops_counts() TO authenticated, service_role;
