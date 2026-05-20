create or replace function public.find_auth_user_email_by_identifier(_identifier text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email
  from auth.users u
  where
    (position('@' in _identifier) > 0 and lower(u.email) = lower(_identifier))
    or (position('@' in _identifier) = 0 and u.phone = regexp_replace(_identifier, '^\+', ''))
    or (position('@' in _identifier) = 0 and u.phone = _identifier)
  order by u.created_at asc
  limit 1
$$;

revoke all on function public.find_auth_user_email_by_identifier(text) from public;
revoke all on function public.find_auth_user_email_by_identifier(text) from anon;
revoke all on function public.find_auth_user_email_by_identifier(text) from authenticated;
grant execute on function public.find_auth_user_email_by_identifier(text) to service_role;