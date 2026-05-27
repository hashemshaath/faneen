
-- Sequence for ALR-NNNNNNN ref_ids
CREATE SEQUENCE IF NOT EXISTS public.seq_operational_alerts START WITH 1000001 INCREMENT BY 1;

-- Table
CREATE TABLE public.operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE DEFAULT public.generate_ref_id('ALR', 'seq_operational_alerts'),
  domain text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  condition_code text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  title_ar text NOT NULL,
  title_en text NOT NULL,
  message_ar text NOT NULL,
  message_en text NOT NULL,
  owner_user_id uuid NULL,
  owner_business_id uuid NULL,
  due_at timestamptz NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz NULL,
  acknowledged_by uuid NULL,
  resolved_at timestamptz NULL,
  resolved_by uuid NULL,
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_alerts_severity_check
    CHECK (severity IN ('info','warning','overdue','critical')),
  CONSTRAINT operational_alerts_status_check
    CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  CONSTRAINT operational_alerts_domain_check
    CHECK (domain IN ('leads','invitations','contracts','verification','memberships','payments','support'))
);

-- GRANTs (read-only for authenticated; RLS scopes which rows are visible)
GRANT SELECT ON public.operational_alerts TO authenticated;
GRANT ALL ON public.operational_alerts TO service_role;

-- Indexes
CREATE INDEX idx_op_alerts_status_severity ON public.operational_alerts (status, severity);
CREATE INDEX idx_op_alerts_domain_condition ON public.operational_alerts (domain, condition_code);
CREATE INDEX idx_op_alerts_owner_user ON public.operational_alerts (owner_user_id);
CREATE INDEX idx_op_alerts_owner_business ON public.operational_alerts (owner_business_id);
CREATE INDEX idx_op_alerts_due_at ON public.operational_alerts (due_at);
CREATE INDEX idx_op_alerts_triggered_at ON public.operational_alerts (triggered_at DESC);
CREATE INDEX idx_op_alerts_entity ON public.operational_alerts (entity_type, entity_id);

-- updated_at trigger (reuse generic helper)
CREATE TRIGGER trg_op_alerts_updated_at
  BEFORE UPDATE ON public.operational_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

-- Policies (read-only for non-service roles; no anon)
CREATE POLICY "Admins read all operational alerts"
  ON public.operational_alerts
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Owner user reads own operational alerts"
  ON public.operational_alerts
  FOR SELECT
  TO authenticated
  USING (owner_user_id IS NOT NULL AND owner_user_id = auth.uid());

CREATE POLICY "Business members read business operational alerts"
  ON public.operational_alerts
  FOR SELECT
  TO authenticated
  USING (
    owner_business_id IS NOT NULL
    AND public.has_entity_membership(auth.uid(), owner_business_id, 'entity.view')
  );

CREATE POLICY "Service role full access to operational alerts"
  ON public.operational_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
