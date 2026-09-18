import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  LockKeyhole,
  Printer,
  ReceiptIndianRupee,
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