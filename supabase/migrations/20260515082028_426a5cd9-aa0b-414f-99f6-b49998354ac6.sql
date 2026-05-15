
DROP POLICY IF EXISTS "Providers insert their own lead events" ON public.quote_request_lead_events;
CREATE POLICY "Providers insert their own lead events"
  ON public.quote_request_lead_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND event_type IN ('lead_viewed','provider_interested','provider_not_interested')
    AND EXISTS (
      SELECT 1 FROM public.quote_request_leads l
      WHERE l.id = quote_request_lead_events.lead_id
        AND (l.provider_user_id = auth.uid() OR public.is_business_owner(auth.uid(), l.provider_id))
    )
  );
