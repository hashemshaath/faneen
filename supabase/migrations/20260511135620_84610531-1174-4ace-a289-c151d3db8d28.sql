
REVOKE EXECUTE ON FUNCTION public.get_active_membership_limits(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_membership_usage(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_membership_usage(boolean, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public._membership_free_defaults() FROM PUBLIC, anon;
