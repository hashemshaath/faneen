
-- ---------- 1. country_settings ----------
CREATE TABLE public.country_settings (
  country_id uuid PRIMARY KEY REFERENCES public.countries(id) ON DELETE CASCADE,
  default_currency text,
  default_locale text,
  default_timezone text,
  default_tax_rate numeric,
  phone_code text,
  address_format jsonb,
  is_launched boolean NOT NULL DEFAULT false,
  beta_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.country_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "country_settings public select launched"
  ON public.country_settings FOR SELECT USING (is_launched = true);

CREATE POLICY "country_settings super_admin all"
  ON public.country_settings FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_country_settings_updated_at
  BEFORE UPDATE ON public.country_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.country_settings (
  country_id, default_currency, default_locale, default_timezone,
  default_tax_rate, phone_code, is_launched, beta_enabled
) VALUES (
  '4e37871f-3211-4484-935e-cf8c387cbf80'::uuid,
  'SAR', 'ar-SA', 'Asia/Riyadh', 15, '+966', true, true
);

-- ---------- 2. business_tax_profiles ----------
CREATE TABLE public.business_tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  country_id uuid NOT NULL REFERENCES public.countries(id),
  scheme text NOT NULL CHECK (scheme IN ('VAT','GST','SALES_TAX','NONE')),
  tax_number text,
  tax_rate numeric,
  inclusive_default boolean NOT NULL DEFAULT true,
  status text NOT NULL CHECK (status IN ('not_required','pending','verified','rejected')),
  certificate_path text,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, country_id)
);
ALTER TABLE public.business_tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "btp owner_staff_admin select"
  ON public.business_tax_profiles FOR SELECT
  USING (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.is_business_staff(auth.uid(), business_id)
    OR public.has_admin_access(auth.uid())
  );

CREATE POLICY "btp owner_staff insert"
  ON public.business_tax_profiles FOR INSERT
  WITH CHECK (
    (
      (public.is_business_owner_or_manager(auth.uid(), business_id)
       OR public.is_business_staff(auth.uid(), business_id))
      AND status IN ('pending','not_required')
    )
    OR public.has_admin_access(auth.uid())
  );

CREATE POLICY "btp owner_staff update"
  ON public.business_tax_profiles FOR UPDATE
  USING (
    (
      (public.is_business_owner_or_manager(auth.uid(), business_id)
       OR public.is_business_staff(auth.uid(), business_id))
      AND status IN ('pending','not_required')
    )
    OR public.has_admin_access(auth.uid())
  )
  WITH CHECK (
    (
      (public.is_business_owner_or_manager(auth.uid(), business_id)
       OR public.is_business_staff(auth.uid(), business_id))
      AND status IN ('pending','not_required')
    )
    OR public.has_admin_access(auth.uid())
  );

CREATE POLICY "btp admin delete"
  ON public.business_tax_profiles FOR DELETE
  USING (public.has_admin_access(auth.uid()));

CREATE TRIGGER trg_btp_updated_at
  BEFORE UPDATE ON public.business_tax_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 3. business_service_countries ----------
CREATE TABLE public.business_service_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  country_id uuid NOT NULL REFERENCES public.countries(id),
  is_primary boolean NOT NULL DEFAULT false,
  coverage_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, country_id)
);
ALTER TABLE public.business_service_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bsc select"
  ON public.business_service_countries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.country_settings cs
      WHERE cs.country_id = business_service_countries.country_id
        AND cs.is_launched = true
    )
    OR public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.is_business_staff(auth.uid(), business_id)
    OR public.has_admin_access(auth.uid())
  );

CREATE POLICY "bsc insert"
  ON public.business_service_countries FOR INSERT
  WITH CHECK (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.is_business_staff(auth.uid(), business_id)
    OR public.has_admin_access(auth.uid())
  );

CREATE POLICY "bsc update"
  ON public.business_service_countries FOR UPDATE
  USING (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.is_business_staff(auth.uid(), business_id)
    OR public.has_admin_access(auth.uid())
  )
  WITH CHECK (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.is_business_staff(auth.uid(), business_id)
    OR public.has_admin_access(auth.uid())
  );

CREATE POLICY "bsc delete"
  ON public.business_service_countries FOR DELETE
  USING (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.is_business_staff(auth.uid(), business_id)
    OR public.has_admin_access(auth.uid())
  );

