CREATE TABLE IF NOT EXISTS public.profile_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_activity_log_user_changed
  ON public.profile_activity_log (user_id, changed_at DESC);

ALTER TABLE public.profile_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own activity"
  ON public.profile_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_admin_access(auth.uid()));

-- No client inserts/updates/deletes: log is system-managed via trigger.

CREATE OR REPLACE FUNCTION public.tg_log_profile_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fields text[] := ARRAY[
    'full_name','full_name_ar','full_name_en','username','email','phone',
    'avatar_url','preferred_language','country_id','city_id',
    'national_id','national_id_type','vat_number',
    'short_national_address','region_name','district','street',
    'building_number','additional_number','postal_code','address_line'
  ];
  f text;
  old_v text;
  new_v text;
BEGIN
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', f, f)
      INTO old_v, new_v
      USING OLD, NEW;
    IF old_v IS DISTINCT FROM new_v THEN
      INSERT INTO public.profile_activity_log (user_id, field, old_value, new_value)
      VALUES (NEW.user_id, f, old_v, new_v);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_profile_activity ON public.profiles;
CREATE TRIGGER trg_log_profile_activity
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_log_profile_activity();
