
-- 1. Fix contract-attachments: drop ALL existing policies for this bucket first
DROP POLICY IF EXISTS "Contract parties can view their attachments" ON storage.objects;
DROP POLICY IF EXISTS "Contract parties can upload their attachments" ON storage.objects;
DROP POLICY IF EXISTS "Contract parties can delete their attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contract attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view contract attachments" ON storage.objects;
DROP POLICY IF EXISTS "Contract attachments are accessible to authenticated users" ON storage.objects;

CREATE POLICY "Contract parties can view their attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contract-attachments'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

CREATE POLICY "Contract parties can upload their attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contract-attachments'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

CREATE POLICY "Contract parties can delete their attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contract-attachments'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

-- 2. Fix business_bnpl_providers
DROP POLICY IF EXISTS "Active business BNPL viewable by everyone" ON public.business_bnpl_providers;
DROP POLICY IF EXISTS "Public can see active BNPL provider links" ON public.business_bnpl_providers;

CREATE POLICY "Public can see active BNPL links"
ON public.business_bnpl_providers FOR SELECT
USING (is_active = true);

-- 3. Create secure branch data function
CREATE OR REPLACE FUNCTION public.get_public_branch_data(_branch_id uuid)
RETURNS TABLE (
  id uuid, business_id uuid, name_ar text, name_en text,
  address text, city_id uuid, country_id uuid, region text,
  district text, latitude numeric, longitude numeric,
  phone varchar, mobile text, email text, website text,
  is_main boolean, sort_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT id, business_id, name_ar, name_en,
    address, city_id, country_id, region,
    district, latitude, longitude,
    phone, mobile, email, website,
    is_main, sort_order
  FROM public.business_branches
  WHERE id = _branch_id AND is_active = true;
$$;

-- 4. Rate limiting table
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  attempt_type text NOT NULL DEFAULT 'login',
  attempts integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  UNIQUE(identifier, attempt_type)
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to rate limits"
ON public.auth_rate_limits FOR ALL
USING (false);

-- 5. Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text, _type text,
  _max_attempts integer DEFAULT 5,
  _window_minutes integer DEFAULT 15,
  _block_minutes integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE _record auth_rate_limits%ROWTYPE;
BEGIN
  SELECT * INTO _record FROM auth_rate_limits
  WHERE identifier = _identifier AND attempt_type = _type;

  IF _record.blocked_until IS NOT NULL AND _record.blocked_until > now() THEN
    RETURN false;
  END IF;

  IF _record.id IS NOT NULL AND _record.first_attempt_at < now() - (_window_minutes || ' minutes')::interval THEN
    UPDATE auth_rate_limits SET attempts = 1, first_attempt_at = now(), last_attempt_at = now(), blocked_until = NULL
    WHERE id = _record.id;
    RETURN true;
  END IF;

  IF _record.id IS NULL THEN
    INSERT INTO auth_rate_limits (identifier, attempt_type) VALUES (_identifier, _type);
    RETURN true;
  ELSE
    UPDATE auth_rate_limits SET attempts = _record.attempts + 1, last_attempt_at = now()
    WHERE id = _record.id;
    IF _record.attempts + 1 >= _max_attempts THEN
      UPDATE auth_rate_limits SET blocked_until = now() + (_block_minutes || ' minutes')::interval
      WHERE id = _record.id;
      RETURN false;
    END IF;
    RETURN true;
  END IF;
END;
$$;
