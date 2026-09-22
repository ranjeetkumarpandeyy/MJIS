import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  LockKeyhole,
  Printer,
  ReceiptIndianRupee,
  Save,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployeeStatus } from "@/hooks/useEmployeeStatus";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

import {
  drawPdfFooter,
  drawPdfHeader,
  fetchImageAsDataUrl,
  formatCurrencyForPdf,
  PDF_TABLE_HEAD_STYLE,
  PDF_COLORS,
} from "@/lib/pdfTheme";

type SalarySlip = {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  total_allowances: number;
  total_deductions: number;
  net_salary: number;
  status: "draft" | "processed" | "paid";
  paid_at: string | null;
};

type PayrollIdentity = {
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
};

type PayrollDocument = {
  id: string;
  user_id: string;
  employee_id: string | null;
  document_type: string;
  document_name: string;
  storage_path: string;
  created_at: string;
};

type SalaryStructure = {
  basic_salary: number | null;
  hra: number | null;
  transport_allowance: number | null;
  medical_allowance: number | null;
  other_allowances: number | null;
  tax_deduction: number | null;
  pf_deduction: number | null;
  effective_from: string | null;
};

const REQUIRED_PAYROLL_DOCUMENTS = [
  { type: "Aadhaar Card", hint: "Aadhaar / identity proof" },
  { type: "PAN Card", hint: "PAN card copy" },
  { type: "Bank Proof", hint: "Cancelled cheque / bank passbook / bank proof" },
  { type: "Insurance Document", hint: "Insurance / ESIC / policy document" },
  { type: "UAN Document", hint: "UAN card / EPFO document (if available)" },
  { type: "ESI Document", hint: "ESI card / ESI document (if available)" },
];

const documentTypeSafe = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ============================================================
   HELPERS
============================================================ */

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatStatus(status: string) {
  if (status === "paid") return "Paid";
  if (status === "processed") return "Processed";
  return "Pending";
}

function statusClass(status: string) {
  if (status === "paid") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "processed") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

/**
 * Escape HTML before inserting employee/company data into
 * the temporary print document.
 */
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ============================================================
   COMPONENT
============================================================ */

