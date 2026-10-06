import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import { TeamLeaveCalendar } from "@/components/dashboard/TeamLeaveCalendar";
import { NonEmployeeDashboard } from "@/components/dashboard/NonEmployeeDashboard";
import { UpdateNotification } from "@/components/dashboard/UpdateNotification";
import { WhosOut } from "@/components/dashboard/WhosOut";
import { UpcomingCelebrations } from "@/components/dashboard/UpcomingCelebrations";
import { UpcomingHolidays } from "@/components/dashboard/UpcomingHolidays";
import {
  Bot,
  Calendar,
  Package,
  ClipboardCheck,
  CalendarDays,
  Zap,
  UserPlus,
  FileText,
  Target,
  ClipboardList,
  MessageSquareText,
  Receipt,
  Send,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useEmployeeStatus } from "@/hooks/useEmployeeStatus";
import { useIsAdminOrHR } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------
// USER ACCESS (role based)
// Owner = full access | HR/Admin = Employee + Joining + Attendance
// Site Supervisor = assigned site attendance / manpower
// Employee = own profile + attendance + leave + salary slip
// NOTE: check the routes below match your App.tsx routes.
// ---------------------------------------------------------------
type AccessRole = "owner" | "hr_admin" | "site_supervisor" | "employee";

const ACCESS_BY_ROLE: Record<
  AccessRole,
  {
    label: string;
    summary: string;
    items: { title: string; to: string; icon: typeof Users }[];
  }
> = {
  owner: {
    label: "Owner",
    summary: "Full access to every HRMS module.",
    items: [
      { title: "Employees", to: "/employees", icon: Users },
      { title: "Joining", to: "/onboarding", icon: UserPlus },
      { title: "Attendance", to: "/attendance", icon: ClipboardList },
      { title: "Payroll", to: "/payroll", icon: FileText },
    ],
  },
  hr_admin: {
    label: "HR / Admin",
    summary: "Employee + Joining + Attendance.",
    items: [
      { title: "Employees", to: "/employees", icon: Users },
      { title: "Joining", to: "/onboarding", icon: UserPlus },
      { title: "Attendance", to: "/attendance", icon: ClipboardList },
    ],
  },
  site_supervisor: {
    label: "Site Supervisor",
    summary: "Assigned site attendance and manpower.",
    items: [
      { title: "Site Attendance", to: "/attendance", icon: ClipboardList },
      { title: "Manpower", to: "/employees", icon: Users },
    ],
  },
  employee: {
    label: "Employee",
    summary: "Own profile + attendance + leave + salary slip.",
    items: [
      { title: "My Profile", to: "/profile", icon: UserCircle },
      { title: "My Attendance", to: "/attendance", icon: ClipboardList },
      { title: "My Leave", to: "/leaves", icon: Calendar },
      { title: "Salary Slip", to: "/payroll", icon: Receipt },
    ],
  },
};

// ---------------------------------------------------------------
// MJIS AI ASSISTANT (HRMS dashboard)
// Uses the same Supabase Edge Function "mjis-ai" with mode: "hrms".
// Falls back to built-in answers if the function is unavailable.
// ---------------------------------------------------------------
type ChatMessage = { role: "user" | "assistant"; content: string };

type AiContext = {
  role: string;
  firstName: string;
  availableLeaves: number;
  totalLeaves: number;
  assetsAssigned: number;
  pendingApprovals: number;
  onLeaveToday: boolean;
};

const AI_SUGGESTIONS = [
  "What is my leave balance?",
  "How do I request leave?",
  "Where is my salary slip?",
  "What can my role access?",
];

