
-- 1. Sequential ID for profiles
CREATE SEQUENCE IF NOT EXISTS public.profile_account_number_seq START WITH 1000 INCREMENT BY 1;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number bigint UNIQUE DEFAULT nextval('public.profile_account_number_seq');

-- Backfill existing profiles
UPDATE public.profiles SET account_number = nextval('public.profile_account_number_seq') WHERE account_number IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.profiles ALTER COLUMN account_number SET NOT NULL;

-- 2. Sequential ID for businesses
CREATE SEQUENCE IF NOT EXISTS public.business_number_seq START WITH 5000 INCREMENT BY 1;

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_number bigint UNIQUE DEFAULT nextval('public.business_number_seq');

-- Backfill existing businesses
UPDATE public.businesses SET business_number = nextval('public.business_number_seq') WHERE business_number IS NULL;

ALTER TABLE public.businesses ALTER COLUMN business_number SET NOT NULL;

-- 3. Business staff roles enum
DO $$ BEGIN
  CREATE TYPE public.business_staff_role AS ENUM ('owner', 'manager', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Business staff table
CREATE TABLE IF NOT EXISTS public.business_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role business_staff_role NOT NULL DEFAULT 'viewer',
  invited_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Enable RLS
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;

-- Staff can view their own business team
CREATE POLICY "Staff can view their business team"
  ON public.business_staff FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = business_staff.business_id
        AND bs.user_id = auth.uid()
        AND bs.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_staff.business_id
        AND b.user_id = auth.uid()
    )
  );

-- Business owner can insert staff
CREATE POLICY "Business owner can add staff"
  ON public.business_staff FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_staff.business_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = business_staff.business_id
        AND bs.user_id = auth.uid()
        AND bs.role IN ('owner', 'manager')
        AND bs.is_active = true
    )
  );

-- Business owner can update staff
CREATE POLICY "Business owner can update staff"
  ON public.business_staff FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_staff.business_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = business_staff.business_id
        AND bs.user_id = auth.uid()
        AND bs.role = 'owner'
        AND bs.is_active = true
    )
  );

-- Business owner can delete staff
CREATE POLICY "Business owner can delete staff"
  ON public.business_staff FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_staff.business_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = business_staff.business_id
        AND bs.user_id = auth.uid()
        AND bs.role = 'owner'
        AND bs.is_active = true
    )
  );

-- Admins can manage all staff
CREATE POLICY "Admins can manage all staff"
  ON public.business_staff FOR ALL
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_business_staff_updated_at
  BEFORE UPDATE ON public.business_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper function to check business staff role
CREATE OR REPLACE FUNCTION public.has_business_role(_user_id uuid, _business_id uuid, _roles business_staff_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_staff
    WHERE user_id = _user_id
      AND business_id = _business_id
      AND role = ANY(_roles)
      AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id
      AND user_id = _user_id
  )
$$;

-- 6. Auto-insert owner when business is created
CREATE OR REPLACE FUNCTION public.auto_add_business_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_staff (business_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id)
  ON CONFLICT (business_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_add_business_owner
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_business_owner();
