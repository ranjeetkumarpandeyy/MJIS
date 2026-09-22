-- =====================================================================
-- MJIS PROFILE PICTURE RLS FINAL REPAIR
-- =====================================================================
-- Run this entire script once in Supabase SQL Editor.
--
-- Fixes the employee upload error:
--   new row violates row-level security policy
--
-- Employee profile picture path:
--   <auth-user-id>/profile
--
-- Employee:
--   INSERT / UPDATE / SELECT own profile picture
--   DELETE is not allowed
--
-- Admin / HR:
--   SELECT / INSERT / UPDATE / DELETE
--
-- The application updates profiles.avatar_url.
-- The trigger below copies that URL into employees.avatar_url, so the
-- employee does not need direct UPDATE permission on employees merely
-- to change a profile photo.
-- =====================================================================

begin;

-- 1. Ensure the bucket exists.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'employee-profile-pictures',
  'employee-profile-pictures',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id)
do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Recreate deterministic policies for the exact <uid>/profile object.
drop policy if exists "MJIS profile pictures select" on storage.objects;
drop policy if exists "MJIS profile pictures insert" on storage.objects;
drop policy if exists "MJIS profile pictures update" on storage.objects;
drop policy if exists "MJIS profile pictures delete" on storage.objects;

-- Storage upload returns object metadata, so matching SELECT access is
-- required as well as INSERT access.
create policy "MJIS profile pictures select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'employee-profile-pictures'
  and (
    name = auth.uid()::text || '/profile'
    or public.is_mjis_admin_or_hr()
  )
);

create policy "MJIS profile pictures insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'employee-profile-pictures'
  and (
    name = auth.uid()::text || '/profile'
    or public.is_mjis_admin_or_hr()
  )
);

create policy "MJIS profile pictures update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'employee-profile-pictures'
  and (
    name = auth.uid()::text || '/profile'
    or public.is_mjis_admin_or_hr()
  )
)
with check (
  bucket_id = 'employee-profile-pictures'
  and (
    name = auth.uid()::text || '/profile'
    or public.is_mjis_admin_or_hr()
  )
);

-- Employee cannot delete their profile photo. Admin/HR can.
create policy "MJIS profile pictures delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'employee-profile-pictures'
  and public.is_mjis_admin_or_hr()
);

-- 3. Make profile update permission explicit for the authenticated owner
-- and Admin/HR.
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "MJIS users can update own profile" on public.profiles;

create policy "MJIS users can update own profile"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_mjis_admin_or_hr()
)
with check (
  id = auth.uid()
  or public.is_mjis_admin_or_hr()
);

-- 4. Sync profiles.avatar_url -> employees.avatar_url server-side.
create or replace function public.sync_employee_avatar_from_profile_mjis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.avatar_url is distinct from old.avatar_url then
    update public.employees
    set
      avatar_url = new.avatar_url,
      updated_at = now()
    where user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_sync_employee_avatar_mjis
on public.profiles;

create trigger profiles_sync_employee_avatar_mjis
after update of avatar_url
on public.profiles
for each row
execute function public.sync_employee_avatar_from_profile_mjis();

notify pgrst, 'reload schema';

commit;

-- 5. Verify the bucket and policies.
select
  id,
  name,
  public as is_public,
  file_size_limit
from storage.buckets
where id = 'employee-profile-pictures';

select
  policyname,
  cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'MJIS profile pictures select',
    'MJIS profile pictures insert',
    'MJIS profile pictures update',
    'MJIS profile pictures delete'
  )
order by policyname;

select
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and policyname = 'MJIS users can update own profile';
