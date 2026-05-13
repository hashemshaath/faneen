
-- Business staff email invitations
create table if not exists public.business_staff_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role text not null default 'viewer',
  token text not null unique,
  invited_by uuid not null,
  status text not null default 'pending', -- pending | accepted | revoked | expired
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz not null default now()
);

alter table public.business_staff_invitations enable row level security;

create index if not exists idx_bsi_business on public.business_staff_invitations(business_id);
create index if not exists idx_bsi_email on public.business_staff_invitations(lower(email));
create index if not exists idx_bsi_token on public.business_staff_invitations(token);

-- Owners + admins can view/manage their own invitations
create policy "Owners view invitations"
  on public.business_staff_invitations for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_staff_invitations.business_id
        and (b.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

create policy "Owners create invitations"
  on public.business_staff_invitations for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.businesses b
      where b.id = business_staff_invitations.business_id
        and (b.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

create policy "Owners update invitations"
  on public.business_staff_invitations for update
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_staff_invitations.business_id
        and (b.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

create policy "Owners delete invitations"
  on public.business_staff_invitations for delete
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_staff_invitations.business_id
        and (b.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

-- Token preview (no auth required) for the acceptance page
create or replace function public.get_staff_invitation_preview(_token text)
returns table (
  id uuid,
  business_id uuid,
  business_name_ar text,
  business_name_en text,
  email text,
  role text,
  status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.business_id,
         b.name_ar, b.name_en,
         i.email, i.role, i.status, i.expires_at
  from public.business_staff_invitations i
  join public.businesses b on b.id = i.business_id
  where i.token = _token
  limit 1;
$$;

grant execute on function public.get_staff_invitation_preview(text) to anon, authenticated;

-- Accept invitation (authenticated only) — checks email match, expiry, status
create or replace function public.accept_staff_invitation(_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  caller_email text;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'code', 'unauthenticated');
  end if;

  select email into caller_email from auth.users where id = auth.uid();

  select * into inv from public.business_staff_invitations where token = _token for update;
  if not found then
    return json_build_object('ok', false, 'code', 'not_found');
  end if;

  if inv.status <> 'pending' then
    return json_build_object('ok', false, 'code', 'already_processed', 'status', inv.status);
  end if;

  if inv.expires_at < now() then
    update public.business_staff_invitations set status = 'expired' where id = inv.id;
    return json_build_object('ok', false, 'code', 'expired');
  end if;

  if lower(coalesce(caller_email, '')) <> lower(inv.email) then
    return json_build_object('ok', false, 'code', 'email_mismatch', 'expected', inv.email);
  end if;

  -- Insert into business_staff (idempotent on conflict)
  insert into public.business_staff (business_id, user_id, role, invited_by, is_active)
  values (inv.business_id, auth.uid(), inv.role, inv.invited_by, true)
  on conflict (business_id, user_id) do update set role = excluded.role, is_active = true;

  update public.business_staff_invitations
    set status = 'accepted', accepted_at = now(), accepted_by = auth.uid()
    where id = inv.id;

  return json_build_object('ok', true, 'business_id', inv.business_id);
end;
$$;

grant execute on function public.accept_staff_invitation(text) to authenticated;
