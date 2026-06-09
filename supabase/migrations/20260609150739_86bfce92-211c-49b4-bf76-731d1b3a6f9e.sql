-- Tighten provider lead document upload to require matching lead row
DROP POLICY IF EXISTS provider_lead_docs_token_insert ON storage.objects;

CREATE POLICY provider_lead_docs_token_insert
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'provider-lead-documents'
  AND (storage.foldername(name))[1] = 'prv-leads'
  AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.provider_leads pl
    WHERE pl.id::text = (storage.foldername(name))[2]
      AND pl.created_at > now() - interval '24 hours'
  )
);