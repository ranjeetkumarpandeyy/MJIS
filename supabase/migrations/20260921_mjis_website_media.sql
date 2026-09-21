-- MAA JANKI INDUSTRIAL SERVICES
-- Website service-photo + completed-project media support

create table if not exists public.site_service_media (
  service_key text primary key,
  service_name text not null,
  image_url text not null,
  image_path text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_projects (
  id uuid primary key,
  title text not null,
  location text,
  completion_date date,
  description text,
  photo_url text,
  photo_path text,
  certificate_url text,
  certificate_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists site_projects_completion_date_idx
  on public.site_projects (completion_date desc);

alter table public.site_service_media enable row level security;
alter table public.site_projects enable row level security;

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

-- Public website visitors can view published website media.
drop policy if exists "Public can view service media" on public.site_service_media;
create policy "Public can view service media"
on public.site_service_media
for select
to anon, authenticated
using (true);

-- Only Admin / HR can manage service photos.
drop policy if exists "Admin HR insert service media" on public.site_service_media;
create policy "Admin HR insert service media"
on public.site_service_media
for insert
to authenticated
with check (public.is_mjis_admin_or_hr());

drop policy if exists "Admin HR update service media" on public.site_service_media;
create policy "Admin HR update service media"
on public.site_service_media
for update
to authenticated
using (public.is_mjis_admin_or_hr())
with check (public.is_mjis_admin_or_hr());

drop policy if exists "Admin HR delete service media" on public.site_service_media;
create policy "Admin HR delete service media"
on public.site_service_media
for delete
to authenticated
using (public.is_mjis_admin_or_hr());

-- Public website visitors can view completed projects.
drop policy if exists "Public can view completed projects" on public.site_projects;
create policy "Public can view completed projects"
on public.site_projects
for select
to anon, authenticated
using (true);

-- Only Admin / HR can create/update/delete completed projects.
drop policy if exists "Admin HR insert completed projects" on public.site_projects;
create policy "Admin HR insert completed projects"
on public.site_projects
for insert
to authenticated
with check (public.is_mjis_admin_or_hr());

drop policy if exists "Admin HR update completed projects" on public.site_projects;
create policy "Admin HR update completed projects"
on public.site_projects
for update
to authenticated
using (public.is_mjis_admin_or_hr())
with check (public.is_mjis_admin_or_hr());

drop policy if exists "Admin HR delete completed projects" on public.site_projects;
create policy "Admin HR delete completed projects"
on public.site_projects
for delete
to authenticated
using (public.is_mjis_admin_or_hr());

-- Public buckets so published site photos/certificates can be viewed without login.
insert into storage.buckets (id, name, public)
values
  ('mjis-service-media', 'mjis-service-media', true),
  ('mjis-project-media', 'mjis-project-media', true)
on conflict (id) do update set public = excluded.public;

-- Public read access for published website media.
drop policy if exists "Public read MJIS service media" on storage.objects;
create policy "Public read MJIS service media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'mjis-service-media');

drop policy if exists "Public read MJIS project media" on storage.objects;
create policy "Public read MJIS project media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'mjis-project-media');

-- Admin / HR upload access.
drop policy if exists "Admin HR upload MJIS service media" on storage.objects;
create policy "Admin HR upload MJIS service media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mjis-service-media'
  and public.is_mjis_admin_or_hr()
);

drop policy if exists "Admin HR update MJIS service media" on storage.objects;
create policy "Admin HR update MJIS service media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'mjis-service-media'
  and public.is_mjis_admin_or_hr()
)
with check (
  bucket_id = 'mjis-service-media'
  and public.is_mjis_admin_or_hr()
);

drop policy if exists "Admin HR delete MJIS service media" on storage.objects;
create policy "Admin HR delete MJIS service media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mjis-service-media'
  and public.is_mjis_admin_or_hr()
);

drop policy if exists "Admin HR upload MJIS project media" on storage.objects;
create policy "Admin HR upload MJIS project media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mjis-project-media'
  and public.is_mjis_admin_or_hr()
);

drop policy if exists "Admin HR update MJIS project media" on storage.objects;
create policy "Admin HR update MJIS project media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'mjis-project-media'
  and public.is_mjis_admin_or_hr()
)
with check (
  bucket_id = 'mjis-project-media'
  and public.is_mjis_admin_or_hr()
);

drop policy if exists "Admin HR delete MJIS project media" on storage.objects;
create policy "Admin HR delete MJIS project media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mjis-project-media'
  and public.is_mjis_admin_or_hr()
);
