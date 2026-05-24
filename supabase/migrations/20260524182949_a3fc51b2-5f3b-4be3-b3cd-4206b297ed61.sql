
-- 2) Admin sequence starting at 1
CREATE SEQUENCE IF NOT EXISTS public.seq_adm START WITH 1 INCREMENT BY 1;
REVOKE ALL ON SEQUENCE public.seq_adm FROM anon, authenticated;

-- 3) Dynamic default for profiles.ref_id (admin -> ADM, else USR)
CREATE OR REPLACE FUNCTION public.tg_profiles_set_ref_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    IF NEW.account_type = 'admin'::public.account_type THEN
      NEW.ref_id := public.generate_ref_id('ADM', 'seq_adm');
    ELSE
      NEW.ref_id := public.generate_ref_id('USR', 'seq_usr');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles ALTER COLUMN ref_id DROP DEFAULT;

DROP TRIGGER IF EXISTS trg_profiles_set_ref_id ON public.profiles;
CREATE TRIGGER trg_profiles_set_ref_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_profiles_set_ref_id();

-- 4) Re-number current accounts (only 3 exist)
-- Free up old ref_ids first to avoid unique conflicts during swap
UPDATE public.profiles SET ref_id = 'TMP-' || ref_id WHERE ref_id IN ('USR-1000007','USR-1000008','USR-1000009');
UPDATE public.businesses SET ref_id = 'TMP-' || ref_id WHERE ref_id = 'BIZ-5000004';

-- Promote admin to account_type=admin and assign ADM-0000001
UPDATE public.profiles
SET account_type = 'admin'::public.account_type,
    ref_id = 'ADM-0000001',
    updated_at = now()
WHERE email = 'admin@admin.com';

UPDATE public.profiles
SET ref_id = 'USR-0000001', updated_at = now()
WHERE email = 'user@user.com';

UPDATE public.profiles
SET ref_id = 'USR-0000002', updated_at = now()
WHERE email = 'pro@pro.com';

UPDATE public.businesses
SET ref_id = 'BIZ-0000001', updated_at = now()
WHERE user_id = (SELECT user_id FROM public.profiles WHERE email = 'pro@pro.com');

-- 5) Reset sequences so next inserts continue from current allocation
SELECT setval('public.seq_adm', 1, true);
SELECT setval('public.seq_usr', 2, true);
SELECT setval('public.seq_biz', 1, true);

-- 6) Ensure admin still has full role (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::public.app_role
FROM public.profiles p
WHERE p.email = 'admin@admin.com'
ON CONFLICT (user_id, role) DO NOTHING;
