
-- Commercial Registration (CR) document fields + storage bucket for admin scanner
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS cr_document_url       TEXT,
  ADD COLUMN IF NOT EXISTS cr_document_path      TEXT,
  ADD COLUMN IF NOT EXISTS cr_document_mime      TEXT,
  ADD COLUMN IF NOT EXISTS cr_document_size      INTEGER,
  ADD COLUMN IF NOT EXISTS cr_document_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cr_document_uploaded_by UUID,
  ADD COLUMN IF NOT EXISTS cr_scan_raw           TEXT,
  ADD COLUMN IF NOT EXISTS cr_scan_data          JSONB,
  ADD COLUMN IF NOT EXISTS cr_scan_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cr_owner_name         TEXT,
  ADD COLUMN IF NOT EXISTS cr_legal_entity       TEXT,
  ADD COLUMN IF NOT EXISTS cr_issue_date         DATE,
  ADD COLUMN IF NOT EXISTS cr_expiry_date        DATE;

-- Private bucket for sensitive business documents (CR scans, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-documents', 'business-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: admins (any role: admin / super_admin) can read/write all docs.
-- Business owners (auth.uid() = businesses.user_id) can read their own.
-- Path convention: cr/<business_id>/<filename>
DROP POLICY IF EXISTS "business-documents admin all" ON storage.objects;
CREATE POLICY "business-documents admin all"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'business-documents'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
)
WITH CHECK (
  bucket_id = 'business-documents'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

DROP POLICY IF EXISTS "business-documents owner read" ON storage.objects;
CREATE POLICY "business-documents owner read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-documents'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.user_id = auth.uid()
      AND (storage.foldername(name))[2] = b.id::text
  )
);
