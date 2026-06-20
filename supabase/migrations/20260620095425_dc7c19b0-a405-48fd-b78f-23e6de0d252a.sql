CREATE TABLE public.user_dashboard_layouts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_key TEXT NOT NULL DEFAULT 'admin',
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dashboard_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_dashboard_layouts TO authenticated;
GRANT ALL ON public.user_dashboard_layouts TO service_role;
ALTER TABLE public.user_dashboard_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_layout_select" ON public.user_dashboard_layouts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_layout_insert" ON public.user_dashboard_layouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_layout_update" ON public.user_dashboard_layouts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_layout_delete" ON public.user_dashboard_layouts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_dashboard_layouts_touch BEFORE UPDATE ON public.user_dashboard_layouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();