
-- Fix corrupted auth user with NULL confirmation_token
UPDATE auth.users 
SET confirmation_token = '' 
WHERE id = '00000000-0000-0000-0000-000000000001' 
  AND confirmation_token IS NULL;
