-- =====================================================================
-- MJIS PAYROLL / KYC REPAIR MIGRATION
-- =====================================================================
-- SAFE / ADDITIVE:
--   * Does NOT DROP, TRUNCATE or DELETE existing MJIS data.
--   * Ensures the two payroll tables exist.
--   * Ensures the private Storage bucket exists.
--   * Ensures required RLS policies and API privileges exist.
--   * Backfills payroll profile rows for existing auth users.
--   * Links existing employee.user_id -> payroll profile.
--   * Reloads PostgREST schema cache.
--
-- Run this once in:
--   Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Ensure helper role function exists.
-- ---------------------------------------------------------------------
create or replace function public.is_mjis_admin_or_hr()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'hr')
  );
$$;

revoke all on function public.is_mjis_admin_or_hr() from public;
grant execute on function public.is_mjis_admin_or_hr() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Payroll / statutory profile table.
-- ---------------------------------------------------------------------
create table if not exists public.employee_payroll_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  employee_id uuid unique references public.employees(id) on delete set null,

  bank_name text,
  bank_account_number text,
  ifsc_code text,
  pan_number text,
  uan_number text,
  esi_number text,
  insurance_number text,
  aadhaar_number text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add missing columns without disturbing existing data.
alter table public.employee_payroll_profiles
  add column if not exists user_id uuid;

alter table public.employee_payroll_profiles
  add column if not exists employee_id uuid;

alter table public.employee_payroll_profiles
  add column if not exists bank_name text;

alter table public.employee_payroll_profiles
  add column if not exists bank_account_number text;

alter table public.employee_payroll_profiles
  add column if not exists ifsc_code text;

alter table public.employee_payroll_profiles
  add column if not exists pan_number text;

alter table public.employee_payroll_profiles
  add column if not exists uan_number text;

alter table public.employee_payroll_profiles
  add column if not exists esi_number text;

alter table public.employee_payroll_profiles
  add column if not exists insurance_number text;

alter table public.employee_payroll_profiles
  add column if not exists aadhaar_number text;

alter table public.employee_payroll_profiles
  add column if not exists created_at timestamptz default now();

alter table public.employee_payroll_profiles
  add column if not exists updated_at timestamptz default now();

-- Helpful constraints/indexes. These only fail safely when already present.
create unique index if not exists employee_payroll_profiles_user_id_uidx
  on public.employee_payroll_profiles(user_id);

create unique index if not exists employee_payroll_profiles_employee_id_uidx
  on public.employee_payroll_profiles(employee_id)
  where employee_id is not null;

-- ---------------------------------------------------------------------
-- 3. Payroll documents table.
-- ---------------------------------------------------------------------
create table if not exists public.employee_payroll_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  document_type text not null,
  document_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employee_payroll_documents
  add column if not exists user_id uuid;

alter table public.employee_payroll_documents
  add column if not exists employee_id uuid;

alter table public.employee_payroll_documents
  add column if not exists document_type text;

alter table public.employee_payroll_documents
  add column if not exists document_name text;

alter table public.employee_payroll_documents
  add column if not exists storage_path text;

alter table public.employee_payroll_documents
  add column if not exists created_at timestamptz default now();

alter table public.employee_payroll_documents
  add column if not exists updated_at timestamptz default now();

create unique index if not exists employee_payroll_documents_user_type_uidx
  on public.employee_payroll_documents(user_id, document_type);

create index if not exists employee_payroll_documents_employee_idx
  on public.employee_payroll_documents(employee_id);

-- ---------------------------------------------------------------------
-- 4. Row Level Security.
-- ---------------------------------------------------------------------
alter table public.employee_payroll_profiles enable row level security;
alter table public.employee_payroll_documents enable row level security;

drop policy if exists "MJIS payroll profile select" on public.employee_payroll_profiles;
create policy "MJIS payroll profile select"
on public.employee_payroll_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_mjis_admin_or_hr()
);

drop policy if exists "MJIS payroll profile insert" on public.employee_payroll_profiles;
create policy "MJIS payroll profile insert"
on public.employee_payroll_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_mjis_admin_or_hr()
);

drop policy if exists "MJIS payroll profile update" on public.employee_payroll_profiles;
create policy "MJIS payroll profile update"
on public.employee_payroll_profiles
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_mjis_admin_or_hr()
)
with check (
  user_id = auth.uid()
  or public.is_mjis_admin_or_hr()
);

drop policy if exists "MJIS payroll profile delete" on public.employee_payroll_profiles;
create policy "MJIS payroll profile delete"
on public.employee_payroll_profiles
for delete
to authenticated
using (
  public.is_mjis_admin_or_hr()
);

