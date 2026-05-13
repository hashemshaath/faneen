-- Audit table for rejected/blocked membership upgrade attempts
CREATE TABLE IF NOT EXISTS public.membership_upgrade_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempted_business_id uuid,
  attempted_business_ref_id text,
  actual_business_ref_id text,
  requested_tier text,
  billing_cycle text,
  reason_code text NOT NULL,
  error_message text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mur_user        ON public.membership_upgrade_rejections(user_id);
CREATE INDEX IF NOT EXISTS idx_mur_business    ON public.membership_upgrade_rejections(attempted_business_id);
CREATE INDEX IF NOT EXISTS idx_mur_ref         ON public.membership_upgrade_rejections(attempted_business_ref_id);
CREATE INDEX IF NOT EXISTS idx_mur_reason      ON public.membership_upgrade_rejections(reason_code);
CREATE INDEX IF NOT EXISTS idx_mur_created     ON public.membership_upgrade_rejections(created_at DESC);

ALTER TABLE public.membership_upgrade_rejections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read rejections" ON public.membership_upgrade_rejections;
CREATE POLICY "Admins read rejections"
  ON public.membership_upgrade_rejections
  FOR SELECT
  TO authenticated
  USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Owners read own rejections" ON public.membership_upgrade_rejections;
CREATE POLICY "Owners read own rejections"
  ON public.membership_upgrade_rejections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Writes only via SECURITY DEFINER function below — no INSERT/UPDATE/DELETE policies.

CREATE OR REPLACE FUNCTION public.log_upgrade_rejection(
  _attempted_business_id uuid,
  _attempted_business_ref_id text,
  _requested_tier text,
  _billing_cycle text,
  _reason_code text,
  _error_message text,
  _user_agent text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  actual_ref text;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  IF _attempted_business_id IS NOT NULL THEN
    SELECT ref_id INTO actual_ref FROM public.businesses WHERE id = _attempted_business_id;
  END IF;

  INSERT INTO public.membership_upgrade_rejections (
    user_id, attempted_business_id, attempted_business_ref_id, actual_business_ref_id,
    requested_tier, billing_cycle, reason_code, error_message, user_agent
  ) VALUES (
    uid, _attempted_business_id, _attempted_business_ref_id, actual_ref,
    _requested_tier, _billing_cycle,
    coalesce(nullif(trim(_reason_code), ''), 'unknown'),
    _error_message, _user_agent
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_upgrade_rejection(uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_upgrade_rejection(uuid, text, text, text, text, text, text) TO authenticated;