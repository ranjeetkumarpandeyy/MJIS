import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  FileText,
  Wallet,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Printer,
  FileCheck2,
  Upload,
  Eye,
  Trash2,
  ShieldCheck,
  Save,
} from "lucide-react";
import { downloadPayslip } from "@/lib/payslipPdfGenerator";
import { fetchImageAsDataUrl } from "@/lib/pdfTheme";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface PayslipViewerProps {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
}

interface SalaryStructure {
  basic_salary: number;
  hra: number | null;
  transport_allowance: number | null;
  medical_allowance: number | null;
  other_allowances: number | null;
  tax_deduction: number | null;
  pf_deduction: number | null;
}

interface PayrollIdentity {
  user_id: string;
  employee_id: string | null;
  bank_name: string;
  bank_account_number: string;
  ifsc_code: string;
  pan_number: string;
  uan_number: string;
  esi_number: string;
  insurance_number: string;
  aadhaar_number: string;
}

interface PayrollDocument {
  id: string;
  user_id: string;
  employee_id: string | null;
  document_type: string;
  document_name: string;
  storage_path: string;
  created_at: string;
}

const payrollDataClient = supabase as any;

const REQUIRED_PAYROLL_DOCUMENTS = [
  { type: "Aadhaar Card", hint: "Aadhaar / identity proof" },
  { type: "PAN Card", hint: "PAN card copy" },
  { type: "Bank Proof", hint: "Cancelled cheque / bank passbook / bank proof" },
  { type: "Insurance Document", hint: "Insurance / ESIC / policy document" },
  { type: "UAN Document", hint: "UAN card / EPFO document (if available)" },
  { type: "ESI Document", hint: "ESI card / ESI document (if available)" },
];

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

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
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          Paid
        </Badge>
      );
    case "processed":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          Processed
        </Badge>
      );
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
};

