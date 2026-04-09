
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title_ar text NOT NULL,
  title_en text,
  body_ar text,
  body_en text,
  notification_type varchar NOT NULL DEFAULT 'system',
  reference_id uuid,
  reference_type varchar,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System and admins can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification (reusable from triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _title_ar text,
  _title_en text,
  _body_ar text,
  _body_en text,
  _type varchar,
  _ref_id uuid DEFAULT NULL,
  _ref_type varchar DEFAULT NULL,
  _action_url text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_id, reference_type, action_url)
  VALUES (_user_id, _title_ar, _title_en, _body_ar, _body_en, _type, _ref_id, _ref_type, _action_url)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Trigger: notify on contract status change
CREATE OR REPLACE FUNCTION public.notify_contract_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify client
    PERFORM create_notification(
      NEW.client_id,
      'تحديث حالة العقد: ' || NEW.contract_number,
      'Contract status updated: ' || NEW.contract_number,
      'تم تغيير حالة العقد إلى ' || NEW.status,
      'Contract status changed to ' || NEW.status,
      'contract', NEW.id, 'contract', '/contracts/' || NEW.id
    );
    -- Notify provider
    PERFORM create_notification(
      NEW.provider_id,
      'تحديث حالة العقد: ' || NEW.contract_number,
      'Contract status updated: ' || NEW.contract_number,
      'تم تغيير حالة العقد إلى ' || NEW.status,
      'Contract status changed to ' || NEW.status,
      'contract', NEW.id, 'contract', '/contracts/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_contract_status
AFTER UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.notify_contract_status_change();

-- Trigger: notify on installment payment due
CREATE OR REPLACE FUNCTION public.notify_installment_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _contract_id uuid;
  _client_id uuid;
  _provider_id uuid;
BEGIN
  SELECT ip.contract_id INTO _contract_id FROM installment_plans ip WHERE ip.id = NEW.plan_id;
  SELECT c.client_id, c.provider_id INTO _client_id, _provider_id FROM contracts c WHERE c.id = _contract_id;
  
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      _client_id,
      'قسط جديد مستحق',
      'New installment due',
      'القسط رقم ' || NEW.installment_number || ' بمبلغ ' || NEW.amount || ' مستحق بتاريخ ' || NEW.due_date,
      'Installment #' || NEW.installment_number || ' amount ' || NEW.amount || ' due on ' || NEW.due_date,
      'installment', NEW.id, 'installment_payment', '/dashboard/installments'
    );
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid' THEN
    PERFORM create_notification(
      _provider_id,
      'تم دفع قسط',
      'Installment paid',
      'تم دفع القسط رقم ' || NEW.installment_number || ' بمبلغ ' || NEW.amount,
      'Installment #' || NEW.installment_number || ' amount ' || NEW.amount || ' has been paid',
      'installment', NEW.id, 'installment_payment', '/dashboard/installments'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_installment
AFTER INSERT OR UPDATE ON public.installment_payments
FOR EACH ROW EXECUTE FUNCTION public.notify_installment_payment();

-- Trigger: notify on new promotion
CREATE OR REPLACE FUNCTION public.notify_new_promotion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- This is a placeholder; in production you'd notify followers/subscribers
  -- For now we skip mass notifications
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_promotion
AFTER INSERT ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.notify_new_promotion();
