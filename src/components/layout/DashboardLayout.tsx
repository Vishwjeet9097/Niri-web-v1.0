import { useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { authService } from "@/services/auth.service";
import { notificationService } from "@/services/notification.service";
import { MENU_CONFIG } from "@/utils/roles";

// Icon mapping for MENU_CONFIG icons
const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  submission: FileText,
  ranking: BarChart3,
  support: HelpCircle,
  settings: Settings,
  users: Users,
};

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = authService.getUser();

  const handleLogout = () => {
    authService.logout();
    notificationService.toast({
      title: "Logged Out",
      message: "You have been logged out successfully",
      type: "info",
    });
    navigate("/auth");
  };

  const isActive = (path: string) => {
    if (
      path === "/" ||
      path === "/dashboard" ||
      path === "/reviewer-dashboard"
    ) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Filter menu items based on user role (backend format)
  const role = user?.role;
  const menus = MENU_CONFIG.filter((item) =>
    item.roles.includes(role)
  );

  // Handle dashboard path based on role
  const getDashboardPath = () => {
    if (role === "MOSPI_REVIEWER" || role === "MOSPI_APPROVER") {
      return "/dashboard";
    }
    return "/dashboard";
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200 shadow-sm flex items-center">
        <div className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-gray-700 hover:bg-gray-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            <div className="flex items-center gap-3">
              {/* Government Logo Placeholder */}
              <div className="hidden sm:flex items-center gap-3 border-r border-gray-200 pr-4">
                <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-600 leading-tight">
                    Ministry of Statistics and
                  </p>
                  <p className="text-xs text-gray-600 leading-tight">
                    Programme Implementation
                  </p>
                  <p className="text-xs text-gray-500 leading-tight">
                    Government of India
                  </p>
                </div>
              </div>
              {/* NIRI Branding */}
              <div>
                <h1 className="text-xl font-bold text-primary">NIRI</h1>
                <p className="text-xs text-gray-600 hidden sm:block">
                  National Infrastructure Readiness Index
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || "Nodal Officer"}
                </p>
                <p className="text-xs text-gray-600">Maharashtra</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {user?.name?.[0] || "N"}
                </span>
                <span className="text-sm font-semibold text-primary">
                  {user?.name?.[0] || "N"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-card border-r z-40 overflow-y-hidden transform transition-transform duration-200 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <nav className="flex flex-col h-full p-4">
            <div className="flex-1 space-y-1 overflow-y-auto">
              {menus.map((item) => {
                let path = item.path;
                if (item.label === "Dashboard") {
                  path = getDashboardPath();
                }
                const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                const active = isActive(path);
                return (
                  <Link
                    key={item.label}
                    to={path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <Button
              variant="ghost"
              className="justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 lg:ml-64 h-[calc(100vh-4rem)] overflow-y-auto bg-gray-50 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
