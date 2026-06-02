
-- Portfolio professional enhancements: view tracking, sharing analytics, project metadata

ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS project_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS project_duration_days integer,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.business_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_portfolio_items_views ON public.portfolio_items(business_id, view_count DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_service ON public.portfolio_items(service_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_tags ON public.portfolio_items USING GIN(tags);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_portfolio_items_updated_at ON public.portfolio_items;
CREATE TRIGGER trg_portfolio_items_updated_at
BEFORE UPDATE ON public.portfolio_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── View events table ──
CREATE TABLE IF NOT EXISTS public.portfolio_item_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_item_id uuid NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  viewer_user_id uuid,
  session_id text,
  referrer text,
  user_agent text,
  event_type text NOT NULL DEFAULT 'view' CHECK (event_type IN ('view','share','click')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.portfolio_item_views TO authenticated;
GRANT ALL ON public.portfolio_item_views TO service_role;

CREATE INDEX IF NOT EXISTS idx_portfolio_views_item ON public.portfolio_item_views(portfolio_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_views_business ON public.portfolio_item_views(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_views_event ON public.portfolio_item_views(event_type, created_at DESC);

ALTER TABLE public.portfolio_item_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners view own portfolio analytics"
ON public.portfolio_item_views
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = portfolio_item_views.business_id
      AND (b.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- ── Public RPC to record a view event (security definer, public-safe) ──
CREATE OR REPLACE FUNCTION public.record_portfolio_view(
  _portfolio_id uuid,
  _event_type text DEFAULT 'view',
  _session_id text DEFAULT NULL,
  _referrer text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _biz_id uuid;
BEGIN
  IF _event_type NOT IN ('view','share','click') THEN
    RAISE EXCEPTION 'invalid event_type';
  END IF;

  SELECT pi.business_id INTO _biz_id
  FROM public.portfolio_items pi
  JOIN public.businesses b ON b.id = pi.business_id
  WHERE pi.id = _portfolio_id
    AND b.approval_status = 'published'
    AND b.is_active = true
    AND COALESCE(b.is_demo, false) = false;

  IF _biz_id IS NULL THEN
    RETURN; -- silently ignore non-public items
  END IF;

  INSERT INTO public.portfolio_item_views(portfolio_item_id, business_id, viewer_user_id, session_id, referrer, event_type)
  VALUES (_portfolio_id, _biz_id, auth.uid(), _session_id, _referrer, _event_type);

  IF _event_type = 'view' THEN
    UPDATE public.portfolio_items
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = _portfolio_id;
  ELSIF _event_type = 'share' THEN
    UPDATE public.portfolio_items SET share_count = share_count + 1 WHERE id = _portfolio_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_portfolio_view(uuid, text, text, text) TO anon, authenticated;

-- ── Owner-facing analytics aggregate RPC ──
CREATE OR REPLACE FUNCTION public.get_portfolio_analytics(_business_id uuid, _days integer DEFAULT 30)
RETURNS TABLE (
  portfolio_item_id uuid,
  views_total bigint,
  views_period bigint,
  shares_period bigint,
  unique_sessions bigint,
  last_view timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pi.id AS portfolio_item_id,
    pi.view_count::bigint AS views_total,
    COUNT(*) FILTER (WHERE v.event_type = 'view' AND v.created_at > now() - make_interval(days => _days))::bigint AS views_period,
    COUNT(*) FILTER (WHERE v.event_type = 'share' AND v.created_at > now() - make_interval(days => _days))::bigint AS shares_period,
    COUNT(DISTINCT v.session_id) FILTER (WHERE v.created_at > now() - make_interval(days => _days))::bigint AS unique_sessions,
    MAX(v.created_at) AS last_view
  FROM public.portfolio_items pi
  LEFT JOIN public.portfolio_item_views v ON v.portfolio_item_id = pi.id
  WHERE pi.business_id = _business_id
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = _business_id
        AND (b.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  GROUP BY pi.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_portfolio_analytics(uuid, integer) TO authenticated;
