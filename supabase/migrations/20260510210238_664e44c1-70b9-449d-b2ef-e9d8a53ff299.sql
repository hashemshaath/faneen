ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

ALTER TABLE public.lead_requests
  DROP CONSTRAINT IF EXISTS lead_requests_conversation_id_fkey;

ALTER TABLE public.lead_requests
  ADD CONSTRAINT lead_requests_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_requests_conversation_id
  ON public.lead_requests(conversation_id) WHERE conversation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_or_get_lead_conversation(_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead public.lead_requests%ROWTYPE;
  _actor uuid := auth.uid();
  _is_admin boolean;
  _is_provider boolean;
  _is_customer boolean;
  _provider_user uuid;
  _p1 uuid;
  _p2 uuid;
  _conv_id uuid;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _lead FROM public.lead_requests WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found' USING ERRCODE = '02000';
  END IF;

  -- Guests cannot have a conversation in SR-3A.
  IF _lead.user_id IS NULL THEN
    RAISE EXCEPTION 'Lead has no authenticated customer; conversation not supported'
      USING ERRCODE = '22023', HINT = 'guest_lead';
  END IF;

  -- Only after provider has engaged.
  IF _lead.status NOT IN ('accepted','needs_info') THEN
    RAISE EXCEPTION 'Conversation only available after accept or needs_info'
      USING ERRCODE = '22023', HINT = 'invalid_status';
  END IF;

  IF _lead.business_id IS NULL THEN
    RAISE EXCEPTION 'Lead has no business' USING ERRCODE = '22023';
  END IF;

  _is_admin    := public.has_admin_access(_actor);
  _is_provider := public.is_business_owner_or_manager(_actor, _lead.business_id);
  _is_customer := (_lead.user_id = _actor);

  IF NOT (_is_admin OR _is_provider OR _is_customer) THEN
    RAISE EXCEPTION 'Not authorized for this lead' USING ERRCODE = '42501';
  END IF;

  -- Reuse existing link.
  IF _lead.conversation_id IS NOT NULL THEN
    RETURN _lead.conversation_id;
  END IF;

  SELECT user_id INTO _provider_user FROM public.businesses WHERE id = _lead.business_id;
  IF _provider_user IS NULL THEN
    RAISE EXCEPTION 'Business owner not resolvable' USING ERRCODE = '22023';
  END IF;

  IF _provider_user = _lead.user_id THEN
    RAISE EXCEPTION 'Customer and provider are the same user' USING ERRCODE = '22023';
  END IF;

  -- Deterministic ordering to satisfy UNIQUE(participant_1, participant_2)
  IF _lead.user_id < _provider_user THEN
    _p1 := _lead.user_id;  _p2 := _provider_user;
  ELSE
    _p1 := _provider_user; _p2 := _lead.user_id;
  END IF;

  SELECT id INTO _conv_id FROM public.conversations
    WHERE participant_1 = _p1 AND participant_2 = _p2
    LIMIT 1;

  IF _conv_id IS NULL THEN
    INSERT INTO public.conversations (participant_1, participant_2, created_by)
    VALUES (_p1, _p2, _actor)
    RETURNING id INTO _conv_id;
  END IF;

  UPDATE public.lead_requests
    SET conversation_id = _conv_id
    WHERE id = _lead_id AND conversation_id IS NULL;

  RETURN _conv_id;
END $$;

REVOKE ALL ON FUNCTION public.create_or_get_lead_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_or_get_lead_conversation(uuid) TO authenticated;