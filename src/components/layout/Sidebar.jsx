import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { MENU_CONFIG } from "../../utils/roles";
import { useAuth } from "../../features/auth/AuthProvider";

// Example icon mapping (replace with your actual icons if needed)
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  Users,
} from "lucide-react";

const ICONS = {
  dashboard: LayoutDashboard,
  submission: FileText,
  ranking: BarChart3,
  support: HelpCircle,
  settings: Settings,
  users: Users,
};

export default function Sidebar({ sidebarOpen, setSidebarOpen, handleLogout }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Role-based menu
  const navigation = MENU_CONFIG.filter((item) =>
    item.roles.includes(user?.role),
  ).map((item) => ({
    ...item,
    icon: ICONS[item.icon] || LayoutDashboard,
  }));

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // Use passed handleLogout or fallback to context logout
  const doLogout = handleLogout || logout;

  return (
    <aside
      className={`fixed top-16 left-0 z-40 w-64 h-screen bg-card border-r transition-transform duration-200 ease-in-out  ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } hidden lg:block`}
      style={{ willChange: "transform" }}
    >
      <nav className="flex flex-col h-full p-4">
        <div className="flex-1 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen && setSidebarOpen(false)}
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
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={doLogout}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </nav>
    </aside>
  );
}
