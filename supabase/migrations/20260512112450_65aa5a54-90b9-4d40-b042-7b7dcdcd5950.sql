-- Enum
CREATE TYPE public.client_invite_status AS ENUM ('pending','accepted','expired','cancelled','revoked');

-- Sequence for INV-NNNNNNN
CREATE SEQUENCE IF NOT EXISTS public.seq_inv START 1000000;

-- Table
CREATE TABLE public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  draft_payload jsonb,
  template_version_id uuid REFERENCES public.contract_template_versions(id),
  work_type text,
  email_lower text NOT NULL,
  email_hmac text,
  recipient_name text,
  recipient_phone text,
  token_hash text NOT NULL UNIQUE,
  status public.client_invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id),
  bound_contract_id uuid REFERENCES public.contracts(id),
  cancelled_at timestamptz,
  reminder_count smallint NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_invitations_invited_by  ON public.client_invitations(invited_by);
CREATE INDEX idx_client_invitations_email_lower ON public.client_invitations(email_lower);
CREATE INDEX idx_client_invitations_status      ON public.client_invitations(status);
CREATE INDEX idx_client_invitations_expires_at  ON public.client_invitations(expires_at);
CREATE INDEX idx_client_invitations_business_id ON public.client_invitations(business_id);
CREATE INDEX idx_client_invitations_bound_contract_id ON public.client_invitations(bound_contract_id);

CREATE TRIGGER trg_client_invitations_updated_at
BEFORE UPDATE ON public.client_invitations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- RLS: inviter sees own
CREATE POLICY "Inviter can view own invitations"
  ON public.client_invitations FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid());

-- RLS: admins see all
CREATE POLICY "Admins can view all invitations"
  ON public.client_invitations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- No INSERT/UPDATE/DELETE policies → mutations only via SECURITY DEFINER RPCs.

-- ===== RPCs =====

