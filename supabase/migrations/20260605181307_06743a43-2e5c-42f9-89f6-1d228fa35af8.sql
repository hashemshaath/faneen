
CREATE OR REPLACE FUNCTION public.slugify_branch(_text text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  s text;
  ar_map text[][] := ARRAY[
    ['ا','a'],['أ','a'],['إ','a'],['آ','a'],['ب','b'],['ت','t'],['ث','th'],
    ['ج','j'],['ح','h'],['خ','kh'],['د','d'],['ذ','dh'],['ر','r'],['ز','z'],
    ['س','s'],['ش','sh'],['ص','s'],['ض','d'],['ط','t'],['ظ','z'],['ع','a'],
    ['غ','gh'],['ف','f'],['ق','q'],['ك','k'],['ل','l'],['م','m'],['ن','n'],
    ['ه','h'],['و','w'],['ي','y'],['ى','a'],['ة','h'],['ء',''],['ئ','y'],['ؤ','w'],
    [' ','-'],['_','-']
  ];
  i int;
BEGIN
  IF _text IS NULL OR length(trim(_text)) = 0 THEN RETURN NULL; END IF;
  s := lower(trim(_text));
  FOR i IN 1..array_length(ar_map, 1) LOOP
    s := replace(s, ar_map[i][1], ar_map[i][2]);
  END LOOP;
  s := regexp_replace(s, '[^a-z0-9\-]+', '-', 'g');
  s := regexp_replace(s, '-+', '-', 'g');
  s := trim(both '-' from s);
  IF length(s) = 0 THEN RETURN NULL; END IF;
  RETURN left(s, 60);
END;
$$;

CREATE OR REPLACE FUNCTION public.gen_unique_branch_slug(_business_id uuid, _name_en text, _name_ar text, _exclude_id uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  base text; candidate text; i int := 0; taken boolean;
BEGIN
  base := COALESCE(public.slugify_branch(_name_en), public.slugify_branch(_name_ar));
  IF base IS NULL THEN base := 'branch'; END IF;
  candidate := base;
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.business_branches
      WHERE business_id = _business_id AND slug = candidate
        AND (_exclude_id IS NULL OR id <> _exclude_id)
    ) INTO taken;
    EXIT WHEN NOT taken;
    i := i + 1;
    candidate := base || '-' || i;
    IF i > 50 THEN
      candidate := base || '-' || substr(gen_random_uuid()::text, 1, 6);
      EXIT;
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

DO $$
DECLARE r record; new_slug text;
BEGIN
  FOR r IN
    SELECT id, business_id, name_en, name_ar, slug FROM public.business_branches
    WHERE slug IS NULL OR slug ~ '^loc[0-9]+$'
  LOOP
    new_slug := public.gen_unique_branch_slug(r.business_id, r.name_en, r.name_ar, r.id);
    UPDATE public.business_branches SET slug = new_slug WHERE id = r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.tg_branch_auto_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 OR NEW.slug ~ '^loc[0-9]+$' THEN
    NEW.slug := public.gen_unique_branch_slug(NEW.business_id, NEW.name_en, NEW.name_ar, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branch_auto_slug ON public.business_branches;
CREATE TRIGGER trg_branch_auto_slug
  BEFORE INSERT OR UPDATE OF name_ar, name_en, slug ON public.business_branches
  FOR EACH ROW EXECUTE FUNCTION public.tg_branch_auto_slug();

-- Branch visits
CREATE TABLE IF NOT EXISTS public.branch_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.business_branches(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  visitor_hash text NOT NULL,
  event_type text NOT NULL DEFAULT 'view' CHECK (event_type IN ('view','phone_reveal','whatsapp_click','share','favorite')),
  created_at timestamptz NOT NULL DEFAULT now(),
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date
);

GRANT SELECT, INSERT ON public.branch_visits TO anon;
GRANT SELECT, INSERT ON public.branch_visits TO authenticated;
GRANT ALL ON public.branch_visits TO service_role;
ALTER TABLE public.branch_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_visits_insert_all" ON public.branch_visits
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "branch_visits_select_admin_owner" ON public.branch_visits
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = branch_visits.business_id AND b.user_id = auth.uid())
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_branch_visits_dedup
  ON public.branch_visits (branch_id, visitor_hash, event_type, day);
CREATE INDEX IF NOT EXISTS ix_branch_visits_branch_event
  ON public.branch_visits (branch_id, event_type);

CREATE OR REPLACE FUNCTION public.get_branch_visit_count(_branch_id uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::bigint FROM public.branch_visits
  WHERE branch_id = _branch_id AND event_type = 'view';
$$;
GRANT EXECUTE ON FUNCTION public.get_branch_visit_count(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_branch_visit(_branch_id uuid, _visitor_hash text, _event_type text DEFAULT 'view')
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _business_id uuid;
BEGIN
  SELECT business_id INTO _business_id FROM public.business_branches WHERE id = _branch_id;
  IF _business_id IS NULL THEN RETURN 0; END IF;
  IF _event_type NOT IN ('view','phone_reveal','whatsapp_click','share','favorite') THEN
    _event_type := 'view';
  END IF;
  INSERT INTO public.branch_visits (branch_id, business_id, visitor_hash, event_type)
  VALUES (_branch_id, _business_id, COALESCE(NULLIF(_visitor_hash, ''), gen_random_uuid()::text), _event_type)
  ON CONFLICT (branch_id, visitor_hash, event_type, day) DO NOTHING;
  RETURN public.get_branch_visit_count(_branch_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_branch_visit(uuid, text, text) TO anon, authenticated;

-- Favorites
CREATE TABLE IF NOT EXISTS public.user_favorite_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_ref_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_favorite_businesses TO authenticated;
GRANT ALL ON public.user_favorite_businesses TO service_role;
ALTER TABLE public.user_favorite_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favs_select_own" ON public.user_favorite_businesses
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "favs_insert_own" ON public.user_favorite_businesses
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favs_delete_own" ON public.user_favorite_businesses
FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ix_user_favs_user ON public.user_favorite_businesses (user_id);
