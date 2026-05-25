
-- Sequence for EAR- reference ids
CREATE SEQUENCE IF NOT EXISTS public.seq_ear START 1000;

-- Access requests table (additive, no destructive changes elsewhere)
CREATE TABLE IF NOT EXISTS public.entity_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL DEFAULT public.generate_ref_id('EAR', 'seq_ear'),
  requester_user_id uuid NOT NULL,
  target_business_id uuid NULL REFERENCES public.businesses(id) ON DELETE SET NULL,
  target_ref text NULL,
  message text NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid NULL,
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_access_requests_status_chk
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  CONSTRAINT entity_access_requests_target_present_chk
    CHECK (target_business_id IS NOT NULL OR (target_ref IS NOT NULL AND length(btrim(target_ref)) > 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS entity_access_requests_ref_id_uidx
  ON public.entity_access_requests (ref_id);
CREATE INDEX IF NOT EXISTS entity_access_requests_requester_idx
  ON public.entity_access_requests (requester_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entity_access_requests_target_business_idx
  ON public.entity_access_requests (target_business_id) WHERE target_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS entity_access_requests_status_idx
  ON public.entity_access_requests (status);

-- Updated-at trigger (reuses existing helper)
DROP TRIGGER IF EXISTS entity_access_requests_updated_at ON public.entity_access_requests;
CREATE TRIGGER entity_access_requests_updated_at
BEFORE UPDATE ON public.entity_access_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.entity_access_requests ENABLE ROW LEVEL SECURITY;

-- Requester can insert own request
DROP POLICY IF EXISTS "ear_insert_own" ON public.entity_access_requests;
CREATE POLICY "ear_insert_own"
ON public.entity_access_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requester_user_id);

-- Requester can read own requests; business owner or admin can read targeted ones
DROP POLICY IF EXISTS "ear_select_visible" ON public.entity_access_requests;
CREATE POLICY "ear_select_visible"
ON public.entity_access_requests
FOR SELECT TO authenticated
USING (
  auth.uid() = requester_user_id
  OR (
    target_business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = target_business_id AND b.user_id = auth.uid()
    )
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Requester can cancel own pending; targeted business owner or admin can review
DROP POLICY IF EXISTS "ear_update_owner_or_admin_or_self_cancel" ON public.entity_access_requests;
CREATE POLICY "ear_update_owner_or_admin_or_self_cancel"
ON public.entity_access_requests
FOR UPDATE TO authenticated
USING (
  (auth.uid() = requester_user_id AND status = 'pending')
  OR (
    target_business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = target_business_id AND b.user_id = auth.uid()
    )
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  (auth.uid() = requester_user_id AND status IN ('pending','cancelled'))
  OR (
    target_business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = target_business_id AND b.user_id = auth.uid()
    )
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);
