import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Minus,
  ShieldCheck,
  FileCheck2,
} from "lucide-react";

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employee: {
    name: string;
    email: string;
    avatar?: string;
  };
  month: string;
  monthNum: number;
  year: number;
  basic: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "paid" | "pending" | "processing";
  paidAt?: string;
}

interface PayslipViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PayrollRecord | null;
}

interface PayrollIdentity {
  bank_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  pan_number: string | null;
  uan_number: string | null;
  esi_number: string | null;
  insurance_number: string | null;
  aadhaar_number: string | null;
}

const payrollDataClient = supabase as any;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);

const getStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          Paid
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20">
          Processed
        </Badge>
      );
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
};

export function PayslipViewDialog({
  open,
  onOpenChange,
  record,
}: PayslipViewDialogProps) {
  const { data: salaryStructure, isLoading } = useQuery({
    queryKey: ["salary-structure-view", record?.employeeId],
    queryFn: async () => {
      if (!record?.employeeId) return null;

      const { data, error } = await supabase
        .from("salary_structures")
        .select("*")
        .eq("employee_id", record.employeeId)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!record?.employeeId && open,
  });

  const { data: payrollIdentity } = useQuery({
    queryKey: [
      "payroll-identity-view",
      record?.employeeId,
    ],
    queryFn: async () => {
      if (!record?.employeeId) return null;

      const { data, error } = await payrollDataClient
        .from("employee_payroll_profiles")
        .select(
          "bank_name, bank_account_number, ifsc_code, pan_number, uan_number, esi_number, insurance_number, aadhaar_number"
        )
        .eq("employee_id", record.employeeId)
        .maybeSingle();

      if (error) throw error;
      return data as PayrollIdentity | null;
    },
    enabled: !!record?.employeeId && open,
  });

  const { data: lopDays = 0 } = useQuery({
    queryKey: [
      "lop-days-view",
      record?.employeeId,
      record?.monthNum,
      record?.year,
    ],
    queryFn: async () => {
      if (!record?.employeeId) return 0;

      const startDate = new Date(
        record.year,
        record.monthNum - 1,
        1
      );
      const endDate = new Date(
        record.year,
        record.monthNum,
        0
      );

      const { data, error } = await supabase
        .from("leave_requests")
        .select(
          "days_count, leave_type:leave_types!leave_requests_leave_type_id_fkey(is_paid)"
        )
        .eq("employee_id", record.employeeId)
        .eq("status", "approved")
        .gte(
          "start_date",
          startDate.toISOString().slice(0, 10)
        )
        .lte(
          "end_date",
          endDate.toISOString().slice(0, 10)
        );

      if (error) throw error;

      return (data ?? []).reduce((sum, item) => {
        const leaveType = item.leave_type as
          | { is_paid?: boolean | null }
          | null;

        return leaveType?.is_paid === false
          ? sum + Number(item.days_count ?? 0)
          : sum;
      }, 0);
    },
    enabled: !!record?.employeeId && open,
  });

  if (!record) return null;

  const getAllowanceBreakdown = () => {
    if (!salaryStructure) return [];

    const items: {
      label: string;
      amount: number;
    }[] = [];

    if (salaryStructure.hra) {
      items.push({
        label: "House Rent Allowance (HRA)",
        amount: Number(salaryStructure.hra),
      });
    }

    if (salaryStructure.transport_allowance) {
      items.push({
        label: "Transport Allowance",
        amount: Number(
          salaryStructure.transport_allowance
        ),
      });
    }

    if (salaryStructure.medical_allowance) {
      items.push({
        label: "Medical Allowance",
        amount: Number(
          salaryStructure.medical_allowance
        ),
      });
    }

    if (salaryStructure.other_allowances) {
      items.push({
        label: "Other Allowances",
        amount: Number(
          salaryStructure.other_allowances
        ),
      });
    }

    return items;
  };

  const getDeductionBreakdown = () => {
    if (!salaryStructure) return [];

    const items: {
      label: string;
      amount: number;
    }[] = [];

    if (salaryStructure.tax_deduction) {
      items.push({
        label: "Tax Deduction",
        amount: Number(salaryStructure.tax_deduction),
      });
    }

    if (salaryStructure.pf_deduction) {
      items.push({
        label: "PF Deduction",
        amount: Number(
          salaryStructure.pf_deduction
        ),
      });
    }

    return items;
  };

  const allowanceBreakdown = getAllowanceBreakdown();
  const deductionBreakdown =
    getDeductionBreakdown();
  const grossSalary =
    record.basic + record.allowances;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Payslip - {record.month}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Details */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="font-semibold mb-3">
              Employee Details
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">
                  Name:
                </span>
                <span className="ml-2 font-medium">
                  {record.employee.name}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  Employee Code:
                </span>
                <span className="ml-2 font-medium">
                  {record.employeeCode}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  Email:
                </span>
                <span className="ml-2 font-medium">
                  {record.employee.email}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  Pay Period:
                </span>
                <span className="ml-2 font-medium">
                  {record.month}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  LOP Days:
                </span>
                <span className="ml-2 font-medium">
                  {lopDays}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-muted-foreground">
                  Status:
                </span>
                <span className="ml-2">
                  {getStatusBadge(record.status)}
                </span>

                {record.paidAt && (
                  <span className="ml-2 text-muted-foreground text-xs">
                    ({record.paidAt})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Payroll / Statutory information */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">
                  Payroll & Statutory Information
                </h3>
                <p className="text-xs text-muted-foreground">
                  The same details are used in the employee salary slip.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["UAN Number", payrollIdentity?.uan_number],
                ["Bank Name", payrollIdentity?.bank_name],
                [
                  "Bank Account Number",
                  payrollIdentity?.bank_account_number,
                ],
                ["IFSC Code", payrollIdentity?.ifsc_code],
                ["PAN Number", payrollIdentity?.pan_number],
                ["ESI Number", payrollIdentity?.esi_number],
                [
                  "Insurance Number",
                  payrollIdentity?.insurance_number,
                ],
                [
                  "Aadhaar Number",
                  payrollIdentity?.aadhaar_number,
                ],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-md bg-muted/30 p-3"
                >
                  <div className="text-xs text-muted-foreground">
                    {label}
                  </div>
                  <div className="mt-1 font-medium">
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Earnings */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Plus className="h-4 w-4" />
                  <span className="font-semibold">
                    Earnings
                  </span>
                </div>

                <div className="space-y-2 rounded-lg border bg-background p-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Basic Salary
                    </span>
                    <span className="font-medium">
                      {formatCurrency(record.basic)}
                    </span>
                  </div>

                  {allowanceBreakdown.length > 0 ? (
                    allowanceBreakdown.map((item) => (
                      <div
                        key={item.label}
                        className="flex justify-between"
                      >
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="font-medium text-emerald-600">
                          +
                          {formatCurrency(
                            item.amount
                          )}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Allowances
                      </span>
                      <span className="font-medium text-emerald-600">
                        +
                        {formatCurrency(
                          record.allowances
                        )}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>Gross Salary</span>
                    <span>
                      {formatCurrency(
                        grossSalary
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                  <Minus className="h-4 w-4" />
                  <span className="font-semibold">
                    Deductions
                  </span>
                </div>

                <div className="space-y-2 rounded-lg border bg-background p-4">
                  {deductionBreakdown.length >
                  0 ? (
                    <>
                      {deductionBreakdown.map(
                        (item) => (
                          <div
                            key={item.label}
                            className="flex justify-between"
                          >
                            <span className="text-muted-foreground">
                              {item.label}
                            </span>

                            <span className="font-medium text-destructive">
                              -
                              {formatCurrency(
                                item.amount
                              )}
                            </span>
                          </div>
                        )
                      )}

                      <Separator />
                    </>
                  ) : null}

                  <div className="flex justify-between font-semibold">
                    <span>
                      Total Deductions
                    </span>
                    <span className="text-destructive">
                      -
                      {formatCurrency(
                        record.deductions
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">
                Net Salary
              </span>

              <span className="font-bold text-2xl text-primary">
                {formatCurrency(
                  record.netSalary
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <FileCheck2 className="h-4 w-4" />
            This is a computer-generated payslip view.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
