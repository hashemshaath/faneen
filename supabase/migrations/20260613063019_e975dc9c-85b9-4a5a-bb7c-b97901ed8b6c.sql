REVOKE EXECUTE ON FUNCTION public.get_business_sensitive_fields(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_business_sensitive_fields(uuid, text, jsonb, text, text, text, text, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_owner_business_full(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_business_full_by_id(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_business_sensitive_fields(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_sensitive_fields(uuid, text, jsonb, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_business_full(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_full_by_id(uuid) TO authenticated;