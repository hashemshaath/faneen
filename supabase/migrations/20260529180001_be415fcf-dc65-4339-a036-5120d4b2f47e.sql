-- Security fixes from supabase_lov scan (PLATFORM-DEEP-AUDIT-REPAIR / hardening pass)
-- 1) Remove anon-facing SELECT policies on businesses & business_branches.
--    Public reads continue to work via the businesses_public / business_branches_public
--    views (security_invoker=off, view owner bypasses RLS), which omit sensitive columns.
--    Authenticated owners/staff/admins keep access via the remaining policies.

DROP POLICY IF EXISTS "Public can read published active businesses" ON public.businesses;

-- Restore authenticated-only equivalent for legitimate session reads of full rows
-- (owners, staff, admins). Anon is intentionally excluded.
CREATE POLICY "Authenticated members can read full business rows"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR public.is_business_staff(auth.uid(), id)
  OR public.has_admin_access(auth.uid())
);

DROP POLICY IF EXISTS "Active branches are publicly readable" ON public.business_branches;

-- Authenticated-only equivalent. Staff/owner/admin already had separate policies,
-- so this is intentionally restricted; anon goes through business_branches_public.
-- (No new policy required — the existing "Staff can view full branch details",
-- "Admins can view all branches", and owner policies cover authenticated reads.)

-- 2) Restrict profiles INSERT policy to authenticated only (was applied to {public}).
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Same for the bare UPDATE policy that targets {public}.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- And the bare INSERT policy on businesses (also {public}, same issue).
DROP POLICY IF EXISTS "Users can insert their own business" ON public.businesses;
CREATE POLICY "Users can insert their own business"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own business" ON public.businesses;
CREATE POLICY "Users can update their own business"
ON public.businesses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3) Tighten work-order-files INSERT to require business membership.
-- Upload paths are `<businessId>/<workOrderId>/YYYY/MM/<rand>.<ext>` — enforce
-- that the first path segment is a business the uploader owns or manages.
DROP POLICY IF EXISTS "wo_files_insert_manager" ON storage.objects;
CREATE POLICY "wo_files_insert_manager"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-order-files'
  AND owner = auth.uid()
  AND public.is_business_owner_or_manager(
    auth.uid(),
    NULLIF((string_to_array(name, '/'))[1], '')::uuid
  )
);