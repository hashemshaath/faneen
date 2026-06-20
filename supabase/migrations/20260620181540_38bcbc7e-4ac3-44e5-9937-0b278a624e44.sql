DROP POLICY IF EXISTS "Anyone can record badge conversions" ON public.badge_conversions;

CREATE POLICY "badge_conversions_insert_guarded"
  ON public.badge_conversions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND event_type IN ('profile_view','contact','booking','phone_reveal','email_reveal')
    AND session_token IS NOT NULL
    AND length(session_token) BETWEEN 8 AND 128
    AND (source_page IS NULL OR length(source_page) <= 512)
  );

DROP POLICY IF EXISTS "hal_insert_authenticated" ON public.help_assistant_logs;

CREATE POLICY "help_assistant_logs_insert_guarded"
  ON public.help_assistant_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    event IN ('question_asked','answer_found','low_confidence','content_gap_submitted')
    AND (query_normalized IS NULL OR length(query_normalized) <= 1024)
    AND (page_key IS NULL OR length(page_key) <= 128)
    AND (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
    AND sources_count >= 0
    AND sources_count <= 100
  );