const documentTypeSafe = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export function PayslipViewer({
  employeeId,
  employeeName,
  employeeCode,
}: PayslipViewerProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(
    String(currentDate.getFullYear())
  );
  const [expandedRecord, setExpandedRecord] =
    useState<string | null>(null);
  const { data: branding } = useCompanyBranding();

  const {
    data: payrollRecords,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["my-payslips", employeeId, selectedYear],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from("payroll_records")
        .select(`
          id,
          employee_id,
          month,
          year,
          basic_salary,
          total_allowances,
          total_deductions,
          net_salary,
          status,
          paid_at
        `)
        .eq("employee_id", employeeId)
        .eq("year", Number(selectedYear))
        .order("month", { ascending: false });

      if (queryError) throw queryError;
      return data || [];
    },
    enabled: !!employeeId,
  });

  const { data: salaryStructure } = useQuery({
    queryKey: ["my-salary-structure", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_structures")
        .select("*")
        .eq("employee_id", employeeId)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SalaryStructure | null;
    },
    enabled: !!employeeId,
  });

  const { data: employeeInfo } = useQuery({
    queryKey: ["my-employee-info", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(
          "hire_date, designation, email, user_id, department:departments!employees_department_id_fkey(name)"
        )
        .eq("id", employeeId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });


  const { data: payrollIdentity, refetch: refetchPayrollIdentity } = useQuery({
    queryKey: ["my-payroll-identity", employeeId],
    queryFn: async () => {
      const { data, error: queryError } = await payrollDataClient
        .from("employee_payroll_profiles")
        .select(
          "user_id, employee_id, bank_name, bank_account_number, ifsc_code, pan_number, uan_number, esi_number, insurance_number, aadhaar_number"
        )
        .eq("employee_id", employeeId)
        .maybeSingle();

      if (queryError) throw queryError;

      return (data as PayrollIdentity | null) ?? null;
    },
    enabled: !!employeeId,
  });

  const { data: payrollDocuments = [], refetch: refetchPayrollDocuments } = useQuery({
    queryKey: ["my-payroll-documents", employeeId],
    queryFn: async () => {
      const { data, error: queryError } = await payrollDataClient
        .from("employee_payroll_documents")
        .select(
          "id, user_id, employee_id, document_type, document_name, storage_path, created_at"
        )
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      return (data ?? []) as PayrollDocument[];
    },
    enabled: !!employeeId,
  });

  const [payrollIdentityForm, setPayrollIdentityForm] =
    useState<Omit<PayrollIdentity, "user_id" | "employee_id">>({
      bank_name: "",
      bank_account_number: "",
      ifsc_code: "",
      pan_number: "",
      uan_number: "",
      esi_number: "",
      insurance_number: "",
      aadhaar_number: "",
    });

  const [savingPayrollIdentity, setSavingPayrollIdentity] =
    useState(false);
  const [payrollIdentityMessage, setPayrollIdentityMessage] =
    useState("");
  const [uploadingPayrollDocument, setUploadingPayrollDocument] =
    useState<string | null>(null);
  const [payrollDocumentMessage, setPayrollDocumentMessage] =
    useState("");

  useEffect(() => {
    setPayrollIdentityForm({
      bank_name: payrollIdentity?.bank_name ?? "",
      bank_account_number: payrollIdentity?.bank_account_number ?? "",
      ifsc_code: payrollIdentity?.ifsc_code ?? "",
      pan_number: payrollIdentity?.pan_number ?? "",
      uan_number: payrollIdentity?.uan_number ?? "",
      esi_number: payrollIdentity?.esi_number ?? "",
      insurance_number: payrollIdentity?.insurance_number ?? "",
      aadhaar_number: payrollIdentity?.aadhaar_number ?? "",
    });
  }, [payrollIdentity]);

  const savePayrollIdentity = async () => {
    if (!employeeId || !employeeInfo?.user_id) {
      setPayrollIdentityMessage(
        "Your employee record is not linked to your portal account yet."
      );
      return;
    }

    setSavingPayrollIdentity(true);
    setPayrollIdentityMessage("");

    try {
      const { error: saveError } = await payrollDataClient
        .from("employee_payroll_profiles")
        .upsert(
          {
            user_id: employeeInfo.user_id,
            employee_id: employeeId,
            ...payrollIdentityForm,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (saveError) throw saveError;

      await refetchPayrollIdentity();

      setPayrollIdentityMessage(
        "Payroll and statutory details saved successfully."
      );
    } catch (saveError) {
      console.error("Payroll identity save error:", saveError);
      setPayrollIdentityMessage(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save payroll details."
      );
    } finally {
      setSavingPayrollIdentity(false);
    }
  };

  const payrollDocumentSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handlePayrollDocumentUpload = async (
    documentType: string,
    file: File
  ) => {
    if (!employeeInfo?.user_id || !employeeId) {
      setPayrollDocumentMessage(
        "Your employee record is not linked to your portal account yet."
      );
      return;
    }

    setUploadingPayrollDocument(documentType);
    setPayrollDocumentMessage("");

    try {
      const previous = payrollDocuments.find(
        (document) => document.document_type === documentType
      );

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const storagePath = `${employeeInfo.user_id}/${payrollDocumentSlug(
        documentType
      )}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("employee-payroll-documents")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { error: documentError } = await payrollDataClient
        .from("employee_payroll_documents")
        .upsert(
          {
            user_id: employeeInfo.user_id,
            employee_id: employeeId,
            document_type: documentType,
            document_name: file.name,
            storage_path: storagePath,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,document_type" }
        );

      if (documentError) {
        await supabase.storage
          .from("employee-payroll-documents")
          .remove([storagePath]);
        throw documentError;
      }

      if (previous?.storage_path) {
        await supabase.storage
          .from("employee-payroll-documents")
          .remove([previous.storage_path]);
      }

      await refetchPayrollDocuments();
      setPayrollDocumentMessage(`${documentType} uploaded successfully.`);
    } catch (uploadError) {
      console.error("Payroll document upload error:", uploadError);
      setPayrollDocumentMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload document."
      );
    } finally {
      setUploadingPayrollDocument(null);
    }
  };

  const openPayrollDocument = async (document: PayrollDocument) => {
    try {
      const { data, error: signedUrlError } = await supabase.storage
        .from("employee-payroll-documents")
        .createSignedUrl(document.storage_path, 60 * 10);

      if (signedUrlError) throw signedUrlError;

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (openError) {
      console.error("Payroll document open error:", openError);
      setPayrollDocumentMessage(
        openError instanceof Error
          ? openError.message
          : "Unable to open document."
      );
    }
  };

  const deletePayrollDocument = async (document: PayrollDocument) => {
    const confirmed = window.confirm(
      `Delete ${document.document_type}?`
    );

    if (!confirmed) return;

    try {
      const { error: deleteError } = await payrollDataClient
        .from("employee_payroll_documents")
        .delete()
        .eq("id", document.id);

      if (deleteError) throw deleteError;

      await supabase.storage
        .from("employee-payroll-documents")
        .remove([document.storage_path]);

      await refetchPayrollDocuments();
      setPayrollDocumentMessage(
        `${document.document_type} deleted successfully.`
      );
    } catch (deleteError) {
      console.error("Payroll document delete error:", deleteError);
      setPayrollDocumentMessage(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete document."
      );
    }
  };

  const getLopDaysForRecord = async (
    record: NonNullable<typeof payrollRecords>[number]
  ) => {
    const periodStart = startOfMonth(
      new Date(record.year, record.month - 1)
    );
    const periodEnd = endOfMonth(periodStart);

    const { data: unpaidLeaves, error: lopError } = await supabase
      .from("leave_requests")
      .select(
        "days_count, leave_type:leave_types!leave_requests_leave_type_id_fkey(is_paid)"
      )
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .gte("start_date", format(periodStart, "yyyy-MM-dd"))
      .lte("end_date", format(periodEnd, "yyyy-MM-dd"));

    if (lopError) {
      console.warn("LOP calculation failed:", lopError);
      return 0;
    }

    return (unpaidLeaves ?? []).reduce((sum, item) => {
      const leaveType = item.leave_type as
        | { is_paid?: boolean | null }
        | null;

      return leaveType?.is_paid === false
        ? sum + Number(item.days_count ?? 0)
        : sum;
    }, 0);
  };

  const getAllowanceBreakdown = () => {
    if (!salaryStructure) return [];

    const items: { label: string; amount: number }[] = [];

    if (salaryStructure.hra) {
      items.push({
        label: "House Rent Allowance (HRA)",
        amount: Number(salaryStructure.hra),
      });
    }

    if (salaryStructure.transport_allowance) {
      items.push({
        label: "Transport Allowance",
        amount: Number(salaryStructure.transport_allowance),
      });
    }

    if (salaryStructure.medical_allowance) {
      items.push({
        label: "Medical Allowance",
        amount: Number(salaryStructure.medical_allowance),
      });
    }

    if (salaryStructure.other_allowances) {
      items.push({
        label: "Other Allowances",
        amount: Number(salaryStructure.other_allowances),
      });
    }

    return items;
  };

  const getDeductionBreakdown = () => {
    if (!salaryStructure) return [];

    const items: { label: string; amount: number }[] = [];

    if (salaryStructure.tax_deduction) {
      items.push({
        label: "Tax Deduction",
        amount: Number(salaryStructure.tax_deduction),
      });
    }

    if (salaryStructure.pf_deduction) {
      items.push({
        label: "PF Deduction",
        amount: Number(salaryStructure.pf_deduction),
      });
    }

    return items;
  };

  const handleDownloadPayslip = async (record: NonNullable<typeof payrollRecords>[number]) => {
    const monthName =
      MONTHS.find((m) => m.value === String(record.month))?.label ||
      "";

    const logoDataUrl = await fetchImageAsDataUrl(
      branding?.logoUrl
    );

    const periodStart = startOfMonth(
      new Date(record.year, record.month - 1)
    );
    const periodEnd = endOfMonth(periodStart);

    const { count: workedDays } = await supabase
      .from("attendance_records")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("employee_id", employeeId)
      .eq("status", "present")
      .gte("date", format(periodStart, "yyyy-MM-dd"))
      .lte("date", format(periodEnd, "yyyy-MM-dd"));

    const lopDays = await getLopDaysForRecord(record);

    downloadPayslip(
      {
        employeeName,
        employeeCode,
        employeeEmail: employeeInfo?.email || "",
        monthName,
        year: record.year,
        status: record.status,
        paidAt: record.paid_at
          ? new Date(record.paid_at).toLocaleDateString()
          : undefined,
        basicSalary: Number(record.basic_salary),
        allowances: Number(record.total_allowances) || 0,
        deductions: Number(record.total_deductions) || 0,
        netSalary: Number(record.net_salary),
        companyName: branding?.companyName || undefined,
        companyAddress:
          branding?.companyAddress || undefined,
        logoDataUrl,
        dateOfJoining: employeeInfo?.hire_date
          ? format(
              new Date(employeeInfo.hire_date),
              "dd MMM yyyy"
            )
          : undefined,
        designation:
          employeeInfo?.designation ?? undefined,
        department:
          employeeInfo?.department?.name ?? undefined,
        workedDays: workedDays ?? undefined,
        lopDays,
        bankName: payrollIdentity?.bank_name || undefined,
        bankAccountNumber:
          payrollIdentity?.bank_account_number || undefined,
        ifscCode: payrollIdentity?.ifsc_code || undefined,
        panNumber: payrollIdentity?.pan_number || undefined,
        uanNumber: payrollIdentity?.uan_number || undefined,
        esiNumber: payrollIdentity?.esi_number || undefined,
        insuranceNumber:
          payrollIdentity?.insurance_number || undefined,
        aadhaarNumber:
          payrollIdentity?.aadhaar_number || undefined,
        salaryBreakdown: salaryStructure
          ? {
              hra: salaryStructure.hra ?? undefined,
              transport_allowance:
                salaryStructure.transport_allowance ??
                undefined,
              medical_allowance:
                salaryStructure.medical_allowance ??
                undefined,
              other_allowances:
                salaryStructure.other_allowances ??
                undefined,
              tax_deduction:
                salaryStructure.tax_deduction ??
                undefined,
              pf_deduction:
                salaryStructure.pf_deduction ??
                undefined,
            }
          : undefined,
      },
      `Payslip_${employeeCode}_${monthName}_${record.year}.pdf`
    );
  };

  const handlePrintPayslip = async (
    record: NonNullable<typeof payrollRecords>[number]
  ) => {
    const monthName =
      MONTHS.find((m) => m.value === String(record.month))?.label ||
      "";

    const periodStart = startOfMonth(
      new Date(record.year, record.month - 1)
    );
    const periodEnd = endOfMonth(periodStart);

    const { count: workedDays } = await supabase
      .from("attendance_records")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("employee_id", employeeId)
      .eq("status", "present")
      .gte("date", format(periodStart, "yyyy-MM-dd"))
      .lte("date", format(periodEnd, "yyyy-MM-dd"));

    const lopDays = await getLopDaysForRecord(record);

    const allowances = getAllowanceBreakdown();
    const deductions = getDeductionBreakdown();

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=1000"
    );

    if (!printWindow) {
      throw new Error(
        "Popup blocked. Please allow popups for this portal."
      );
    }

    const allowanceRows = allowances
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.label)}</td><td class="amount">+${escapeHtml(
            formatCurrency(item.amount)
          )}</td></tr>`
      )
      .join("");

    const deductionRows = deductions
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.label)}</td><td class="amount">-${escapeHtml(
            formatCurrency(item.amount)
          )}</td></tr>`
      )
      .join("");

    const statusText =
      record.status === "paid"
        ? "Paid"
        : record.status === "processed"
          ? "Processed"
          : "Draft";

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Payslip - ${escapeHtml(monthName)} ${record.year}</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: white;
            }
            .sheet {
              max-width: 860px;
              margin: 0 auto;
              border: 1px solid #d1d5db;
              padding: 28px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #111827;
              padding-bottom: 18px;
              margin-bottom: 22px;
            }
            .logo {
              max-height: 58px;
              max-width: 220px;
              object-fit: contain;
              margin-bottom: 8px;
            }
            h1 { margin: 0 0 6px; font-size: 26px; }
            h2 { margin: 0 0 6px; font-size: 18px; }
            .muted { color: #6b7280; }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 28px;
              margin-bottom: 24px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding: 5px 0;
            }
            .label { color: #6b7280; }
            .section {
              margin-top: 22px;
              border: 1px solid #d1d5db;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 9px 10px;
              border-bottom: 1px solid #e5e7eb;
              text-align: left;
            }
            th {
              background: #f3f4f6;
              font-weight: 700;
            }
            .amount { text-align: right; }
            .total {
              display: flex;
              justify-content: space-between;
              padding: 13px 10px;
              font-weight: 700;
              border-top: 2px solid #111827;
            }
            .net {
              margin-top: 22px;
              padding: 18px;
              border: 2px solid #111827;
              display: flex;
              justify-content: space-between;
              font-size: 20px;
              font-weight: 700;
            }
            .footer {
              margin-top: 32px;
              padding-top: 14px;
              border-top: 1px solid #d1d5db;
              text-align: center;
              font-size: 11px;
              color: #6b7280;
            }
            .no-print {
              margin: 18px 0;
              text-align: center;
            }
            .print-btn {
              border: 0;
              border-radius: 8px;
              padding: 10px 18px;
              background: #111827;
              color: white;
              cursor: pointer;
              font-size: 14px;
            }
            @media print {
              body { padding: 0; }
              .sheet { border: 0; max-width: none; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="print-btn" onclick="window.print()">Print Payslip</button>
          </div>

          <div class="sheet">
            <div class="header">
              ${
                branding?.logoUrl
                  ? `<img class="logo" src="${escapeHtml(
                      branding.logoUrl
                    )}" alt="Company logo" />`
                  : ""
              }
              <h1>${escapeHtml(
                branding?.companyName || "MJIS"
              )}</h1>
              ${
                branding?.companyAddress
                  ? `<div class="muted">${escapeHtml(
                      branding.companyAddress
                    )}</div>`
                  : ""
              }
              <h2 style="margin-top:14px;">Salary Payslip</h2>
              <div class="muted">${escapeHtml(
                monthName
              )} ${record.year}</div>
            </div>

            <div class="grid">
              <div>
                <div class="row">
                  <span class="label">Employee Name</span>
                  <strong>${escapeHtml(employeeName)}</strong>
                </div>
                <div class="row">
                  <span class="label">Employee Code</span>
                  <strong>${escapeHtml(employeeCode)}</strong>
                </div>
                <div class="row">
                  <span class="label">Email</span>
                  <strong>${escapeHtml(
                    employeeInfo?.email || ""
                  )}</strong>
                </div>
              </div>

              <div>
                <div class="row">
                  <span class="label">Designation</span>
                  <strong>${escapeHtml(
                    employeeInfo?.designation || "—"
                  )}</strong>
                </div>
                <div class="row">
                  <span class="label">Department</span>
                  <strong>${escapeHtml(
                    employeeInfo?.department?.name || "—"
                  )}</strong>
                </div>
                <div class="row">
                  <span class="label">Date of Joining</span>
                  <strong>${escapeHtml(
                    employeeInfo?.hire_date
                      ? format(
                          new Date(
                            employeeInfo.hire_date
                          ),
                          "dd MMM yyyy"
                        )
                      : "—"
                  )}</strong>
                </div>
              </div>
            </div>

            <div class="section">
              <table>
                <thead>
                  <tr>
                    <th colspan="2">Payroll & Statutory Information</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>UAN Number</td>
                    <td>${escapeHtml(payrollIdentity?.uan_number || "—")}</td>
                  </tr>
                  <tr>
                    <td>Bank Name</td>
                    <td>${escapeHtml(payrollIdentity?.bank_name || "—")}</td>
                  </tr>
                  <tr>
                    <td>Bank Account Number</td>
                    <td>${escapeHtml(payrollIdentity?.bank_account_number || "—")}</td>
                  </tr>
                  <tr>
                    <td>IFSC Code</td>
                    <td>${escapeHtml(payrollIdentity?.ifsc_code || "—")}</td>
                  </tr>
                  <tr>
                    <td>PAN Number</td>
                    <td>${escapeHtml(payrollIdentity?.pan_number || "—")}</td>
                  </tr>
                  <tr>
                    <td>ESI Number</td>
                    <td>${escapeHtml(payrollIdentity?.esi_number || "—")}</td>
                  </tr>
                  <tr>
                    <td>Insurance Number</td>
                    <td>${escapeHtml(payrollIdentity?.insurance_number || "—")}</td>
                  </tr>
                  <tr>
                    <td>Aadhaar Number</td>
                    <td>${escapeHtml(payrollIdentity?.aadhaar_number || "—")}</td>
                  </tr>
                  <tr>
                    <td>LOP Days</td>
                    <td>${escapeHtml(String(lopDays))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section">
              <table>
                <thead>
                  <tr>
                    <th>Earnings</th>
                    <th class="amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Basic Salary</td>
                    <td class="amount">${escapeHtml(
                      formatCurrency(
                        Number(record.basic_salary)
                      )
                    )}</td>
                  </tr>
                  ${allowanceRows}
                </tbody>
              </table>
              <div class="total">
                <span>Gross Salary</span>
                <span>${escapeHtml(
                  formatCurrency(
                    Number(record.basic_salary) +
                      Number(record.total_allowances || 0)
                  )
                )}</span>
              </div>
            </div>

            <div class="section">
              <table>
                <thead>
                  <tr>
                    <th>Deductions</th>
                    <th class="amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    deductionRows ||
                    `<tr><td>No deductions</td><td class="amount">₹0.00</td></tr>`
                  }
                </tbody>
              </table>
              <div class="total">
                <span>Total Deductions</span>
                <span>${escapeHtml(
                  formatCurrency(
                    Number(record.total_deductions || 0)
                  )
                )}</span>
              </div>
            </div>

            <div class="net">
              <span>Net Salary</span>
              <span>${escapeHtml(
                formatCurrency(Number(record.net_salary))
              )}</span>
            </div>

            <div class="grid" style="margin-top:18px;">
              <div class="row">
                <span class="label">Status</span>
                <strong>${statusText}</strong>
              </div>
              <div class="row">
                <span class="label">Worked Days</span>
                <strong>${workedDays ?? "—"}</strong>
              </div>
            </div>

            <div class="footer">
              This is a computer-generated payslip and does not require a signature.<br />
              Generated on ${escapeHtml(
                new Date().toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              )}
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  const allowanceBreakdown = getAllowanceBreakdown();
  const deductionBreakdown = getDeductionBreakdown();

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium">
            Unable to load payslips
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error
              ? error.message
              : "Please try again later."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>My Payslips</CardTitle>
              <CardDescription>
                View, download or print your salary statements
              </CardDescription>
            </div>
          </div>

          <Select
            value={selectedYear}
            onValueChange={setSelectedYear}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem
                  key={year.value}
                  value={year.value}
                >
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {salaryStructure && (
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Salary Structure Breakdown
              </CardTitle>
              <CardDescription>
                Your current salary components
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
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
                        {formatCurrency(
                          Number(
                            salaryStructure.basic_salary
                          )
                        )}
                      </span>
                    </div>

                    {allowanceBreakdown.map((item) => (
                      <div
                        key={item.label}
                        className="flex justify-between"
                      >
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="font-medium text-green-600">
                          +{formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}

                    <Separator />

                    <div className="flex justify-between font-semibold">
                      <span>Gross Salary</span>
                      <span>
                        {formatCurrency(
                          Number(
                            salaryStructure.basic_salary
                          ) +
                            Number(
                              salaryStructure.hra || 0
                            ) +
                            Number(
                              salaryStructure.transport_allowance ||
                                0
                            ) +
                            Number(
                              salaryStructure.medical_allowance ||
                                0
                            ) +
                            Number(
                              salaryStructure.other_allowances ||
                                0
                            )
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <Minus className="h-4 w-4" />
                    <span className="font-semibold">
                      Deductions
                    </span>
                  </div>

                  <div className="space-y-2 rounded-lg border bg-background p-4">
                    {deductionBreakdown.length > 0 ? (
                      <>
                        {deductionBreakdown.map((item) => (
                          <div
                            key={item.label}
                            className="flex justify-between"
                          >
                            <span className="text-muted-foreground">
                              {item.label}
                            </span>
                            <span className="font-medium text-red-600">
                              -{formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}

                        <Separator />

                        <div className="flex justify-between font-semibold">
                          <span>Total Deductions</span>
                          <span className="text-red-600">
                            -
                            {formatCurrency(
                              deductionBreakdown.reduce(
                                (sum, item) =>
                                  sum + item.amount,
                                0
                              )
                            )}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No deductions configured
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">
                    Net Salary (Monthly)
                  </span>
                  <span className="font-bold text-xl text-primary">
                    {formatCurrency(
                      Number(salaryStructure.basic_salary) +
                        Number(
                          salaryStructure.hra || 0
                        ) +
                        Number(
                          salaryStructure.transport_allowance ||
                            0
                        ) +
                        Number(
                          salaryStructure.medical_allowance ||
                            0
                        ) +
                        Number(
                          salaryStructure.other_allowances ||
                            0
                        ) -
                        Number(
                          salaryStructure.tax_deduction ||
                            0
                        ) -
                        Number(
                          salaryStructure.pf_deduction ||
                            0
                        )
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Payroll & Statutory Details + Documents */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Payroll & Statutory Information
                  </CardTitle>
                  <CardDescription>
                    Keep these details and required payroll documents updated.
                    They are used on your salary slip.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">Employee / HR</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">UAN Number</label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={payrollIdentityForm.uan_number}
                  onChange={(event) =>
                    setPayrollIdentityForm((current) => ({
                      ...current,
                      uan_number: event.target.value,
                    }))
                  }
                  placeholder="Enter UAN"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Bank Name</label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={payrollIdentityForm.bank_name}
                  onChange={(event) =>
                    setPayrollIdentityForm((current) => ({
                      ...current,
                      bank_name: event.target.value,
                    }))
                  }
                  placeholder="Enter bank name"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Bank Account Number</label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={payrollIdentityForm.bank_account_number}
                  onChange={(event) =>
                    setPayrollIdentityForm((current) => ({
                      ...current,
                      bank_account_number: event.target.value,
                    }))
                  }
                  placeholder="Enter account number"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="text-sm font-medium">IFSC Code</label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm uppercase"
                  value={payrollIdentityForm.ifsc_code}
                  onChange={(event) =>
                    setPayrollIdentityForm((current) => ({
                      ...current,
                      ifsc_code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Enter IFSC"
                />
              </div>

              <div>
                <label className="text-sm font-medium">PAN Number</label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm uppercase"
                  value={payrollIdentityForm.pan_number}
                  onChange={(event) =>
                    setPayrollIdentityForm((current) => ({
                      ...current,
                      pan_number: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Enter PAN"
                />
              </div>

              <div>
                <label className="text-sm font-medium">ESI Number</label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={payrollIdentityForm.esi_number}
                  onChange={(event) =>
                    setPayrollIdentityForm((current) => ({
                      ...current,
                      esi_number: event.target.value,
                    }))
                  }
                  placeholder="Enter ESI number"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Insurance Number</label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={payrollIdentityForm.insurance_number}
                  onChange={(event) =>
                    setPayrollIdentityForm((current) => ({
                      ...current,
                      insurance_number: event.target.value,
                    }))
                  }
                  placeholder="Enter insurance number"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Aadhaar Number</label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={payrollIdentityForm.aadhaar_number}
                  onChange={(event) =>
                    setPayrollIdentityForm((current) => ({
                      ...current,
                      aadhaar_number: event.target.value,
                    }))
                  }
                  placeholder="Enter Aadhaar number"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Bank, statutory and identity fields are stored separately from
                the employee directory and protected by row-level access.
              </p>
              <Button
                type="button"
                onClick={() => void savePayrollIdentity()}
                disabled={savingPayrollIdentity}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingPayrollIdentity ? "Saving..." : "Save Payroll Details"}
              </Button>
            </div>

            {payrollIdentityMessage && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                {payrollIdentityMessage}
              </div>
            )}

            <Separator />

            <div>
              <div className="mb-4 flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Required Payroll Documents</h3>
                  <p className="text-xs text-muted-foreground">
                    Upload your documents after creating your portal account.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {REQUIRED_PAYROLL_DOCUMENTS.map((requiredDocument) => {
                  const document = payrollDocuments.find(
                    (item) =>
                      item.document_type === requiredDocument.type
                  );

                  return (
                    <div
                      key={requiredDocument.type}
                      className="rounded-xl border bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">
                            {requiredDocument.type}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {requiredDocument.hint}
                          </div>
                        </div>

                        <Badge
                          variant={document ? "default" : "secondary"}
                        >
                          {document ? "Uploaded" : "Pending"}
                        </Badge>
                      </div>

                      {document && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          {document.document_name}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <input
                          id={`payroll-doc-${documentTypeSafe(requiredDocument.type)}`}
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (file) {
                              void handlePayrollDocumentUpload(
                                requiredDocument.type,
                                file
                              );
                            }
                          }}
                        />

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            uploadingPayrollDocument ===
                            requiredDocument.type
                          }
                          onClick={() =>
                            window.document.getElementById(
                                `payroll-doc-${documentTypeSafe(
                                  requiredDocument.type
                                )}`
                              )
                              ?.click()
                          }
                        >
                          {uploadingPayrollDocument ===
                          requiredDocument.type ? (
                            "Uploading..."
                          ) : (
                            <>
                              <Upload className="mr-1 h-4 w-4" />
                              {document ? "Replace" : "Upload"}
                            </>
                          )}
                        </Button>

                        {document && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void openPayrollDocument(document)
                              }
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              Open
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() =>
                                void deletePayrollDocument(document)
                              }
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {payrollDocumentMessage && (
                <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
                  {payrollDocumentMessage}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-16 w-full"
              />
            ))}
          </div>
        ) : payrollRecords && payrollRecords.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold">
              Payslip History
            </h3>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">
                      Basic Salary
                    </TableHead>
                    <TableHead className="text-right">
                      Allowances
                    </TableHead>
                    <TableHead className="text-right">
                      Deductions
                    </TableHead>
                    <TableHead className="text-right">
                      Net Salary
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {payrollRecords.map((record) => {
                    const monthName =
                      MONTHS.find(
                        (m) =>
                          m.value ===
                          String(record.month)
                      )?.label || "";

                    const isExpanded =
                      expandedRecord === record.id;

                    return (
                      <>
                        <TableRow
                          key={record.id}
                          className="cursor-pointer"
                          onClick={() =>
                            setExpandedRecord(
                              isExpanded
                                ? null
                                : record.id
                            )
                          }
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </TableCell>

                          <TableCell className="font-medium whitespace-nowrap">
                            {monthName} {record.year}
                          </TableCell>

                          <TableCell className="text-right">
                            {formatCurrency(
                              Number(
                                record.basic_salary
                              )
                            )}
                          </TableCell>

                          <TableCell className="text-right text-green-600">
                            +
                            {formatCurrency(
                              Number(
                                record.total_allowances
                              ) || 0
                            )}
                          </TableCell>

                          <TableCell className="text-right text-red-600">
                            -
                            {formatCurrency(
                              Number(
                                record.total_deductions
                              ) || 0
                            )}
                          </TableCell>

                          <TableCell className="text-right font-semibold">
                            {formatCurrency(
                              Number(
                                record.net_salary
                              )
                            )}
                          </TableCell>

                          <TableCell>
                            {getStatusBadge(
                              record.status
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintPayslip(
                                    record
                                  ).catch((printError) => {
                                    console.error(
                                      printError
                                    );
                                  });
                                }}
                                title="Print payslip"
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">
                                  Print
                                </span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPayslip(
                                    record
                                  ).catch((downloadError) => {
                                    console.error(
                                      downloadError
                                    );
                                  });
                                }}
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">
                                  PDF
                                </span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow key={`${record.id}-details`}>
                            <TableCell
                              colSpan={8}
                              className="bg-muted/30 p-4"
                            >
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <p className="font-medium text-green-600 flex items-center gap-1">
                                    <Plus className="h-3 w-3" />
                                    Earnings Breakdown
                                  </p>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Basic Salary
                                      </span>
                                      <span>
                                        {formatCurrency(
                                          Number(
                                            record.basic_salary
                                          )
                                        )}
                                      </span>
                                    </div>

                                    {allowanceBreakdown.length >
                                    0 ? (
                                      allowanceBreakdown.map(
                                        (item) => (
                                          <div
                                            key={
                                              item.label
                                            }
                                            className="flex justify-between"
                                          >
                                            <span className="text-muted-foreground">
                                              {item.label}
                                            </span>
                                            <span className="text-green-600">
                                              +
                                              {formatCurrency(
                                                item.amount
                                              )}
                                            </span>
                                          </div>
                                        )
                                      )
                                    ) : (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Total
                                          Allowances
                                        </span>
                                        <span className="text-green-600">
                                          +
                                          {formatCurrency(
                                            Number(
                                              record.total_allowances
                                            ) || 0
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <p className="font-medium text-red-600 flex items-center gap-1">
                                    <Minus className="h-3 w-3" />
                                    Deductions Breakdown
                                  </p>

                                  <div className="space-y-1 text-sm">
                                    {deductionBreakdown.length >
                                    0 ? (
                                      deductionBreakdown.map(
                                        (item) => (
                                          <div
                                            key={
                                              item.label
                                            }
                                            className="flex justify-between"
                                          >
                                            <span className="text-muted-foreground">
                                              {item.label}
                                            </span>
                                            <span className="text-red-600">
                                              -
                                              {formatCurrency(
                                                item.amount
                                              )}
                                            </span>
                                          </div>
                                        )
                                      )
                                    ) : (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Total
                                          Deductions
                                        </span>
                                        <span className="text-red-600">
                                          -
                                          {formatCurrency(
                                            Number(
                                              record.total_deductions
                                            ) || 0
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              Draft payslips can also be downloaded/printed. Mark payroll as
              processed or paid when the final status is ready.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              No Payslips Found
            </p>
            <p className="text-sm text-muted-foreground">
              No payroll record is visible for {selectedYear}.
            </p>

            {salaryStructure ? (
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Your salary structure exists. HR may need to generate payroll
                for this month, or your portal account may need to be linked
                to the employee record.
              </p>
            ) : (
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                HR needs to assign a salary structure and generate payroll
                before a payslip can appear here.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}