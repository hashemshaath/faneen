-- 1) branch_inquiries: exclude viewer-staff from PII
DROP POLICY IF EXISTS "Users see own; business sees its inquiries" ON public.branch_inquiries;
CREATE POLICY "Users see own; owner/manager see business inquiries"
  ON public.branch_inquiries
  FOR SELECT
  USING (
    (auth.uid() = user_id)
    OR is_business_owner_or_manager(auth.uid(), business_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Business updates inquiry status" ON public.branch_inquiries;
CREATE POLICY "Owner/manager updates inquiry status"
  ON public.branch_inquiries
  FOR UPDATE
  USING (
    is_business_owner_or_manager(auth.uid(), business_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 2) business_bnpl_providers: restrict merchant_code to owner/manager only
DROP POLICY IF EXISTS "Business staff can view their BNPL providers" ON public.business_bnpl_providers;
CREATE POLICY "Owner/manager can view BNPL providers"
  ON public.business_bnpl_providers
  FOR SELECT
  USING (
    is_business_owner_or_manager(auth.uid(), business_id)
    OR has_admin_access(auth.uid())
  );

-- 3) provider-lead-documents bucket: require UUID-format token folder
DROP POLICY IF EXISTS "provider_lead_docs_public_insert" ON storage.objects;
CREATE POLICY "provider_lead_docs_token_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-lead-documents'
    AND (storage.foldername(name))[1] = 'prv-leads'
    AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$'
  );