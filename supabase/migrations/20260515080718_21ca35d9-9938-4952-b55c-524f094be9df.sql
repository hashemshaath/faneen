
-- 1. Extend quote_request_leads with contact reveal fields
ALTER TABLE public.quote_request_leads
  ADD COLUMN IF NOT EXISTS contact_revealed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_revealed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_revealed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_reveal_note text,
  ADD COLUMN IF NOT EXISTS contact_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_view_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.quote_request_leads
  DROP CONSTRAINT IF EXISTS qrl_contact_view_count_nonneg_chk;
ALTER TABLE public.quote_request_leads
  ADD CONSTRAINT qrl_contact_view_count_nonneg_chk CHECK (contact_view_count >= 0);

CREATE INDEX IF NOT EXISTS idx_qrl_contact_revealed ON public.quote_request_leads(contact_revealed) WHERE contact_revealed = true;

-- 2. Update provider guard so reveal-related fields stay admin-only,
-- but allow contact_viewed_at and contact_view_count to be updated by providers (for tracking).
CREATE OR REPLACE FUNCTION public.quote_request_leads_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_admin_access(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.quote_request_id IS DISTINCT FROM OLD.quote_request_id
     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
     OR NEW.provider_user_id IS DISTINCT FROM OLD.provider_user_id
     OR NEW.match_score IS DISTINCT FROM OLD.match_score
     OR NEW.match_reasons IS DISTINCT FROM OLD.match_reasons
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.contact_revealed IS DISTINCT FROM OLD.contact_revealed
     OR NEW.contact_revealed_at IS DISTINCT FROM OLD.contact_revealed_at
     OR NEW.contact_revealed_by IS DISTINCT FROM OLD.contact_revealed_by
     OR NEW.contact_reveal_note IS DISTINCT FROM OLD.contact_reveal_note THEN
    RAISE EXCEPTION 'providers cannot modify protected fields on quote_request_leads';
  END IF;

  IF NEW.status NOT IN ('new','viewed','interested','not_interested') THEN
    RAISE EXCEPTION 'providers cannot set status %', NEW.status;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Lead events table (audit trail)
CREATE TABLE IF NOT EXISTS public.quote_request_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.quote_request_leads(id) ON DELETE CASCADE,
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qrle_lead_id ON public.quote_request_lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_qrle_quote_request_id ON public.quote_request_lead_events(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_qrle_created_at ON public.quote_request_lead_events(created_at DESC);

ALTER TABLE public.quote_request_lead_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all lead events" ON public.quote_request_lead_events;
CREATE POLICY "Admins manage all lead events"
  ON public.quote_request_lead_events
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Providers view their own lead events" ON public.quote_request_lead_events;
CREATE POLICY "Providers view their own lead events"
  ON public.quote_request_lead_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quote_request_leads l
    WHERE l.id = quote_request_lead_events.lead_id
      AND (l.provider_user_id = auth.uid() OR public.is_business_owner(auth.uid(), l.provider_id))
  ));
