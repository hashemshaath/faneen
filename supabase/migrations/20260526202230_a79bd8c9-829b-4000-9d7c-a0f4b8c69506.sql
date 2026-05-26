
-- BM-REF-FIX-TRIGGERS-1: ref_id auto-assignment triggers + one-shot repair.

-- ──────────────────────────────────────────────────────────────────
-- 1. businesses trigger
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_businesses_set_ref_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id NOT LIKE 'ENT-%' THEN
    IF NEW.ref_id LIKE 'BIZ-%' AND NEW.legacy_ref_id IS NULL THEN
      NEW.legacy_ref_id := NEW.ref_id;
    END IF;
    NEW.ref_id := public.generate_ref_id('ENT', 'seq_ent');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_set_ref_id ON public.businesses;
CREATE TRIGGER trg_businesses_set_ref_id
BEFORE INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.tg_businesses_set_ref_id();

-- ──────────────────────────────────────────────────────────────────
-- 2. business_staff trigger
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_business_staff_set_ref_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN
    NEW.ref_id := public.generate_ref_id('STF', 'seq_stf');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_staff_set_ref_id ON public.business_staff;
CREATE TRIGGER trg_business_staff_set_ref_id
BEFORE INSERT ON public.business_staff
FOR EACH ROW
EXECUTE FUNCTION public.tg_business_staff_set_ref_id();

-- ──────────────────────────────────────────────────────────────────
-- 3. provider_subscriptions trigger
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_provider_subscriptions_set_ref_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN
    NEW.ref_id := public.generate_ref_id('PVS', 'seq_pvs');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provider_subscriptions_set_ref_id ON public.provider_subscriptions;
CREATE TRIGGER trg_provider_subscriptions_set_ref_id
BEFORE INSERT ON public.provider_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.tg_provider_subscriptions_set_ref_id();

-- ──────────────────────────────────────────────────────────────────
-- 4. One-shot repair
-- ──────────────────────────────────────────────────────────────────

-- 4A. businesses: rows still carrying BIZ- in ref_id → move to legacy, mint ENT-
UPDATE public.businesses
SET legacy_ref_id = COALESCE(legacy_ref_id, ref_id),
    ref_id        = public.generate_ref_id('ENT', 'seq_ent')
WHERE ref_id LIKE 'BIZ-%';

-- 4B. businesses: rows with null ref_id → mint ENT-
UPDATE public.businesses
SET ref_id = public.generate_ref_id('ENT', 'seq_ent')
WHERE ref_id IS NULL;

-- 4C. business_staff: null → STF-
UPDATE public.business_staff
SET ref_id = public.generate_ref_id('STF', 'seq_stf')
WHERE ref_id IS NULL;

-- 4D. provider_subscriptions: null → PVS-
UPDATE public.provider_subscriptions
SET ref_id = public.generate_ref_id('PVS', 'seq_pvs')
WHERE ref_id IS NULL;
