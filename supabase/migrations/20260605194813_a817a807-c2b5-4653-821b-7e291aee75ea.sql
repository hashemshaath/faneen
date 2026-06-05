
-- ============================================================================
-- branch_inquiries: visitor → branch service inquiry requests
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE public.branch_inquiry_status AS ENUM ('pending','in_review','responded','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.branch_inquiries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    uuid NOT NULL REFERENCES public.business_branches(id) ON DELETE CASCADE,
  business_id  uuid NOT NULL REFERENCES public.businesses(id)         ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id)                ON DELETE CASCADE,
  service_id   uuid          REFERENCES public.business_services(id)  ON DELETE SET NULL,
  name         text NOT NULL,
  phone        text NOT NULL,
  email        text,
  message      text NOT NULL,
  budget       numeric(12,2),
  currency_code varchar(3) NOT NULL DEFAULT 'SAR',
  status       public.branch_inquiry_status NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  responded_by uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT branch_inquiries_name_len    CHECK (char_length(name)    BETWEEN 2 AND 120),
  CONSTRAINT branch_inquiries_phone_len   CHECK (char_length(phone)   BETWEEN 5 AND 30),
  CONSTRAINT branch_inquiries_message_len CHECK (char_length(message) BETWEEN 5 AND 2000)
);

CREATE INDEX IF NOT EXISTS idx_branch_inquiries_branch     ON public.branch_inquiries(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_branch_inquiries_business   ON public.branch_inquiries(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_branch_inquiries_user       ON public.branch_inquiries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_branch_inquiries_service    ON public.branch_inquiries(service_id) WHERE service_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.branch_inquiries TO authenticated;
GRANT ALL ON public.branch_inquiries TO service_role;

ALTER TABLE public.branch_inquiries ENABLE ROW LEVEL SECURITY;

-- A signed-in visitor can submit an inquiry as themselves
CREATE POLICY "Users can submit inquiries"
  ON public.branch_inquiries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- A user sees their own inquiries; owners/staff/admins see the inquiries belonging to their business
CREATE POLICY "Users see own; business sees its inquiries"
  ON public.branch_inquiries FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_business_owner(business_id, auth.uid())
    OR public.is_business_staff(business_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Only the business side (owner/staff/admin) can change status
CREATE POLICY "Business updates inquiry status"
  ON public.branch_inquiries FOR UPDATE TO authenticated
  USING (
    public.is_business_owner(business_id, auth.uid())
    OR public.is_business_staff(business_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_business_owner(business_id, auth.uid())
    OR public.is_business_staff(business_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- updated_at
CREATE TRIGGER trg_branch_inquiries_updated_at
  BEFORE UPDATE ON public.branch_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify the business owner on new inquiry (SECURITY DEFINER bypasses the
-- "Only admins can create notifications" insert policy on notifications).
CREATE OR REPLACE FUNCTION public.notify_business_on_new_inquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_branch_name text;
BEGIN
  SELECT owner_id INTO v_owner FROM public.businesses WHERE id = NEW.business_id;
  SELECT COALESCE(name_ar, name_en) INTO v_branch_name FROM public.business_branches WHERE id = NEW.branch_id;
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_id, reference_type, action_url)
    VALUES (
      v_owner,
      'استفسار جديد لفرع ' || COALESCE(v_branch_name,''),
      'New inquiry for branch ' || COALESCE(v_branch_name,''),
      NEW.message,
      NEW.message,
      'inquiry',
      NEW.id,
      'branch_inquiry',
      '/dashboard/inquiries/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_branch_inquiries_notify
  AFTER INSERT ON public.branch_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.notify_business_on_new_inquiry();
