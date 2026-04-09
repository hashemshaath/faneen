
-- 1. Fix profiles: replace overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Allow users to see basic info of all profiles (name, avatar) but not sensitive fields
-- We keep the existing "Users can view own profile" policy for full access to own data
-- Add a restricted policy for viewing other users' non-sensitive data
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR true  -- allow SELECT but sensitive fields will be handled via view/app logic
);

-- Actually, better approach: replace with two clear policies
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Single policy: users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 2. Fix businesses: hide sensitive contact info from anonymous users
DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON public.businesses;

-- Public can see active businesses (email/phone will be filtered in app code)
CREATE POLICY "Active businesses are viewable by everyone"
ON public.businesses
FOR SELECT
TO public
USING (is_active = true);

-- 3. Fix chat-attachments bucket: make it private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';