-- 1. create_client_invitation
CREATE OR REPLACE FUNCTION public.create_client_invitation(
  _email text,
  _name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _business_id uuid DEFAULT NULL,
  _draft_payload jsonb DEFAULT NULL,
  _template_version_id uuid DEFAULT NULL,
  _work_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_email text;
  v_existing_user uuid;
  v_count_hour int;
  v_count_day int;
  v_token text;
  v_token_hash text;
  v_ref text;
  v_id uuid;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  v_email := lower(trim(coalesce(_email, '')));
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = '22023';
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin');

  -- Already registered?
  SELECT p.user_id INTO v_existing_user
    FROM public.profiles p
   WHERE lower(p.email) = v_email
   LIMIT 1;

  IF v_existing_user IS NOT NULL THEN
    RETURN jsonb_build_object(
      'already_registered', true,
      'user_id', v_existing_user,
      'invite_id', NULL,
      'token', NULL
    );
  END IF;

  -- Business ownership check
  IF _business_id IS NOT NULL AND NOT v_is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.businesses b
       WHERE b.id = _business_id AND b.user_id = v_uid
    ) THEN
      RAISE EXCEPTION 'forbidden_business' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Suppression
  IF EXISTS (SELECT 1 FROM public.suppressed_emails s WHERE lower(s.email) = v_email) THEN
    RAISE EXCEPTION 'email_suppressed' USING ERRCODE = '22023';
  END IF;

  -- Rate limits
  IF NOT v_is_admin THEN
    SELECT count(*) INTO v_count_hour
      FROM public.client_invitations
     WHERE invited_by = v_uid AND created_at > now() - interval '1 hour';
    IF v_count_hour >= 5 THEN
      RAISE EXCEPTION 'rate_limit_hour' USING ERRCODE = '23505';
    END IF;

    SELECT count(*) INTO v_count_day
      FROM public.client_invitations
     WHERE invited_by = v_uid AND created_at > now() - interval '1 day';
    IF v_count_day >= 30 THEN
      RAISE EXCEPTION 'rate_limit_day' USING ERRCODE = '23505';
    END IF;
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_ref := public.generate_ref_id('INV', 'seq_inv');
  v_expires := now() + interval '14 days';

  INSERT INTO public.client_invitations (
    ref_id, invited_by, business_id, draft_payload, template_version_id, work_type,
    email_lower, recipient_name, recipient_phone, token_hash, expires_at
  ) VALUES (
    v_ref, v_uid, _business_id, _draft_payload, _template_version_id, _work_type,
    v_email, nullif(trim(coalesce(_name,'')),''), nullif(trim(coalesce(_phone,'')),''),
    v_token_hash, v_expires
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'already_registered', false,
    'invite_id', v_id,
    'ref_id', v_ref,
    'token', v_token,
    'expires_at', v_expires
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_client_invitation(text,text,text,uuid,jsonb,uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_client_invitation(text,text,text,uuid,jsonb,uuid,text) TO authenticated;

-- 2. cancel_client_invitation
CREATE OR REPLACE FUNCTION public.cancel_client_invitation(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.client_invitations;
  v_is_admin boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  v_is_admin := public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin');

  SELECT * INTO v_inv FROM public.client_invitations WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_inv.invited_by <> v_uid AND NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.client_invitations
     SET status = 'cancelled', cancelled_at = now(), updated_at = now()
   WHERE id = _id;

  RETURN jsonb_build_object('cancelled', true, 'invite_id', _id);
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_client_invitation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_client_invitation(uuid) TO authenticated;

-- 3. resend_client_invitation (rotates token)
CREATE OR REPLACE FUNCTION public.resend_client_invitation(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.client_invitations;
  v_is_admin boolean;
  v_token text;
  v_token_hash text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  v_is_admin := public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin');

  SELECT * INTO v_inv FROM public.client_invitations WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_inv.invited_by <> v_uid AND NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;
  IF v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'expired' USING ERRCODE = '22023';
  END IF;
  IF v_inv.reminder_count >= 2 THEN
    RAISE EXCEPTION 'reminder_limit' USING ERRCODE = '23505';
  END IF;
  IF v_inv.last_reminder_at IS NOT NULL AND v_inv.last_reminder_at > now() - interval '60 seconds' THEN
    RAISE EXCEPTION 'cooldown' USING ERRCODE = '23505';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  UPDATE public.client_invitations
     SET token_hash = v_token_hash,
         reminder_count = reminder_count + 1,
         last_reminder_at = now(),
         updated_at = now()
   WHERE id = _id;

  RETURN jsonb_build_object(
    'invite_id', v_inv.id,
    'ref_id', v_inv.ref_id,
    'email_lower', v_inv.email_lower,
    'recipient_name', v_inv.recipient_name,
    'token', v_token,
    'reminder_count', v_inv.reminder_count + 1,
    'expires_at', v_inv.expires_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.resend_client_invitation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.resend_client_invitation(uuid) TO authenticated;

-- 4. accept_client_invitation
CREATE OR REPLACE FUNCTION public.accept_client_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text;
  v_inv public.client_invitations;
  v_user_email text;
  v_draft_ready boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF _token IS NULL OR length(_token) < 32 THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = '22023';
  END IF;

  v_hash := encode(digest(_token, 'sha256'), 'hex');

  SELECT * INTO v_inv FROM public.client_invitations WHERE token_hash = v_hash FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;
  IF v_inv.expires_at <= now() THEN
    UPDATE public.client_invitations SET status='expired', updated_at=now() WHERE id = v_inv.id;
    RAISE EXCEPTION 'expired' USING ERRCODE = '22023';
  END IF;

  SELECT lower(u.email) INTO v_user_email FROM auth.users u WHERE u.id = v_uid;
  IF v_user_email IS DISTINCT FROM v_inv.email_lower THEN
    RAISE EXCEPTION 'email_mismatch' USING ERRCODE = '42501';
  END IF;

  v_draft_ready := (v_inv.draft_payload IS NOT NULL AND v_inv.template_version_id IS NOT NULL);

  UPDATE public.client_invitations
     SET status = 'accepted',
         accepted_at = now(),
         accepted_by = v_uid,
         updated_at = now()
   WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'accepted', true,
    'invite_id', v_inv.id,
    'ref_id', v_inv.ref_id,
    'draft_payload_ready', v_draft_ready,
    'bound_contract_id', NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.accept_client_invitation(text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_client_invitation(text) TO authenticated;

-- 5. expire_client_invitations
CREATE OR REPLACE FUNCTION public.expire_client_invitations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int;
BEGIN
  -- Allow service_role (no auth.uid) and admins
  IF v_uid IS NOT NULL
     AND NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH upd AS (
    UPDATE public.client_invitations
       SET status='expired', updated_at=now()
     WHERE status='pending' AND expires_at < now()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;

  RETURN jsonb_build_object('expired', v_count);
END;
$$;
REVOKE ALL ON FUNCTION public.expire_client_invitations() FROM public;
GRANT EXECUTE ON FUNCTION public.expire_client_invitations() TO authenticated, service_role;