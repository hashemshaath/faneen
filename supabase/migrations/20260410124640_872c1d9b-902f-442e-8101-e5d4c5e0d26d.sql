
-- Super admin can view ALL conversations
CREATE POLICY "Super admins can view all conversations"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admin can update ALL conversations
CREATE POLICY "Super admins can update all conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admin can delete conversations
CREATE POLICY "Super admins can delete conversations"
ON public.conversations FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admin can view ALL messages
CREATE POLICY "Super admins can view all messages"
ON public.messages FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admin can delete messages
CREATE POLICY "Super admins can delete messages"
ON public.messages FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admin can view all profiles (for conversation display)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users and admins can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_admin_access(auth.uid()));