-- ---------- 4. user_locale_settings ----------
CREATE TABLE public.user_locale_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'ar',
  timezone text NOT NULL DEFAULT 'Asia/Riyadh',
  date_format text,
  number_format text,
  currency_display text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_locale_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uls self all"
  ON public.user_locale_settings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "uls admin select"
  ON public.user_locale_settings FOR SELECT
  USING (public.has_admin_access(auth.uid()));

CREATE TRIGGER trg_uls_updated_at
  BEFORE UPDATE ON public.user_locale_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 5. country_admin_assignments ----------
CREATE TABLE public.country_admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  country_id uuid NOT NULL REFERENCES public.countries(id),
  role text NOT NULL CHECK (role IN ('country_admin','country_moderator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, country_id, role)
);
ALTER TABLE public.country_admin_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "caa self select"
  ON public.country_admin_assignments FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "caa super_admin all"
  ON public.country_admin_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ---------- Part B — Foundation columns ----------
ALTER TABLE public.contracts              ADD COLUMN country_id uuid REFERENCES public.countries(id);
ALTER TABLE public.lead_requests          ADD COLUMN country_id uuid REFERENCES public.countries(id);
ALTER TABLE public.client_sites           ADD COLUMN country_id uuid REFERENCES public.countries(id);
ALTER TABLE public.business_service_areas ADD COLUMN country_id uuid REFERENCES public.countries(id);

CREATE INDEX idx_contracts_country_id              ON public.contracts(country_id);
CREATE INDEX idx_lead_requests_country_id          ON public.lead_requests(country_id);
CREATE INDEX idx_client_sites_country_id           ON public.client_sites(country_id);
CREATE INDEX idx_business_service_areas_country_id ON public.business_service_areas(country_id);
CREATE INDEX idx_business_tax_profiles_business    ON public.business_tax_profiles(business_id);
CREATE INDEX idx_business_tax_profiles_country     ON public.business_tax_profiles(country_id);
CREATE INDEX idx_business_service_countries_biz    ON public.business_service_countries(business_id);
CREATE INDEX idx_business_service_countries_ctry   ON public.business_service_countries(country_id);
CREATE INDEX idx_country_admin_assignments_user    ON public.country_admin_assignments(user_id);

ALTER TABLE public.profiles   ALTER COLUMN country_id SET DEFAULT '4e37871f-3211-4484-935e-cf8c387cbf80'::uuid;
ALTER TABLE public.businesses ALTER COLUMN country_id SET DEFAULT '4e37871f-3211-4484-935e-cf8c387cbf80'::uuid;

-- ---------- Part E — handle_new_user() ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _next_account_number integer;
  _account_type text;
  _full_name text;
  _placeholder_username text;
  _sa_country uuid := '4e37871f-3211-4484-935e-cf8c387cbf80'::uuid;
  _new_biz_id uuid;
BEGIN
  SELECT COALESCE(MAX(account_number), 999) + 1 INTO _next_account_number FROM public.profiles;

  _account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  IF _account_type NOT IN ('individual', 'business', 'company') THEN
    _account_type := 'individual';
  END IF;

  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.profiles (user_id, phone, email, full_name, account_number, account_type, country_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.email, ''),
    _full_name,
    _next_account_number,
    _account_type::account_type,
    _sa_country
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_locale_settings (user_id, language, timezone)
  VALUES (NEW.id, 'ar', 'Asia/Riyadh')
  ON CONFLICT (user_id) DO NOTHING;

  IF _account_type IN ('business', 'company') THEN
    _placeholder_username := 'biz-' || substring(replace(NEW.id::text, '-', '') from 1 for 12);
    BEGIN
      INSERT INTO public.businesses (user_id, name_ar, username, approval_status, username_status, country_id)
      VALUES (
        NEW.id,
        NULLIF(_full_name, ''),
        _placeholder_username,
        'draft'::business_approval_status,
        'pending'::username_status,
        _sa_country
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO _new_biz_id;

      IF _new_biz_id IS NOT NULL THEN
        INSERT INTO public.business_service_countries (business_id, country_id, is_primary)
        VALUES (_new_biz_id, _sa_country, true)
        ON CONFLICT (business_id, country_id) DO NOTHING;

        INSERT INTO public.business_tax_profiles (
          business_id, country_id, scheme, tax_rate, inclusive_default, status
        ) VALUES (
          _new_biz_id, _sa_country, 'VAT', 15, true, 'not_required'
        )
        ON CONFLICT (business_id, country_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
