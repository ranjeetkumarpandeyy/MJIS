import { ReactNode, useState } from "react";
import { PWAInstallBanner } from "@/components/layout/PWAInstallBanner";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useIsAdminOrHR } from "@/hooks/useUserRole";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

import {
  Users,
  ReceiptIndianRupee,
  Calendar,
  Package,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  UserPlus,
  ClipboardList,
  ChevronDown,
  Target,
  Clock,
  Building2,
  CalendarDays,
  Bell,
  User,
  Sparkles,
  Receipt,
  BriefcaseBusiness,
  UserRoundSearch,
  MessageSquareText,
  ImagePlus,
} from "lucide-react";

import hrHubLogo from "@/assets/hr-hub-logo.svg";
import {
  APP_VERSION,
  isAutoUpdatingEnvironment,
} from "@/lib/version";
import { useVersionCheck } from "@/hooks/useVersionCheck";

import { Button } from "@/components/ui/button";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
  adminOnly?: boolean;
  employeeOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <Home className="h-5 w-5" />,
  },
{
  label: "Salary Slips",
  href: "/salary-slips",
  icon: <ReceiptIndianRupee className="h-5 w-5" />,
  employeeOnly: true,
},
  {
    label: "Employees",
    href: "/employees",
    icon: <Users className="h-5 w-5" />,
    adminOnly: true,
  },

  {
    label: "Team Directory",
    href: "/employees",
    icon: <Users className="h-5 w-5" />,
    employeeOnly: true,
  },

  {
    label: "Departments",
    href: "/departments",
    icon: <Building2 className="h-5 w-5" />,
    adminOnly: true,
  },

  {
    label: "Onboarding",
    href: "/onboarding",
    icon: <UserPlus className="h-5 w-5" />,
    adminOnly: true,
  },

  /*
   * NEW
   * Public website Work Enquiries appear here for Admin / HR.
   */
  {
    label: "Work Enquiries",
    href: "/work-enquiries",
    icon: <BriefcaseBusiness className="h-5 w-5" />,
    adminOnly: true,
  },

  {
    label: "Attendance",
    href: "/attendance",
    icon: <Clock className="h-5 w-5" />,
  },

  {
  label: "Recruitment",
  href: "/recruitment",
  icon: <UserRoundSearch className="h-5 w-5" />,
  adminOnly: true,
},

{
  label: "Contact Messages",
  href: "/contact-messages",
  icon: <MessageSquareText className="h-5 w-5" />,
  adminOnly: true,
},

