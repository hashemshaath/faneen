-- 1) Drop newsletter header-spoof UPDATE policy. Use token-based unsubscribe edge function instead.
DROP POLICY IF EXISTS "Subscriber can unsubscribe themselves" ON public.newsletter_subscribers;

-- 2) Drop SELECT policy on phone_otps so plaintext codes can't be read by clients.
--    Verification happens via the verify-otp edge function using the service role.
DROP POLICY IF EXISTS "Users can read their own OTPs" ON public.phone_otps;

-- 3) Switch SECURITY DEFINER views to security_invoker so RLS of the caller is enforced.
ALTER VIEW public.contract_amendment_audit_safe SET (security_invoker = true);
ALTER VIEW public.contract_amendment_approvals_safe SET (security_invoker = true);