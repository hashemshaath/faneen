
-- Add supervisor fields to contracts
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS supervisor_name text,
ADD COLUMN IF NOT EXISTS supervisor_phone text,
ADD COLUMN IF NOT EXISTS supervisor_email text;

-- Contract Notes table
CREATE TABLE public.contract_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  note_type text NOT NULL DEFAULT 'note', -- note, update, alert, milestone_update
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract parties can view notes"
ON public.contract_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = contract_notes.contract_id
    AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

CREATE POLICY "Contract parties can add notes"
ON public.contract_notes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = contract_notes.contract_id
    AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

CREATE POLICY "Users can delete own notes"
ON public.contract_notes FOR DELETE
USING (auth.uid() = user_id);

-- Contract Attachments table
CREATE TABLE public.contract_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.contract_milestones(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image', -- image, document, other
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract parties can view attachments"
ON public.contract_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = contract_attachments.contract_id
    AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

CREATE POLICY "Contract parties can add attachments"
ON public.contract_attachments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = contract_attachments.contract_id
    AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

CREATE POLICY "Users can delete own attachments"
ON public.contract_attachments FOR DELETE
USING (auth.uid() = user_id);

-- Storage bucket for contract attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('contract-attachments', 'contract-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Contract parties can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contract-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Contract parties can view their attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'contract-attachments' AND auth.role() = 'authenticated');
