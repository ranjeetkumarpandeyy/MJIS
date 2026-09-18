import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useIsAdminOrHR } from "@/hooks/useUserRole";

type WorkEnquiry = {
  id: string;
  enquiry_no: string;
  company_name: string;
  contact_person: string;
  mobile: string;
  email: string | null;
  project_name: string | null;
  location: string | null;
  industry: string | null;
  service: string | null;
  duration: string | null;
  manpower_required: number | null;
  start_date: string | null;
  budget: number | null;
  details: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "site_assessment",
  "quotation_sent",
  "negotiation",
  "approved",
  "in_progress",
  "completed",
  "cancelled",
];

function statusLabel(status: string) {
  return status
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function statusClass(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-700";

    case "contacted":
      return "bg-yellow-100 text-yellow-700";

    case "site_assessment":
      return "bg-purple-100 text-purple-700";

    case "quotation_sent":
      return "bg-indigo-100 text-indigo-700";

    case "negotiation":
      return "bg-orange-100 text-orange-700";

    case "approved":
      return "bg-green-100 text-green-700";

    case "in_progress":
      return "bg-cyan-100 text-cyan-700";

    case "completed":
      return "bg-emerald-100 text-emerald-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default function WorkEnquiries() {
  const navigate = useNavigate();

  const {
    isAdminOrHR,
    isLoading: roleLoading,
  } = useIsAdminOrHR();

  const [enquiries, setEnquiries] = useState<
    WorkEnquiry[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [selected, setSelected] =
    useState<WorkEnquiry | null>(null);

  const [error, setError] = useState("");

  async function loadEnquiries(
    showRefresh = false
  ) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const { data, error: queryError } =
      await supabase
        .from("work_enquiries")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (queryError) {
      console.error(
        "Work enquiries load error:",
        queryError
      );

      setError(
        queryError.message ||
          "Unable to load work enquiries."
      );

      setEnquiries([]);
    } else {
      setEnquiries(
        (data ?? []) as WorkEnquiry[]
      );
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (
      !roleLoading &&
      !isAdminOrHR
    ) {
      navigate("/dashboard", {
        replace: true,
      });
    }
  }, [
    roleLoading,
    isAdminOrHR,
    navigate,
  ]);

  useEffect(() => {
    if (
      !roleLoading &&
      isAdminOrHR
    ) {
      void loadEnquiries();
    }
  }, [
    roleLoading,
    isAdminOrHR,
  ]);

  async function updateStatus(
    id: string,
    status: string
  ) {
    setError("");

    const updatedAt =
      new Date().toISOString();

    const { error: updateError } =
      await supabase
        .from("work_enquiries")
        .update({
          status,
          updated_at: updatedAt,
        })
        .eq("id", id);

    if (updateError) {
      console.error(
        "Work enquiry update error:",
        updateError
      );

      setError(
        updateError.message ||
          "Unable to update enquiry."
      );

      return;
    }

    setEnquiries((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              updated_at: updatedAt,
            }
          : item
      )
    );

    setSelected((current) =>
      current?.id === id
        ? {
            ...current,
            status,
            updated_at: updatedAt,
          }
        : current
    );
  }

  const filteredEnquiries = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return enquiries.filter((item) => {
      const matchesSearch =
        !query ||
        item.enquiry_no
          .toLowerCase()
          .includes(query) ||
        item.company_name
          .toLowerCase()
          .includes(query) ||
        item.contact_person
          .toLowerCase()
          .includes(query) ||
        (
          item.project_name ?? ""
        )
          .toLowerCase()
          .includes(query) ||
        (
          item.mobile ?? ""
        )
          .toLowerCase()
          .includes(query) ||
        (
          item.location ?? ""
        )
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        item.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    enquiries,
    search,
    statusFilter,
  ]);

  const counts = useMemo(() => {
    return {
      total: enquiries.length,

      new: enquiries.filter(
        (item) =>
          item.status === "new"
      ).length,

      contacted: enquiries.filter(
        (item) =>
          item.status === "contacted"
      ).length,

      quotation: enquiries.filter(
        (item) =>
          item.status ===
          "quotation_sent"
      ).length,

      approved: enquiries.filter(
        (item) =>
          item.status === "approved"
      ).length,

      completed: enquiries.filter(
        (item) =>
          item.status === "completed"
      ).length,
    };
  }, [enquiries]);

  if (roleLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminOrHR) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="min-w-0">

          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Work Enquiries
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage project and industrial service
            enquiries submitted through the public website.
          </p>

        </div>

        <button
          type="button"
          onClick={() =>
            void loadEnquiries(true)
          }
          disabled={refreshing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50 sm:w-auto"
        >
          <RefreshCw
            className={
              refreshing
                ? "h-4 w-4 animate-spin"
                : "h-4 w-4"
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

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
          METRICS
      ====================================================== */}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">

        <MetricCard
          label="Total"
          value={counts.total}
        />

        <MetricCard
          label="New"
          value={counts.new}
          valueClass="text-blue-600"
        />

        <MetricCard
          label="Contacted"
          value={counts.contacted}
          valueClass="text-yellow-600"
        />

        <MetricCard
          label="Quotation"
          value={counts.quotation}
          valueClass="text-indigo-600"
        />

        <MetricCard
          label="Approved"
          value={counts.approved}
          valueClass="text-green-600"
        />

        <MetricCard
          label="Completed"
          value={counts.completed}
          valueClass="text-emerald-600"
        />

      </div>

      {/* =====================================================
          FILTERS
      ====================================================== */}

      <div className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">

          <div className="relative min-w-0 flex-1">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="text"
              placeholder="Search company, contact, project..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              className="w-full min-w-0 rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary"
            />

          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none sm:w-52"
          >

            <option value="all">
              All Status
            </option>

            {STATUS_OPTIONS.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {statusLabel(status)}
                </option>
              )
            )}

          </select>

        </div>

      </div>

      {/* =====================================================
          LOADING
      ====================================================== */}

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 text-center">

          <Building2 className="h-12 w-12 text-muted-foreground" />

          <h3 className="mt-4 text-lg font-semibold">
            No work enquiries found
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            New enquiries submitted from the public
            website will appear here automatically.
          </p>

        </div>
      ) : (
        <>
          {/* =================================================
              DESKTOP TABLE
          ================================================== */}

          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">

            <div className="w-full overflow-x-auto">

              <table className="w-full table-fixed">

                <thead className="border-b border-border bg-muted/40">

                  <tr>

                    <th className="w-[15%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Enquiry
                    </th>

                    <th className="w-[15%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Company
                    </th>

                    <th className="w-[15%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Contact
                    </th>

                    <th className="w-[15%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Service
                    </th>

                    <th className="w-[12%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Location
                    </th>

                    <th className="w-[10%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date
                    </th>

                    <th className="w-[11%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>

                    <th className="w-[7%] px-4 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      View
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredEnquiries.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >

                        <td className="px-4 py-4 align-top">
                          <div className="truncate font-semibold">
                            {item.enquiry_no}
                          </div>

                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {item.project_name ||
                              "No project"}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="truncate font-medium">
                            {item.company_name}
                          </div>

                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {item.industry ||
                              "Industry not specified"}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="truncate font-medium">
                            {item.contact_person}
                          </div>

                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {item.mobile}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="truncate text-sm">
                            {item.service || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex min-w-0 items-center gap-1">

                            {item.location && (
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}

                            <span className="truncate text-sm">
                              {item.location || "—"}
                            </span>

                          </div>
                        </td>

                        <td className="px-4 py-4 align-top text-sm">
                          {formatDate(
                            item.created_at
                          )}
                        </td>

                        <td className="px-4 py-4 align-top">

                          <select
                            value={item.status}
                            onChange={(event) =>
                              void updateStatus(
                                item.id,
                                event.target.value
                              )
                            }
                            className={`max-w-full rounded-full border-0 px-2.5 py-1.5 text-xs font-bold outline-none ${statusClass(
                              item.status
                            )}`}
                          >

                            {STATUS_OPTIONS.map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {statusLabel(
                                    status
                                  )}
                                </option>
                              )
                            )}

                          </select>

                        </td>

                        <td className="px-4 py-4 text-right align-top">

                          <button
                            type="button"
                            onClick={() =>
                              setSelected(item)
                            }
                            aria-label={`View ${item.enquiry_no}`}
                            className="inline-flex items-center justify-center rounded-lg border border-border p-2.5 transition hover:bg-muted"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

          {/* =================================================
              MOBILE CARDS
          ================================================== */}

          <div className="grid gap-4 md:hidden">

            {filteredEnquiries.map(
              (item) => (
                <div
                  key={item.id}
                  className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm"
                >

                  {/* TOP */}

                  <div className="flex min-w-0 items-start justify-between gap-3">

                    <div className="min-w-0">

                      <div className="truncate text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {item.enquiry_no}
                      </div>

                      <h3 className="mt-1 truncate text-base font-bold">
                        {item.company_name}
                      </h3>

                      {item.project_name && (
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {item.project_name}
                        </p>
                      )}

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelected(item)
                      }
                      aria-label={`View ${item.enquiry_no}`}
                      className="shrink-0 rounded-xl border border-border p-2.5 hover:bg-muted"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                  </div>

                  {/* INFO */}

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm">

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Users className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">

                        <div className="text-xs text-muted-foreground">
                          Contact Person
                        </div>

                        <div className="truncate font-medium">
                          {item.contact_person}
                        </div>

                      </div>

                    </div>

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Phone className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">

                        <div className="text-xs text-muted-foreground">
                          Mobile
                        </div>

                        <a
                          href={`tel:${item.mobile}`}
                          className="block truncate font-medium text-primary"
                        >
                          {item.mobile}
                        </a>

                      </div>

                    </div>

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">

                        <div className="text-xs text-muted-foreground">
                          Service
                        </div>

                        <div className="truncate font-medium">
                          {item.service || "—"}
                        </div>

                      </div>

                    </div>

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <MapPin className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">

                        <div className="text-xs text-muted-foreground">
                          Location
                        </div>

                        <div className="truncate font-medium">
                          {item.location || "—"}
                        </div>

                      </div>

                    </div>

                  </div>

                  {/* FOOTER */}

                  <div className="mt-5 border-t border-border pt-4">

                    <div className="text-xs text-muted-foreground">
                      Status
                    </div>

                    <select
                      value={item.status}
                      onChange={(event) =>
                        void updateStatus(
                          item.id,
                          event.target.value
                        )
                      }
                      className={`mt-2 w-full rounded-xl border-0 px-3 py-3 text-sm font-bold outline-none ${statusClass(
                        item.status
                      )}`}
                    >

                      {STATUS_OPTIONS.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {statusLabel(status)}
                          </option>
                        )
                      )}

                    </select>

                    <div className="mt-3 text-xs text-muted-foreground">
                      Submitted{" "}
                      {formatDate(
                        item.created_at
                      )}
                    </div>

                  </div>

                </div>
              )
            )}

          </div>
        </>
      )}

      {/* =====================================================
          DETAIL DRAWER
      ====================================================== */}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">

          <div
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              setSelected(null)
            }
          />

          <div className="relative h-full w-full max-w-2xl overflow-y-auto overflow-x-hidden bg-background p-4 shadow-2xl sm:p-6">

            {/* HEADER */}

            <div className="flex items-start justify-between gap-4 border-b border-border pb-5">

              <div className="min-w-0">

                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Work Enquiry
                </div>

                <h2 className="mt-1 break-all text-lg font-bold sm:text-xl">
                  {selected.enquiry_no}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="shrink-0 rounded-lg p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="mt-6 space-y-6">

              {/* STATUS */}

              <div className="rounded-2xl border border-border p-4">

                <div className="text-sm text-muted-foreground">
                  Current Status
                </div>

                <select
                  value={selected.status}
                  onChange={(event) =>
                    void updateStatus(
                      selected.id,
                      event.target.value
                    )
                  }
                  className={`mt-3 w-full rounded-xl border-0 px-4 py-3 text-sm font-bold outline-none ${statusClass(
                    selected.status
                  )}`}
                >

                  {STATUS_OPTIONS.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {statusLabel(status)}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* CONTACT */}

              <section>

                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Contact Information
                </h3>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">

                  <InfoBox
                    label="Company"
                    value={
                      selected.company_name
                    }
                    icon={
                      <Building2 className="h-4 w-4" />
                    }
                  />

                  <InfoBox
                    label="Contact Person"
                    value={
                      selected.contact_person
                    }
                    icon={
                      <Users className="h-4 w-4" />
                    }
                  />

                  <InfoBox
                    label="Mobile"
                    value={selected.mobile}
                    icon={
                      <Phone className="h-4 w-4" />
                    }
                    href={`tel:${selected.mobile}`}
                  />

                  <InfoBox
                    label="Email"
                    value={
                      selected.email || "—"
                    }
                    icon={
                      <Mail className="h-4 w-4" />
                    }
                    href={
                      selected.email
                        ? `mailto:${selected.email}`
                        : undefined
                    }
                  />

                </div>

              </section>

              {/* PROJECT */}

              <section>

                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Project Information
                </h3>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">

                  <InfoBox
                    label="Project Name"
                    value={
                      selected.project_name ||
                      "—"
                    }
                  />

                  <InfoBox
                    label="Location"
                    value={
                      selected.location || "—"
                    }
                    icon={
                      <MapPin className="h-4 w-4" />
                    }
                  />

                  <InfoBox
                    label="Industry"
                    value={
                      selected.industry || "—"
                    }
                  />

                  <InfoBox
                    label="Service"
                    value={
                      selected.service || "—"
                    }
                  />

                  <InfoBox
                    label="Duration"
                    value={
                      selected.duration || "—"
                    }
                    icon={
                      <Clock3 className="h-4 w-4" />
                    }
                  />

                  <InfoBox
                    label="Start Date"
                    value={
                      selected.start_date
                        ? formatDate(
                            selected.start_date
                          )
                        : "—"
                    }
                  />

                  <InfoBox
                    label="Manpower Required"
                    value={
                      selected.manpower_required !==
                      null
                        ? String(
                            selected.manpower_required
                          )
                        : "—"
                    }
                  />

                  <InfoBox
                    label="Budget"
                    value={
                      selected.budget !== null
                        ? `₹${selected.budget.toLocaleString(
                            "en-IN"
                          )}`
                        : "—"
                    }
                  />

                </div>

              </section>

              {/* DETAILS */}

              <InfoBox
                label="Project Details"
                value={
                  selected.details ||
                  "No project details were provided."
                }
                multiline
              />

              {/* ACTIONS */}

              <div className="grid gap-3 sm:grid-cols-2">

                <a
                  href={`tel:${selected.mobile}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition hover:opacity-90"
                >
                  <Phone className="h-4 w-4" />
                  Call Contact
                </a>

                {selected.email ? (
                  <a
                    href={`mailto:${selected.email}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 font-bold transition hover:bg-muted"
                  >
                    <Mail className="h-4 w-4" />
                    Send Email
                  </a>
                ) : (
                  <div className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
                    No Email
                  </div>
                )}

              </div>

              {selected.status ===
                "completed" && (
                <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  This enquiry has been completed.
                </div>
              )}

              {selected.status ===
                "cancelled" && (
                <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                  <XCircle className="h-5 w-5 shrink-0" />
                  This enquiry has been cancelled.
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

/* =============================================================
   METRIC CARD
============================================================= */

function MetricCard({
  label,
  value,
  valueClass = "text-foreground",
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">

      <div className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
        {label}
      </div>

      <div
        className={`mt-2 text-2xl font-bold sm:text-3xl ${valueClass}`}
      >
        {value}
      </div>

    </div>
  );
}

/* =============================================================
   INFO BOX
============================================================= */

function InfoBox({
  label,
  value,
  icon,
  href,
  multiline = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  href?: string;
  multiline?: boolean;
}) {
  const content = (
    <>

      <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">

        {icon && (
          <span className="shrink-0">
            {icon}
          </span>
        )}

        {label}

      </div>

      <div
        className={`mt-2 ${
          multiline
            ? "whitespace-pre-wrap leading-7"
            : "break-words"
        } font-semibold`}
      >
        {value}
      </div>

    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="min-w-0 rounded-xl border border-border p-4 transition hover:bg-muted"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="min-w-0 rounded-xl border border-border p-4">
      {content}
    </div>
  );
}