
DROP POLICY IF EXISTS "Users can insert their own OTPs" ON public.phone_otps;
DROP POLICY IF EXISTS "Users can update their own OTPs" ON public.phone_otps;

DROP POLICY IF EXISTS "Rate limited password reset logging" ON public.password_reset_log;
-- No replacement public INSERT policy: writes happen via service role from edge functions only.
