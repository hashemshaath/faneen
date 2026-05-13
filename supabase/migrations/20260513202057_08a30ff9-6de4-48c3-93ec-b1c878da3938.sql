-- Add optional custom permissions blob to invitations + seed default per-module
-- permissions automatically when an invitation is accepted.
ALTER TABLE public.business_staff_invitations
  ADD COLUMN IF NOT EXISTS permissions jsonb;

CREATE OR REPLACE FUNCTION public.accept_staff_invitation(_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv record;
  caller_email text;
  _staff_id uuid;
  _module public.business_module;
  _perm jsonb;
  _modules public.business_module[] := ARRAY[
    'business_profile','branches','staff','contracts','projects','services',
    'offers','leads','messages','reviews','warranties','billing','analytics','settings'
  ]::public.business_module[];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO inv FROM public.business_staff_invitations WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF inv.status <> 'pending' THEN
    RETURN json_build_object('ok', false, 'code', 'already_processed', 'status', inv.status);
  END IF;

  IF inv.expires_at < now() THEN
    UPDATE public.business_staff_invitations SET status = 'expired' WHERE id = inv.id;
    RETURN json_build_object('ok', false, 'code', 'expired');
  END IF;

  IF lower(coalesce(caller_email, '')) <> lower(inv.email) THEN
    RETURN json_build_object('ok', false, 'code', 'email_mismatch', 'expected', inv.email);
  END IF;

  -- Insert/upsert staff row, return id for permission seeding
  INSERT INTO public.business_staff (business_id, user_id, role, invited_by, is_active)
  VALUES (inv.business_id, auth.uid(), inv.role::public.business_staff_role, inv.invited_by, true)
  ON CONFLICT (business_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, is_active = true
  RETURNING id INTO _staff_id;

  -- Seed per-module permissions automatically based on role (or custom override).
  -- Idempotent via ON CONFLICT — re-accepting won't overwrite admin-tuned values.
  IF inv.permissions IS NOT NULL THEN
    -- Custom permissions provided at invitation time
    FOREACH _module IN ARRAY _modules LOOP
      _perm := inv.permissions -> _module::text;
      IF _perm IS NOT NULL THEN
        INSERT INTO public.business_staff_permissions
          (business_staff_id, module, can_view, can_create, can_edit, can_delete)
        VALUES (
          _staff_id, _module,
          COALESCE((_perm->>'view')::boolean, true),
          COALESCE((_perm->>'create')::boolean, false),
          COALESCE((_perm->>'edit')::boolean, false),
          COALESCE((_perm->>'delete')::boolean, false)
        )
        ON CONFLICT (business_staff_id, module) DO NOTHING;
      END IF;
    END LOOP;
  ELSE
    -- Defaults derived from role
    FOREACH _module IN ARRAY _modules LOOP
      INSERT INTO public.business_staff_permissions
        (business_staff_id, module, can_view, can_create, can_edit, can_delete)
      VALUES (
        _staff_id, _module,
        true,
        inv.role IN ('owner','manager','editor'),
        inv.role IN ('owner','manager','editor'),
        inv.role IN ('owner','manager')
      )
      ON CONFLICT (business_staff_id, module) DO NOTHING;
    END LOOP;
  END IF;

  UPDATE public.business_staff_invitations
    SET status = 'accepted', accepted_at = now(), accepted_by = auth.uid()
    WHERE id = inv.id;

  RETURN json_build_object('ok', true, 'business_id', inv.business_id, 'staff_id', _staff_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_staff_invitation(text) TO authenticated;