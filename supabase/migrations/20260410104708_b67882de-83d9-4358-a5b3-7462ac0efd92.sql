-- Create helper functions
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- admin_activity_log
DROP POLICY IF EXISTS "Admins can insert activity log" ON public.admin_activity_log;
CREATE POLICY "Admins can insert activity log" ON public.admin_activity_log
  FOR INSERT TO authenticated WITH CHECK (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can view activity log" ON public.admin_activity_log;
CREATE POLICY "Admins can view activity log" ON public.admin_activity_log
  FOR SELECT TO authenticated USING (has_admin_access(auth.uid()));

-- blog_posts
DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins can manage blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- notifications
DROP POLICY IF EXISTS "Only admins can create notifications" ON public.notifications;
CREATE POLICY "Only admins can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (has_admin_access(auth.uid()));

-- platform_settings
DROP POLICY IF EXISTS "Admins can delete settings" ON public.platform_settings;
CREATE POLICY "Admins can delete settings" ON public.platform_settings
  FOR DELETE TO authenticated USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert settings" ON public.platform_settings;
CREATE POLICY "Admins can insert settings" ON public.platform_settings
  FOR INSERT TO authenticated WITH CHECK (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can update settings" ON public.platform_settings;
CREATE POLICY "Admins can update settings" ON public.platform_settings
  FOR UPDATE TO authenticated USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can view settings" ON public.platform_settings;
CREATE POLICY "Admins can view settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (has_admin_access(auth.uid()));

-- newsletter_subscribers
DROP POLICY IF EXISTS "Admins can delete subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can delete subscribers" ON public.newsletter_subscribers
  FOR DELETE TO authenticated USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can update subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can update subscribers" ON public.newsletter_subscribers
  FOR UPDATE TO authenticated USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can view subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can view subscribers" ON public.newsletter_subscribers
  FOR SELECT TO authenticated USING (has_admin_access(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (has_admin_access(auth.uid()));

-- profile_images
DROP POLICY IF EXISTS "Admins can manage profile images" ON public.profile_images;
CREATE POLICY "Admins can manage profile images" ON public.profile_images
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- profile_specifications
DROP POLICY IF EXISTS "Admins can manage profile specs" ON public.profile_specifications;
CREATE POLICY "Admins can manage profile specs" ON public.profile_specifications
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- profile_suppliers
DROP POLICY IF EXISTS "Admins can manage all suppliers" ON public.profile_suppliers;
CREATE POLICY "Admins can manage all suppliers" ON public.profile_suppliers
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- profile_systems
DROP POLICY IF EXISTS "Admins can manage profile systems" ON public.profile_systems;
CREATE POLICY "Admins can manage profile systems" ON public.profile_systems
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- user_roles: super_admin full access, admin read-only
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));