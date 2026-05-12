
-- Sector / city pageview events
CREATE TABLE public.sector_page_events (
  id BIGSERIAL PRIMARY KEY,
  sector_slug TEXT NOT NULL,
  city_slug TEXT,
  referrer_host TEXT,
  path TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_spe_sector_time ON public.sector_page_events (sector_slug, occurred_at DESC);
CREATE INDEX idx_spe_sector_city_time ON public.sector_page_events (sector_slug, city_slug, occurred_at DESC);
CREATE INDEX idx_spe_referrer ON public.sector_page_events (referrer_host) WHERE referrer_host IS NOT NULL;
CREATE INDEX idx_spe_occurred_at ON public.sector_page_events (occurred_at DESC);

ALTER TABLE public.sector_page_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read raw events
CREATE POLICY "Admins read sector page events"
  ON public.sector_page_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No direct insert policy — inserts go through SECURITY DEFINER function

-- Allowed sector slugs (kept in sync with src/lib/sector-keywords.ts)
CREATE OR REPLACE FUNCTION public.log_sector_pageview(
  p_sector TEXT,
  p_city TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_path TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sector TEXT := lower(trim(p_sector));
  v_city TEXT := NULLIF(lower(trim(p_city)), '');
  v_ref TEXT := NULLIF(lower(trim(p_referrer)), '');
  v_path TEXT := left(coalesce(p_path, ''), 256);
BEGIN
  IF v_sector IS NULL OR v_sector NOT IN ('aluminum','iron','glass','wood','cabinets') THEN
    RETURN;
  END IF;

  -- Strip protocol/path from referrer to keep just the host
  IF v_ref IS NOT NULL THEN
    v_ref := regexp_replace(v_ref, '^https?://', '');
    v_ref := split_part(v_ref, '/', 1);
    v_ref := regexp_replace(v_ref, '^www\.', '');
    v_ref := left(v_ref, 128);
    -- Drop self-referrals
    IF v_ref IN ('qitaat.com', 'qitaat.lovable.app', 'localhost', '127.0.0.1') THEN
      v_ref := NULL;
    END IF;
  END IF;

  INSERT INTO public.sector_page_events (sector_slug, city_slug, referrer_host, path)
  VALUES (v_sector, v_city, v_ref, NULLIF(v_path, ''));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_sector_pageview(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Aggregate: per sector×city stats with growth between two windows
CREATE OR REPLACE FUNCTION public.market_sector_city_stats(
  p_days INTEGER DEFAULT 30
) RETURNS TABLE (
  sector_slug TEXT,
  city_slug TEXT,
  visits_current BIGINT,
  visits_previous BIGINT,
  growth_pct NUMERIC,
  unique_referrers BIGINT,
  backlink_visits BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cur AS (
    SELECT sector_slug, COALESCE(city_slug, '') AS city_slug,
           COUNT(*) AS visits,
           COUNT(DISTINCT referrer_host) FILTER (WHERE referrer_host IS NOT NULL) AS uniq_ref,
           COUNT(*) FILTER (WHERE referrer_host IS NOT NULL) AS backlinks
    FROM sector_page_events
    WHERE occurred_at >= now() - (p_days || ' days')::interval
    GROUP BY 1, 2
  ),
  prev AS (
    SELECT sector_slug, COALESCE(city_slug, '') AS city_slug, COUNT(*) AS visits
    FROM sector_page_events
    WHERE occurred_at >= now() - (2 * p_days || ' days')::interval
      AND occurred_at <  now() - (p_days || ' days')::interval
    GROUP BY 1, 2
  )
  SELECT c.sector_slug,
         NULLIF(c.city_slug, '') AS city_slug,
         c.visits AS visits_current,
         COALESCE(p.visits, 0) AS visits_previous,
         CASE WHEN COALESCE(p.visits, 0) = 0 THEN NULL
              ELSE ROUND(((c.visits - p.visits)::numeric / p.visits::numeric) * 100, 1)
         END AS growth_pct,
         c.uniq_ref AS unique_referrers,
         c.backlinks AS backlink_visits
  FROM cur c
  LEFT JOIN prev p USING (sector_slug, city_slug)
  ORDER BY c.visits DESC;
$$;

GRANT EXECUTE ON FUNCTION public.market_sector_city_stats(INTEGER) TO authenticated;

-- Aggregate: top referrer hosts per sector
CREATE OR REPLACE FUNCTION public.market_top_referrers(
  p_days INTEGER DEFAULT 30,
  p_sector TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25
) RETURNS TABLE (
  referrer_host TEXT,
  sector_slug TEXT,
  visits BIGINT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT referrer_host,
         sector_slug,
         COUNT(*) AS visits,
         MIN(occurred_at) AS first_seen,
         MAX(occurred_at) AS last_seen
  FROM sector_page_events
  WHERE referrer_host IS NOT NULL
    AND occurred_at >= now() - (p_days || ' days')::interval
    AND (p_sector IS NULL OR sector_slug = p_sector)
  GROUP BY referrer_host, sector_slug
  ORDER BY visits DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 25), 200));
$$;

GRANT EXECUTE ON FUNCTION public.market_top_referrers(INTEGER, TEXT, INTEGER) TO authenticated;

-- Aggregate: daily visits time-series for a sector (and optional city)
CREATE OR REPLACE FUNCTION public.market_visits_timeseries(
  p_days INTEGER DEFAULT 30,
  p_sector TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
) RETURNS TABLE (
  day DATE,
  sector_slug TEXT,
  visits BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (occurred_at AT TIME ZONE 'UTC')::date AS day,
         sector_slug,
         COUNT(*) AS visits
  FROM sector_page_events
  WHERE occurred_at >= now() - (p_days || ' days')::interval
    AND (p_sector IS NULL OR sector_slug = p_sector)
    AND (p_city IS NULL OR city_slug = p_city)
  GROUP BY 1, 2
  ORDER BY 1 ASC;
$$;

GRANT EXECUTE ON FUNCTION public.market_visits_timeseries(INTEGER, TEXT, TEXT) TO authenticated;
