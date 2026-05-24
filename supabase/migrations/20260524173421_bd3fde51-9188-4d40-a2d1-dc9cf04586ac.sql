-- Step 1: clear unverified phone from USR-1000003 (email-login user, auth.phone IS NULL,
-- profile.phone was manually entered and conflicts with the verified owner of this number).
UPDATE public.profiles
SET phone = NULL,
    updated_at = now()
WHERE user_id = '2cf86bd3-cb92-48ed-bd9d-caec8b28dd56'
  AND phone = '+966506315300';

-- Step 2: set canonical phone on USR-1000002 to match auth.users.phone (verified via OTP).
UPDATE public.profiles
SET phone = '+966506315300',
    updated_at = now()
WHERE user_id = '1e67423f-ffc1-4345-b27d-5726dcfa66d7';