
CREATE SEQUENCE IF NOT EXISTS public.seq_customer_project_notification START WITH 1000001;

CREATE TABLE IF NOT EXISTS public.customer_project_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE
    DEFAULT ('CPN-' || lpad(nextval('public.seq_customer_project_notification')::text, 7, '0')),
  business_id uuid NOT NULL,
  work_order_id uuid NULL,
  quotation_id uuid NULL,
  contract_id uuid NULL,
  customer_email text NULL,
  customer_phone text NULL,
  channel text NOT NULL CHECK (channel IN ('internal','email')),
  event_type text NOT NULL,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  body_ar text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  action_url text NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','skipped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_cpn_business ON public.customer_project_notifications(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpn_work_order ON public.customer_project_notifications(work_order_id) WHERE work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpn_event ON public.customer_project_notifications(event_type);

GRANT SELECT, INSERT, UPDATE ON public.customer_project_notifications TO authenticated;
GRANT ALL ON public.customer_project_notifications TO service_role;

ALTER TABLE public.customer_project_notifications ENABLE ROW LEVEL SECURITY;

-- Business owner can see their notifications
CREATE POLICY "cpn_owner_select"
ON public.customer_project_notifications
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = customer_project_notifications.business_id
      AND b.user_id = auth.uid()
  )
);

-- Active business staff can see notifications for their business
CREATE POLICY "cpn_staff_select"
ON public.customer_project_notifications
FOR SELECT TO authenticated
USING (
  public.is_business_staff(auth.uid(), customer_project_notifications.business_id)
);

-- Owner / staff may insert (dispatcher runs under user context)
CREATE POLICY "cpn_owner_insert"
ON public.customer_project_notifications
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = customer_project_notifications.business_id
      AND b.user_id = auth.uid()
  )
  OR public.is_business_staff(auth.uid(), customer_project_notifications.business_id)
);

CREATE POLICY "cpn_owner_update"
ON public.customer_project_notifications
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = customer_project_notifications.business_id
      AND b.user_id = auth.uid()
  )
  OR public.is_business_staff(auth.uid(), customer_project_notifications.business_id)
);
