create table public.contract_pdf_analysis_log (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  status text not null check (status in ('PASS','FAIL')),
  mojibake_detected boolean not null default false,
  mojibake_count integer not null default 0,
  byte_length integer,
  file_name text,
  build_version text,
  source text not null default 'backend',
  sample text,
  report text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index contract_pdf_analysis_log_contract_idx
  on public.contract_pdf_analysis_log (contract_id, created_at desc);

alter table public.contract_pdf_analysis_log enable row level security;

create policy "Contract parties can view PDF analysis log"
  on public.contract_pdf_analysis_log
  for select
  using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_pdf_analysis_log.contract_id
        and (auth.uid() = c.client_id or auth.uid() = c.provider_id)
    )
  );

create policy "Contract parties can insert PDF analysis log"
  on public.contract_pdf_analysis_log
  for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.contracts c
      where c.id = contract_pdf_analysis_log.contract_id
        and (auth.uid() = c.client_id or auth.uid() = c.provider_id)
    )
  );