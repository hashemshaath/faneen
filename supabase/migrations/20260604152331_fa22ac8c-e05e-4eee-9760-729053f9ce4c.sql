
-- Users upload to their own folder: ownership-claim-proofs/{user_id}/...
CREATE POLICY "users_upload_own_claim_proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ownership-claim-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_read_own_claim_proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ownership-claim-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "users_delete_own_claim_proofs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ownership-claim-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
