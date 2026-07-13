
-- =====================================================================
-- T5 — rental returns / pickup / damages
-- =====================================================================

-- 1) TABLE
CREATE TABLE IF NOT EXISTS public.rental_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_order_id uuid NOT NULL REFERENCES public.rental_orders(id) ON DELETE CASCADE,
  returned_at timestamptz NOT NULL DEFAULT now(),
  condition text NOT NULL CHECK (condition IN ('good','damaged','missing_parts')),
  damage_description text,
  damage_amount numeric NOT NULL DEFAULT 0,
  deposit_refunded numeric,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_notes text,
  customer_ack boolean NOT NULL DEFAULT false,
  customer_ack_at timestamptz,
  customer_dispute_note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rental_returns_unique_per_order UNIQUE (rental_order_id)
);

CREATE INDEX IF NOT EXISTS idx_rental_returns_order ON public.rental_returns(rental_order_id);

-- 2) GRANT
GRANT SELECT, INSERT, UPDATE ON public.rental_returns TO authenticated;
GRANT ALL ON public.rental_returns TO service_role;

-- 3) RLS
ALTER TABLE public.rental_returns ENABLE ROW LEVEL SECURITY;

-- 4) POLICIES
-- Admin: full access
CREATE POLICY "rental_returns admin all"
  ON public.rental_returns
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Provider staff of the order can SELECT
CREATE POLICY "rental_returns provider select"
  ON public.rental_returns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rental_orders o
      WHERE o.id = rental_returns.rental_order_id
        AND is_business_staff(auth.uid(), o.provider_business_id)
    )
  );

-- Provider staff of the order can INSERT (must be self as created_by)
CREATE POLICY "rental_returns provider insert"
  ON public.rental_returns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.rental_orders o
      WHERE o.id = rental_returns.rental_order_id
        AND is_business_staff(auth.uid(), o.provider_business_id)
    )
  );

-- Provider staff can UPDATE their own return rows
CREATE POLICY "rental_returns provider update"
  ON public.rental_returns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rental_orders o
      WHERE o.id = rental_returns.rental_order_id
        AND is_business_staff(auth.uid(), o.provider_business_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rental_orders o
      WHERE o.id = rental_returns.rental_order_id
        AND is_business_staff(auth.uid(), o.provider_business_id)
    )
  );

-- Customer of the order can SELECT (read-only). No direct UPDATE — the
-- acknowledge_rental_return() RPC is the only supported ack/dispute path.
CREATE POLICY "rental_returns customer select"
  ON public.rental_returns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rental_orders o
      WHERE o.id = rental_returns.rental_order_id
        AND o.customer_user_id = auth.uid()
    )
  );

-- 5) updated_at trigger
CREATE TRIGGER trg_rental_returns_updated_at
  BEFORE UPDATE ON public.rental_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6) SECURITY DEFINER RPC — customer acknowledges (or disputes) the return.
CREATE OR REPLACE FUNCTION public.acknowledge_rental_return(
  p_return_id uuid,
  p_dispute_note text DEFAULT NULL
)
RETURNS public.rental_returns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_return public.rental_returns;
  v_order public.rental_orders;
  v_dispute boolean := (p_dispute_note IS NOT NULL AND btrim(p_dispute_note) <> '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_return FROM public.rental_returns WHERE id = p_return_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'return_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_order FROM public.rental_orders WHERE id = v_return.rental_order_id;
  IF NOT FOUND OR v_order.customer_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.rental_returns
     SET customer_ack = CASE WHEN v_dispute THEN false ELSE true END,
         customer_ack_at = CASE WHEN v_dispute THEN customer_ack_at ELSE now() END,
         customer_dispute_note = CASE WHEN v_dispute THEN btrim(p_dispute_note) ELSE customer_dispute_note END
   WHERE id = p_return_id
   RETURNING * INTO v_return;

  INSERT INTO public.rental_order_events (rental_order_id, event_type, payload, actor_user_id)
  VALUES (
    v_order.id,
    CASE WHEN v_dispute THEN 'return.disputed' ELSE 'return.acknowledged' END,
    jsonb_build_object('return_id', v_return.id, 'dispute_note', v_return.customer_dispute_note),
    v_uid
  );

  RETURN v_return;
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_rental_return(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acknowledge_rental_return(uuid, text) TO authenticated;

-- =====================================================================
-- 7) storage.objects policies for private bucket `rental-return-photos`
--    Path convention: `<return_id>/<timestamp>-<name>`
--    Mirrors the RFQ samples pattern.
-- =====================================================================

CREATE POLICY "rental_return_photos_read_admin"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'rental-return-photos'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "rental_return_photos_read_provider"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'rental-return-photos'
    AND EXISTS (
      SELECT 1
        FROM public.rental_returns rr
        JOIN public.rental_orders o ON o.id = rr.rental_order_id
       WHERE rr.id::text = (storage.foldername(objects.name))[1]
         AND is_business_staff(auth.uid(), o.provider_business_id)
    )
  );

CREATE POLICY "rental_return_photos_read_customer"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'rental-return-photos'
    AND EXISTS (
      SELECT 1
        FROM public.rental_returns rr
        JOIN public.rental_orders o ON o.id = rr.rental_order_id
       WHERE rr.id::text = (storage.foldername(objects.name))[1]
         AND o.customer_user_id = auth.uid()
    )
  );

CREATE POLICY "rental_return_photos_upload_provider"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'rental-return-photos'
    AND EXISTS (
      SELECT 1
        FROM public.rental_returns rr
        JOIN public.rental_orders o ON o.id = rr.rental_order_id
       WHERE rr.id::text = (storage.foldername(objects.name))[1]
         AND is_business_staff(auth.uid(), o.provider_business_id)
    )
  );

CREATE POLICY "rental_return_photos_delete_provider"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'rental-return-photos'
    AND EXISTS (
      SELECT 1
        FROM public.rental_returns rr
        JOIN public.rental_orders o ON o.id = rr.rental_order_id
       WHERE rr.id::text = (storage.foldername(objects.name))[1]
         AND is_business_staff(auth.uid(), o.provider_business_id)
    )
  );

CREATE POLICY "rental_return_photos_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'rental-return-photos'
    AND has_role(auth.uid(), 'admin'::app_role)
  );
