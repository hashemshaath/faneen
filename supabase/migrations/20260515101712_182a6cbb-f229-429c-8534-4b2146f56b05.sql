-- Showcase submissions
create table if not exists public.showcase_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('logo','work')),
  title_ar text,
  title_en text,
  description_ar text,
  description_en text,
  image_url text not null,
  link_url text,
  sector_slug text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejected_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists showcase_submissions_business_idx on public.showcase_submissions (business_id);
create index if not exists showcase_submissions_status_idx   on public.showcase_submissions (status);
create index if not exists showcase_submissions_kind_idx     on public.showcase_submissions (kind);
create index if not exists showcase_submissions_sector_idx   on public.showcase_submissions (sector_slug);

create trigger showcase_submissions_set_updated_at
  before update on public.showcase_submissions
  for each row execute function public.update_updated_at_column();

alter table public.showcase_submissions enable row level security;

-- Public can read approved submissions whose business is verified + active
create policy "showcase_public_read_approved"
on public.showcase_submissions for select
using (
  status = 'approved'
  and exists (
    select 1 from public.businesses b
    where b.id = showcase_submissions.business_id
      and b.is_verified = true
      and b.is_active = true
  )
);

-- Provider can read all their own submissions (any status)
create policy "showcase_owner_read_own"
on public.showcase_submissions for select
using (
  exists (
    select 1 from public.businesses b
    where b.id = showcase_submissions.business_id
      and b.user_id = auth.uid()
  )
);

-- Provider can insert for businesses they own
create policy "showcase_owner_insert"
on public.showcase_submissions for insert
with check (
  exists (
    select 1 from public.businesses b
    where b.id = showcase_submissions.business_id
      and b.user_id = auth.uid()
  )
  and submitted_by = auth.uid()
);

-- Provider can update their own pending/rejected submissions (cannot change status)
create policy "showcase_owner_update_own"
on public.showcase_submissions for update
using (
  status in ('pending','rejected')
  and exists (
    select 1 from public.businesses b
    where b.id = showcase_submissions.business_id
      and b.user_id = auth.uid()
  )
)
with check (
  status in ('pending','rejected')
  and exists (
    select 1 from public.businesses b
    where b.id = showcase_submissions.business_id
      and b.user_id = auth.uid()
  )
);

-- Provider can delete their own
create policy "showcase_owner_delete_own"
on public.showcase_submissions for delete
using (
  exists (
    select 1 from public.businesses b
    where b.id = showcase_submissions.business_id
      and b.user_id = auth.uid()
  )
);

-- Admin full access
create policy "showcase_admin_all"
on public.showcase_submissions for all
using (public.has_role(auth.uid(),'super_admin'))
with check (public.has_role(auth.uid(),'super_admin'));

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('showcase', 'showcase', true)
on conflict (id) do nothing;

-- Public read of showcase bucket
create policy "showcase_bucket_public_read"
on storage.objects for select
using (bucket_id = 'showcase');

-- Authenticated users can upload to showcase bucket under their own folder (auth.uid()/...)
create policy "showcase_bucket_owner_upload"
on storage.objects for insert
with check (
  bucket_id = 'showcase'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "showcase_bucket_owner_update"
on storage.objects for update
using (
  bucket_id = 'showcase'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "showcase_bucket_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'showcase'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);