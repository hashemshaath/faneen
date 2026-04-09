
-- Recreate the view with SECURITY INVOKER (default, safe)
CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker = on) AS
  SELECT id, user_id, full_name, avatar_url, account_type, membership_tier, is_verified, created_at
  FROM public.profiles;
