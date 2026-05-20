-- Emergency admin role correction: ensure only hshaath@gmail.com has admin/super_admin
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE lower(email) = lower('hshaath@gmail.com') LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target admin user hshaath@gmail.com not found in auth.users';
  END IF;

  -- Revoke admin/super_admin from everyone else (preserve provider/user/moderator roles)
  DELETE FROM public.user_roles
   WHERE role IN ('admin','super_admin')
     AND user_id <> target_user_id;

  -- Grant both admin and super_admin to the target user (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'super_admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;