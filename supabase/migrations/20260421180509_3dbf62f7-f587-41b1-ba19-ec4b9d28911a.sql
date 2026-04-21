ALTER TABLE public.migration_telemetry ADD COLUMN IF NOT EXISTS error_code text;
CREATE INDEX IF NOT EXISTS idx_migration_telemetry_error_code ON public.migration_telemetry (error_code) WHERE error_code IS NOT NULL;

-- Update RLS insert policy to allow error_code field with length cap
DROP POLICY IF EXISTS "Anyone can log known migration events" ON public.migration_telemetry;
CREATE POLICY "Anyone can log known migration events" ON public.migration_telemetry
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (migration_key = ANY (ARRAY['localStorage_v1'::text, 'localStorage_faneen_to_qitaat'::text]))
    AND (length(COALESCE(user_agent, ''::text)) <= 500)
    AND (length(COALESCE(error_message, ''::text)) <= 1000)
    AND (length(COALESCE(error_code, ''::text)) <= 64)
    AND (keys_migrated >= 0)
    AND (keys_migrated <= 100)
  );