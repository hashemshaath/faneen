-- SECURITY: tighten public read access on portfolio_items and rfq_requests.

-- ─── portfolio_items ───────────────────────────────────────────────
-- Old policy made every portfolio item world-readable, including items
-- belonging to unapproved, inactive, or demo businesses. Restrict public
-- reads to items whose owning business is actually published & active,
-- and keep an explicit owner-read policy so owners can still see their
-- own work-in-progress portfolios before publishing.

DROP POLICY IF EXISTS "Portfolio items are viewable by everyone" ON public.portfolio_items;

CREATE POLICY "Portfolio items of published businesses are public"
  ON public.portfolio_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = portfolio_items.business_id
        AND b.approval_status = 'published'
        AND b.is_active = true
        AND COALESCE(b.is_demo, false) = false
    )
  );

CREATE POLICY "Business owners can view own portfolio"
  ON public.portfolio_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = portfolio_items.business_id
        AND b.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ─── rfq_requests ──────────────────────────────────────────────────
-- Old policy let any authenticated user list every open RFQ, exposing
-- buyer identity, budget range, deadline, and project descriptions for
-- enumeration. Restrict SELECT to: buyer, admin, or providers who have
-- already submitted a quote on that RFQ.

DROP POLICY IF EXISTS "Open RFQs visible to authenticated" ON public.rfq_requests;

CREATE POLICY "RFQ visible to buyer admin or quoting provider"
  ON public.rfq_requests
  FOR SELECT
  TO authenticated
  USING (
    buyer_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.rfq_quotes q
      WHERE q.rfq_id = rfq_requests.id
        AND q.provider_user_id = auth.uid()
    )
  );