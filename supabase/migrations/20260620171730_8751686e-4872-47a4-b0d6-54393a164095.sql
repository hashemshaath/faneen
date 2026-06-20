
CREATE TABLE IF NOT EXISTS public.notification_event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  recipient_role text NOT NULL CHECK (recipient_role IN ('client','provider','admin')),
  channel text NOT NULL CHECK (channel IN ('in_app','email','whatsapp','sms')),
  enabled boolean NOT NULL DEFAULT true,
  title_ar text,
  title_en text,
  body_ar text NOT NULL,
  body_en text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, recipient_role, channel)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_event_templates TO authenticated;
GRANT ALL ON public.notification_event_templates TO service_role;

ALTER TABLE public.notification_event_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read notification templates"
  ON public.notification_event_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage notification templates"
  ON public.notification_event_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_notification_event_templates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_notification_event_templates ON public.notification_event_templates;
CREATE TRIGGER trg_touch_notification_event_templates
  BEFORE UPDATE ON public.notification_event_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_notification_event_templates();

INSERT INTO public.notification_event_templates
  (event_type, recipient_role, channel, enabled, title_ar, title_en, body_ar, body_en) VALUES
  ('created','client','in_app',true,'تم استلام طلبك','Opportunity received','استلمنا طلب الفرصة وسنبدأ بمطابقتك مع المزودين.','We received your opportunity and will start matching providers.'),
  ('created','client','email',true,'تم استلام طلبك','Opportunity received','تم إنشاء فرصتك بنجاح.','Your opportunity was created successfully.'),
  ('created','client','whatsapp',true,null,null,'قِطاعات: استلمنا طلب الفرصة وسنرسل أول عرض قريباً.','Qitaat: opportunity received. First bid coming soon.'),
  ('created','client','sms',true,null,null,'قِطاعات: تم استلام طلب الفرصة.','Qitaat: opportunity received.'),
  ('provider_matched','provider','in_app',true,'فرصة جديدة مطابقة','New matching opportunity','هناك فرصة جديدة مطابقة لنشاطك — سارع بتقديم عرضك.','A new opportunity matches your business — submit your bid.'),
  ('provider_matched','provider','email',true,'فرصة جديدة','New opportunity','فرصة جديدة بانتظارك.','A new opportunity is waiting.'),
  ('provider_matched','provider','whatsapp',true,null,null,'قِطاعات: فرصة جديدة مطابقة لنشاطك — قدّم عرضك.','Qitaat: new matching opportunity — submit your bid.'),
  ('provider_matched','provider','sms',true,null,null,'قِطاعات: فرصة جديدة مطابقة لنشاطك.','Qitaat: new matching opportunity.'),
  ('bid_submitted','client','in_app',true,'وصل عرض جديد','New bid received','وصلك عرض جديد على فرصتك.','A new bid arrived on your opportunity.'),
  ('bid_submitted','client','email',true,'عرض جديد','New bid','تم تقديم عرض جديد على فرصتك.','A new bid was submitted on your opportunity.'),
  ('bid_submitted','client','whatsapp',true,null,null,'قِطاعات: عرض جديد على الفرصة. راجع التفاصيل.','Qitaat: new bid on your opportunity. Review it.'),
  ('bid_revised','client','in_app',true,'تم تحديث عرض','Bid updated','تم تحديث أحد العروض على الفرصة.','A bid on your opportunity was updated.'),
  ('awarded','provider','in_app',true,'تم تعميد عرضك','Bid awarded','مبروك! تم تعميد عرضك. الخطوة التالية: مراجعة العقد.','Congratulations — your bid was awarded. Next: review the contract.'),
  ('awarded','provider','email',true,'تم تعميد عرضك','You won the bid','مبروك، تم تعميد عرضك على الفرصة.','Congratulations, your bid has been awarded.'),
  ('awarded','provider','whatsapp',true,null,null,'قِطاعات: مبروك، تم تعميد عرضك.','Qitaat: congrats, your bid was awarded.'),
  ('award_lost','provider','in_app',true,'لم يقع الاختيار','Bid not selected','لم يقع الاختيار على عرضك هذه المرة. حظًا أوفر في القادم.','Your bid was not selected this time. Good luck next time.'),
  ('contract_created','client','in_app',true,'عقد مبدئي جاهز','Draft contract ready','تم إنشاء عقد مبدئي من فرصتك — راجع البنود.','A draft contract was created — review the terms.'),
  ('contract_created','provider','in_app',true,'عقد مبدئي جاهز','Draft contract ready','تم إنشاء عقد مبدئي — راجع البنود وتابع مع العميل.','A draft contract was created — review and proceed with the client.'),
  ('opportunity_cancelled','provider','in_app',true,'تم إلغاء الفرصة','Opportunity cancelled','تم إلغاء الفرصة من قِبل العميل.','The client cancelled the opportunity.'),
  ('opportunity_cancelled','client','in_app',true,'تم إلغاء الفرصة','Opportunity cancelled','تم إلغاء الفرصة. تواصل مع الدعم إذا كان ذلك بالخطأ.','Opportunity cancelled. Contact support if this was a mistake.'),
  ('opportunity_expired','client','in_app',true,'انتهت صلاحية الفرصة','Opportunity expired','انتهت صلاحية الفرصة دون تعميد — يمكنك إعادة فتحها.','The opportunity expired without an award — you can reopen it.'),
  ('opportunity_expired','provider','in_app',true,'انتهت صلاحية الفرصة','Opportunity expired','انتهت صلاحية الفرصة دون تعميد.','The opportunity expired without an award.')
ON CONFLICT (event_type, recipient_role, channel) DO NOTHING;

-- Dedup trigger: skip identical notifications (same user+type+reference) within 60s.
CREATE OR REPLACE FUNCTION public.notifications_skip_duplicate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = NEW.user_id
      AND n.notification_type = NEW.notification_type
      AND n.reference_type IS NOT DISTINCT FROM NEW.reference_type
      AND n.reference_id = NEW.reference_id
      AND n.created_at > now() - interval '60 seconds'
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notifications_skip_duplicate ON public.notifications;
CREATE TRIGGER trg_notifications_skip_duplicate
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_skip_duplicate();