export default function EmployeeSalarySlips() {
  const navigate = useNavigate();

  const { user } = useAuth();

  const {
    data: employeeStatus,
    isLoading: employeeStatusLoading,
  } = useEmployeeStatus();

  const { data: branding } = useCompanyBranding();

  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSlip, setSelectedSlip] =
    useState<SalarySlip | null>(null);

  // LOP is calculated for the currently selected salary slip month.
  // This value is shared by the View, Print and PDF salary-slip outputs.
  const [selectedLopDays, setSelectedLopDays] = useState(0);

  // ============================================================
  // SHARED CURRENT SALARY + PAYROLL/KYC DATA
  // This uses the exact same records as Employee Edit -> Salary.
  // ============================================================

  const { data: currentSalaryStructure } = useQuery({
    queryKey: [
      "employee-salary-slips-current-structure",
      employeeStatus?.employeeId,
    ],
    queryFn: async () => {
      if (!employeeStatus?.employeeId) return null;

      const { data, error } = await supabase
        .from("salary_structures")
        .select(
          "basic_salary, hra, transport_allowance, medical_allowance, other_allowances, tax_deduction, pf_deduction, effective_from"
        )
        .eq("employee_id", employeeStatus.employeeId)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SalaryStructure | null;
    },
    enabled:
      !employeeStatusLoading &&
      !!employeeStatus?.employeeId,
  });

  const { data: payrollIdentity, refetch: refetchPayrollIdentity } =
    useQuery({
      queryKey: [
        "employee-salary-slips-payroll-identity",
        employeeStatus?.employeeId,
      ],
      queryFn: async () => {
        if (!employeeStatus?.employeeId) return null;

        const { data, error } = await (supabase as any)
          .from("employee_payroll_profiles")
          .select(
            "user_id, employee_id, bank_name, bank_account_number, ifsc_code, pan_number, uan_number, esi_number, insurance_number, aadhaar_number"
          )
          .eq("employee_id", employeeStatus.employeeId)
          .maybeSingle();

        if (error) throw error;
        return (data as PayrollIdentity | null) ?? null;
      },
      enabled:
        !employeeStatusLoading &&
        !!employeeStatus?.employeeId,
    });

  const { data: payrollDocuments = [], refetch: refetchPayrollDocuments } =
    useQuery({
      queryKey: [
        "employee-salary-slips-payroll-documents",
        employeeStatus?.employeeId,
      ],
      queryFn: async () => {
        if (!employeeStatus?.employeeId) return [];

        const { data, error } = await (supabase as any)
          .from("employee_payroll_documents")
          .select(
            "id, user_id, employee_id, document_type, document_name, storage_path, created_at"
          )
          .eq("employee_id", employeeStatus.employeeId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as PayrollDocument[];
      },
      enabled:
        !employeeStatusLoading &&
        !!employeeStatus?.employeeId,
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
    if (!employeeStatus?.employeeId || !user?.id) {
      setPayrollIdentityMessage(
        "Your employee record is not linked to your portal account yet."
      );
      return;
    }

    setSavingPayrollIdentity(true);
    setPayrollIdentityMessage("");

    try {
      const { error: saveError } = await (supabase as any)
        .from("employee_payroll_profiles")
        .upsert(
          {
            user_id: user.id,
            employee_id: employeeStatus.employeeId,
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
      console.error("Employee payroll save error:", saveError);
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
    if (!employeeStatus?.employeeId || !user?.id) {
      setPayrollDocumentMessage(
        "Your employee record is not linked to your portal account yet."
      );
      return;
    }

    setUploadingPayrollDocument(documentType);
    setPayrollDocumentMessage("");

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const storagePath = `${user.id}/${payrollDocumentSlug(
        documentType
      )}/current`;

      const { error: uploadError } = await supabase.storage
        .from("employee-payroll-documents")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { error: documentError } = await (supabase as any)
        .from("employee_payroll_documents")
        .upsert(
          {
            user_id: user.id,
            employee_id: employeeStatus.employeeId,
            document_type: documentType,
            document_name: file.name,
            storage_path: storagePath,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,document_type" }
        );

      if (documentError) throw documentError;

      await refetchPayrollDocuments();

      setPayrollDocumentMessage(
        `${documentType} uploaded/replaced successfully.`
      );
    } catch (uploadError) {
      console.error("Employee payroll document upload error:", uploadError);
      setPayrollDocumentMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload document."
      );
    } finally {
      setUploadingPayrollDocument(null);
    }
  };

  const openPayrollDocument = async (payrollDocument: PayrollDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("employee-payroll-documents")
        .createSignedUrl(payrollDocument.storage_path, 60 * 10);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (openError) {
      console.error("Employee payroll document open error:", openError);
      setPayrollDocumentMessage(
        openError instanceof Error
          ? openError.message
          : "Unable to open document."
      );
    }
  };
  // ============================================================
  // SHARED LOP CALCULATION
  // The same approved unpaid-leave calculation is used by the
  // salary-slip View, Print and Download PDF outputs.
  // ============================================================
  const getLopDaysForSlip = async (slip: SalarySlip) => {
    const periodStart = new Date(
      slip.year,
      slip.month - 1,
      1
    );
    const periodEnd = new Date(
      slip.year,
      slip.month,
      0
    );

    const { data: unpaidLeaves, error: lopError } = await supabase
      .from("leave_requests")
      .select(
        "days_count, leave_type:leave_types!leave_requests_leave_type_id_fkey(is_paid)"
      )
      .eq("employee_id", slip.employee_id)
      .eq("status", "approved")
      .gte(
        "start_date",
        periodStart.toISOString().slice(0, 10)
      )
      .lte(
        "end_date",
        periodEnd.toISOString().slice(0, 10)
      );

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

  useEffect(() => {
    if (!selectedSlip) {
      setSelectedLopDays(0);
      return;
    }

    void getLopDaysForSlip(selectedSlip).then(setSelectedLopDays);
  }, [selectedSlip]);


  const [downloadLoading, setDownloadLoading] =
    useState<string | null>(null);

  const [printLoading, setPrintLoading] =
    useState<string | null>(null);

  /* ============================================================
     LOAD OWN SALARY SLIPS
  ============================================================ */

  async function loadSalarySlips(employeeId: string) {
    setLoading(true);
    setError("");

    const { data, error: queryError } =
      await supabase
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
        .in("status", ["processed", "paid"])
        .order("year", {
          ascending: false,
        })
        .order("month", {
          ascending: false,
        });

    if (queryError) {
      console.error(
        "Employee salary slips error:",
        queryError
      );

      setError(queryError.message);
      setSlips([]);
    } else {
      setSlips(
        (data ?? []) as SalarySlip[]
      );
    }

    setLoading(false);
  }

  /* ============================================================
     EMPLOYEE ACCESS
  ============================================================ */

  useEffect(() => {
    if (
      !employeeStatusLoading &&
      !employeeStatus?.isEmployee
    ) {
      navigate("/dashboard", {
        replace: true,
      });
    }
  }, [
    employeeStatusLoading,
    employeeStatus?.isEmployee,
    navigate,
  ]);

  useEffect(() => {
    if (
      !employeeStatusLoading &&
      employeeStatus?.isEmployee &&
      employeeStatus.employeeId
    ) {
      void loadSalarySlips(
        employeeStatus.employeeId
      );
    }
  }, [
    employeeStatusLoading,
    employeeStatus?.isEmployee,
    employeeStatus?.employeeId,
  ]);

  /* ============================================================
     SUMMARY
  ============================================================ */

  const totalPaid = useMemo(() => {
    return slips
      .filter(
        (slip) => slip.status === "paid"
      )
      .reduce(
        (sum, slip) =>
          sum + Number(slip.net_salary),
        0
      );
  }, [slips]);

  const latestSlip = slips[0];

  /* ============================================================
     DOWNLOAD OFFICIAL PDF
  ============================================================ */

  async function downloadSalarySlip(
    slip: SalarySlip
  ) {
    try {
      setDownloadLoading(slip.id);
      setError("");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth =
        doc.internal.pageSize.getWidth();

      const pageHeight =
        doc.internal.pageSize.getHeight();

      const margin = 16;

      /*
       * Existing MJIS/company branding
       */
      const logoDataUrl =
        await fetchImageAsDataUrl(
          branding?.logoUrl
        );

      const companyName =
        branding?.companyName ||
        "Maa Janki Industrial Services";

      const companyAddress =
        branding?.companyAddress || "";

      /*
       * Header
       */
      let currentY = drawPdfHeader(
        doc,
        {
          title: "Salary Slip",
          subtitle: `${MONTHS[slip.month - 1]} ${slip.year}`,
          companyName,
          companyAddress,
          logoDataUrl,
          pageWidth,
          margin,
        }
      );

      /*
       * Confidential marker
       */
      doc.setTextColor(
        ...PDF_COLORS.gray
      );

      doc.setFontSize(8);
      doc.setFont(
        "helvetica",
        "italic"
      );

      doc.text(
        "Confidential - Employee Copy",
        pageWidth - margin,
        currentY,
        {
          align: "right",
        }
      );

      currentY += 10;

      /*
       * Employee name
       */
      doc.setTextColor(
        ...PDF_COLORS.dark
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(13);

      doc.text(
        user?.user_metadata?.full_name ||
          "Employee",
        margin,
        currentY
      );

      currentY += 7;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(9);

      doc.setTextColor(
        ...PDF_COLORS.gray
      );

      doc.text(
        user?.email || "",
        margin,
        currentY
      );

      currentY += 11;

      /*
       * Employee / period table
       */
      autoTable(doc, {
        startY: currentY,

        theme: "grid",

        head: [["Employee Information", "Details"]],

        body: [
          [
            "Employee ID",
            slip.employee_id,
          ],
          [
            "Employee Email",
            user?.email || "—",
          ],
          [
            "Pay Period",
            `${MONTHS[slip.month - 1]} ${slip.year}`,
          ],
          [
            "Payroll Status",
            formatStatus(slip.status),
          ],
          [
            "Payment Date",
            slip.paid_at
              ? new Date(
                  slip.paid_at
                ).toLocaleDateString(
                  "en-IN"
                )
              : "—",
          ],
          [
            "LOP Days",
            String(
              await getLopDaysForSlip(slip)
            ),
          ],
        ],

        headStyles:
          PDF_TABLE_HEAD_STYLE,

        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor:
            PDF_COLORS.dark,
        },

        columnStyles: {
          0: {
            cellWidth: 55,
          },

          1: {
            cellWidth: "auto",
          },
        },
      });

      currentY =
        (doc as any).lastAutoTable
          ?.finalY + 10 ||
        currentY + 55;

      /*
       * Payroll / statutory information
       * Uses the same employee_payroll_profiles record shown
       * in Employee Edit -> Salary and on the employee dashboard.
       */
      autoTable(doc, {
        startY: currentY,

        theme: "grid",

        head: [["Payroll & Statutory Information", "Details"]],

        body: [
          ["UAN Number", payrollIdentity?.uan_number || "—"],
          ["Aadhaar Number", payrollIdentity?.aadhaar_number || "—"],
          ["PAN Number", payrollIdentity?.pan_number || "—"],
          ["ESI Number", payrollIdentity?.esi_number || "—"],
          [
            "Insurance Number",
            payrollIdentity?.insurance_number || "—",
          ],
          ["Bank Name", payrollIdentity?.bank_name || "—"],
          [
            "Bank Account Number",
            payrollIdentity?.bank_account_number || "—",
          ],
          ["IFSC Code", payrollIdentity?.ifsc_code || "—"],
        ],

        headStyles:
          PDF_TABLE_HEAD_STYLE,

        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor:
            PDF_COLORS.dark,
        },

        columnStyles: {
          0: {
            cellWidth: 55,
          },

          1: {
            cellWidth: "auto",
          },
        },
      });

      currentY =
        (doc as any).lastAutoTable
          ?.finalY + 10 ||
        currentY + 95;


      /*
       * Earnings + deductions
       */
      autoTable(doc, {
        startY: currentY,

        theme: "grid",

        head: [
          [
            "Salary Component",
            "Amount",
          ],
        ],

        body: [
          [
            "Basic Salary",
            formatCurrencyForPdf(
              Number(
                slip.basic_salary
              )
            ),
          ],
          [
            "Total Allowances",
            formatCurrencyForPdf(
              Number(
                slip.total_allowances
              )
            ),
          ],
          [
            "Gross Salary",
            formatCurrencyForPdf(
              Number(
                slip.basic_salary
              ) +
                Number(
                  slip.total_allowances
                )
            ),
          ],
          [
            "Total Deductions",
            formatCurrencyForPdf(
              Number(
                slip.total_deductions
              )
            ),
          ],
        ],

        headStyles:
          PDF_TABLE_HEAD_STYLE,

        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor:
            PDF_COLORS.dark,
        },

        columnStyles: {
          0: {
            cellWidth: 100,
          },

          1: {
            halign: "right",
          },
        },
      });

      currentY =
        (doc as any).lastAutoTable
          ?.finalY + 12 ||
        currentY + 50;

      /*
       * NET SALARY BOX
       */

      doc.setFillColor(
        248,
        250,
        252
      );

      doc.setDrawColor(
        ...PDF_COLORS.accent
      );

      doc.roundedRect(
        margin,
        currentY,
        pageWidth -
          margin * 2,
        24,
        3,
        3,
        "FD"
      );

      doc.setTextColor(
        ...PDF_COLORS.dark
      );

      doc.setFontSize(12);
      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.text(
        "NET SALARY",
        margin + 7,
        currentY + 10
      );

      doc.setFontSize(15);

      doc.text(
        formatCurrencyForPdf(
          Number(
            slip.net_salary
          )
        ),
        pageWidth - margin - 7,
        currentY + 12,
        {
          align: "right",
        }
      );

      currentY += 36;

      /*
       * Notes
       */

      doc.setTextColor(
        ...PDF_COLORS.gray
      );

      doc.setFontSize(8);

      doc.setFont(
        "helvetica",
        "normal"
      );

      const notes = [
        "This is a computer-generated salary slip.",
        "Salary information is confidential and intended only for the employee.",
        "For any payroll discrepancy, please contact HR/Admin.",
      ];

      notes.forEach(
        (note, index) => {
          doc.text(
            `• ${note}`,
            margin,
            currentY +
              index * 5
          );
        }
      );

      /*
       * Authorization section
       */

      const signatureY =
        Math.min(
          currentY + 30,
          pageHeight - 45
        );

      doc.setDrawColor(
        ...PDF_COLORS.rule
      );

      doc.line(
        margin,
        signatureY,
        margin + 55,
        signatureY
      );

      doc.line(
        pageWidth - margin - 55,
        signatureY,
        pageWidth - margin,
        signatureY
      );

      doc.setTextColor(
        ...PDF_COLORS.gray
      );

      doc.setFontSize(8);

      doc.text(
        "Employee",
        margin,
        signatureY + 5
      );

      doc.text(
        "Authorized HR / Admin",
        pageWidth - margin,
        signatureY + 5,
        {
          align: "right",
        }
      );

      /*
       * Footer
       */

      drawPdfFooter(
        doc,
        {
          pageWidth,
          pageHeight,
          margin,
          pageNumber: 1,
          totalPages: 1,
        }
      );

      /*
       * Filename
       */

      const safeName = (
        user?.user_metadata
          ?.full_name ||
        "employee"
      )
        .replace(
          /[^a-z0-9]+/gi,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        )
        .toLowerCase();

      const monthName =
        MONTHS[
          slip.month - 1
        ].toLowerCase();

      doc.save(
        `MJIS-${safeName}-salary-slip-${monthName}-${slip.year}.pdf`
      );
    } catch (err) {
      console.error(
        "Salary slip PDF error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to download salary slip."
      );
    } finally {
      setDownloadLoading(null);
    }
  }

  /* ============================================================
     PRINT SALARY SLIP
  ============================================================ */

  async function printSalarySlip(
    slip: SalarySlip
  ) {
    try {
      setPrintLoading(slip.id);
      setError("");

      /*
       * Fetch existing company logo as a data URL
       * so printing does not depend on a second network
       * request inside the print window.
       */
      const logoDataUrl =
        await fetchImageAsDataUrl(
          branding?.logoUrl
        );

      const companyName =
        branding?.companyName ||
        "Maa Janki Industrial Services";

      const companyAddress =
        branding?.companyAddress || "";

      const employeeName =
        user?.user_metadata
          ?.full_name ||
        "Employee";

      const employeeEmail =
        user?.email || "";

      const grossSalary =
        Number(
          slip.basic_salary
        ) +
        Number(
          slip.total_allowances
        );

      const printLopDays =
        await getLopDaysForSlip(slip);

      const printWindow =
        window.open(
          "",
          "_blank",
          "width=900,height=1100"
        );

      if (!printWindow) {
        throw new Error(
          "Please allow pop-ups in your browser to print the salary slip."
        );
      }

      printWindow.document.write(`
        <!doctype html>

        <html>
          <head>

            <meta charset="UTF-8" />

            <title>
              MJIS Salary Slip -
              ${escapeHtml(
                MONTHS[
                  slip.month - 1
                ]
              )} ${slip.year}
            </title>

            <style>

              * {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                padding: 24px;
                background: #ffffff;
                color: #0f172a;
                font-family: Arial, Helvetica, sans-serif;
              }

              .sheet {
                max-width: 820px;
                margin: 0 auto;
                border: 1px solid #cbd5e1;
                padding: 28px;
              }

              .header {
                display: flex;
                justify-content: space-between;
                gap: 20px;
                align-items: flex-start;
                padding-bottom: 18px;
                border-bottom: 2px solid #334155;
              }

              .company {
                display: flex;
                gap: 14px;
                align-items: flex-start;
              }

              .logo {
                width: 64px;
                height: 64px;
                object-fit: contain;
              }

              .company-name {
                margin: 0;
                font-size: 20px;
                font-weight: 800;
              }

              .company-address {
                margin-top: 5px;
                color: #64748b;
                font-size: 12px;
                max-width: 350px;
                line-height: 1.5;
              }

              .document {
                text-align: right;
              }

              .document-title {
                margin: 0;
                font-size: 20px;
                font-weight: 800;
              }

              .document-period {
                margin-top: 5px;
                color: #64748b;
                font-size: 12px;
              }

              .confidential {
                margin-top: 7px;
                color: #64748b;
                font-size: 11px;
                font-style: italic;
              }

              .section {
                margin-top: 24px;
              }

              .section-title {
                margin: 0 0 10px;
                font-size: 13px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: .05em;
                color: #475569;
              }

              .employee-name {
                font-size: 18px;
                font-weight: 800;
                margin-bottom: 4px;
              }

              .employee-email {
                color: #64748b;
                font-size: 12px;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
              }

              th {
                background: #334155;
                color: #ffffff;
                text-align: left;
                padding: 9px;
                font-size: 11px;
              }

              td {
                border: 1px solid #e2e8f0;
                padding: 9px;
                font-size: 11px;
              }

              .right {
                text-align: right;
              }

              .net-box {
                margin-top: 22px;
                padding: 18px;
                border: 2px solid #334155;
                background: #f8fafc;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }

              .net-label {
                font-size: 14px;
                font-weight: 800;
              }

              .net-value {
                font-size: 20px;
                font-weight: 900;
              }

              .notes {
                margin-top: 22px;
                font-size: 10px;
                color: #64748b;
                line-height: 1.6;
              }

              .signatures {
                margin-top: 55px;
                display: flex;
                justify-content: space-between;
                gap: 40px;
              }

              .signature {
                width: 180px;
                border-top: 1px solid #94a3b8;
                padding-top: 7px;
                text-align: center;
                font-size: 10px;
                color: #64748b;
              }

              .footer {
                margin-top: 30px;
                padding-top: 12px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                gap: 15px;
                font-size: 9px;
                color: #94a3b8;
              }

              @media print {

                body {
                  padding: 0;
                }

                .sheet {
                  border: none;
                  max-width: none;
                  width: 100%;
                }

                @page {
                  size: A4;
                  margin: 12mm;
                }

              }

            </style>

          </head>

          <body>

            <div class="sheet">

              <div class="header">

                <div class="company">

                  ${
                    logoDataUrl
                      ? `
                        <img
                          src="${logoDataUrl}"
                          class="logo"
                          alt="MJIS Logo"
                        />
                      `
                      : ""
                  }

                  <div>

                    <h1 class="company-name">
                      ${escapeHtml(
                        companyName
                      )}
                    </h1>

                    ${
                      companyAddress
                        ? `
                          <div class="company-address">
                            ${escapeHtml(
                              companyAddress
                            )}
                          </div>
                        `
                        : ""
                    }

                  </div>

                </div>

                <div class="document">

                  <h2 class="document-title">
                    SALARY SLIP
                  </h2>

                  <div class="document-period">
                    ${escapeHtml(
                      MONTHS[
                        slip.month - 1
                      ]
                    )} ${slip.year}
                  </div>

                  <div class="confidential">
                    Confidential - Employee Copy
                  </div>

                </div>

              </div>

              <div class="section">

                <div class="section-title">
                  Employee
                </div>

                <div class="employee-name">
                  ${escapeHtml(
                    employeeName
                  )}
                </div>

                <div class="employee-email">
                  ${escapeHtml(
                    employeeEmail
                  )}
                </div>

              </div>

              <div class="section">

                <div class="section-title">
                  Payroll Information
                </div>

                <table>

                  <tr>
                    <th>Field</th>
                    <th>Details</th>
                  </tr>

                  <tr>
                    <td>Employee ID</td>
                    <td>${escapeHtml(
                      slip.employee_id
                    )}</td>
                  </tr>

                  <tr>
                    <td>Pay Period</td>
                    <td>${escapeHtml(
                      `${MONTHS[
                        slip.month - 1
                      ]} ${slip.year}`
                    )}</td>
                  </tr>

                  <tr>
                    <td>Status</td>
                    <td>${escapeHtml(
                      formatStatus(
                        slip.status
                      )
                    )}</td>
                  </tr>

                  <tr>
                    <td>Payment Date</td>
                    <td>${
                      slip.paid_at
                        ? escapeHtml(
                            new Date(
                              slip.paid_at
                            ).toLocaleDateString(
                              "en-IN"
                            )
                          )
                        : "—"
                    }</td>
                  </tr>

                  <tr>
                    <td>LOP Days</td>
                    <td>${printLopDays}</td>
                  </tr>

                </table>

              </div>

              <div class="section">

                <div class="section-title">
                  Payroll &amp; Statutory Information
                </div>

                <table>

                  <tr>
                    <th>Field</th>
                    <th>Details</th>
                  </tr>

                  <tr>
                    <td>UAN Number</td>
                    <td>${escapeHtml(payrollIdentity?.uan_number || "—")}</td>
                  </tr>

                  <tr>
                    <td>Aadhaar Number</td>
                    <td>${escapeHtml(payrollIdentity?.aadhaar_number || "—")}</td>
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

                </table>

              </div>

              <div class="section">

                <div class="section-title">
                  Salary Details
                </div>

                <table>

                  <tr>
                    <th>
                      Component
                    </th>

                    <th class="right">
                      Amount
                    </th>
                  </tr>

                  <tr>
                    <td>
                      Basic Salary
                    </td>

                    <td class="right">
                      ${escapeHtml(
                        formatCurrency(
                          Number(
                            slip.basic_salary
                          )
                        )
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Total Allowances
                    </td>

                    <td class="right">
                      +${escapeHtml(
                        formatCurrency(
                          Number(
                            slip.total_allowances
                          )
                        )
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Gross Salary
                    </td>

                    <td class="right">
                      ${escapeHtml(
                        formatCurrency(
                          grossSalary
                        )
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Total Deductions
                    </td>

                    <td class="right">
                      -${escapeHtml(
                        formatCurrency(
                          Number(
                            slip.total_deductions
                          )
                        )
                      )}
                    </td>
                  </tr>

                </table>

              </div>

              <div class="net-box">

                <div class="net-label">
                  NET SALARY
                </div>

                <div class="net-value">
                  ${escapeHtml(
                    formatCurrency(
                      Number(
                        slip.net_salary
                      )
                    )
                  )}
                </div>

              </div>

              <div class="notes">

                <div>
                  • This is a computer-generated salary slip.
                </div>

                <div>
                  • Salary information is confidential and intended only for the employee.
                </div>

                <div>
                  • For any payroll discrepancy, please contact HR/Admin.
                </div>

              </div>

              <div class="signatures">

                <div class="signature">
                  Employee
                </div>

                <div class="signature">
                  Authorized HR / Admin
                </div>

              </div>

              <div class="footer">

                <div>
                  ${escapeHtml(
                    companyName
                  )}
                </div>

                <div>
                  Generated on
                  ${escapeHtml(
                    new Date().toLocaleDateString(
                      "en-IN"
                    )
                  )}
                </div>

              </div>

            </div>

            <script>

              window.addEventListener(
                "load",
                function () {
                  setTimeout(
                    function () {
                      window.print();

                      window.addEventListener(
                        "afterprint",
                        function () {
                          window.close();
                        }
                      );
                    },
                    350
                  );
                }
              );

            </script>

          </body>
        </html>
      `);

      printWindow.document.close();
    } catch (err) {
      console.error(
        "Salary slip print error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to print salary slip."
      );
    } finally {
      setPrintLoading(null);
    }
  }

  /* ============================================================
     LOADING
  ============================================================ */

  if (employeeStatusLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employeeStatus?.isEmployee) {
    return null;
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <DashboardLayout>

      <div className="min-w-0 space-y-6 overflow-x-hidden">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="min-w-0">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ReceiptIndianRupee className="h-5 w-5" />
            </div>

            <div className="min-w-0">

              <h1 className="truncate text-xl font-bold sm:text-2xl">
                My Salary Slips
              </h1>

              <p className="text-sm text-muted-foreground">
                View, download and print your salary statements.
              </p>

            </div>

          </div>

        </div>

        {/* =====================================================
            SECURITY
        ====================================================== */}

        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">

          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <div className="min-w-0">

            <p className="text-sm font-semibold">
              Private employee information
            </p>

            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
              Only salary slips belonging to your authenticated
              employee account are available here.
            </p>

          </div>

        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            CURRENT PAYROLL / STATUTORY PROFILE
            Same source of truth as Employee Edit -> Salary.
        ====================================================== */}

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>

                <h2 className="text-lg font-bold">
                  Payroll & Statutory Information
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Same employee payroll/KYC details used by HR in
                  Employee Edit → Salary.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() => void savePayrollIdentity()}
              disabled={savingPayrollIdentity}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingPayrollIdentity ? "Saving..." : "Save Details"}
            </button>

          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            {[
              ["UAN Number", "uan_number", "Enter UAN number"],
              ["Aadhaar Number", "aadhaar_number", "Enter Aadhaar number"],
              ["PAN Number", "pan_number", "Enter PAN number"],
              ["ESI Number", "esi_number", "Enter ESI number"],
              ["Insurance Number", "insurance_number", "Enter insurance number"],
              ["Bank Name", "bank_name", "Enter bank name"],
              ["Bank Account Number", "bank_account_number", "Enter bank account number"],
              ["IFSC Code", "ifsc_code", "Enter IFSC code"],
            ].map(([label, key, placeholder]) => (

              <div key={key} className="space-y-2">

                <label
                  htmlFor={`salary-slip-payroll-${key}`}
                  className="text-sm font-medium"
                >
                  {label}
                </label>

                <input
                  id={`salary-slip-payroll-${key}`}
                  value={
                    payrollIdentityForm[
                      key as keyof typeof payrollIdentityForm
                    ]
                  }
                  onChange={(event) =>
                    setPayrollIdentityForm((prev) => ({
                      ...prev,
                      [key]: event.target.value,
                    }))
                  }
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

              </div>

            ))}

          </div>

          {payrollIdentityMessage && (
            <div className="mt-4 rounded-xl border border-border bg-background p-3 text-sm">
              {payrollIdentityMessage}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-border bg-background p-4">

            <div className="flex items-center gap-2">

              <FileCheck2 className="h-5 w-5 text-primary" />

              <div>

                <h3 className="font-semibold">
                  Payroll / KYC Documents
                </h3>

                <p className="text-xs text-muted-foreground">
                  Uploaded documents can be opened or replaced.
                  Delete is locked for employees.
                </p>

              </div>

            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">

              {REQUIRED_PAYROLL_DOCUMENTS.map((requiredDocument) => {

                const payrollDocument = payrollDocuments.find(
                  (item) =>
                    item.document_type === requiredDocument.type
                );

                return (

                  <div
                    key={requiredDocument.type}
                    className="rounded-xl border border-border bg-card p-4"
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

                      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold">
                        {payrollDocument ? "Uploaded" : "Pending"}
                      </span>

                    </div>

                    {payrollDocument && (
                      <div className="mt-3 truncate text-xs text-muted-foreground">
                        {payrollDocument.document_name}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">

                      <input
                        id={`salary-slip-payroll-doc-${documentTypeSafe(
                          requiredDocument.type
                        )}`}
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

                      <button
                        type="button"
                        disabled={
                          uploadingPayrollDocument ===
                          requiredDocument.type
                        }
                        onClick={() =>
                          window.document
                            .getElementById(
                              `salary-slip-payroll-doc-${documentTypeSafe(
                                requiredDocument.type
                              )}`
                            )
                            ?.click()
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:bg-muted disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingPayrollDocument ===
                        requiredDocument.type
                          ? "Uploading..."
                          : payrollDocument
                            ? "Replace"
                            : "Upload"}
                      </button>

                      {payrollDocument && (
                        <button
                          type="button"
                          onClick={() =>
                            void openPayrollDocument(
                              payrollDocument
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                          Open
                        </button>
                      )}

                    </div>

                  </div>

                );

              })}

            </div>

            {payrollDocumentMessage && (
              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                {payrollDocumentMessage}
              </div>
            )}

          </div>

          <div className="mt-6">

            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Current Salary Structure
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              Read-only on the employee dashboard. HR/Admin maintains this
              structure in Employee Edit → Salary.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {[
                [
                  "Basic Salary",
                  formatCurrency(
                    Number(currentSalaryStructure?.basic_salary ?? 0)
                  ),
                ],
                [
                  "HRA",
                  formatCurrency(
                    Number(currentSalaryStructure?.hra ?? 0)
                  ),
                ],
                [
                  "Transport Allowance",
                  formatCurrency(
                    Number(
                      currentSalaryStructure?.transport_allowance ?? 0
                    )
                  ),
                ],
                [
                  "Medical Allowance",
                  formatCurrency(
                    Number(
                      currentSalaryStructure?.medical_allowance ?? 0
                    )
                  ),
                ],
                [
                  "Other Allowances",
                  formatCurrency(
                    Number(
                      currentSalaryStructure?.other_allowances ?? 0
                    )
                  ),
                ],
                [
                  "Tax Deduction",
                  formatCurrency(
                    Number(
                      currentSalaryStructure?.tax_deduction ?? 0
                    )
                  ),
                ],
                [
                  "PF Deduction",
                  formatCurrency(
                    Number(
                      currentSalaryStructure?.pf_deduction ?? 0
                    )
                  ),
                ],
                [
                  "Net Structure",
                  formatCurrency(
                    Number(currentSalaryStructure?.basic_salary ?? 0) +
                    Number(currentSalaryStructure?.hra ?? 0) +
                    Number(
                      currentSalaryStructure?.transport_allowance ?? 0
                    ) +
                    Number(
                      currentSalaryStructure?.medical_allowance ?? 0
                    ) +
                    Number(
                      currentSalaryStructure?.other_allowances ?? 0
                    ) -
                    Number(currentSalaryStructure?.tax_deduction ?? 0) -
                    Number(currentSalaryStructure?.pf_deduction ?? 0)
                  ),
                ],
              ].map(([label, value]) => (

                <div
                  key={label}
                  className="rounded-xl border border-border bg-background p-4"
                >

                  <p className="text-xs text-muted-foreground">
                    {label}
                  </p>

                  <p className="mt-1 font-bold">
                    {value}
                  </p>

                </div>

              ))}

            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">

              <div className="rounded-xl border border-border bg-background p-4">

                <p className="text-xs text-muted-foreground">
                  Effective From
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {currentSalaryStructure?.effective_from
                    ? new Date(
                        currentSalaryStructure.effective_from
                      ).toLocaleDateString("en-IN")
                    : "Not assigned"}
                </p>

              </div>

              <div className="rounded-xl border border-border bg-background p-4">

                <p className="text-xs text-muted-foreground">
                  Selected Slip LOP Days
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {selectedSlip
                    ? `${selectedLopDays} day(s)`
                    : "Open a salary slip to view LOP days"}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            SUMMARY
        ====================================================== */}

        {!loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <FileText className="h-5 w-5" />
                </div>

                <div>

                  <p className="text-xs text-muted-foreground">
                    Available Slips
                  </p>

                  <p className="text-2xl font-bold">
                    {slips.length}
                  </p>

                </div>

              </div>

            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <ReceiptIndianRupee className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs text-muted-foreground">
                    Total Paid
                  </p>

                  <p className="truncate text-xl font-bold sm:text-2xl">
                    {formatCurrency(
                      totalPaid
                    )}
                  </p>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* =====================================================
            LATEST
        ====================================================== */}

        {latestSlip && !loading && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  Latest Salary Slip
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {MONTHS[
                    latestSlip.month - 1
                  ]}{" "}
                  {latestSlip.year}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Net Salary:{" "}
                  <span className="font-bold text-foreground">
                    {formatCurrency(
                      Number(
                        latestSlip.net_salary
                      )
                    )}
                  </span>
                </p>

              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

                <button
                  type="button"
                  onClick={() =>
                    setSelectedSlip(
                      latestSlip
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold transition hover:bg-muted"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void printSalarySlip(
                      latestSlip
                    )
                  }
                  disabled={
                    printLoading ===
                    latestSlip.id
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold transition hover:bg-muted disabled:opacity-50"
                >

                  {printLoading ===
                  latestSlip.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}

                  Print

                </button>

                <button
                  type="button"
                  onClick={() =>
                    void downloadSalarySlip(
                      latestSlip
                    )
                  }
                  disabled={
                    downloadLoading ===
                    latestSlip.id
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >

                  {downloadLoading ===
                  latestSlip.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}

                  Download PDF

                </button>

              </div>

            </div>

          </div>
        )}

        {/* =====================================================
            SLIP LIST
        ====================================================== */}

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : slips.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 text-center">

            <FileText className="h-12 w-12 text-muted-foreground" />

            <h3 className="mt-4 text-lg font-semibold">
              No salary slips available
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Your processed or paid salary slips will appear
              here after payroll is generated by HR.
            </p>

          </div>
        ) : (
          <div className="grid gap-4">

            {slips.map((slip) => (
              <div
                key={slip.id}
                className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
              >

                {/* TOP */}

                <div className="flex min-w-0 items-start justify-between gap-3">

                  <div className="min-w-0">

                    <div className="flex items-center gap-2">

                      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />

                      <h3 className="truncate font-bold">
                        {MONTHS[
                          slip.month - 1
                        ]}{" "}
                        {slip.year}
                      </h3>

                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      Net Salary
                    </p>

                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(
                        Number(
                          slip.net_salary
                        )
                      )}
                    </p>

                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(
                      slip.status
                    )}`}
                  >
                    {formatStatus(
                      slip.status
                    )}
                  </span>

                </div>

                {/* BREAKDOWN */}

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <div className="rounded-xl bg-muted/50 p-3">

                    <p className="text-xs text-muted-foreground">
                      Basic Salary
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatCurrency(
                        Number(
                          slip.basic_salary
                        )
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-muted/50 p-3">

                    <p className="text-xs text-muted-foreground">
                      Allowances
                    </p>

                    <p className="mt-1 font-semibold text-emerald-600">
                      +
                      {formatCurrency(
                        Number(
                          slip.total_allowances
                        )
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-muted/50 p-3">

                    <p className="text-xs text-muted-foreground">
                      Deductions
                    </p>

                    <p className="mt-1 font-semibold text-destructive">
                      -
                      {formatCurrency(
                        Number(
                          slip.total_deductions
                        )
                      )}
                    </p>

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="mt-4 border-t border-border pt-4">

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSlip(
                          slip
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void printSalarySlip(
                          slip
                        )
                      }
                      disabled={
                        printLoading ===
                        slip.id
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
                    >

                      {printLoading ===
                      slip.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4" />
                      )}

                      Print

                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void downloadSalarySlip(
                          slip
                        )
                      }
                      disabled={
                        downloadLoading ===
                        slip.id
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                    >

                      {downloadLoading ===
                      slip.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}

                      Download PDF

                    </button>

                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {slip.paid_at
                      ? `Paid ${new Date(
                          slip.paid_at
                        ).toLocaleDateString(
                          "en-IN"
                        )}`
                      : "Payroll processed"}
                  </p>

                </div>

              </div>
            ))}

          </div>
        )}

        {/* =====================================================
            VIEW MODAL
        ====================================================== */}

        {selectedSlip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">

            <div
              className="absolute inset-0 bg-black/40"
              onClick={() =>
                setSelectedSlip(null)
              }
            />

            <div className="relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-4 shadow-2xl sm:p-6">

              {/* HEADER */}

              <div className="flex items-start justify-between gap-4 border-b border-border pb-5">

                <div className="min-w-0">

                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    Salary Slip
                  </p>

                  <h2 className="mt-1 truncate text-xl font-bold">
                    {MONTHS[
                      selectedSlip.month - 1
                    ]}{" "}
                    {selectedSlip.year}
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedSlip(null)
                  }
                  className="shrink-0 rounded-lg p-2 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

              {/* EMPLOYEE */}

              <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">

                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Employee
                </div>

                <div className="mt-2 font-semibold">
                  {user?.user_metadata?.full_name ||
                    "Employee"}
                </div>

                <div className="mt-1 break-all text-sm text-muted-foreground">
                  {user?.email}
                </div>

              </div>

              {/* PAYROLL / STATUTORY INFORMATION */}

              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">

                <div className="flex items-center gap-2">

                  <ShieldCheck className="h-5 w-5 text-primary" />

                  <div>

                    <p className="text-sm font-bold">
                      Payroll &amp; Statutory Information
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Same information maintained in Employee Edit → Salary.
                    </p>

                  </div>

                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                  {[
                    ["UAN Number", payrollIdentity?.uan_number],
                    ["Aadhaar Number", payrollIdentity?.aadhaar_number],
                    ["PAN Number", payrollIdentity?.pan_number],
                    ["ESI Number", payrollIdentity?.esi_number],
                    [
                      "Insurance Number",
                      payrollIdentity?.insurance_number,
                    ],
                    ["Bank Name", payrollIdentity?.bank_name],
                    [
                      "Bank Account Number",
                      payrollIdentity?.bank_account_number,
                    ],
                    ["IFSC Code", payrollIdentity?.ifsc_code],
                  ].map(([label, value]) => (

                    <div
                      key={String(label)}
                      className="rounded-lg border border-border bg-background p-3"
                    >

                      <p className="text-xs text-muted-foreground">
                        {label}
                      </p>

                      <p className="mt-1 break-all text-sm font-semibold">
                        {value || "—"}
                      </p>

                    </div>

                  ))}

                </div>

              </div>

              {/* LOP DAYS FOR THIS SALARY SLIP */}

              <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      LOP Days
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Approved unpaid leave for this salary-slip month.
                    </p>

                  </div>

                  <div className="text-xl font-black">
                    {selectedLopDays}
                  </div>

                </div>

              </div>

              {/* CURRENT SALARY STRUCTURE */}

              <div className="mt-5 rounded-xl border border-border bg-background p-4">

                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Current Salary Structure
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">

                  {[
                    [
                      "Basic Salary",
                      formatCurrency(
                        Number(currentSalaryStructure?.basic_salary ?? selectedSlip.basic_salary ?? 0)
                      ),
                    ],
                    [
                      "HRA",
                      formatCurrency(
                        Number(currentSalaryStructure?.hra ?? 0)
                      ),
                    ],
                    [
                      "Transport Allowance",
                      formatCurrency(
                        Number(currentSalaryStructure?.transport_allowance ?? 0)
                      ),
                    ],
                    [
                      "Medical Allowance",
                      formatCurrency(
                        Number(currentSalaryStructure?.medical_allowance ?? 0)
                      ),
                    ],
                    [
                      "Other Allowances",
                      formatCurrency(
                        Number(currentSalaryStructure?.other_allowances ?? 0)
                      ),
                    ],
                    [
                      "Tax Deduction",
                      formatCurrency(
                        Number(currentSalaryStructure?.tax_deduction ?? 0)
                      ),
                    ],
                    [
                      "PF Deduction",
                      formatCurrency(
                        Number(currentSalaryStructure?.pf_deduction ?? 0)
                      ),
                    ],
                    [
                      "Effective From",
                      currentSalaryStructure?.effective_from
                        ? new Date(
                            currentSalaryStructure.effective_from
                          ).toLocaleDateString("en-IN")
                        : "—",
                    ],
                  ].map(([label, value]) => (

                    <div
                      key={label}
                      className="rounded-lg border border-border bg-muted/20 p-3"
                    >

                      <p className="text-xs text-muted-foreground">
                        {label}
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {value}
                      </p>

                    </div>

                  ))}

                </div>

              </div>

              {/* SALARY */}

              <div className="mt-5 grid gap-3">

                <div className="rounded-xl border border-border p-4">

                  <div className="text-sm text-muted-foreground">
                    Basic Salary
                  </div>

                  <div className="mt-1 text-lg font-bold">
                    {formatCurrency(
                      Number(
                        selectedSlip.basic_salary
                      )
                    )}
                  </div>

                </div>

                <div className="rounded-xl border border-border p-4">

                  <div className="text-sm text-muted-foreground">
                    Total Allowances
                  </div>

                  <div className="mt-1 text-lg font-bold text-emerald-600">
                    +
                    {formatCurrency(
                      Number(
                        selectedSlip.total_allowances
                      )
                    )}
                  </div>

                </div>

                <div className="rounded-xl border border-border p-4">

                  <div className="text-sm text-muted-foreground">
                    Total Deductions
                  </div>

                  <div className="mt-1 text-lg font-bold text-destructive">
                    -
                    {formatCurrency(
                      Number(
                        selectedSlip.total_deductions
                      )
                    )}
                  </div>

                </div>

              </div>

              {/* NET */}

              <div className="mt-5 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                  <span className="text-lg font-bold">
                    Net Salary
                  </span>

                  <span className="text-2xl font-black text-primary">
                    {formatCurrency(
                      Number(
                        selectedSlip.net_salary
                      )
                    )}
                  </span>

                </div>

              </div>

              {/* ACTIONS */}

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">

                <button
                  type="button"
                  onClick={() =>
                    void printSalarySlip(
                      selectedSlip
                    )
                  }
                  disabled={
                    printLoading ===
                    selectedSlip.id
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 font-bold hover:bg-muted disabled:opacity-50"
                >

                  {printLoading ===
                  selectedSlip.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}

                  Print Salary Slip

                </button>

                <button
                  type="button"
                  onClick={() =>
                    void downloadSalarySlip(
                      selectedSlip
                    )
                  }
                  disabled={
                    downloadLoading ===
                    selectedSlip.id
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >

                  {downloadLoading ===
                  selectedSlip.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}

                  Download PDF

                </button>

              </div>

              <div className="mt-5 flex items-center gap-3 rounded-xl bg-muted/50 p-4 text-xs leading-5 text-muted-foreground">

                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />

                <span>
                  This is a computer-generated salary slip for
                  the authenticated employee account.
                </span>

              </div>

            </div>

          </div>
        )}

      </div>

    </DashboardLayout>
  );
}