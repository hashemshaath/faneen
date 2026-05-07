
-- 1) DELETE policies
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Users can delete their own business"
  ON public.businesses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any business"
  ON public.businesses FOR DELETE TO authenticated
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Users can delete their own OTPs"
  ON public.phone_otps FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete contact messages"
  ON public.contact_messages FOR DELETE TO authenticated
  USING (has_admin_access(auth.uid()));

-- 2) reviews_public masked view
CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.business_id,
  r.rating,
  r.title,
  r.content,
  r.is_verified,
  r.created_at,
  r.updated_at,
  r.project_id,
  COALESCE(p.full_name, 'مستخدم') AS reviewer_name,
  p.avatar_url AS reviewer_avatar
FROM public.reviews r
LEFT JOIN public.profiles p ON p.user_id = r.user_id;

GRANT SELECT ON public.reviews_public TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.reviews_public FROM authenticated, anon;

-- 3) Password reset rate-limit (SECURITY DEFINER bypasses RLS safely)
CREATE INDEX IF NOT EXISTS idx_password_reset_log_email_created
  ON public.password_reset_log (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_log_ip_created
  ON public.password_reset_log (ip_address, created_at DESC);

CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*) FROM public.password_reset_log
    WHERE lower(email) = lower(_email)
      AND created_at > now() - interval '1 hour'
  ) < 5;
$$;

REVOKE EXECUTE ON FUNCTION public.check_password_reset_rate_limit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_password_reset_rate_limit(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can log a password reset request" ON public.password_reset_log;

CREATE POLICY "Rate limited password reset logging"
  ON public.password_reset_log FOR INSERT
  WITH CHECK (public.check_password_reset_rate_limit(email));

-- 4) security_invoker on existing public views
ALTER VIEW public.businesses_public SET (security_invoker = true);
ALTER VIEW public.business_branches_public SET (security_invoker = true);
