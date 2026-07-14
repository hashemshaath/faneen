ALTER TABLE public.membership_payment_intents
  ADD COLUMN IF NOT EXISTS invoice_pdf_path text,
  ADD COLUMN IF NOT EXISTS invoice_number text;

CREATE UNIQUE INDEX IF NOT EXISTS membership_payment_intents_invoice_number_key
  ON public.membership_payment_intents (invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.membership_invoice_number_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;

GRANT USAGE ON SEQUENCE public.membership_invoice_number_seq TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_membership_invoice_number(_intent_id uuid)
RETURNS TABLE (invoice_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_intent public.membership_payment_intents;
  v_new_number text;
  v_year text;
BEGIN
  SELECT * INTO v_intent FROM public.membership_payment_intents WHERE id = _intent_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_intent_not_found' USING ERRCODE = '22023';
  END IF;

  IF v_intent.user_id <> v_caller AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'insufficient_privileges' USING ERRCODE = '42501';
  END IF;

  IF v_intent.status <> 'succeeded' THEN
    RAISE EXCEPTION 'intent_not_succeeded' USING ERRCODE = '22023';
  END IF;

  IF v_intent.invoice_number IS NOT NULL THEN
    invoice_number := v_intent.invoice_number;
    RETURN NEXT;
    RETURN;
  END IF;

  v_year := to_char(coalesce(v_intent.confirmed_at, v_intent.created_at, now()), 'YYYY');
  v_new_number := 'INV-' || v_year || '-' || lpad(nextval('public.membership_invoice_number_seq')::text, 6, '0');

  UPDATE public.membership_payment_intents
     SET invoice_number = v_new_number,
         updated_at = now()
   WHERE id = _intent_id AND invoice_number IS NULL;

  SELECT mpi.invoice_number INTO v_new_number FROM public.membership_payment_intents mpi WHERE mpi.id = _intent_id;
  invoice_number := v_new_number;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_membership_invoice_number(uuid) FROM public;
REVOKE ALL ON FUNCTION public.assign_membership_invoice_number(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_membership_invoice_number(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_membership_invoice_pdf_path(_intent_id uuid, _path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_intent public.membership_payment_intents;
BEGIN
  IF _path IS NULL OR length(trim(_path)) = 0 THEN
    RAISE EXCEPTION 'invalid_path' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_intent FROM public.membership_payment_intents WHERE id = _intent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_intent_not_found' USING ERRCODE = '22023';
  END IF;

  IF v_intent.user_id <> v_caller AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'insufficient_privileges' USING ERRCODE = '42501';
  END IF;

  UPDATE public.membership_payment_intents
     SET invoice_pdf_path = _path,
         updated_at = now()
   WHERE id = _intent_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_membership_invoice_pdf_path(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.record_membership_invoice_pdf_path(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_membership_invoice_pdf_path(uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS membership_invoices_owner_select ON storage.objects;
CREATE POLICY membership_invoices_owner_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'membership-invoices'
  AND (storage.foldername(name))[1] = 'invoices'
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id::text = (storage.foldername(name))[2]
      AND ms.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS membership_invoices_owner_insert ON storage.objects;
CREATE POLICY membership_invoices_owner_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'membership-invoices'
  AND (storage.foldername(name))[1] = 'invoices'
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id::text = (storage.foldername(name))[2]
      AND ms.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS membership_invoices_owner_update ON storage.objects;
CREATE POLICY membership_invoices_owner_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'membership-invoices'
  AND (storage.foldername(name))[1] = 'invoices'
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id::text = (storage.foldername(name))[2]
      AND ms.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS membership_invoices_admin_all ON storage.objects;
CREATE POLICY membership_invoices_admin_all ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'membership-invoices' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'membership-invoices' AND public.has_role(auth.uid(), 'admin'));