function hrmsLocalAnswer(question: string, ctx: AiContext): string {
  const q = question.toLowerCase();
  // Whole-word matching: short words must match exactly ("hi" will not match "things")
  const tokens = q.split(/[^a-z0-9]+/);
  const has = (...words: string[]) =>
    words.some((word) =>
      word.includes(" ")
        ? q.includes(word)
        : word.length <= 3
        ? tokens.includes(word)
        : tokens.some((token) => token.startsWith(word))
    );

  if (has("balance", "how many leave", "leaves left")) {
    return `You have ${ctx.availableLeaves} of ${ctx.totalLeaves} leaves available.`;
  }

  if (has("request leave", "apply leave", "take leave", "leave")) {
    return "Open Quick Actions → Request Leave (or go to the Leaves page) and submit your dates. Your approver will be notified.";
  }

  if (has("salary", "payslip", "slip", "payroll")) {
    return "Your salary slip is available on the Payroll page from the sidebar.";
  }

  if (has("attendance", "present", "absent")) {
    return `Open the Attendance page to see your records. Today you are marked as ${
      ctx.onLeaveToday ? "On Leave" : "Working"
    }.`;
  }

  if (has("asset", "laptop", "equipment")) {
    return `You currently have ${ctx.assetsAssigned} asset(s) assigned to you.`;
  }

  if (has("approval", "pending")) {
    return ctx.pendingApprovals
      ? `You have ${ctx.pendingApprovals} pending approval(s). Open Leave Approvals to review them.`
      : "You have no pending approvals right now.";
  }

  if (has("kpi", "performance", "target")) {
    return "Open Quick Actions → My KPIs to see your performance targets.";
  }

  if (has("access", "role", "permission")) {
    const key = (Object.keys(ACCESS_BY_ROLE) as AccessRole[]).find(
      (item) => ACCESS_BY_ROLE[item].label === ctx.role
    );

    return key
      ? `As ${ctx.role} you have: ${ACCESS_BY_ROLE[key].summary}`
      : `Your role is ${ctx.role}.`;
  }

  if (has("hello", "hi", "hey", "namaste")) {
    return `Hello ${ctx.firstName}! Ask me about leave, attendance, salary slip, assets or your access.`;
  }

  return "";
}

