-- Verification: only hshaath@gmail.com should hold admin/super_admin.
-- Run via Supabase SQL editor or psql. Read-only; contains no secrets.

SELECT
  (SELECT count(*) FROM public.user_roles WHERE role = 'admin')       AS admin_count,
  (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin') AS super_admin_count;

SELECT u.email, array_agg(ur.role::text ORDER BY ur.role) AS roles
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
 WHERE ur.role IN ('admin','super_admin')
 GROUP BY u.email
 ORDER BY u.email;

-- Expected: only one row, email = hshaath@gmail.com, roles = {admin, super_admin}