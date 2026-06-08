-- 1) business_ownership_transfer_requests.admin_note — admin-only
REVOKE SELECT (admin_note) ON public.business_ownership_transfer_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_botr_admin_notes()
RETURNS TABLE(id uuid, admin_note text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.admin_note
  FROM public.business_ownership_transfer_requests b
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
$$;
REVOKE ALL ON FUNCTION public.admin_get_botr_admin_notes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_botr_admin_notes() TO authenticated;

-- 2) contact_messages.internal_notes — admin-only
REVOKE SELECT (internal_notes) ON public.contact_messages FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_contact_message_internal_notes()
RETURNS TABLE(id uuid, internal_notes text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.internal_notes
  FROM public.contact_messages c
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
$$;
REVOKE ALL ON FUNCTION public.admin_get_contact_message_internal_notes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_contact_message_internal_notes() TO authenticated;

-- 3) work_order_quotations.approval_token_hash — server-only (never exposed to clients)
REVOKE SELECT (approval_token_hash) ON public.work_order_quotations FROM anon, authenticated;
