ALTER TABLE public.password_reset_log
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_password_reset_log_status_created
  ON public.password_reset_log (status, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'password_reset_log'
      AND policyname = 'Anyone can insert password reset logs'
  ) THEN
    CREATE POLICY "Anyone can insert password reset logs"
      ON public.password_reset_log
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

GRANT INSERT ON public.password_reset_log TO anon, authenticated;