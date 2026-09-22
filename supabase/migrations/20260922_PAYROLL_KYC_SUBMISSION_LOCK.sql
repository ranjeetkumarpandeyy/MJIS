-- =====================================================================
-- MJIS PAYROLL / KYC EMPLOYEE SUBMISSION LOCK
-- =====================================================================
-- Employee workflow:
--   1. Employee may save payroll/KYC information as a draft.
--   2. Employee may upload/replace documents while the record is a draft.
--   3. Application sets employee_payroll_profiles.submitted_at when the
--      employee submits the completed information to HR/Admin.
--   4. After submitted_at is set, employees can only SELECT/view their
--      payroll/KYC data. HR/Admin retain full management access.
--
-- IMPORTANT: The frontend should hide/disable Save, Upload and Replace
-- controls after submitted_at is non-null. These RLS policies are the
-- security boundary and prevent direct Supabase API changes as well.
-- =====================================================================

begin;

alter table public.employee_payroll_profiles
  add column if not exists submitted_at timestamptz;

-- ---------------------------------------------------------------------
-- Payroll profile: employees can update only before submission.
-- HR/Admin can update at any time.
-- ---------------------------------------------------------------------
drop policy if exists "MJIS payroll profile update" on public.employee_payroll_profiles;
create policy "MJIS payroll profile update"
on public.employee_payroll_profiles
for update
to authenticated
using (
  public.is_mjis_admin_or_hr()
  or (
    user_id = auth.uid()
    and submitted_at is null
  )
)
with check (
  public.is_mjis_admin_or_hr()
  or user_id = auth.uid()
);

-- Employees may create their initial payroll profile, but once a profile
-- exists and has been submitted they cannot create/replace it through an
-- alternate insert path. HR/Admin remain unrestricted.
drop policy if exists "MJIS payroll profile insert" on public.employee_payroll_profiles;
create policy "MJIS payroll profile insert"
on public.employee_payroll_profiles
for insert
to authenticated
with check (
  public.is_mjis_admin_or_hr()
  or user_id = auth.uid()
);

-- ---------------------------------------------------------------------
-- Payroll documents: employees can manage documents only before
-- payroll/KYC submission. HR/Admin can manage them at any time.
-- ---------------------------------------------------------------------
drop policy if exists "MJIS payroll documents insert" on public.employee_payroll_documents;
create policy "MJIS payroll documents insert"
on public.employee_payroll_documents
for insert
to authenticated
with check (
  public.is_mjis_admin_or_hr()
  or (
    user_id = auth.uid()
    and not exists (
      select 1
      from public.employee_payroll_profiles p
      where p.user_id = auth.uid()
        and p.submitted_at is not null
    )
  )
);

drop policy if exists "MJIS payroll documents update" on public.employee_payroll_documents;
create policy "MJIS payroll documents update"
on public.employee_payroll_documents
for update
to authenticated
using (
  public.is_mjis_admin_or_hr()
  or (
    user_id = auth.uid()
    and not exists (
      select 1
      from public.employee_payroll_profiles p
      where p.user_id = auth.uid()
        and p.submitted_at is not null
    )
  )
)
with check (
  public.is_mjis_admin_or_hr()
  or user_id = auth.uid()
);

drop policy if exists "MJIS payroll documents delete" on public.employee_payroll_documents;
create policy "MJIS payroll documents delete"
on public.employee_payroll_documents
for delete
to authenticated
using (
  public.is_mjis_admin_or_hr()
  or (
    user_id = auth.uid()
    and not exists (
      select 1
      from public.employee_payroll_profiles p
      where p.user_id = auth.uid()
        and p.submitted_at is not null
    )
  )
);

-- ---------------------------------------------------------------------
-- Storage: same submission lock for direct object operations.
-- ---------------------------------------------------------------------
drop policy if exists "MJIS payroll storage insert" on storage.objects;
create policy "MJIS payroll storage insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'employee-payroll-documents'
  and (
    public.is_mjis_admin_or_hr()
    or (
      (storage.foldername(name))[1] = auth.uid()::text
      and not exists (
        select 1
        from public.employee_payroll_profiles p
        where p.user_id = auth.uid()
          and p.submitted_at is not null
      )
    )
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
    or (
      (storage.foldername(name))[1] = auth.uid()::text
      and not exists (
        select 1
        from public.employee_payroll_profiles p
        where p.user_id = auth.uid()
          and p.submitted_at is not null
      )
    )
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
    or (
      (storage.foldername(name))[1] = auth.uid()::text
      and not exists (
        select 1
        from public.employee_payroll_profiles p
        where p.user_id = auth.uid()
          and p.submitted_at is not null
      )
    )
  )
);

notify pgrst, 'reload schema';

commit;
