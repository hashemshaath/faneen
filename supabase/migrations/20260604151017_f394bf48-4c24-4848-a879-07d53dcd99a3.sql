-- 1) Reject RPC with audit
CREATE OR REPLACE FUNCTION public.admin_reject_business_ownership_transfer(
  _request_id uuid,
  _admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_req record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden_admin_only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req FROM public.business_ownership_transfer_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request_not_pending'; END IF;

  UPDATE public.business_ownership_transfer_requests
    SET status = 'rejected',
        reviewed_by = v_caller,
        reviewed_at = now(),
        admin_note = COALESCE(_admin_note, admin_note)
    WHERE id = _request_id;

  INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_caller,
    'ownership_transfer_rejected',
    'business_ownership_transfer_request',
    _request_id,
    jsonb_build_object(
      'business_id', v_req.business_id,
      'requester_user_id', v_req.requester_user_id,
      'admin_note', _admin_note,
      'rejected_at', now()
    )
  );

  RETURN jsonb_build_object('success', true, 'request_id', _request_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_business_ownership_transfer(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_reject_business_ownership_transfer(uuid, text) TO authenticated;

-- 2) Add audit log entry on approve (rewrite existing function to add audit)
CREATE OR REPLACE FUNCTION public.admin_transfer_business_ownership(
  _request_id uuid,
  _admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_req record;
  v_biz record;
  v_previous_owner uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden_admin_only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req
  FROM public.business_ownership_transfer_requests
  WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request_not_pending'; END IF;

  SELECT * INTO v_biz FROM public.businesses WHERE id = v_req.business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'business_not_found'; END IF;
  IF NOT v_biz.placeholder_owner THEN RAISE EXCEPTION 'business_not_placeholder'; END IF;

  IF public.has_role(v_req.requester_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'owner_cannot_be_super_admin';
  END IF;

  v_previous_owner := v_biz.user_id;

  UPDATE public.businesses
    SET user_id = v_req.requester_user_id,
        placeholder_owner = false,
        updated_at = now()
    WHERE id = v_req.business_id;

  UPDATE public.business_ownership_transfer_requests
    SET status = 'approved',
        reviewed_by = v_caller,
        reviewed_at = now(),
        admin_note = COALESCE(_admin_note, admin_note)
    WHERE id = _request_id;

  UPDATE public.business_ownership_transfer_requests
    SET status = 'rejected',
        reviewed_by = v_caller,
        reviewed_at = now(),
        admin_note = COALESCE(admin_note, 'auto-rejected: another request approved')
    WHERE business_id = v_req.business_id
      AND id <> _request_id
      AND status = 'pending';

  INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_caller,
    'ownership_transfer_approved',
    'business',
    v_req.business_id,
    jsonb_build_object(
      'request_id', _request_id,
      'previous_owner_user_id', v_previous_owner,
      'new_owner_user_id', v_req.requester_user_id,
      'admin_note', _admin_note,
      'approved_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'business_id', v_req.business_id,
    'new_owner_user_id', v_req.requester_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_transfer_business_ownership(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_transfer_business_ownership(uuid, text) TO authenticated;

-- 3) Placeholder report function (admin-only)
CREATE OR REPLACE FUNCTION public.get_placeholder_owner_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_placeholder_email constant text := 'com@qitaat.com';
  v_user_id uuid;
  v_linked int;
  v_pending int;
  v_approved int;
  v_rejected int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden_admin_only' USING ERRCODE = '42501';
  END IF;

  SELECT user_id INTO v_user_id FROM public.profiles WHERE lower(email) = v_placeholder_email LIMIT 1;

  SELECT count(*) INTO v_linked
    FROM public.businesses
    WHERE placeholder_owner = true
       OR (v_user_id IS NOT NULL AND user_id = v_user_id);

  SELECT
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'approved'),
    count(*) FILTER (WHERE status = 'rejected')
  INTO v_pending, v_approved, v_rejected
  FROM public.business_ownership_transfer_requests;

  RETURN jsonb_build_object(
    'placeholder_email', v_placeholder_email,
    'placeholder_user_id', v_user_id,
    'linked_businesses_count', v_linked,
    'transfer_requests', jsonb_build_object(
      'pending', v_pending,
      'approved', v_approved,
      'rejected', v_rejected
    ),
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_placeholder_owner_report() FROM public;
GRANT EXECUTE ON FUNCTION public.get_placeholder_owner_report() TO authenticated;