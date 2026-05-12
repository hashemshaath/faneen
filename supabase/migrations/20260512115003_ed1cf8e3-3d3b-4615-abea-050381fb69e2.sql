-- CT4C.5 — complete_contract_from_invitation RPC + provider notification trigger

-- 1. Secure RPC: provider/admin completes contract from accepted invitation
CREATE OR REPLACE FUNCTION public.complete_contract_from_invitation(_invite_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.client_invitations;
  v_is_admin boolean;
  v_contract_id uuid;
  v_payload jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inv FROM public.client_invitations WHERE id = _invite_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  v_is_admin := has_role(v_uid, 'admin'::app_role) OR has_role(v_uid, 'super_admin'::app_role);

  -- Authorization: only inviter or admin
  IF v_inv.invited_by <> v_uid AND NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Idempotency: if already bound, return existing contract
  IF v_inv.bound_contract_id IS NOT NULL THEN
    RETURN v_inv.bound_contract_id;
  END IF;

  IF v_inv.status <> 'accepted' THEN
    RAISE EXCEPTION 'invitation_not_accepted' USING ERRCODE = '22023';
  END IF;
  IF v_inv.accepted_by IS NULL THEN
    RAISE EXCEPTION 'invitation_missing_acceptor' USING ERRCODE = '22023';
  END IF;
  IF v_inv.draft_payload IS NULL OR v_inv.template_version_id IS NULL THEN
    RAISE EXCEPTION 'draft_payload_missing' USING ERRCODE = '22023';
  END IF;

  -- Validate inviter still owns business if business_id provided
  IF v_inv.business_id IS NOT NULL THEN
    PERFORM 1 FROM public.businesses b
      WHERE b.id = v_inv.business_id
        AND (b.owner_id = v_inv.invited_by OR v_is_admin);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'business_ownership_invalid' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Build minimal trusted payload: only safe fields from draft_payload + server-trusted ids
  v_payload := jsonb_build_object(
    'provider_id', v_inv.invited_by,
    'client_id',   v_inv.accepted_by,
    'business_id', v_inv.business_id,
    'title_ar',     v_inv.draft_payload->>'title_ar',
    'title_en',     v_inv.draft_payload->>'title_en',
    'description_ar', v_inv.draft_payload->>'description_ar',
    'description_en', v_inv.draft_payload->>'description_en',
    'terms_ar',     v_inv.draft_payload->>'terms_ar',
    'terms_en',     v_inv.draft_payload->>'terms_en',
    'start_date',   v_inv.draft_payload->>'start_date',
    'end_date',     v_inv.draft_payload->>'end_date',
    'total_amount', v_inv.draft_payload->>'total_amount',
    'currency_code', COALESCE(v_inv.draft_payload->>'currency_code','SAR'),
    'vat_inclusive', v_inv.draft_payload->>'vat_inclusive',
    'vat_rate',     v_inv.draft_payload->>'vat_rate',
    'status',       'draft'
  );

  -- Delegate to existing template-aware constructor (creates snapshot atomically)
  v_contract_id := public.create_contract_from_template(
    v_payload,
    v_inv.template_version_id,
    NULLIF(v_inv.draft_payload->>'pricing_method','')
  );

  -- Bind invitation to created contract
  UPDATE public.client_invitations
     SET bound_contract_id = v_contract_id,
         updated_at = now()
   WHERE id = v_inv.id;

  RETURN v_contract_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_contract_from_invitation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_contract_from_invitation(uuid) TO authenticated;

-- 2. Provider in-app notification on accept (idempotent via invite_id)
CREATE OR REPLACE FUNCTION public.notify_inviter_on_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    BEGIN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        NEW.invited_by,
        'contract_invitation_accepted',
        'تم قبول دعوة العقد',
        'قام العميل بقبول دعوتك. يمكنك الآن إكمال إصدار العقد.',
        jsonb_build_object(
          'invite_id', NEW.id,
          'ref_id', NEW.ref_id,
          'idempotency_key', 'client-invite-accepted-' || NEW.id::text
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Notifications schema may differ; never block acceptance
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_invitations_notify_accept ON public.client_invitations;
CREATE TRIGGER trg_client_invitations_notify_accept
AFTER UPDATE ON public.client_invitations
FOR EACH ROW
EXECUTE FUNCTION public.notify_inviter_on_accept();