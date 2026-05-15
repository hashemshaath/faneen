
-- ============ quote_requests ============
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  customer_type text NOT NULL,
  preferred_contact_method text NOT NULL,
  sector text NOT NULL,
  city text NOT NULL,
  district text,
  service_location_type text NOT NULL,
  project_description text NOT NULL,
  approx_dimensions text,
  quantity text,
  execution_timeline text NOT NULL,
  has_budget boolean NOT NULL DEFAULT false,
  budget_amount numeric,
  budget_note text,
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'website_quote_form',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_requests_status_chk CHECK (status IN ('new','under_review','matched','contacted','completed','cancelled')),
  CONSTRAINT quote_requests_customer_type_chk CHECK (customer_type IN ('individual','contractor','engineering_office','company','government','other')),
  CONSTRAINT quote_requests_contact_method_chk CHECK (preferred_contact_method IN ('whatsapp','call','email')),
  CONSTRAINT quote_requests_service_location_chk CHECK (service_location_type IN ('project_site','provider_location','not_sure'))
);

CREATE INDEX idx_quote_requests_user_id ON public.quote_requests(user_id);
CREATE INDEX idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX idx_quote_requests_created_at ON public.quote_requests(created_at DESC);
CREATE INDEX idx_quote_requests_sector ON public.quote_requests(sector);

CREATE TRIGGER trg_quote_requests_updated_at
BEFORE UPDATE ON public.quote_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) may insert. user_id must match auth.uid() if signed in, or be NULL if anon.
CREATE POLICY "Anyone can submit a quote request"
ON public.quote_requests FOR INSERT TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY "Users can view their own quote requests"
ON public.quote_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their open quote requests"
ON public.quote_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status IN ('new','under_review'))
WITH CHECK (user_id = auth.uid() AND status IN ('new','under_review'));

CREATE POLICY "Admins can view all quote requests"
ON public.quote_requests FOR SELECT TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can update all quote requests"
ON public.quote_requests FOR UPDATE TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete quote requests"
ON public.quote_requests FOR DELETE TO authenticated
USING (public.has_admin_access(auth.uid()));

-- ============ quote_request_files ============
CREATE TABLE public.quote_request_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_request_files_request ON public.quote_request_files(quote_request_id);

ALTER TABLE public.quote_request_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can insert files for their open requests"
ON public.quote_request_files FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id = quote_request_id
      AND qr.user_id = auth.uid()
      AND qr.status IN ('new','under_review')
  )
);

CREATE POLICY "Anon can insert files for anonymous requests"
ON public.quote_request_files FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id = quote_request_id AND qr.user_id IS NULL
  )
);

CREATE POLICY "Owners can view their files"
ON public.quote_request_files FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.quote_requests qr WHERE qr.id = quote_request_id AND qr.user_id = auth.uid())
);

CREATE POLICY "Admins can view all quote files"
ON public.quote_request_files FOR SELECT TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Owners can delete files on open requests"
ON public.quote_request_files FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id = quote_request_id
      AND qr.user_id = auth.uid()
      AND qr.status IN ('new','under_review')
  )
);

CREATE POLICY "Admins can delete quote files"
ON public.quote_request_files FOR DELETE TO authenticated
USING (public.has_admin_access(auth.uid()));

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('quote-request-files', 'quote-request-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies. First folder segment = quote_request_id.
CREATE POLICY "Owners can upload quote files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'quote-request-files'
  AND EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id::text = (storage.foldername(name))[1]
      AND qr.user_id = auth.uid()
  )
);

CREATE POLICY "Anon can upload to anon quote folders"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'quote-request-files'
  AND EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id::text = (storage.foldername(name))[1]
      AND qr.user_id IS NULL
  )
);

CREATE POLICY "Owners can read quote files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'quote-request-files'
  AND EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id::text = (storage.foldername(name))[1]
      AND qr.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can read all quote files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'quote-request-files'
  AND public.has_admin_access(auth.uid())
);

CREATE POLICY "Owners can delete quote files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'quote-request-files'
  AND EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id::text = (storage.foldername(name))[1]
      AND qr.user_id = auth.uid()
      AND qr.status IN ('new','under_review')
  )
);

CREATE POLICY "Admins can delete all quote files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'quote-request-files'
  AND public.has_admin_access(auth.uid())
);
