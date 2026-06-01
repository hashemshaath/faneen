-- Replace plaintext OTP storage with a SHA-256 hash.
-- Existing in-flight OTP rows are deleted (5-minute lifetime, users can re-request).
DELETE FROM public.phone_otps;

ALTER TABLE public.phone_otps
  ADD COLUMN IF NOT EXISTS otp_code_hash text;

ALTER TABLE public.phone_otps
  DROP COLUMN IF EXISTS otp_code;

ALTER TABLE public.phone_otps
  ALTER COLUMN otp_code_hash SET NOT NULL;