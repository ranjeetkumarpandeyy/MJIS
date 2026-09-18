create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  application_no text not null unique,
  full_name text not null,
  mobile text not null,
  email text,
  dob date,
  gender text,
  address text,
  district text,
  state text,
  trade text,
  position text,
  experience_years numeric,
  expected_salary numeric,
  availability text,
  previous_company text,
  skills text,
  message text,
  status text not null default 'new',
  assigned_to uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_enquiries (
  id uuid primary key default gen_random_uuid(),
  enquiry_no text not null unique,
  company_name text not null,
  contact_person text not null,
  mobile text not null,
  email text,
  project_name text,
  location text,
  industry text,
  service text,
  duration text,
  manpower_required integer,
  start_date date,
  budget numeric,
  details text,
  status text not null default 'new',
  assigned_to uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text,
  email text,
  subject text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.job_applications enable row level security;
alter table public.work_enquiries enable row level security;
alter table public.contact_messages enable row level security;

grant insert on public.job_applications to anon, authenticated;
grant insert on public.work_enquiries to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;

grant select, update on public.job_applications to authenticated;
grant select, update on public.work_enquiries to authenticated;
grant select on public.contact_messages to authenticated;

-- ============================================================
-- REMOVE OLD POLICIES IF THEY ALREADY EXIST
-- ============================================================

drop policy if exists "public_submit_job_application"
on public.job_applications;

drop policy if exists "public_submit_work_enquiry"
on public.work_enquiries;

drop policy if exists "public_submit_contact_message"
on public.contact_messages;

drop policy if exists "hr_admin_view_job_applications"
on public.job_applications;

drop policy if exists "hr_admin_update_job_applications"
on public.job_applications;

drop policy if exists "hr_admin_view_work_enquiries"
on public.work_enquiries;

drop policy if exists "hr_admin_update_work_enquiries"
on public.work_enquiries;

drop policy if exists "hr_admin_view_contact_messages"
on public.contact_messages;


-- ============================================================
-- PUBLIC JOB APPLICATION
-- ============================================================

create policy "public_submit_job_application"
on public.job_applications
for insert
to anon, authenticated
with check (
  length(trim(full_name)) >= 2
  and length(trim(mobile)) >= 7
);


-- ============================================================
-- PUBLIC WORK ENQUIRY
-- ============================================================

create policy "public_submit_work_enquiry"
on public.work_enquiries
for insert
to anon, authenticated
with check (
  length(trim(company_name)) >= 2
  and length(trim(contact_person)) >= 2
  and length(trim(mobile)) >= 7
);


-- ============================================================
-- PUBLIC CONTACT
-- ============================================================

create policy "public_submit_contact_message"
on public.contact_messages
for insert
to anon, authenticated
with check (
  length(trim(name)) >= 2
  and length(trim(message)) >= 2
);


-- ============================================================
-- HR VIEW JOB APPLICATIONS
-- ============================================================

create policy "hr_admin_view_job_applications"
on public.job_applications
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'hr')
  )
);


-- ============================================================
-- HR UPDATE JOB APPLICATIONS
-- ============================================================

create policy "hr_admin_update_job_applications"
on public.job_applications
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'hr')
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'hr')
  )
);


-- ============================================================
-- HR VIEW WORK ENQUIRIES
-- ============================================================

create policy "hr_admin_view_work_enquiries"
on public.work_enquiries
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'hr')
  )
);


-- ============================================================
-- HR UPDATE WORK ENQUIRIES
-- ============================================================

create policy "hr_admin_update_work_enquiries"
on public.work_enquiries
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'hr')
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'hr')
  )
);


-- ============================================================
-- HR VIEW CONTACT MESSAGES
-- ============================================================

create policy "hr_admin_view_contact_messages"
on public.contact_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'hr')
  )
);