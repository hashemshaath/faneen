
-- ============================================
-- UNIFIED REF_ID SYSTEM
-- Format: PREFIX-NNNNNNN (supports 10M per entity)
-- ============================================

-- 1. Unified ref_id generator function
CREATE OR REPLACE FUNCTION public.generate_ref_id(_prefix text, _seq_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next bigint;
BEGIN
  EXECUTE format('SELECT nextval(%L)', 'public.' || _seq_name) INTO _next;
  RETURN _prefix || '-' || lpad(_next::text, 7, '0');
END;
$$;

-- 2. Create sequences (all start at 1000001 except profiles/businesses which continue from existing)
-- Drop old sequences first
DROP SEQUENCE IF EXISTS public.profile_account_number_seq CASCADE;
DROP SEQUENCE IF EXISTS public.business_number_seq CASCADE;

CREATE SEQUENCE public.seq_usr START WITH 1000001 INCREMENT BY 1;
CREATE SEQUENCE public.seq_biz START WITH 5000001 INCREMENT BY 1;
CREATE SEQUENCE public.seq_cnt START WITH 1000001 INCREMENT BY 1;
CREATE SEQUENCE public.seq_prj START WITH 1000001 INCREMENT BY 1;
CREATE SEQUENCE public.seq_wrt START WITH 1000001 INCREMENT BY 1;
CREATE SEQUENCE public.seq_mnt START WITH 1000001 INCREMENT BY 1;
CREATE SEQUENCE public.seq_ins START WITH 1000001 INCREMENT BY 1;
CREATE SEQUENCE public.seq_prm START WITH 1000001 INCREMENT BY 1;
CREATE SEQUENCE public.seq_cht START WITH 1000001 INCREMENT BY 1;
CREATE SEQUENCE public.seq_blg START WITH 1000001 INCREMENT BY 1;

-- 3. Add ref_id columns where missing and update existing ones

-- PROFILES: rename account_number → ref_id (text)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ref_id text UNIQUE;
-- Backfill existing profiles
UPDATE public.profiles SET ref_id = 'USR-' || lpad(account_number::text, 7, '0') WHERE ref_id IS NULL AND account_number IS NOT NULL;
UPDATE public.profiles SET ref_id = generate_ref_id('USR', 'seq_usr') WHERE ref_id IS NULL;
ALTER TABLE public.profiles ALTER COLUMN ref_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN ref_id SET DEFAULT generate_ref_id('USR', 'seq_usr');
-- Advance sequence past existing values
SELECT setval('public.seq_usr', GREATEST(
  (SELECT COALESCE(MAX(NULLIF(regexp_replace(ref_id, '[^0-9]', '', 'g'), '')::bigint), 1000000) FROM public.profiles),
  1000000
));

-- BUSINESSES: rename business_number → ref_id (text)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS ref_id text UNIQUE;
UPDATE public.businesses SET ref_id = 'BIZ-' || lpad(business_number::text, 7, '0') WHERE ref_id IS NULL AND business_number IS NOT NULL;
UPDATE public.businesses SET ref_id = generate_ref_id('BIZ', 'seq_biz') WHERE ref_id IS NULL;
ALTER TABLE public.businesses ALTER COLUMN ref_id SET NOT NULL;
ALTER TABLE public.businesses ALTER COLUMN ref_id SET DEFAULT generate_ref_id('BIZ', 'seq_biz');
SELECT setval('public.seq_biz', GREATEST(
  (SELECT COALESCE(MAX(NULLIF(regexp_replace(ref_id, '[^0-9]', '', 'g'), '')::bigint), 5000000) FROM public.businesses),
  5000000
));

-- CONTRACTS: update contract_number format
UPDATE public.contracts SET contract_number = generate_ref_id('CNT', 'seq_cnt') WHERE contract_number NOT LIKE 'CNT-_______';
ALTER TABLE public.contracts ALTER COLUMN contract_number SET DEFAULT generate_ref_id('CNT', 'seq_cnt');

-- PROJECTS: add ref_id
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ref_id text UNIQUE DEFAULT generate_ref_id('PRJ', 'seq_prj');
UPDATE public.projects SET ref_id = generate_ref_id('PRJ', 'seq_prj') WHERE ref_id IS NULL;

-- WARRANTIES: add ref_id
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS ref_id text UNIQUE DEFAULT generate_ref_id('WRT', 'seq_wrt');
UPDATE public.warranties SET ref_id = generate_ref_id('WRT', 'seq_wrt') WHERE ref_id IS NULL;

-- MAINTENANCE_REQUESTS: update request_number format  
UPDATE public.maintenance_requests SET request_number = generate_ref_id('MNT', 'seq_mnt') WHERE request_number NOT LIKE 'MNT-_______';
ALTER TABLE public.maintenance_requests ALTER COLUMN request_number SET DEFAULT generate_ref_id('MNT', 'seq_mnt');

-- INSTALLMENT_PLANS: add ref_id
ALTER TABLE public.installment_plans ADD COLUMN IF NOT EXISTS ref_id text UNIQUE DEFAULT generate_ref_id('INS', 'seq_ins');
UPDATE public.installment_plans SET ref_id = generate_ref_id('INS', 'seq_ins') WHERE ref_id IS NULL;

-- PROMOTIONS: add ref_id
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS ref_id text UNIQUE DEFAULT generate_ref_id('PRM', 'seq_prm');
UPDATE public.promotions SET ref_id = generate_ref_id('PRM', 'seq_prm') WHERE ref_id IS NULL;

-- CONVERSATIONS: add ref_id
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS ref_id text UNIQUE DEFAULT generate_ref_id('CHT', 'seq_cht');
UPDATE public.conversations SET ref_id = generate_ref_id('CHT', 'seq_cht') WHERE ref_id IS NULL;

-- BLOG_POSTS: add ref_id
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS ref_id text UNIQUE DEFAULT generate_ref_id('BLG', 'seq_blg');
UPDATE public.blog_posts SET ref_id = generate_ref_id('BLG', 'seq_blg') WHERE ref_id IS NULL;

-- 4. Create indexes for ref_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_ref_id ON public.profiles(ref_id);
CREATE INDEX IF NOT EXISTS idx_businesses_ref_id ON public.businesses(ref_id);
CREATE INDEX IF NOT EXISTS idx_projects_ref_id ON public.projects(ref_id);
CREATE INDEX IF NOT EXISTS idx_warranties_ref_id ON public.warranties(ref_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_ref_id ON public.installment_plans(ref_id);
CREATE INDEX IF NOT EXISTS idx_promotions_ref_id ON public.promotions(ref_id);
CREATE INDEX IF NOT EXISTS idx_conversations_ref_id ON public.conversations(ref_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_ref_id ON public.blog_posts(ref_id);
