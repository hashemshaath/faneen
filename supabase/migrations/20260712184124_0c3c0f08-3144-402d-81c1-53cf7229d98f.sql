-- ============================================================
-- D2.1 — Extend assets / rental_items / rental_orders RLS to
-- include business staff (additive to existing owner + admin).
-- Uses the project-standard is_business_staff() helper.
-- ============================================================

-- ------- assets -------
DROP POLICY IF EXISTS "assets owner read"  ON public.assets;
DROP POLICY IF EXISTS "assets owner write" ON public.assets;

CREATE POLICY "assets business read"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = assets.owner_business_id
        AND b.user_id = auth.uid()
    )
    OR public.is_business_staff(auth.uid(), assets.owner_business_id)
  );

CREATE POLICY "assets business write"
  ON public.assets
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = assets.owner_business_id
        AND b.user_id = auth.uid()
    )
    OR public.is_business_staff(auth.uid(), assets.owner_business_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = assets.owner_business_id
        AND b.user_id = auth.uid()
    )
    OR public.is_business_staff(auth.uid(), assets.owner_business_id)
  );

-- ------- rental_items -------
DROP POLICY IF EXISTS "rental_items provider read own"   ON public.rental_items;
DROP POLICY IF EXISTS "rental_items provider insert own" ON public.rental_items;
DROP POLICY IF EXISTS "rental_items provider update own" ON public.rental_items;
DROP POLICY IF EXISTS "rental_items provider delete own" ON public.rental_items;

CREATE POLICY "rental_items provider read own"
  ON public.rental_items
  FOR SELECT
  TO authenticated
  USING (
    provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.is_business_staff(auth.uid(), provider_business_id)
  );

CREATE POLICY "rental_items provider insert own"
  ON public.rental_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.is_business_staff(auth.uid(), provider_business_id)
  );

CREATE POLICY "rental_items provider update own"
  ON public.rental_items
  FOR UPDATE
  TO authenticated
  USING (
    provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.is_business_staff(auth.uid(), provider_business_id)
  );

CREATE POLICY "rental_items provider delete own"
  ON public.rental_items
  FOR DELETE
  TO authenticated
  USING (
    provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.is_business_staff(auth.uid(), provider_business_id)
  );

-- ------- rental_orders -------
DROP POLICY IF EXISTS "rental_orders scoped read" ON public.rental_orders;
DROP POLICY IF EXISTS "rental_orders insert"      ON public.rental_orders;
DROP POLICY IF EXISTS "rental_orders update"      ON public.rental_orders;

CREATE POLICY "rental_orders scoped read"
  ON public.rental_orders
  FOR SELECT
  TO authenticated
  USING (
    provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    OR customer_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.is_business_staff(auth.uid(), provider_business_id)
  );

CREATE POLICY "rental_orders insert"
  ON public.rental_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_user_id = auth.uid()
    OR provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.is_business_staff(auth.uid(), provider_business_id)
  );

CREATE POLICY "rental_orders update"
  ON public.rental_orders
  FOR UPDATE
  TO authenticated
  USING (
    provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    OR customer_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.is_business_staff(auth.uid(), provider_business_id)
  );