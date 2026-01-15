import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronDown } from "lucide-react";
import { getMenuConfig } from "@/utils/roles";
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
  const [openDropdown, setOpenDropdown] = React.useState(null);

  // Role-based menu
  const navigation = getMenuConfig().filter((item) =>
    item.roles.includes(user?.role)
  ).map((item) => ({
    ...item,
    icon: ICONS[item.icon] || LayoutDashboard,
  }));

  const isActive = (path) => {
    if (!path) return false;
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

            // 🔽 Check if menu item has children (dropdown)
            if (item.children && item.children.length > 0) {
              const isOpen = openDropdown === item.label;
              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() =>
                      setOpenDropdown(isOpen ? null : item.label)
                    }
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isOpen
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="ml-8 flex flex-col space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          to={child.path}
                          onClick={() =>
                            setSidebarOpen && setSidebarOpen(false)
                          }
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive(child.path)
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          • {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // 🧭 Regular single-link menu items
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

        {/* Logout Button */}
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
