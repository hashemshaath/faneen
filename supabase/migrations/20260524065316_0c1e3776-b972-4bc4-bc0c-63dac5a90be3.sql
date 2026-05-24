-- R4F-8B: Membership payments schema PROPOSAL (preparation only).
-- No live payments are activated. Manual/admin/promo activation behavior is preserved.

-- ============================================================
-- A) Extend membership_subscriptions with nullable payment fields
-- ============================================================
ALTER TABLE public.membership_subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider text NULL,
  ADD COLUMN IF NOT EXISTS payment_status text NULL,
  ADD COLUMN IF NOT EXISTS last_invoice_id text NULL,
  ADD COLUMN IF NOT EXISTS last_external_payment_id text NULL,
  ADD COLUMN IF NOT EXISTS last_paid_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_paid_amount numeric(10,2) NULL,
  ADD COLUMN IF NOT EXISTS last_paid_currency varchar(3) NULL,
  ADD COLUMN IF NOT EXISTS last_receipt_url text NULL,
  ADD COLUMN IF NOT EXISTS payment_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'membership_subscriptions_payment_provider_check'
  ) THEN
    ALTER TABLE public.membership_subscriptions
      ADD CONSTRAINT membership_subscriptions_payment_provider_check
      CHECK (payment_provider IS NULL OR payment_provider IN
        ('manual','promo','stripe','paddle','tap','hyperpay','moyasar','other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'membership_subscriptions_payment_status_check'
  ) THEN
    ALTER TABLE public.membership_subscriptions
      ADD CONSTRAINT membership_subscriptions_payment_status_check
      CHECK (payment_status IS NULL OR payment_status IN
        ('pending','paid','failed','refunded','manual','cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'membership_subscriptions_last_paid_currency_check'
  ) THEN
    ALTER TABLE public.membership_subscriptions
      ADD CONSTRAINT membership_subscriptions_last_paid_currency_check
      CHECK (last_paid_currency IS NULL OR char_length(last_paid_currency) = 3);
  END IF;
END $$;

COMMENT ON COLUMN public.membership_subscriptions.payment_provider IS
  'R4F-8B: Future payment provider key. NULL for current manual/admin/promo activations.';
COMMENT ON COLUMN public.membership_subscriptions.payment_status IS
  'R4F-8B: Last known payment lifecycle status. NULL until a payment provider is wired (R4F-8E).';
COMMENT ON COLUMN public.membership_subscriptions.payment_metadata IS
  'R4F-8B: Provider-agnostic metadata bag (jsonb, default {}).';

-- ============================================================
-- B) membership_payment_intents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.membership_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.membership_subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  business_id uuid NULL,
  plan_id uuid NULL REFERENCES public.membership_plans(id),
  billing_cycle text NULL,
  provider text NOT NULL,
  provider_intent_id text NULL,
  idempotency_key text NOT NULL UNIQUE,
  amount numeric(10,2) NOT NULL,
  currency varchar(3) NOT NULL,
  status text NOT NULL DEFAULT 'created',
  invoice_id text NULL,
  receipt_url text NULL,
  failure_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz NULL,
  CONSTRAINT membership_payment_intents_billing_cycle_check
    CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly','yearly')),
  CONSTRAINT membership_payment_intents_status_check
    CHECK (status IN ('created','requires_action','succeeded','failed','cancelled','refunded')),
  CONSTRAINT membership_payment_intents_currency_check
    CHECK (char_length(currency) = 3)
);

CREATE INDEX IF NOT EXISTS idx_mpi_subscription_id ON public.membership_payment_intents (subscription_id);
CREATE INDEX IF NOT EXISTS idx_mpi_user_id ON public.membership_payment_intents (user_id);
CREATE INDEX IF NOT EXISTS idx_mpi_business_id ON public.membership_payment_intents (business_id);
CREATE INDEX IF NOT EXISTS idx_mpi_status ON public.membership_payment_intents (status);
CREATE INDEX IF NOT EXISTS idx_mpi_created_at_desc ON public.membership_payment_intents (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mpi_provider_intent
  ON public.membership_payment_intents (provider, provider_intent_id)
  WHERE provider_intent_id IS NOT NULL;

COMMENT ON TABLE public.membership_payment_intents IS
  'R4F-8B: Provider-agnostic payment intents for membership subscriptions. No client writes in this phase.';

-- updated_at trigger (reuses standard helper if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace)
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_mpi_updated_at') THEN
    CREATE TRIGGER update_mpi_updated_at
      BEFORE UPDATE ON public.membership_payment_intents
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.membership_payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mpi_service_role_all"
  ON public.membership_payment_intents
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "mpi_admin_select_all"
  ON public.membership_payment_intents
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "mpi_owner_select_own"
  ON public.membership_payment_intents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- C) membership_payment_webhook_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.membership_payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz NULL,
  processing_error text NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_mpwe_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_mpwe_provider_event_type
  ON public.membership_payment_webhook_events (provider, event_type);
CREATE INDEX IF NOT EXISTS idx_mpwe_processed_at
  ON public.membership_payment_webhook_events (processed_at);
CREATE INDEX IF NOT EXISTS idx_mpwe_received_at_desc
  ON public.membership_payment_webhook_events (received_at DESC);

COMMENT ON TABLE public.membership_payment_webhook_events IS
  'R4F-8B: Raw payment webhook events for dedupe + audit. Service-role and admin-read only.';

ALTER TABLE public.membership_payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mpwe_service_role_all"
  ON public.membership_payment_webhook_events
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "mpwe_admin_select_all"
  ON public.membership_payment_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
