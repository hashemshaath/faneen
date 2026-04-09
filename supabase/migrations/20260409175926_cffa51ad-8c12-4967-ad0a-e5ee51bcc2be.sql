
-- Table for storing platform-level API configurations (admin only)
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL DEFAULT '',
  setting_label_ar text,
  setting_label_en text,
  category text NOT NULL DEFAULT 'general',
  is_secret boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT false,
  description_ar text,
  description_en text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view settings
CREATE POLICY "Admins can view settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can manage settings
CREATE POLICY "Admins can insert settings"
ON public.platform_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.platform_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
ON public.platform_settings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default API setting keys
INSERT INTO public.platform_settings (setting_key, setting_label_ar, setting_label_en, category, description_ar, description_en) VALUES
-- Email
('SMTP_HOST', 'خادم SMTP', 'SMTP Host', 'email', 'عنوان خادم البريد الإلكتروني', 'Email server address'),
('SMTP_PORT', 'منفذ SMTP', 'SMTP Port', 'email', 'رقم المنفذ (587 أو 465)', 'Port number (587 or 465)'),
('SMTP_USER', 'مستخدم SMTP', 'SMTP User', 'email', 'اسم المستخدم للبريد', 'Email username'),
('SMTP_PASSWORD', 'كلمة مرور SMTP', 'SMTP Password', 'email', 'كلمة مرور البريد', 'Email password'),
('SENDER_EMAIL', 'بريد المرسل', 'Sender Email', 'email', 'عنوان البريد الإلكتروني للإرسال', 'Email address used for sending'),
('SENDER_NAME', 'اسم المرسل', 'Sender Name', 'email', 'الاسم الظاهر في الرسائل', 'Display name in emails'),
-- SMS / Twilio
('TWILIO_ACCOUNT_SID', 'معرّف حساب Twilio', 'Twilio Account SID', 'sms', 'معرّف الحساب من لوحة Twilio', 'Account SID from Twilio dashboard'),
('TWILIO_AUTH_TOKEN', 'رمز المصادقة', 'Twilio Auth Token', 'sms', 'رمز المصادقة السري', 'Secret auth token'),
('TWILIO_PHONE_NUMBER', 'رقم Twilio', 'Twilio Phone Number', 'sms', 'رقم الهاتف المسجل في Twilio بصيغة +966XXXXXXXXX', 'Registered Twilio phone number in +966XXXXXXXXX format'),
('TWILIO_VERIFY_SID', 'معرّف خدمة التحقق', 'Twilio Verify SID', 'sms', 'معرّف خدمة Twilio Verify لإرسال OTP', 'Twilio Verify service SID for OTP'),
-- AI
('OPENAI_API_KEY', 'مفتاح OpenAI', 'OpenAI API Key', 'ai', 'مفتاح API لخدمات ChatGPT و DALL-E', 'API key for ChatGPT and DALL-E services'),
('GOOGLE_AI_KEY', 'مفتاح Google AI', 'Google AI Key', 'ai', 'مفتاح API لخدمات Gemini', 'API key for Gemini services'),
-- Google
('GOOGLE_MAPS_KEY', 'مفتاح خرائط جوجل', 'Google Maps Key', 'google', 'مفتاح API لخدمات الخرائط والمواقع', 'API key for Maps and Places services'),
('GOOGLE_ANALYTICS_ID', 'معرّف Google Analytics', 'Google Analytics ID', 'google', 'معرّف القياس GA4 (G-XXXXXXXXXX)', 'GA4 measurement ID (G-XXXXXXXXXX)'),
('GOOGLE_RECAPTCHA_KEY', 'مفتاح reCAPTCHA', 'reCAPTCHA Key', 'google', 'مفتاح الموقع لحماية النماذج', 'Site key for form protection'),
('GOOGLE_RECAPTCHA_SECRET', 'مفتاح reCAPTCHA السري', 'reCAPTCHA Secret', 'google', 'المفتاح السري للتحقق من جانب الخادم', 'Secret key for server-side verification'),
('FCM_SERVER_KEY', 'مفتاح Firebase Cloud Messaging', 'FCM Server Key', 'google', 'مفتاح الخادم لإشعارات Push', 'Server key for Push notifications');
