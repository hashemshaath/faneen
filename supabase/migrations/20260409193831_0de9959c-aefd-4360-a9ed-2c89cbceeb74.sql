
-- Drop the view approach - it doesn't work well with security_invoker + restricted RLS
DROP VIEW IF EXISTS public.public_profiles;

-- Allow all authenticated users to see profiles (needed for reviews, messages, etc.)
-- Sensitive fields (email, phone) are filtered at the application level
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
