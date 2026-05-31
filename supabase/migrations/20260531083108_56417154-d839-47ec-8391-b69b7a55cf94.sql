
CREATE TABLE IF NOT EXISTS public.system_module_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('grant','revoke','reset','update')),
  module_key TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_value TEXT,
  previous_enabled BOOLEAN,
  new_enabled BOOLEAN,
  reason TEXT,
  actor UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sysmod_audit_created
  ON public.system_module_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sysmod_audit_scope
  ON public.system_module_audit_log (scope_type, scope_value);

GRANT SELECT ON public.system_module_audit_log TO authenticated;
GRANT ALL ON public.system_module_audit_log TO service_role;
ALTER TABLE public.system_module_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sysmod_audit admin read" ON public.system_module_audit_log;
CREATE POLICY "sysmod_audit admin read"
  ON public.system_module_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Trigger function: capture insert/update/delete on overrides
CREATE OR REPLACE FUNCTION public.fn_log_system_module_override()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.system_module_audit_log
      (action, module_key, scope_type, scope_value, previous_enabled, new_enabled, reason, actor)
    VALUES
      (CASE WHEN NEW.enabled THEN 'grant' ELSE 'revoke' END,
       NEW.module_key, NEW.scope_type, NEW.scope_value,
       NULL, NEW.enabled, NEW.reason, COALESCE(NEW.set_by, auth.uid()));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.enabled IS DISTINCT FROM NEW.enabled OR OLD.reason IS DISTINCT FROM NEW.reason THEN
      INSERT INTO public.system_module_audit_log
        (action, module_key, scope_type, scope_value, previous_enabled, new_enabled, reason, actor)
      VALUES
        ('update',
         NEW.module_key, NEW.scope_type, NEW.scope_value,
         OLD.enabled, NEW.enabled, NEW.reason, COALESCE(NEW.set_by, auth.uid()));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.system_module_audit_log
      (action, module_key, scope_type, scope_value, previous_enabled, new_enabled, reason, actor)
    VALUES
      ('reset',
       OLD.module_key, OLD.scope_type, OLD.scope_value,
       OLD.enabled, NULL, NULL, auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sysmod_override_audit ON public.system_module_overrides;
CREATE TRIGGER trg_sysmod_override_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.system_module_overrides
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_system_module_override();
