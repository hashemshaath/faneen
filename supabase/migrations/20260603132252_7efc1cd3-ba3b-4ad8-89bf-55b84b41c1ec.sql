CREATE TABLE IF NOT EXISTS public.site_settings_audit (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.client_sites(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_ssa_site_time
  ON public.site_settings_audit(site_id, changed_at DESC);

GRANT SELECT, INSERT ON public.site_settings_audit TO authenticated;
GRANT ALL ON public.site_settings_audit TO service_role;

ALTER TABLE public.site_settings_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ssa_select_site_members" ON public.site_settings_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_sites cs
      WHERE cs.id = site_settings_audit.site_id
        AND (
          cs.owner_user_id = auth.uid()
          OR cs.client_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = cs.business_id AND b.user_id = auth.uid()
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.log_client_site_settings_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_fields text[] := ARRAY[
    'site_name','label','site_type','visibility','qr_enabled',
    'contact_name','contact_phone','address_line1','short_address',
    'city_name','district','access_notes'
  ];
  v_field text;
  v_old text;
  v_new text;
BEGIN
  FOREACH v_field IN ARRAY v_fields LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', v_field, v_field)
      INTO v_old, v_new
      USING OLD, NEW;
    IF v_old IS DISTINCT FROM v_new THEN
      INSERT INTO public.site_settings_audit(site_id, field, old_value, new_value, changed_by)
      VALUES (NEW.id, v_field, v_old, v_new, v_actor);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_sites_settings_audit ON public.client_sites;
CREATE TRIGGER trg_client_sites_settings_audit
  AFTER UPDATE ON public.client_sites
  FOR EACH ROW
  EXECUTE FUNCTION public.log_client_site_settings_changes();
