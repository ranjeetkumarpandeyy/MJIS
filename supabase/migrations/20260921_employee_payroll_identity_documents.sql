-- ================================================================
-- MJIS ADDITIVE PAYROLL / STATUTORY PROFILE + DOCUMENTS
-- ================================================================
-- This migration is additive only.
-- It does NOT drop, truncate, replace, or delete existing MJIS tables,
-- policies, salary structures, payroll records, or employee data.
--
-- Adds:
--   * employee_payroll_profiles
--   * employee_payroll_documents
--   * private Storage bucket for payroll/KYC documents
--   * own-user + admin/HR RLS
--   * automatic profile creation for newly created portal accounts
--   * automatic employee link sync when HR links a user to an employee
-- ================================================================

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

create index if not exists employee_payroll_profiles_employee_id_idx
  on public.employee_payroll_profiles(employee_id);

alter table public.employee_payroll_profiles
  enable row level security;

drop policy if exists "Users can view own payroll profile"
  on public.employee_payroll_profiles;

create policy "Users can view own payroll profile"
on public.employee_payroll_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin_or_hr(auth.uid())
);

drop policy if exists "Users can create own payroll profile"
  on public.employee_payroll_profiles;

create policy "Users can create own payroll profile"
on public.employee_payroll_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_admin_or_hr(auth.uid())
);

drop policy if exists "Users can update own payroll profile"
  on public.employee_payroll_profiles;

create policy "Users can update own payroll profile"
on public.employee_payroll_profiles
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin_or_hr(auth.uid())
)
with check (
  user_id = auth.uid()
  or public.is_admin_or_hr(auth.uid())
);

drop policy if exists "Admin HR can delete payroll profiles"
  on public.employee_payroll_profiles;

create policy "Admin HR can delete payroll profiles"
on public.employee_payroll_profiles
for delete
to authenticated
using (
  public.is_admin_or_hr(auth.uid())
);

-- ----------------------------------------------------------------
-- Documents table
-- ----------------------------------------------------------------

create table if not exists public.employee_payroll_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  document_type text not null,
  document_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, document_type)
);

create index if not exists employee_payroll_documents_employee_id_idx
  on public.employee_payroll_documents(employee_id);

alter table public.employee_payroll_documents
  enable row level security;

drop policy if exists "Users can view own payroll documents"
  on public.employee_payroll_documents;

create policy "Users can view own payroll documents"
on public.employee_payroll_documents
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin_or_hr(auth.uid())
);

drop policy if exists "Users can create own payroll documents"
  on public.employee_payroll_documents;

create policy "Users can create own payroll documents"
on public.employee_payroll_documents
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_admin_or_hr(auth.uid())
);

drop policy if exists "Users can update own payroll documents"
  on public.employee_payroll_documents;

create policy "Users can update own payroll documents"
on public.employee_payroll_documents
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin_or_hr(auth.uid())
)
with check (
  user_id = auth.uid()
  or public.is_admin_or_hr(auth.uid())
);

drop policy if exists "Users can delete own payroll documents"
  on public.employee_payroll_documents;

create policy "Users can delete own payroll documents"
on public.employee_payroll_documents
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin_or_hr(auth.uid())
);

-- ----------------------------------------------------------------
-- updated_at helpers
-- ----------------------------------------------------------------

create or replace function public.touch_employee_payroll_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employee_payroll_profiles_updated_at
  on public.employee_payroll_profiles;

create trigger employee_payroll_profiles_updated_at
before update on public.employee_payroll_profiles
for each row
execute function public.touch_employee_payroll_profile_updated_at();

create or replace function public.touch_employee_payroll_document_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employee_payroll_documents_updated_at
  on public.employee_payroll_documents;

create trigger employee_payroll_documents_updated_at
before update on public.employee_payroll_documents
for each row
execute function public.touch_employee_payroll_document_updated_at();

-- ----------------------------------------------------------------
-- Keep a payroll profile for every portal account.
-- This means a user who creates their own account can complete
-- payroll/statutory details before an employee row is linked.
-- ----------------------------------------------------------------

create or replace function public.create_employee_payroll_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.employee_payroll_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_create_employee_payroll_profile
  on auth.users;

create trigger on_auth_user_create_employee_payroll_profile
after insert on auth.users
for each row
execute function public.create_employee_payroll_profile_for_user();

insert into public.employee_payroll_profiles (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------
-- Automatically connect the payroll profile when HR creates/links
-- an employee record with user_id.
-- ----------------------------------------------------------------

create or replace function public.sync_employee_payroll_profile()
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

drop trigger if exists employees_sync_payroll_profile
  on public.employees;

create trigger employees_sync_payroll_profile
after insert or update of user_id on public.employees
for each row
execute function public.sync_employee_payroll_profile();

-- Backfill links for existing employees.
insert into public.employee_payroll_profiles (
  user_id,
  employee_id
)
select
  e.user_id,
  e.id
from public.employees e
where e.user_id is not null
on conflict (user_id)
do update set
  employee_id = excluded.employee_id,
  updated_at = now();

-- ----------------------------------------------------------------
-- Private Storage bucket
-- ----------------------------------------------------------------

insert into storage.buckets (id, name, public)
values (
  'employee-payroll-documents',
  'employee-payroll-documents',
  false
)
on conflict (id)
do update set public = false;

-- The first folder in each path is the auth user ID:
--   <user-id>/<document-type>/<filename>
--
-- Users can access only their own folder.
-- Admin/HR can access every folder.

drop policy if exists "Users can read own payroll documents"
  on storage.objects;

create policy "Users can read own payroll documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_admin_or_hr(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "Users can upload own payroll documents"
  on storage.objects;

create policy "Users can upload own payroll documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_admin_or_hr(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "Users can update own payroll documents"
  on storage.objects;

create policy "Users can update own payroll documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_admin_or_hr(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_admin_or_hr(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "Users can delete own payroll documents"
  on storage.objects;

create policy "Users can delete own payroll documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_admin_or_hr(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

notify pgrst, 'reload schema';
