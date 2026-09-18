import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useIsAdminOrHR } from "@/hooks/useUserRole";

type JobApplication = {
  id: string;
  application_no: string;
  full_name: string;
  mobile: string;
  email: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  district: string | null;
  state: string | null;
  trade: string | null;
  position: string | null;
  experience_years: number | null;
  expected_salary: number | null;
  availability: string | null;
  previous_company: string | null;
  skills: string | null;
  message: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = [
  "new",
  "under_review",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
  "on_hold",
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

    case "under_review":
      return "bg-yellow-100 text-yellow-700";

    case "shortlisted":
      return "bg-purple-100 text-purple-700";

    case "interview":
      return "bg-indigo-100 text-indigo-700";

    case "selected":
      return "bg-green-100 text-green-700";

    case "rejected":
      return "bg-red-100 text-red-700";

    case "on_hold":
      return "bg-orange-100 text-orange-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function Recruitment() {
  const navigate = useNavigate();

  const {
    isAdminOrHR,
    isLoading: roleLoading,
  } = useIsAdminOrHR();

  const [applications, setApplications] =
    useState<JobApplication[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [selected, setSelected] =
    useState<JobApplication | null>(null);

  const [error, setError] = useState("");

  async function loadApplications(
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
        .from("job_applications")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (queryError) {
      console.error(
        "Recruitment load error:",
        queryError
      );

      setError(queryError.message);
      setApplications([]);
    } else {
      setApplications(
        (data ?? []) as JobApplication[]
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
      void loadApplications();
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
        .from("job_applications")
        .update({
          status,
          updated_at: updatedAt,
        })
        .eq("id", id);

    if (updateError) {
      console.error(
        "Recruitment update error:",
        updateError
      );

      setError(updateError.message);
      return;
    }

    setApplications((current) =>
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

  const filteredApplications =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return applications.filter(
        (item) => {
          const matchesSearch =
            !query ||
            item.application_no
              .toLowerCase()
              .includes(query) ||
            item.full_name
              .toLowerCase()
              .includes(query) ||
            item.mobile
              .toLowerCase()
              .includes(query) ||
            (
              item.email ?? ""
            )
              .toLowerCase()
              .includes(query) ||
            (
              item.trade ?? ""
            )
              .toLowerCase()
              .includes(query) ||
            (
              item.position ?? ""
            )
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === "all" ||
            item.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      applications,
      search,
      statusFilter,
    ]);

  const counts = useMemo(
    () => ({
      total: applications.length,

      new: applications.filter(
        (item) =>
          item.status === "new"
      ).length,

      review: applications.filter(
        (item) =>
          item.status ===
          "under_review"
      ).length,

      shortlisted:
        applications.filter(
          (item) =>
            item.status ===
            "shortlisted"
        ).length,

      selected: applications.filter(
        (item) =>
          item.status ===
          "selected"
      ).length,

      rejected: applications.filter(
        (item) =>
          item.status ===
          "rejected"
      ).length,
    }),
    [applications]
  );

  if (roleLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminOrHR) {
    return null;
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-bold">
            Recruitment
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage job applications submitted
            from the public Careers section.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadApplications(true)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
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

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* METRICS */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">
            Total
          </div>
          <div className="mt-2 text-3xl font-bold">
            {counts.total}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">
            New
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {counts.new}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">
            Under Review
          </div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">
            {counts.review}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">
            Shortlisted
          </div>
          <div className="mt-2 text-3xl font-bold text-purple-600">
            {counts.shortlisted}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">
            Selected
          </div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            {counts.selected}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">
            Rejected
          </div>
          <div className="mt-2 text-3xl font-bold text-red-600">
            {counts.rejected}
          </div>
        </div>

      </div>

      {/* SEARCH */}

      <div className="rounded-2xl border bg-card p-4">

        <div className="flex flex-col gap-3 md:flex-row">

          <div className="relative flex-1">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search name, email, mobile, trade..."
              className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
            />

          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            className="rounded-xl border bg-background px-4 py-2.5 text-sm"
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

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border bg-card">

        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
            <UserRound className="h-12 w-12 text-muted-foreground" />

            <h3 className="mt-4 font-semibold">
              No applications found
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              New Careers submissions will appear
              here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1000px]">

              <thead className="border-b bg-muted/40">

                <tr>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                    Application
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                    Candidate
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                    Trade
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                    Experience
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                    Date
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredApplications.map(
                  (item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >

                      <td className="px-5 py-4">

                        <div className="font-semibold">
                          {item.application_no}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.position || "Position not specified"}
                        </div>

                      </td>

                      <td className="px-5 py-4">

                        <div className="font-medium">
                          {item.full_name}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.mobile}
                        </div>

                      </td>

                      <td className="px-5 py-4">
                        {item.trade || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {item.experience_years !== null
                          ? `${item.experience_years} yrs`
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {new Date(
                          item.created_at
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <select
                          value={item.status}
                          onChange={(e) =>
                            void updateStatus(
                              item.id,
                              e.target.value
                            )
                          }
                          className={`rounded-full border-0 px-3 py-1.5 text-xs font-bold ${statusClass(
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

                      </td>

                      <td className="px-5 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            setSelected(item)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* DETAIL DRAWER */}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">

          <div
            className="absolute inset-0 bg-black/30"
            onClick={() =>
              setSelected(null)
            }
          />

          <div className="relative h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-2xl">

            <div className="flex items-center justify-between border-b pb-5">

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Job Application
                </div>

                <h2 className="mt-1 text-xl font-bold">
                  {selected.application_no}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="mt-6 space-y-6">

              <div className="rounded-2xl border p-5">

                <div className="text-sm text-muted-foreground">
                  Status
                </div>

                <select
                  value={selected.status}
                  onChange={(e) =>
                    void updateStatus(
                      selected.id,
                      e.target.value
                    )
                  }
                  className="mt-3 rounded-xl border bg-background px-4 py-2.5 text-sm"
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

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    Full Name
                  </div>
                  <div className="mt-2 font-semibold">
                    {selected.full_name}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    Mobile
                  </div>
                  <a
                    href={`tel:${selected.mobile}`}
                    className="mt-2 flex items-center gap-2 font-semibold text-primary"
                  >
                    <Phone className="h-4 w-4" />
                    {selected.mobile}
                  </a>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    Email
                  </div>

                  {selected.email ? (
                    <a
                      href={`mailto:${selected.email}`}
                      className="mt-2 flex items-center gap-2 break-all font-semibold text-primary"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      {selected.email}
                    </a>
                  ) : (
                    <div className="mt-2 font-semibold">
                      —
                    </div>
                  )}
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    Date of Birth
                  </div>

                  <div className="mt-2 font-semibold">
                    {selected.dob
                      ? new Date(
                          selected.dob
                        ).toLocaleDateString(
                          "en-IN"
                        )
                      : "—"}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    Gender
                  </div>

                  <div className="mt-2 font-semibold">
                    {selected.gender || "—"}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    Trade
                  </div>

                  <div className="mt-2 font-semibold">
                    {selected.trade || "—"}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    Position
                  </div>

                  <div className="mt-2 font-semibold">
                    {selected.position || "—"}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    Experience
                  </div>

                  <div className="mt-2 font-semibold">
                    {selected.experience_years !== null
                      ? `${selected.experience_years} years`
                      : "—"}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    Expected Salary
                  </div>

                  <div className="mt-2 font-semibold">
                    {selected.expected_salary !==
                      null
                      ? `₹${selected.expected_salary.toLocaleString(
                          "en-IN"
                        )}`
                      : "—"}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    Availability
                  </div>

                  <div className="mt-2 font-semibold">
                    {selected.availability || "—"}
                  </div>
                </div>

              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">
                  Address
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                  {selected.address || "—"}
                  {selected.district
                    ? `\n${selected.district}`
                    : ""}
                  {selected.state
                    ? `\n${selected.state}`
                    : ""}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">
                  Previous Company
                </div>

                <div className="mt-2 font-semibold">
                  {selected.previous_company ||
                    "—"}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">
                  Skills
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                  {selected.skills || "—"}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">
                  Candidate Message
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                  {selected.message || "—"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                <a
                  href={`tel:${selected.mobile}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground"
                >
                  <Phone className="h-4 w-4" />
                  Call Candidate
                </a>

                {selected.email && (
                  <a
                    href={`mailto:${selected.email}`}
                    className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold"
                  >
                    <Mail className="h-4 w-4" />
                    Email Candidate
                  </a>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}