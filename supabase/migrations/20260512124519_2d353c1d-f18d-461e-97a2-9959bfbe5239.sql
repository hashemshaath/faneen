
REVOKE EXECUTE ON FUNCTION public._ct_assert_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.template_version_submit_for_review(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.template_version_request_changes(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.template_version_revert_to_draft(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.template_version_legal_approve(uuid, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.template_version_publish(uuid, timestamptz, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.template_version_archive(uuid, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.template_version_submit_for_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_version_request_changes(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_version_revert_to_draft(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_version_legal_approve(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_version_publish(uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_version_archive(uuid, text) TO authenticated;
