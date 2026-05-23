-- R4G-1 Security fixes: remove PII tables from Realtime publication
-- and lock down provider_landing_settings to admin-only reads.

-- 1) Remove sensitive tables from Supabase Realtime publication.
--    Authenticated subscribers were able to receive contact-form submitters'
--    name/email/message and outbound email recipient addresses. Neither table
--    is consumed via Realtime in the app; admin views poll on demand.
ALTER PUBLICATION supabase_realtime DROP TABLE public.contact_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.email_send_log;

-- 2) Drop the permissive public SELECT policy on provider_landing_settings.
--    The base table holds secret tokens (e.g. indexnow_key). The frontend
--    already reads through the `provider_landing_settings_public` view, which
--    excludes the secret column. Admins continue to read/write via the
--    existing `admin_write_settings` policy.
DROP POLICY IF EXISTS public_read_settings_safe ON public.provider_landing_settings;