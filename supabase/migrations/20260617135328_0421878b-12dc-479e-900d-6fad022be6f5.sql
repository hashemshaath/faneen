
CREATE POLICY "Admins can insert portfolio items" ON public.portfolio_items
  FOR INSERT TO authenticated
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update portfolio items" ON public.portfolio_items
  FOR UPDATE TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete portfolio items" ON public.portfolio_items
  FOR DELETE TO authenticated
  USING (has_admin_access(auth.uid()));
