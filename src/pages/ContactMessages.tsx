import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useIsAdminOrHR } from "@/hooks/useUserRole";

type ContactMessage = {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
};

const STATUS_OPTIONS = [
  "new",
  "read",
  "replied",
  "closed",
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

    case "read":
      return "bg-yellow-100 text-yellow-700";

    case "replied":
      return "bg-green-100 text-green-700";

    case "closed":
      return "bg-slate-100 text-slate-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function ContactMessages() {
  const navigate = useNavigate();

  const {
    isAdminOrHR,
    isLoading: roleLoading,
  } = useIsAdminOrHR();

  const [messages, setMessages] = useState<
    ContactMessage[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [selected, setSelected] =
    useState<ContactMessage | null>(null);

  const [error, setError] = useState("");

  async function loadMessages(
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
        .from("contact_messages")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (queryError) {
      console.error(
        "Contact messages load error:",
        queryError
      );

      setError(queryError.message);
      setMessages([]);
    } else {
      setMessages(
        (data ?? []) as ContactMessage[]
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
      void loadMessages();
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

    const { error: updateError } =
      await supabase
        .from("contact_messages")
        .update({
          status,
        })
        .eq("id", id);

    if (updateError) {
      console.error(
        "Contact status update error:",
        updateError
      );

      setError(updateError.message);
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
            }
          : item
      )
    );

    setSelected((current) =>
      current?.id === id
        ? {
            ...current,
            status,
          }
        : current
    );
  }

  const filteredMessages =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return messages.filter(
        (item) => {
          const matchesSearch =
            !query ||
            item.name
              .toLowerCase()
              .includes(query) ||
            (
              item.email ?? ""
            )
              .toLowerCase()
              .includes(query) ||
            (
              item.mobile ?? ""
            )
              .toLowerCase()
              .includes(query) ||
            (
              item.subject ?? ""
            )
              .toLowerCase()
              .includes(query) ||
            item.message
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === "all" ||
            item.status === statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      messages,
      search,
      statusFilter,
    ]);

  const counts = useMemo(
    () => ({
      total: messages.length,

      new: messages.filter(
        (item) =>
          item.status === "new"
      ).length,

      read: messages.filter(
        (item) =>
          item.status === "read"
      ).length,

      replied: messages.filter(
        (item) =>
          item.status === "replied"
      ).length,

      closed: messages.filter(
        (item) =>
          item.status === "closed"
      ).length,
    }),
    [messages]
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
            Contact Messages
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage messages submitted through
            the public Contact section.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadMessages(true)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

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
            Read
          </div>

          <div className="mt-2 text-3xl font-bold text-yellow-600">
            {counts.read}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">
            Replied
          </div>

          <div className="mt-2 text-3xl font-bold text-green-600">
            {counts.replied}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">
            Closed
          </div>

          <div className="mt-2 text-3xl font-bold text-slate-600">
            {counts.closed}
          </div>
        </div>

      </div>

      {/* FILTERS */}

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
              placeholder="Search name, email, subject, message..."
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
        ) : filteredMessages.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center text-center">

            <MessageSquare className="h-12 w-12 text-muted-foreground" />

            <h3 className="mt-4 font-semibold">
              No contact messages found
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              New website messages will appear here.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px]">

              <thead className="border-b bg-muted/40">

                <tr>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                    Sender
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                    Contact
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                    Subject
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                    Message
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

                {filteredMessages.map(
                  (item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >

                      <td className="px-5 py-4">

                        <div className="font-medium">
                          {item.name}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.email || "No email"}
                        </div>

                      </td>

                      <td className="px-5 py-4">
                        {item.mobile || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {item.subject || "No subject"}
                      </td>

                      <td className="max-w-[280px] px-5 py-4">

                        <div className="truncate text-sm">
                          {item.message}
                        </div>

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
                                {statusLabel(
                                  status
                                )}
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

      {/* DETAIL */}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">

          <div
            className="absolute inset-0 bg-black/30"
            onClick={() =>
              setSelected(null)
            }
          />

          <div className="relative h-full w-full max-w-xl overflow-y-auto bg-background p-6 shadow-2xl">

            <div className="flex items-center justify-between border-b pb-5">

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Contact Message
                </div>

                <h2 className="mt-1 text-xl font-bold">
                  {selected.subject ||
                    "Message"}
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

            <div className="mt-6 space-y-5">

              <div className="rounded-xl border p-4">

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
                        {statusLabel(
                          status
                        )}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="rounded-xl border p-4">

                <div className="text-sm text-muted-foreground">
                  Name
                </div>

                <div className="mt-2 font-semibold">
                  {selected.name}
                </div>

              </div>

              <div className="rounded-xl border p-4">

                <div className="text-sm text-muted-foreground">
                  Mobile
                </div>

                {selected.mobile ? (
                  <a
                    href={`tel:${selected.mobile}`}
                    className="mt-2 flex items-center gap-2 font-semibold text-primary"
                  >
                    <Phone className="h-4 w-4" />
                    {selected.mobile}
                  </a>
                ) : (
                  <div className="mt-2">
                    —
                  </div>
                )}

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
                    <Mail className="h-4 w-4" />
                    {selected.email}
                  </a>
                ) : (
                  <div className="mt-2">
                    —
                  </div>
                )}

              </div>

              <div className="rounded-xl border p-4">

                <div className="text-sm text-muted-foreground">
                  Message
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                  {selected.message}
                </p>

              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                {selected.mobile && (
                  <a
                    href={`tel:${selected.mobile}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}

                {selected.email && (
                  <a
                    href={`mailto:${selected.email}`}
                    className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold"
                  >
                    <Mail className="h-4 w-4" />
                    Email
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