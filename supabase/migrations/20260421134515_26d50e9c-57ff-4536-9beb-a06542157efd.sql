DROP POLICY "Anyone can log migration events" ON public.migration_telemetry;

CREATE POLICY "Anyone can log known migration events"
  ON public.migration_telemetry
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    migration_key IN ('localStorage_v1', 'localStorage_faneen_to_qitaat')
    AND length(coalesce(user_agent, '')) <= 500
    AND length(coalesce(error_message, '')) <= 1000
    AND keys_migrated >= 0
    AND keys_migrated <= 100
  );