const DashboardAiAssistant = ({ context }: { context: AiContext }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi ${context.firstName}! I'm MJIS AI. Ask me about leave, attendance, salary slip, assets or what your role can access.`,
    },
  ]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, open]);

  async function sendMessage(text: string) {
    const question = text.trim().slice(0, 500);
    if (!question || loading) return;

    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];

    setMessages(next);
    setInput("");
    setLoading(true);

    let reply = "";

    try {
      const { data, error } = await supabase.functions.invoke("mjis-ai", {
        body: { mode: "hrms", context, messages: next.slice(-10) },
      });

      if (error) throw error;

      reply = typeof data?.reply === "string" ? data.reply.trim() : "";
    } catch (error) {
      console.error("MJIS AI error:", error);
    }

    if (!reply) reply = hrmsLocalAnswer(question, context) || "MJIS AI could not reach the AI service right now. Please try again in a moment, or contact HR.";

    setMessages([...next, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  // Portal keeps the fixed widget outside the 3D (perspective) dashboard wrapper
  return createPortal(
    <>
      {open && (
        <div
          className="fixed inset-x-3 bottom-20 z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[24rem]"
          style={{ height: "min(32rem, calc(100vh - 7rem))" }}
        >
          <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <div className="text-sm font-semibold leading-none">
                  MJIS AI
                </div>
                <div className="mt-1 text-xs opacity-80">
                  HRMS assistant
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close MJIS AI"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={listRef}
            className="mjis-ai-messages flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3">
                  <span className="mjis-ai-dot" />
                  <span className="mjis-ai-dot" />
                  <span className="mjis-ai-dot" />
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {AI_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-border bg-card p-3"
          >
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ask MJIS AI..."
              maxLength={500}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />

            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={loading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        aria-label="Open MJIS AI assistant"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition hover:opacity-90"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        MJIS AI
      </button>
    </>,
    document.body
  );
};

const Index = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const {
    data: employeeStatus,
    isLoading: isEmployeeStatusLoading,
  } = useEmployeeStatus();
  const {
    isAdminOrHR,
    isLoading: isRoleLoading,
  } = useIsAdminOrHR();
  const { user } = useAuth();
  const navigate = useNavigate();

  const hasPendingApprovals =
    (stats?.pendingApprovals ?? 0) > 0;

  // Current access role. Owner / Site Supervisor need your role hook (see note).
  const accessRole: AccessRole = isAdminOrHR ? "hr_admin" : "employee";
  const access = ACCESS_BY_ROLE[accessRole];

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";

    return "Good evening";
  };

  const getUserFirstName = () => {
    const fullName =
      user?.user_metadata?.full_name ||
      user?.email ||
      "User";

    return fullName.split(" ")[0];
  };

  // Show loading state while checking employee status
  if (
    isEmployeeStatusLoading ||
    isRoleLoading
  ) {
    return (
      <DashboardLayout>
        <div className="space-y-6 mjis-3d-dashboard">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="h-32 rounded-xl mjis-3d-loading"
              />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show non-employee dashboard if user is not an employee and not admin/HR
  if (!employeeStatus?.isEmployee && !isAdminOrHR) {
    return (
      <DashboardLayout>
        <div className="mjis-3d-dashboard">
          <NonEmployeeDashboard />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 mjis-3d-dashboard">
        {/* Update Notification for Admins */}
        <div className="mjis-3d-section">
          <UpdateNotification />
        </div>

        {/* Greeting + Quick Actions */}
        <div className="flex items-center justify-between gap-4 mjis-3d-section">
          <h1 className="text-2xl font-semibold text-foreground">
            {getGreeting()}, {getUserFirstName()}
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 mjis-3d-action"
              >
                <Zap className="h-4 w-4" />
                Quick Actions
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 bg-popover z-50"
            >
              {isAdminOrHR ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/onboarding"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Employee
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/attendance"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Attendance
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/assets"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Package className="h-4 w-4" />
                      Manage Assets
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/payroll"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="h-4 w-4" />
                      View Payroll
                    </Link>
                  </DropdownMenuItem>

                  {/* SMS CENTER MUST STAY INSIDE DropdownMenuContent */}
                  <DropdownMenuItem asChild>
                    <Link
                      to="/sms-center"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <MessageSquareText className="h-4 w-4" />
                      SMS Center
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/leaves"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Calendar className="h-4 w-4" />
                      Request Leave
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/performance"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Target className="h-4 w-4" />
                      My KPIs
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/attendance"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <ClipboardList className="h-4 w-4" />
                      View Attendance
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/payroll"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Receipt className="h-4 w-4" />
                      Salary Slip
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Grid */}
        <div
          className={`grid gap-4 sm:grid-cols-2 ${
            hasPendingApprovals
              ? "lg:grid-cols-4"
              : "lg:grid-cols-3"
          } mjis-3d-section`}
        >
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className="h-32 rounded-xl mjis-3d-loading"
                />
              ))}
            </>
          ) : (
            <>
              <StatsCard
                title="Leave Balance"
                value={`${stats?.availableLeaves || 0} / ${stats?.totalLeaves || 0}`}
                icon={
                  <CalendarDays className="h-6 w-6" />
                }
                variant="primary"
              />

              <StatsCard
                title={
                  stats?.onLeaveToday
                    ? "You're On Leave"
                    : "Status Today"
                }
                value={
                  stats?.onLeaveToday
                    ? "On Leave"
                    : "Working"
                }
                icon={
                  <Calendar className="h-6 w-6" />
                }
                variant={
                  stats?.onLeaveToday
                    ? "warning"
                    : "success"
                }
              />

              <StatsCard
                title="My Assets"
                value={String(
                  stats?.assetsAssigned || 0
                )}
                icon={
                  <Package className="h-6 w-6" />
                }
                variant="success"
              />

              {hasPendingApprovals && (
                <div
                  className="cursor-pointer mjis-3d-action"
                  onClick={() =>
                    navigate("/leave-approvals")
                  }
                >
                  <StatsCard
                    title="Pending Approvals"
                    value={String(
                      stats?.pendingApprovals || 0
                    )}
                    icon={
                      <ClipboardCheck className="h-6 w-6" />
                    }
                    variant="warning"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Your Access (role based) */}
        <div className="mjis-3d-section">
          <div className="rounded-xl border border-border bg-card p-5 text-card-foreground">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                Your Access · {access.label}
              </h2>
              <span className="text-sm opacity-70">
                {access.summary}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {access.items.map(({ title, to, icon: Icon }) => (
                <Link
                  key={title}
                  to={to}
                  className="mjis-3d-action flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm font-medium"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  {title}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Who's Out */}
        <div className="mjis-3d-section">
          <WhosOut />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3 mjis-3d-section">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <UpcomingHolidays />
            <UpcomingCelebrations />
            <PendingApprovalsWidget />
            <TeamLeaveCalendar />
          </div>
        </div>
      </div>

      {/* MJIS AI assistant (rendered in a portal, outside the 3D wrapper) */}
      <DashboardAiAssistant
        context={{
          role: access.label,
          firstName: getUserFirstName(),
          availableLeaves: stats?.availableLeaves || 0,
          totalLeaves: stats?.totalLeaves || 0,
          assetsAssigned: stats?.assetsAssigned || 0,
          pendingApprovals: stats?.pendingApprovals || 0,
          onLeaveToday: Boolean(stats?.onLeaveToday),
        }}
      />
    </DashboardLayout>
  );
};

export default Index;

/*
 * MJIS FAST 3D DASHBOARD NOTE
 *
 * The dashboard gets its 3D treatment from scoped CSS in index.css.
 * Keeping the effect class-based avoids adding a WebGL/Three.js dependency.
 * Existing dashboard behavior and data flow remain unchanged.
 */