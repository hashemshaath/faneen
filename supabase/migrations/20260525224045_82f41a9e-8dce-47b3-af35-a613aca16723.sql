ALTER TABLE public.platform_settings DISABLE TRIGGER USER;

INSERT INTO public.platform_settings (setting_key, setting_value, setting_label_ar, setting_label_en, category, is_secret, is_active, description_ar, description_en)
VALUES (
  'SPL_API_KEY', '', 'مفتاح العنوان الوطني (SPL)', 'Saudi National Address API Key',
  'address', true, false,
  'مفتاح API للبحث عن العنوان الوطني المختصر من بوابة api.address.gov.sa (SPL).',
  'API key for short national address lookup via api.address.gov.sa (SPL).'
)
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE TRIGGER USER;