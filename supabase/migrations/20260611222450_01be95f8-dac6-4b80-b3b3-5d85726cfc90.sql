DROP POLICY IF EXISTS "Deny realtime messages by default" ON public.messages;
DROP POLICY IF EXISTS "Anyone can view provider installment settings" ON public.provider_installment_settings;
CREATE POLICY "Authenticated users can view provider installment settings" ON public.provider_installment_settings FOR SELECT TO authenticated USING (true);