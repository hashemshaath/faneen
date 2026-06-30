CREATE TABLE IF NOT EXISTS public.email_login_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  otp_code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.email_login_otps TO service_role;

ALTER TABLE public.email_login_otps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_login_otps_user_active
  ON public.email_login_otps (user_id, created_at DESC)
  WHERE verified = false;

CREATE INDEX IF NOT EXISTS idx_email_login_otps_email_created
  ON public.email_login_otps (lower(email), created_at DESC);