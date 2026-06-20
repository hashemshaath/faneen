-- OPPORTUNITIES PHASE 5 — opportunity_bids
CREATE TABLE public.opportunity_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.quote_request_leads(id) ON DELETE SET NULL,
  provider_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_amount numeric(14,2),
  currency text NOT NULL DEFAULT 'SAR',
  duration_value integer,
  duration_unit text CHECK (duration_unit IS NULL OR duration_unit IN ('hour','day','week','month')),
  scope_summary text,
  terms text,
  warranty text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','shortlisted','revised','withdrawn','rejected','awarded')),
  submitted_at timestamptz,
  expires_at timestamptz,
  attachments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_bids TO authenticated;
GRANT ALL ON public.opportunity_bids TO service_role;

ALTER TABLE public.opportunity_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opp_bids_select_submitter"
  ON public.opportunity_bids FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "opp_bids_select_business_staff"
  ON public.opportunity_bids FOR SELECT TO authenticated
  USING (
    provider_business_id IS NOT NULL
    AND public.is_business_staff(provider_business_id, auth.uid())
  );

CREATE POLICY "opp_bids_select_client"
  ON public.opportunity_bids FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = opportunity_bids.opportunity_id
        AND qr.user_id = auth.uid()
    )
  );

CREATE POLICY "opp_bids_select_admin"
  ON public.opportunity_bids FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INSERT: provider needs an assignment row for that opportunity.
-- Either the lead.provider_user_id matches the submitter,
-- or the lead.provider_id matches the bid's provider_business_id and the submitter is staff there.
CREATE POLICY "opp_bids_insert_assigned_provider"
  ON public.opportunity_bids FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quote_request_leads l
      WHERE l.quote_request_id = opportunity_bids.opportunity_id
        AND (
          l.provider_user_id = auth.uid()
          OR (
            opportunity_bids.provider_business_id IS NOT NULL
            AND l.provider_id = opportunity_bids.provider_business_id
            AND public.is_business_staff(opportunity_bids.provider_business_id, auth.uid())
          )
        )
    )
  );

CREATE POLICY "opp_bids_update_submitter_editable"
  ON public.opportunity_bids FOR UPDATE TO authenticated
  USING (
    submitted_by = auth.uid()
    AND status IN ('draft','submitted','revised')
  )
  WITH CHECK (
    submitted_by = auth.uid()
    AND status IN ('draft','submitted','revised','withdrawn')
  );

CREATE POLICY "opp_bids_update_admin"
  ON public.opportunity_bids FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "opp_bids_delete_admin"
  ON public.opportunity_bids FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER opp_bids_set_updated_at
  BEFORE UPDATE ON public.opportunity_bids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_opp_bids_opportunity ON public.opportunity_bids(opportunity_id);
CREATE INDEX idx_opp_bids_provider_business ON public.opportunity_bids(provider_business_id);
CREATE INDEX idx_opp_bids_submitted_by ON public.opportunity_bids(submitted_by);
CREATE INDEX idx_opp_bids_status ON public.opportunity_bids(status);
CREATE INDEX idx_opp_bids_assignment ON public.opportunity_bids(assignment_id);