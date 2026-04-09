
-- 1. Remove the old public chat-attachments policy (the new participant-only one remains)
DROP POLICY IF EXISTS "Chat attachments are publicly accessible" ON storage.objects;

-- 2. Fix notifications: only admins/system should create notifications, not regular users
DROP POLICY IF EXISTS "System and admins can create notifications" ON public.notifications;
CREATE POLICY "Only admins can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix profiles: replace broad authenticated SELECT with scoped policy
-- Users can read their own full profile
-- Other authenticated users can only see non-sensitive fields (handled by creating a secure view)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Own profile visible to owner" ON public.profiles;

-- Allow authenticated users to see all profiles (needed for reviewer names, avatars)
-- The app already only queries full_name and avatar_url for other users
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- For public display (reviewer names etc.), create a limited view
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, user_id, full_name, avatar_url, account_type, membership_tier, is_verified, created_at
  FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;
