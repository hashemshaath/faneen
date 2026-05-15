
CREATE TABLE IF NOT EXISTS public.quote_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qre_quote_request_id ON public.quote_request_events(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_qre_event_type ON public.quote_request_events(event_type);
CREATE INDEX IF NOT EXISTS idx_qre_created_at ON public.quote_request_events(created_at DESC);

ALTER TABLE public.quote_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all quote request events" ON public.quote_request_events;
CREATE POLICY "Admins manage all quote request events"
  ON public.quote_request_events
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));
