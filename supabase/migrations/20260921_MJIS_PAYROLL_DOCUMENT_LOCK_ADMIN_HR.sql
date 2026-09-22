-- =====================================================================
-- MJIS PAYROLL/KYC DOCUMENT LOCK
-- Employee: Upload / Replace / Open
-- Employee: NO DELETE
-- Admin/HR: View / Replace / Delete
--
-- SAFE / ADDITIVE:
--   * Does not delete existing employee data.
--   * Removes broad employee DELETE policies.
--   * Recreates DELETE access for Admin/HR only.
--   * Keeps SELECT / INSERT / UPDATE access for employees on their own
--     payroll/KYC records and storage objects.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Payroll document table: employee DELETE is removed.
-- ---------------------------------------------------------------------
drop policy if exists "Users can delete own payroll documents"
  on public.employee_payroll_documents;

drop policy if exists "MJIS payroll documents delete"
  on public.employee_payroll_documents;

create policy "MJIS payroll documents delete"
on public.employee_payroll_documents
for delete
to authenticated
using (
  public.is_mjis_admin_or_hr()
);

-- ---------------------------------------------------------------------
-- 2. Payroll document Storage: employee DELETE is removed.
--    Employees can still UPDATE existing objects for replacement.
-- ---------------------------------------------------------------------
drop policy if exists "Users can delete own payroll documents"
  on storage.objects;

drop policy if exists "MJIS payroll storage delete"
  on storage.objects;

create policy "MJIS payroll storage delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'employee-payroll-documents'
  and public.is_mjis_admin_or_hr()
);

-- ---------------------------------------------------------------------
-- 3. Keep explicit UPDATE permission for employee replacement.
--    This policy is compatible with upload(..., { upsert: true }).
-- ---------------------------------------------------------------------
drop policy if exists "Users can update own payroll documents"
  on storage.objects;

drop policy if exists "MJIS payroll storage update"
  on storage.objects;

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

-- ---------------------------------------------------------------------
-- 4. Keep SELECT and INSERT explicit for the private bucket.
-- ---------------------------------------------------------------------
drop policy if exists "Users can read own payroll documents"
  on storage.objects;

drop policy if exists "MJIS payroll storage select"
  on storage.objects;

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

drop policy if exists "Users can upload own payroll documents"
  on storage.objects;

drop policy if exists "MJIS payroll storage insert"
  on storage.objects;

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

notify pgrst, 'reload schema';

commit;

-- ---------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------
select
  id,
  name,
  public as is_public
from storage.buckets
where id = 'employee-payroll-documents';

select
  polname,
  polcmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'employee_payroll_documents'
order by polname;

select
  policyname,
  cmd,
  qual
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'MJIS payroll storage select',
    'MJIS payroll storage insert',
    'MJIS payroll storage update',
    'MJIS payroll storage delete'
  )
order by policyname;
