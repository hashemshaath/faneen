
CREATE OR REPLACE FUNCTION public.get_client_site_timeline(_site_id uuid, _limit int DEFAULT 100)
RETURNS TABLE (
  event_type text,
  event_id uuid,
  ref_id text,
  title text,
  status text,
  amount numeric,
  currency text,
  occurred_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH authz AS (
    SELECT EXISTS (
      SELECT 1 FROM public.client_sites s
      WHERE s.id = _site_id
        AND (
          s.owner_user_id = auth.uid()
          OR s.client_user_id = auth.uid()
          OR public.is_business_staff(s.business_id, auth.uid())
          OR public.has_role(auth.uid(), 'admin')
        )
    ) AS allowed
  ),
  events AS (
    SELECT 'contract'::text AS event_type, c.id AS event_id, c.contract_number AS ref_id,
           COALESCE(c.title_ar, c.title_en) AS title, c.status::text AS status,
           c.total_amount AS amount, c.currency_code AS currency, c.created_at AS occurred_at
    FROM public.contracts c, authz WHERE authz.allowed AND c.execution_site_id = _site_id
    UNION ALL
    SELECT 'milestone', m.id, NULL, m.title_ar, m.status::text, m.amount, NULL, m.created_at
    FROM public.contract_milestones m
    JOIN public.contracts c ON c.id = m.contract_id
    CROSS JOIN authz
    WHERE authz.allowed AND c.execution_site_id = _site_id
    UNION ALL
    SELECT 'lead', l.id, l.ref_id, NULL, l.status::text, NULL, NULL, l.created_at
    FROM public.lead_requests l, authz WHERE authz.allowed AND l.source_site_id = _site_id
    UNION ALL
    SELECT 'rfq', r.id, r.ref_id, NULL, r.status::text, NULL, NULL, r.created_at
    FROM public.rfq_requests r, authz WHERE authz.allowed AND r.site_id = _site_id
    UNION ALL
    SELECT 'visit', v.id, NULL, v.action, v.visit_source, NULL, NULL, v.created_at
    FROM public.client_site_visit_logs v, authz WHERE authz.allowed AND v.site_id = _site_id
  )
  SELECT event_type, event_id, ref_id, title, status, amount, currency, occurred_at
  FROM events
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT GREATEST(_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.get_client_site_timeline(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_site_timeline(uuid, int) TO authenticated;
