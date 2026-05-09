-- Phase 3: Lead requests for business-targeted inquiries
CREATE TABLE IF NOT EXISTS public.lead_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  budget_range text,
  project_scope text,
  contact_preference text NOT NULL DEFAULT 'any' CHECK (contact_preference IN ('any','email','phone','whatsapp','platform')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','closed','spam')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  source text,
  internal_notes text,
  responded_at timestamptz,
  responded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_requests_name_len CHECK (length(name) BETWEEN 1 AND 200),
  CONSTRAINT lead_requests_email_len CHECK (length(email) BETWEEN 3 AND 254),
  CONSTRAINT lead_requests_message_len CHECK (length(message) BETWEEN 1 AND 5000),
  CONSTRAINT lead_requests_subject_len CHECK (subject IS NULL OR length(subject) <= 300),
  CONSTRAINT lead_requests_phone_len CHECK (phone IS NULL OR length(phone) <= 32)
);

CREATE INDEX IF NOT EXISTS idx_lead_requests_business_created ON public.lead_requests (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_requests_user ON public.lead_requests (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_requests_status ON public.lead_requests (status);

ALTER TABLE public.lead_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (with strict row-level checks)
CREATE POLICY "Anyone can submit lead requests"
  ON public.lead_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    ((user_id IS NULL) OR (user_id = auth.uid()))
    AND status = 'new'
    AND priority IN ('low','normal')
    AND internal_notes IS NULL
    AND responded_at IS NULL
    AND responded_by IS NULL
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.is_active = true)
  );

-- Business owner / staff can view leads for their business
CREATE POLICY "Business members can view their leads"
  ON public.lead_requests FOR SELECT
  TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id) OR public.is_business_staff(auth.uid(), business_id));

-- Submitter can view their own
CREATE POLICY "Submitter can view own lead"
  ON public.lead_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Business owner / managers can update status, notes, response
CREATE POLICY "Business managers can update their leads"
  ON public.lead_requests FOR UPDATE
  TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

-- Admins full visibility & moderation
CREATE POLICY "Admins can view all leads"
  ON public.lead_requests FOR SELECT
  TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can update all leads"
  ON public.lead_requests FOR UPDATE
  TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete leads"
  ON public.lead_requests FOR DELETE
  TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- Auto-update updated_at + responded_at via existing helpers
CREATE TRIGGER trg_lead_requests_updated_at
  BEFORE UPDATE ON public.lead_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify business owner of new lead
CREATE OR REPLACE FUNCTION public.fn_notify_new_lead_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id uuid;
  _biz_name text;
BEGIN
  SELECT user_id, name_ar INTO _owner_id, _biz_name
  FROM public.businesses WHERE id = NEW.business_id;

  IF _owner_id IS NOT NULL THEN
    PERFORM public.create_notification(
      _owner_id,
      'طلب تواصل جديد من ' || NEW.name,
      'New lead request from ' || NEW.name,
      LEFT(NEW.message, 150),
      LEFT(NEW.message, 150),
      'lead_request',
      NEW.id,
      'lead_request',
      '/dashboard/leads'
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_notify_new_lead_request() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_new_lead_request
  AFTER INSERT ON public.lead_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_new_lead_request();