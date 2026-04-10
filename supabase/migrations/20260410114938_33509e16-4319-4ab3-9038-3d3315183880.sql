-- Add onboarding and phone verification fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_onboarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country_code varchar(10) NOT NULL DEFAULT '+966';

-- Mark existing users with full_name as onboarded
UPDATE public.profiles SET is_onboarded = true WHERE full_name IS NOT NULL AND full_name != '';

-- Create phone OTPs table for verification codes
CREATE TABLE public.phone_otps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  phone varchar(20) NOT NULL,
  otp_code varchar(6) NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OTPs"
  ON public.phone_otps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OTPs"
  ON public.phone_otps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OTPs"
  ON public.phone_otps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for cleanup and lookups
CREATE INDEX idx_phone_otps_user_phone ON public.phone_otps (user_id, phone, created_at DESC);

-- Auto-delete expired OTPs (cleanup function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.phone_otps WHERE expires_at < now();
$$;