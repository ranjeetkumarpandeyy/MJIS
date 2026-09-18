-- ============================================================
-- EMPLOYEE SELF-SERVICE SALARY SLIPS
-- ============================================================

grant select
on public.payroll_records
to authenticated;


-- ============================================================
-- EMPLOYEE CAN SEE ONLY THEIR OWN PROCESSED/PAID PAYROLL
-- ============================================================

drop policy if exists "employees_view_own_salary_slips"
on public.payroll_records;

create policy "employees_view_own_salary_slips"
on public.payroll_records

for select

to authenticated

using (
  status in ('processed', 'paid')
  and exists (
    select 1
    from public.employees e
    where e.id = payroll_records.employee_id
      and e.user_id = (select auth.uid())
  )
);