{
  label: "Website Media",
  href: "/website-media",
  icon: <ImagePlus className="h-5 w-5" />,
  adminOnly: true,
},

  {
    label: "Calendar",
    href: "/calendar",
    icon: <CalendarDays className="h-5 w-5" />,
  },

  {
    label: "Leaves",
    href: "/leaves",
    icon: <Calendar className="h-5 w-5" />,
  },

  {
    label: "Reimbursements",
    href: "/reimbursements",
    icon: <Receipt className="h-5 w-5" />,
  },

  {
    label: "Performance",
    href: "/performance",
    icon: <Target className="h-5 w-5" />,
  },

  {
    label: "Assets",
    href: "/assets",
    icon: <Package className="h-5 w-5" />,
    adminOnly: true,
  },

  {
    label: "Payroll",
    href: "/payroll",
    icon: <CreditCard className="h-5 w-5" />,
    adminOnly: true,
  },

  {
    label: "Reports",
    href: "/reports",
    icon: <ClipboardList className="h-5 w-5" />,
    adminOnly: true,
  },

  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
    adminOnly: true,
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const {
    user,
    signOut,
    isSigningOut,
  } = useAuth();

  const {
    isAdminOrHR,
  } = useIsAdminOrHR();

  const {
    data: versionData,
  } = useVersionCheck();

  const {
    data: branding,
  } = useCompanyBranding();

  /*
   * ---------------------------------------------------------
   * FILTER SIDEBAR
   * ---------------------------------------------------------
   *
   * adminOnly = visible to Admin / HR
   * employeeOnly = hidden from Admin / HR
   *
   * This preserves your existing role behaviour.
   */

  const filteredNavItems = navItems.filter(
    (item) => {
      if (item.adminOnly && !isAdminOrHR) {
        return false;
      }

      if (item.employeeOnly && isAdminOrHR) {
        return false;
      }

      return true;
    }
  );

  /*
   * ---------------------------------------------------------
   * VERSION
   * ---------------------------------------------------------
   */

  const displayVersion =
    isAutoUpdatingEnvironment()
      ? (versionData?.currentVersion ?? APP_VERSION)
      : (
          versionData?.hasUpdate
            ? APP_VERSION
            : (
                versionData?.currentVersion ??
                APP_VERSION
              )
        );

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  /*
   * ---------------------------------------------------------
   * USER INITIALS
   * ---------------------------------------------------------
   */

  const getUserInitials = () => {
    const name =
      user?.user_metadata?.full_name ||
      user?.email ||
      "User";

    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  /*
   * ---------------------------------------------------------
   * USER NAME
   * ---------------------------------------------------------
   */

  const getUserName = () => {
    return (
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "User"
    );
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background">

      {/* =====================================================
          MOBILE SIDEBAR OVERLAY
      ====================================================== */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 transform bg-card shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">

          {/* -------------------------------------------------
              LOGO
          -------------------------------------------------- */}

          <div className="flex h-20 items-center justify-between border-b border-border px-6">

            <Link
              to="/dashboard"
              className="flex items-center gap-3"
            >
              <img
                src={
                  branding?.iconUrl ||
                  hrHubLogo
                }
                alt="Maa Janki Industrial Services"
                className="h-10 w-auto"
              />

              <span className="text-xl font-bold text-foreground">
                MJIS
              </span>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() =>
                setSidebarOpen(false)
              }
            >
              <X className="h-5 w-5" />
            </Button>

          </div>

          {/* =================================================
              NAVIGATION
          ================================================== */}

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-2">

              {filteredNavItems.map(
                (item) => {

                  const isActive =
                    location.pathname ===
                    item.href;

                  return (
                    <li key={item.href}>

                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",

                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}

                        onClick={() =>
                          setSidebarOpen(false)
                        }
                      >

                        {item.icon}

                        <span className="flex-1">
                          {item.label}
                        </span>

                        {item.badge && (
                          <Badge
                            variant={
                              isActive
                                ? "secondary"
                                : "default"
                            }
                            className="h-6 min-w-6 justify-center"
                          >
                            {item.badge}
                          </Badge>
                        )}

                      </Link>

                    </li>
                  );
                }
              )}

            </ul>
          </nav>

          {/* =================================================
              USER SECTION
          ================================================== */}

          <div className="border-t border-border p-4">

            <Link
              to="/profile"
              onClick={() =>
                setSidebarOpen(false)
              }
              className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
            >

              <Avatar className="h-10 w-10">

                <AvatarImage
                  src={
                    user?.user_metadata
                      ?.avatar_url
                  }
                />

                <AvatarFallback>
                  {getUserInitials()}
                </AvatarFallback>

              </Avatar>

              <div className="min-w-0 flex-1">

                <p className="truncate text-sm font-medium text-foreground">
                  {getUserName()}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>

              </div>

            </Link>

            {/* -------------------------------------------------
                VERSION
            -------------------------------------------------- */}

            <Link
              to="/changelog"
              onClick={() =>
                setSidebarOpen(false)
              }
              className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >

              <span>
                v{displayVersion}
              </span>

              <span className="text-border">
                •
              </span>

              <span className="hover:underline">
                What's New
              </span>

            </Link>

          </div>

        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="min-w-0 lg:pl-72">

        {/* ===================================================
            TOP HEADER
        ==================================================== */}

        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-lg lg:px-8">

          <div className="flex items-center gap-4">

            {/* Mobile Menu */}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div>

              <h1 className="text-lg font-semibold text-foreground lg:text-xl">

                {new Date().toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                  }
                )}

              </h1>

              <p className="text-sm text-muted-foreground">

                {new Date().toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }
                )}

              </p>

            </div>

          </div>

          {/* =================================================
              HEADER ACTIONS
          ================================================== */}

          <div className="flex items-center gap-3">

            {/* Notifications */}

            <NotificationBell />

            {/* Settings */}

            {isAdminOrHR && (
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <Link to="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            )}

            {/* =================================================
                USER DROPDOWN
            ================================================== */}

            <DropdownMenu>

              <DropdownMenuTrigger asChild>

                <Button
                  variant="ghost"
                  className="flex items-center gap-2 pl-2 pr-3"
                >

                  <Avatar className="h-8 w-8">

                    <AvatarImage
                      src={
                        user?.user_metadata
                          ?.avatar_url
                      }
                    />

                    <AvatarFallback>
                      {getUserInitials()}
                    </AvatarFallback>

                  </Avatar>

                  <ChevronDown className="h-4 w-4 text-muted-foreground" />

                </Button>

              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">

                <DropdownMenuLabel>
                  My Account
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Profile */}

                <DropdownMenuItem asChild>
                  <Link to="/profile">

                    <User className="mr-2 h-4 w-4" />

                    Profile Settings

                  </Link>
                </DropdownMenuItem>

                {/* Notification Preferences */}

                <DropdownMenuItem asChild>
                  <Link to="/notification-preferences">

                    <Bell className="mr-2 h-4 w-4" />

                    Notification Preferences

                  </Link>
                </DropdownMenuItem>

                {/* Account Settings */}

                {isAdminOrHR && (
                  <DropdownMenuItem asChild>

                    <Link to="/settings">

                      <Settings className="mr-2 h-4 w-4" />

                      Account Settings

                    </Link>

                  </DropdownMenuItem>
                )}

                {/* What's New */}

                <DropdownMenuItem asChild>

                  <Link to="/changelog">

                    <Sparkles className="mr-2 h-4 w-4" />

                    What's New

                  </Link>

                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Logout */}

                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >

                  {isSigningOut ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}

                  {isSigningOut
                    ? "Logging out..."
                    : "Log out"}

                </DropdownMenuItem>

              </DropdownMenuContent>

            </DropdownMenu>

          </div>

        </header>

        {/* ===================================================
            PAGE CONTENT
        ==================================================== */}

        <main className="min-w-0 overflow-x-hidden p-3 sm:p-4 lg:p-8">
          {children}
        </main>

      </div>

      {/* =====================================================
          PWA INSTALL
      ====================================================== */}

      <PWAInstallBanner />

    </div>
  );
}
