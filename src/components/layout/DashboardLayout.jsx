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
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/features/auth/AuthProvider";

import { MENU_CONFIG } from "../../utils/roles";

const ICONS = {
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
  const { user, logout } = useAuth();

  const navigation = MENU_CONFIG.filter((item) =>
    item.roles.includes(user?.role)
  ).map((item) => ({
    name: item.label,
    href: item.path,
    icon: ICONS[item.icon] || LayoutDashboard,
  }));

  const handleLogout = () => {
    logout();
    notificationService.toast({
      title: "Logged Out",
      message: "You have been logged out successfully",
      type: "info",
    });
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md flex-none">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-primary-foreground hover:bg-primary-hover"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            <div className="flex items-center gap-3">
              <img
                src="https://img1.digitallocker.gov.in/ai/images/logo.png"
                alt="NIRI Logo"
                className=" h-12 rounded-lg object-contain bg-white"
              />
              {/* <div>
                <h1 className="text-lg font-bold">NIRI</h1>
                <p className="text-xs opacity-90 hidden sm:block">
                  National Infrastructure Readiness Index
                </p>
              </div>*/}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationCenter />
            <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-primary-foreground/20">
              <div className="text-left">
                <p className="text-sm font-medium">
                  {user?.firstName + " " + user?.lastName || "Nodal Officer"}
                </p>
                <p className="text-xs opacity-75">
                  {user?.role || "Nodal Officer"} | {user?.stateName || "N/A"}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXpyVx-TONLYRr4sdABziFMNLrDqytASysNQ&s"
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={` lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out
            ${
              sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }`}
        >
          <nav className="flex flex-col h-full p-4">
            <div className="flex-1 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            <Button
              variant="ghost"
              className="justify-start gap-3 text-destructive  hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </nav>
        </aside>

        {/* Main Content (scrollable area) */}
        <main className="flex-1 ml-0  overflow-y-auto p-6 lg:p-8 bg-background">
          <Outlet />
        </main>
      </div>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
