
-- Password reset audit log
CREATE TABLE public.password_reset_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_password_reset_log_email ON public.password_reset_log (email);
CREATE INDEX idx_password_reset_log_created ON public.password_reset_log (created_at DESC);

-- Enable RLS
ALTER TABLE public.password_reset_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view password reset logs"
  ON public.password_reset_log FOR SELECT
  TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- Anyone can insert (the reset request itself)
CREATE POLICY "Anyone can log a password reset request"
  ON public.password_reset_log FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);
