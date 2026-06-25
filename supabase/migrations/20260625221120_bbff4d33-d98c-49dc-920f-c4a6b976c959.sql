
-- Columns
ALTER TABLE public.contract_milestones
  ADD COLUMN IF NOT EXISTS percentage numeric(5,2),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS auto_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_release_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

-- Evidence
CREATE TABLE IF NOT EXISTS public.contract_milestone_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.contract_milestones(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('image','file','note','link')),
  file_path text,
  file_name text,
  mime_type text,
  note text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_milestone_evidence TO authenticated;
GRANT ALL ON public.contract_milestone_evidence TO service_role;
ALTER TABLE public.contract_milestone_evidence ENABLE ROW LEVEL SECURITY;

-- Events
CREATE TABLE IF NOT EXISTS public.contract_milestone_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.contract_milestones(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','submitted','approved','revision_requested','disputed','released','auto_released','reopened')),
  from_status public.milestone_status,
  to_status public.milestone_status,
  actor_id uuid REFERENCES auth.users(id),
  actor_role text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.contract_milestone_events TO authenticated;
GRANT ALL ON public.contract_milestone_events TO service_role;
ALTER TABLE public.contract_milestone_events ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_contract_party(_contract_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = _contract_id AND (
      c.client_id = _user_id OR c.provider_id = _user_id OR EXISTS (
        SELECT 1 FROM public.business_staff bs WHERE bs.user_id = _user_id
          AND bs.business_id IN (c.requester_entity_id, c.provider_entity_id, c.business_id)
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_contract_provider(_contract_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = _contract_id AND (
      c.provider_id = _user_id OR EXISTS (
        SELECT 1 FROM public.business_staff bs WHERE bs.user_id = _user_id
          AND bs.business_id IN (c.provider_entity_id, c.business_id)
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_contract_client(_contract_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = _contract_id AND (
      c.client_id = _user_id OR EXISTS (
        SELECT 1 FROM public.business_staff bs WHERE bs.user_id = _user_id AND bs.business_id = c.requester_entity_id
      )
    )
  );
$$;

-- RLS evidence
DROP POLICY IF EXISTS me_select ON public.contract_milestone_evidence;
CREATE POLICY me_select ON public.contract_milestone_evidence FOR SELECT TO authenticated
  USING (public.is_contract_party(contract_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS me_insert ON public.contract_milestone_evidence;
CREATE POLICY me_insert ON public.contract_milestone_evidence FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND (public.is_contract_provider(contract_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')));
DROP POLICY IF EXISTS me_delete ON public.contract_milestone_evidence;
CREATE POLICY me_delete ON public.contract_milestone_evidence FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS events
DROP POLICY IF EXISTS mev_select ON public.contract_milestone_events;
CREATE POLICY mev_select ON public.contract_milestone_events FOR SELECT TO authenticated
  USING (public.is_contract_party(contract_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS mev_insert ON public.contract_milestone_events;
CREATE POLICY mev_insert ON public.contract_milestone_events FOR INSERT TO authenticated
  WITH CHECK (public.is_contract_party(contract_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cm_evidence_milestone ON public.contract_milestone_evidence(milestone_id);
CREATE INDEX IF NOT EXISTS idx_cm_events_milestone ON public.contract_milestone_events(milestone_id);
CREATE INDEX IF NOT EXISTS idx_cm_milestones_auto_release ON public.contract_milestones(auto_release_at) WHERE auto_release_at IS NOT NULL;
