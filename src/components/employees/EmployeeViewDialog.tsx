import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck2, ShieldCheck, Eye } from "lucide-react";
import { Mail, Phone, Building2, Briefcase, Calendar, UserCheck, Crown, Hash } from "lucide-react";
import { Employee } from "./EmployeeTable";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdminOrHR } from "@/hooks/useUserRole";

interface EmployeeViewDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusStyles = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
  onboarding: "bg-primary/10 text-primary border-primary/20",
  offboarded: "bg-destructive/10 text-destructive border-destructive/20",
};

export function EmployeeViewDialog({ employee, open, onOpenChange }: EmployeeViewDialogProps) {
  const { isAdminOrHR } = useIsAdminOrHR();

  // Fetch extended employee details including manager and department head
  const { data: extendedDetails } = useQuery({
    queryKey: ["employee-extended-details", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          department_id,
          manager_id,
          manager:employees!employees_manager_id_fkey(first_name, last_name),
          department:departments!employees_department_id_fkey(
            name,
            manager_id,
            department_head:employees!departments_manager_id_fkey(first_name, last_name)
          )
        `)
        .eq("id", employee.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!employee?.id,
  });

  // ============================================================
  // ADMIN / HR ONLY PAYROLL + KYC DATA
  // ============================================================
  const { data: payrollIdentity } = useQuery({
    queryKey: ["employee-payroll-identity", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return null;

      const { data, error } = await (supabase as any)
        .from("employee_payroll_profiles")
        .select(
          "bank_name, bank_account_number, ifsc_code, pan_number, uan_number, esi_number, insurance_number, aadhaar_number"
        )
        .eq("employee_id", employee.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!employee?.id && isAdminOrHR,
  });

  const { data: payrollDocuments = [] } = useQuery({
    queryKey: ["employee-payroll-documents", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];

      const { data, error } = await (supabase as any)
        .from("employee_payroll_documents")
        .select(
          "id, document_type, document_name, storage_path, created_at"
        )
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!employee?.id && isAdminOrHR,
  });

  const openPayrollDocument = async (storagePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("employee-payroll-documents")
        .createSignedUrl(storagePath, 60 * 10);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (openError) {
      console.error("Payroll document open error:", openError);
    }
  };

  if (!employee) return null;

  const manager = extendedDetails?.manager;
  const managerName = manager 
    ? Array.isArray(manager) && manager.length > 0
      ? `${manager[0].first_name} ${manager[0].last_name}`
      : !Array.isArray(manager)
        ? `${(manager as { first_name: string; last_name: string }).first_name} ${(manager as { first_name: string; last_name: string }).last_name}`
        : null
    : null;

  const departmentHead = extendedDetails?.department?.department_head;
  const departmentHeadName = departmentHead 
    ? Array.isArray(departmentHead) && departmentHead.length > 0
      ? `${departmentHead[0].first_name} ${departmentHead[0].last_name}`
      : !Array.isArray(departmentHead)
        ? `${(departmentHead as { first_name: string; last_name: string }).first_name} ${(departmentHead as { first_name: string; last_name: string }).last_name}`
        : null
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatar} />
              <AvatarFallback className="text-lg">
                {employee.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">{employee.employeeCode}</p>
              <h3 className="text-lg font-semibold text-foreground">{employee.name}</h3>
              <Badge variant="outline" className={statusStyles[employee.status]}>
                {employee.status}
              </Badge>
            </div>
          </div>

          {/* ============================================================
              ADMIN / HR PAYROLL & KYC INFORMATION
              Full statutory details are visible only to authorised
              Admin / HR users. RLS protects the underlying rows too.
          ============================================================ */}
          {isAdminOrHR && (
            <>
              <Card>
                <CardContent className="space-y-5 pt-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Payroll & Statutory Information</h3>
                      <p className="text-xs text-muted-foreground">
                        UAN, Aadhaar, PAN, ESI, insurance and bank details for this employee.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["UAN Number", payrollIdentity?.uan_number],
                      ["Aadhaar Number", payrollIdentity?.aadhaar_number],
                      ["PAN Number", payrollIdentity?.pan_number],
                      ["ESI Number", payrollIdentity?.esi_number],
                      ["Insurance Number", payrollIdentity?.insurance_number],
                      ["Bank Name", payrollIdentity?.bank_name],
                      ["Bank Account Number", payrollIdentity?.bank_account_number],
                      ["IFSC Code", payrollIdentity?.ifsc_code],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-md bg-muted/30 p-3">
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="mt-1 break-all font-medium">{value || "—"}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Payroll / KYC Documents</h3>
                      <p className="text-xs text-muted-foreground">
                        Uploaded employee documents are available to authorised Admin / HR users.
                      </p>
                    </div>
                  </div>

                  {payrollDocuments.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      No payroll / KYC documents uploaded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payrollDocuments.map((document: {
                        id: string;
                        document_type: string;
                        document_name: string;
                        storage_path: string;
                        created_at: string;
                      }) => (
                        <div
                          key={document.id}
                          className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="font-medium">{document.document_type}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {document.document_name}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void openPayrollDocument(document.storage_path)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            Open Document
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Details */}
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center gap-3 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-muted-foreground">{employee.employeeCode}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{employee.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{employee.department}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{employee.designation}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Joined {employee.joinDate}</span>
              </div>
              {managerName && (
                <div className="flex items-center gap-3 text-sm">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Reports to {managerName}</span>
                </div>
              )}
              {departmentHeadName && (
                <div className="flex items-center gap-3 text-sm">
                  <Crown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Dept. Head: {departmentHeadName}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