drop policy if exists "MJIS payroll documents select" on public.employee_payroll_documents;
create policy "MJIS payroll documents select"
on public.employee_payroll_documents
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_mjis_admin_or_hr()
);

drop policy if exists "MJIS payroll documents insert" on public.employee_payroll_documents;
create policy "MJIS payroll documents insert"
on public.employee_payroll_documents
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_mjis_admin_or_hr()
);

drop policy if exists "MJIS payroll documents update" on public.employee_payroll_documents;
create policy "MJIS payroll documents update"
on public.employee_payroll_documents
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_mjis_admin_or_hr()
)
with check (
  user_id = auth.uid()
  or public.is_mjis_admin_or_hr()
);

drop policy if exists "MJIS payroll documents delete" on public.employee_payroll_documents;
create policy "MJIS payroll documents delete"
on public.employee_payroll_documents
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_mjis_admin_or_hr()
);

grant select, insert, update, delete
on public.employee_payroll_profiles
to authenticated;

grant select, insert, update, delete
on public.employee_payroll_documents
to authenticated;

-- ---------------------------------------------------------------------
-- 5. Backfill one empty payroll profile for every existing portal user.
-- ---------------------------------------------------------------------
insert into public.employee_payroll_profiles (user_id)
select au.id
from auth.users au
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- 6. Link profiles for employees that already have user_id.
-- ---------------------------------------------------------------------
update public.employee_payroll_profiles p
set
  employee_id = e.id,
  updated_at = now()
from public.employees e
where e.user_id = p.user_id
  and (
    p.employee_id is distinct from e.id
  );

-- ---------------------------------------------------------------------
-- 7. Keep links synchronized for future employee create/update.
-- ---------------------------------------------------------------------
create or replace function public.sync_employee_payroll_profile_mjis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    insert into public.employee_payroll_profiles (
      user_id,
      employee_id
    )
    values (
      new.user_id,
      new.id
    )
    on conflict (user_id)
    do update set
      employee_id = excluded.employee_id,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists employees_sync_payroll_profile_mjis
on public.employees;

create trigger employees_sync_payroll_profile_mjis
after insert or update of user_id
on public.employees
for each row
execute function public.sync_employee_payroll_profile_mjis();

-- ---------------------------------------------------------------------
-- 8. Private Storage bucket.
-- ---------------------------------------------------------------------
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'employee-payroll-documents',
  'employee-payroll-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id)
do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 9. Private bucket object policies.
-- Path format:
--   <auth-user-id>/<document-type>/<filename>
-- ---------------------------------------------------------------------
drop policy if exists "MJIS payroll storage select" on storage.objects;
create policy "MJIS payroll storage select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_mjis_admin_or_hr()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "MJIS payroll storage insert" on storage.objects;
create policy "MJIS payroll storage insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_mjis_admin_or_hr()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "MJIS payroll storage update" on storage.objects;
create policy "MJIS payroll storage update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_mjis_admin_or_hr()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_mjis_admin_or_hr()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "MJIS payroll storage delete" on storage.objects;
create policy "MJIS payroll storage delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_mjis_admin_or_hr()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- ---------------------------------------------------------------------
-- 10. Updated-at triggers.
-- ---------------------------------------------------------------------
create or replace function public.touch_employee_payroll_profile_mjis()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employee_payroll_profiles_touch_updated_at
on public.employee_payroll_profiles;

create trigger employee_payroll_profiles_touch_updated_at
before update on public.employee_payroll_profiles
for each row
execute function public.touch_employee_payroll_profile_mjis();

create or replace function public.touch_employee_payroll_documents_mjis()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employee_payroll_documents_touch_updated_at
on public.employee_payroll_documents;

create trigger employee_payroll_documents_touch_updated_at
before update on public.employee_payroll_documents
for each row
execute function public.touch_employee_payroll_documents_mjis();

-- ---------------------------------------------------------------------
-- 11. Force PostgREST to see the new tables immediately.
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';

commit;

-- ---------------------------------------------------------------------
-- 12. Verification queries (safe to run after the transaction).
-- ---------------------------------------------------------------------

select
  'employee_payroll_profiles' as object_name,
  count(*) as row_count
from public.employee_payroll_profiles;

select
  'employee_payroll_documents' as object_name,
  count(*) as row_count
from public.employee_payroll_documents;

select
  id,
  name,
  public as is_public
from storage.buckets
where id = 'employee-payroll-documents';
