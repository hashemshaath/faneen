-- ============================================================================
-- Security audit log: unified, PII-safe trail for OTP, password reset, and
-- supplier-lead notification events. Admin-only read, service-role insert.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   text NOT NULL,                  -- e.g. 'otp_send', 'otp_verify', 'password_reset', 'supplier_lead_notify'
  event_action text NOT NULL,                  -- e.g. 'attempt' | 'success' | 'failed' | 'rate_limited'
  status       text NOT NULL DEFAULT 'info',   -- 'info' | 'warn' | 'error'
  user_id      uuid,                            -- when known (no FK to auth.users)
  subject_hash text,                            -- SHA-256(phone|email|target_user_id) — never raw PII
  ip_hash      text,                            -- SHA-256(ip|salt)
  user_agent   text,                            -- safe to keep, useful for forensics
  request_id   text,                            -- correlation id (e.g. lead_id, message_id)
  reason       text,                            -- short machine-readable code (e.g. 'invalid_code', 'sms_delivery_failed')
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb, -- non-sensitive context (counts, flags)
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sec_audit_event_created     ON public.security_audit_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_action_created    ON public.security_audit_log (event_action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_user_created      ON public.security_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_subject_created   ON public.security_audit_log (subject_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_ip_created        ON public.security_audit_log (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_request_id        ON public.security_audit_log (request_id);
CREATE INDEX IF NOT EXISTS idx_sec_audit_status_created    ON public.security_audit_log (status, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only platform admins may read. Service role bypasses RLS automatically.
CREATE POLICY "Admins can view security audit log"
  ON public.security_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- No INSERT/UPDATE/DELETE policies → only service_role can write.

-- ----------------------------------------------------------------------------
-- Helper: insert a security audit row from edge functions / SECURITY DEFINER
-- callers without exposing the table directly.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type   text,
  _event_action text,
  _status       text DEFAULT 'info',
  _user_id      uuid DEFAULT NULL,
  _subject_hash text DEFAULT NULL,
  _ip_hash      text DEFAULT NULL,
  _user_agent   text DEFAULT NULL,
  _request_id   text DEFAULT NULL,
  _reason       text DEFAULT NULL,
  _metadata     jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.security_audit_log (
    event_type, event_action, status, user_id, subject_hash,
    ip_hash, user_agent, request_id, reason, metadata
  ) VALUES (
    _event_type, _event_action, COALESCE(_status,'info'), _user_id, _subject_hash,
    _ip_hash, _user_agent, _request_id, _reason, COALESCE(_metadata,'{}'::jsonb)
  ) RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Service role only — explicitly revoke from anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.log_security_event(text,text,text,uuid,text,text,text,text,text,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text,text,text,uuid,text,text,text,text,text,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text,text,text,uuid,text,text,text,text,text,jsonb) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.log_security_event(text,text,text,uuid,text,text,text,text,text,jsonb) TO service_role;

COMMENT ON TABLE  public.security_audit_log IS 'PII-safe audit trail for sensitive events (OTP, password reset, supplier-lead notifications). Identifiers are SHA-256 hashed. Admin-only read; service-role-only write via log_security_event().';
COMMENT ON COLUMN public.security_audit_log.subject_hash IS 'SHA-256 of phone/email/target_user_id with project salt. Never stores raw PII.';
COMMENT ON COLUMN public.security_audit_log.ip_hash      IS 'SHA-256(ip|salt). Never stores raw IP.';