
-- Phase 1: Onboarding tracking columns + secure welcome-notification trigger

-- 1. Add tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ;

-- Backfill onboarding_completed_at for users already onboarded (use updated_at as best estimate)
UPDATE public.profiles
SET onboarding_completed_at = COALESCE(onboarding_completed_at, updated_at)
WHERE is_onboarded = true AND onboarding_completed_at IS NULL;

-- 2. SECURITY DEFINER function to create a welcome notification on completion
CREATE OR REPLACE FUNCTION public.fn_on_onboarding_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when transitioning to completed
  IF (NEW.is_onboarded = true AND COALESCE(OLD.is_onboarded, false) = false) THEN
    NEW.onboarding_completed_at := COALESCE(NEW.onboarding_completed_at, now());

    -- Insert welcome notification (bypasses RLS via SECURITY DEFINER)
    INSERT INTO public.notifications (
      user_id, title_ar, title_en, body_ar, body_en,
      notification_type, action_url
    ) VALUES (
      NEW.user_id,
      'مرحباً بك في قِطاعات 👋',
      'Welcome to Qitaat 👋',
      'تم إنشاء حسابك بنجاح. استكشف الموردين، احفظ مفضلاتك، وابدأ مشاريعك.',
      'Your account is ready. Explore providers, save favorites, and start your projects.',
      'system',
      CASE WHEN NEW.account_type IN ('business', 'company')
           THEN '/dashboard/overview'
           ELSE '/search' END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_onboarding_completed ON public.profiles;
CREATE TRIGGER trg_profiles_onboarding_completed
BEFORE UPDATE OF is_onboarded ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_on_onboarding_completed();
