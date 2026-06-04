DROP POLICY IF EXISTS "Business members can view their leads" ON public.lead_requests;
CREATE POLICY "Business managers can view their leads"
ON public.lead_requests
FOR SELECT
USING (is_business_owner_or_manager(auth.uid(), business_id));