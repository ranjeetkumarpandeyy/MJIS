-- MJIS TRUSTED COMPANIES REPAIR
-- Creates the missing table/function/storage/policies used by the
-- Admin/HR Website Media page and public trusted-company carousel.

create or replace function public.is_mjis_admin_or_hr()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'hr')
  );
$$;

grant execute on function public.is_mjis_admin_or_hr() to authenticated;

create table if not exists public.site_trusted_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  logo_path text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_trusted_companies_name_unique unique (name)
);

create index if not exists site_trusted_companies_order_idx
  on public.site_trusted_companies (display_order, created_at);

alter table public.site_trusted_companies enable row level security;

drop policy if exists "Public can view active trusted companies"
  on public.site_trusted_companies;
create policy "Public can view active trusted companies"
on public.site_trusted_companies
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admin HR insert trusted companies"
  on public.site_trusted_companies;
create policy "Admin HR insert trusted companies"
on public.site_trusted_companies
for insert
to authenticated
with check (public.is_mjis_admin_or_hr());

drop policy if exists "Admin HR update trusted companies"
  on public.site_trusted_companies;
create policy "Admin HR update trusted companies"
on public.site_trusted_companies
for update
to authenticated
using (public.is_mjis_admin_or_hr())
with check (public.is_mjis_admin_or_hr());

drop policy if exists "Admin HR delete trusted companies"
  on public.site_trusted_companies;
create policy "Admin HR delete trusted companies"
on public.site_trusted_companies
for delete
to authenticated
using (public.is_mjis_admin_or_hr());

insert into public.site_trusted_companies (name, display_order, is_active)
values
  ('NTPC', 10, true),
  ('KIIT Auditorium', 20, true),
  ('TATA STEEL', 30, true),
  ('KPA', 40, true)
on conflict (name) do update
set
  display_order = excluded.display_order,
  is_active = true;

insert into storage.buckets (id, name, public)
values (
  'mjis-trusted-companies',
  'mjis-trusted-companies',
  true
)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read MJIS trusted companies"
  on storage.objects;
create policy "Public read MJIS trusted companies"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'mjis-trusted-companies');

drop policy if exists "Admin HR upload MJIS trusted companies"
  on storage.objects;
create policy "Admin HR upload MJIS trusted companies"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mjis-trusted-companies'
  and public.is_mjis_admin_or_hr()
);

drop policy if exists "Admin HR update MJIS trusted companies"
  on storage.objects;
create policy "Admin HR update MJIS trusted companies"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'mjis-trusted-companies'
  and public.is_mjis_admin_or_hr()
)
with check (
  bucket_id = 'mjis-trusted-companies'
  and public.is_mjis_admin_or_hr()
);

drop policy if exists "Admin HR delete MJIS trusted companies"
  on storage.objects;
create policy "Admin HR delete MJIS trusted companies"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mjis-trusted-companies'
  and public.is_mjis_admin_or_hr()
);

create or replace function public.touch_site_trusted_companies_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_trusted_companies_updated_at
  on public.site_trusted_companies;

create trigger site_trusted_companies_updated_at
before update on public.site_trusted_companies
for each row
execute function public.touch_site_trusted_companies_updated_at();

-- Tell PostgREST to reload its schema cache immediately.
notify pgrst, 'reload schema';
