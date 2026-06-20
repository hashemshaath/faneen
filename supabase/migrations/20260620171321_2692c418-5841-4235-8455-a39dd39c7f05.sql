
CREATE TABLE IF NOT EXISTS public.opportunity_message_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid,
  opportunity_ref text,
  event_type text NOT NULL,
  recipient_role text NOT NULL,
  recipient_user_id uuid,
  recipient_phone text,
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms')),
  language text NOT NULL CHECK (language IN ('ar','en')),
  body text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','sent','failed','skipped')),
  provider text,
  provider_message_id text,
  provider_response jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opp_msg_log_opportunity ON public.opportunity_message_send_log(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_msg_log_event ON public.opportunity_message_send_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opp_msg_log_status ON public.opportunity_message_send_log(status, created_at DESC);

GRANT SELECT ON public.opportunity_message_send_log TO authenticated;
GRANT ALL ON public.opportunity_message_send_log TO service_role;

ALTER TABLE public.opportunity_message_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read opportunity message send log"
  ON public.opportunity_message_send_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages opportunity message send log"
  ON public.opportunity_message_send_log
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
