UPDATE auth.users
SET email = 'hassan@gmail.com',
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = 'fa3baa8d-0ed1-4d1a-849d-23f644ef9eef';

UPDATE auth.identities
SET identity_data = jsonb_set(identity_data, '{email}', '"hassan@gmail.com"'),
    updated_at = now()
WHERE user_id = 'fa3baa8d-0ed1-4d1a-849d-23f644ef9eef'
  AND provider = 'email';