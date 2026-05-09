-- Email link click categorization
CREATE TABLE IF NOT EXISTS public.email_link_clicks (
  id BIGSERIAL PRIMARY KEY,
  message_id TEXT NOT NULL,
  template_name TEXT,
  category TEXT NOT NULL,
  target_url TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_link_clicks_msg ON public.email_link_clicks(message_id);
CREATE INDEX IF NOT EXISTS idx_email_link_clicks_cat ON public.email_link_clicks(category);
CREATE INDEX IF NOT EXISTS idx_email_link_clicks_at ON public.email_link_clicks(clicked_at DESC);

ALTER TABLE public.email_link_clicks ENABLE ROW LEVEL SECURITY;

-- Only admins can read; inserts go through service role (bypasses RLS).
CREATE POLICY "Admins can view email link clicks"
ON public.email_link_clicks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Categorize a URL into a known category
CREATE OR REPLACE FUNCTION public.categorize_email_link(_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  u TEXT;
BEGIN
  IF _url IS NULL THEN RETURN 'other'; END IF;
  u := lower(_url);
  IF u ~ '/(pricing|plans|subscribe|upgrade|membership|memberships)(/|\?|$)' THEN RETURN 'pricing'; END IF;
  IF u ~ '/(contracts?|contract-)' THEN RETURN 'contract'; END IF;
  IF u ~ '/(maintenance|maintenance-requests?)' THEN RETURN 'maintenance'; END IF;
  IF u ~ '/(leads?|lead-requests?)' THEN RETURN 'leads'; END IF;
  IF u ~ '/(booking|bookings)' THEN RETURN 'booking'; END IF;
  IF u ~ '/(payments?|invoices?|pay)' THEN RETURN 'payment'; END IF;
  IF u ~ '/(messages?|inbox|chat)' THEN RETURN 'messages'; END IF;
  IF u ~ '/(projects?|portfolio)' THEN RETURN 'projects'; END IF;
  IF u ~ '/(dashboard|profile|settings)' THEN RETURN 'dashboard'; END IF;
  RETURN 'other';
END;
$$;

-- Record a categorized click (called by email-track-click edge function)
CREATE OR REPLACE FUNCTION public.record_email_link_click(
  _message_id TEXT,
  _target_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tpl TEXT;
BEGIN
  -- Look up template_name from latest send log row for this message
  SELECT template_name INTO _tpl
  FROM public.email_send_log
  WHERE message_id = _message_id
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.email_link_clicks (message_id, template_name, category, target_url)
  VALUES (_message_id, _tpl, public.categorize_email_link(_target_url), _target_url);

  -- Also bump the aggregated counters (existing behavior)
  PERFORM public.record_email_click(_message_id);
END;
$$;

-- Per-category aggregate stats
CREATE OR REPLACE FUNCTION public.get_email_link_category_stats(_window_minutes INT DEFAULT 1440)
RETURNS TABLE (
  category TEXT,
  total_clicks BIGINT,
  unique_clicks BIGINT,
  unique_messages BIGINT,
  ctr NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since TIMESTAMPTZ := now() - make_interval(mins => _window_minutes);
  _delivered BIGINT;
BEGIN
  -- delivered = unique messages with status sent in window (used as CTR denominator)
  SELECT COUNT(*) INTO _delivered FROM (
    SELECT DISTINCT ON (message_id) message_id, status, created_at
    FROM public.email_send_log
    WHERE message_id IS NOT NULL AND created_at >= _since
    ORDER BY message_id, created_at DESC
  ) latest WHERE status = 'sent';

  RETURN QUERY
  SELECT
    c.category,
    COUNT(*)::BIGINT AS total_clicks,
    COUNT(DISTINCT c.message_id)::BIGINT AS unique_clicks,
    COUNT(DISTINCT c.message_id)::BIGINT AS unique_messages,
    CASE WHEN _delivered > 0
      THEN ROUND((COUNT(DISTINCT c.message_id)::NUMERIC / _delivered::NUMERIC) * 100, 2)
      ELSE 0
    END AS ctr
  FROM public.email_link_clicks c
  WHERE c.clicked_at >= _since
  GROUP BY c.category
  ORDER BY total_clicks DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_link_category_stats(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.categorize_email_link(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_email_link_click(TEXT, TEXT) TO service_role;