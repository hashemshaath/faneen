CREATE POLICY "client_sites_select_owner_own"
  ON public.client_sites FOR SELECT
  TO authenticated
  USING (owner_user_id IS NOT NULL AND owner_user_id = auth.uid());