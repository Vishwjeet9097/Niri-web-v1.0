import { FloatingThemeToggle } from "@/app/ThemeProvider";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
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
import { getMenuConfig } from "@/utils/roles";

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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
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

  const isActive = (path: string | string[]) => {
    // Handle array of paths (like ["/dashboard", "/ministry/dashboard", "/ministry/nodal"])
    if (Array.isArray(path)) {
      return path.some((p) => {
        if (p === "/" || p === "/dashboard" || p === "/reviewer-dashboard") {
          return location.pathname === p;
        }
        return location.pathname.startsWith(p);
      });
    }

    // Handle single string path
    if (path === "/" || path === "/dashboard" || path === "/reviewer-dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const role = user?.role;
  
  // Calculate condition once
  const hasStateUt = !!(user as any)?.stateUt || !!(user as any)?.state_ut || !!(user as any)?.state;
  const hasMinistryId = !!(user as any)?.ministryId && String((user as any)?.ministryId || "").trim() !== "";
  const showFirstDataSubmission = hasStateUt && !hasMinistryId;
  
  // Debug for NODAL_OFFICER
  if (role === "NODAL_OFFICER") {
    console.log("🔍 Menu Filter:", {
      hasStateUt,
      hasMinistryId,
      showFirstDataSubmission,
      stateUt: (user as any)?.stateUt,
      state_ut: (user as any)?.state_ut,
      state: (user as any)?.state,
      ministryId: (user as any)?.ministryId
    });
  }
  
  // First pass: filter by role and other conditions
  let menus = getMenuConfig().filter((item) => {
    // Check if user role matches
    if (!item.roles.includes(role)) {
      return false;
    }
    
    // If menu item has a showIf condition function, use it (for other items)
    if (typeof item.showIf === 'function') {
      try {
        return item.showIf(user);
      } catch (error) {
        console.error("Error in showIf function:", error);
        return false;
      }
    }
    
    // Default: show the item if no special conditions
    return true;
  });
  
  // Second pass: Special handling for NODAL_OFFICER "Data Submission" menu items
  let filteredMenus = menus;
  if (role === "NODAL_OFFICER") {
    const dataSubmissionMenus = menus.filter(m => m.label === "Data Submission");
    
    if (dataSubmissionMenus.length > 1) {
      console.log("🔍 Found multiple Data Submission menus, filtering...");
      // Create new array with only the correct one
      filteredMenus = menus.filter((menu) => {
        if (menu.label === "Data Submission") {
          const isFirst = Array.isArray(menu.path) && menu.path.includes("/submissions");
          const isSecond = menu.path === "/ministry/ministry-nodal-submission";
          
          if (isFirst) {
            const keep = showFirstDataSubmission;
            console.log(`  → First menu (state-based): ${keep ? 'KEEP' : 'REMOVE'}`);
            return keep;
          }
          if (isSecond) {
            const keep = !showFirstDataSubmission;
            console.log(`  → Second menu (ministry-based): ${keep ? 'KEEP' : 'REMOVE'}`);
            return keep;
          }
          return false; // Remove unknown
        }
        return true; // Keep all other menus
      });
      
      const finalCount = filteredMenus.filter(m => m.label === "Data Submission").length;
      console.log("✅ Final result:", finalCount === 1 ? "✅ SUCCESS - Only one menu item" : `❌ ERROR - Still ${finalCount} items`);
    }
  }

  const getDashboardPath = () => {
    // MINISTRY_APPROVER should go to /ministry/dashboard
    if (role === "MINISTRY_APPROVER") {
      return "/ministry/dashboard";
    }
    // NODAL_OFFICER with ministryId should go to /ministry/nodal
    if (role === "NODAL_OFFICER" && (user as any)?.ministryId && String((user as any).ministryId).trim() !== "") {
      return "/ministry/nodal";
    }
    // Default dashboard path
    return "/dashboard";
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <FloatingThemeToggle />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm flex-none h-16 flex items-center">
        <div className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-gray-700 hover:bg-gray-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-3">
              <img
                src="https://img1.digitallocker.gov.in/ai/images/logo.png"
                alt="NIRI Logo"
                className="h-10 bg-white rounded object-contain"
              />
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
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`lg:static fixed top-16 inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          <nav className="flex flex-col h-full p-4">

            {/* Debug Panel: Remove after troubleshooting */}
            <div style={{ background: '#f8f8f8', color: '#333', fontSize: 12, padding: 8, marginBottom: 8, border: '1px solid #eee', borderRadius: 4 }}>
              <strong>DEBUG USER:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{JSON.stringify(user, null, 2)}</pre>
              <div><strong>hasStateUt:</strong> {String(hasStateUt)}</div>
              <div><strong>hasMinistryId:</strong> {String(hasMinistryId)}</div>
              <div><strong>showFirstDataSubmission:</strong> {String(showFirstDataSubmission)}</div>
              <div><strong>Menus shown:</strong> {filteredMenus.filter(m => m.label === 'Data Submission').length}</div>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto">
              {filteredMenus.map((item, index) => {
                const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                // Generate unique key using label, index, and path (array or string)
                let uniqueKey = `menu-${item.label}-${index}`;
                if (Array.isArray(item.path)) {
                  uniqueKey += '-' + item.path.join('-');
                } else if (typeof item.path === 'string') {
                  uniqueKey += '-' + item.path;
                }

                // Dynamically update label for Data Submission (ministry) for NODAL_OFFICER
                let displayLabel = item.label;
                if (
                  item.label === "Data Submission" &&
                  user?.role === "NODAL_OFFICER" &&
                  user?.ministryId &&
                  String(user.ministryId).trim() !== "" &&
                  item.path === "/ministry/ministry-nodal-submission"
                ) {
                  displayLabel = `Data Submission ${user.ministryId}`;
                }

                let path: string | string[] = item.path;
                if (item.label === "Dashboard") {
                  path = getDashboardPath();
                } else if (Array.isArray(path)) {
                  // For array paths, use the first one for the Link
                  path = path[0];
                }
                const active = isActive(Array.isArray(item.path) ? item.path : path);

                // Dropdown logic
                if (item.children && item.children.length > 0) {
                  const matchesChild = item.children.some((c) =>
                    location.pathname.startsWith(c.path)
                  );
                  const isOpen = openDropdown === uniqueKey || matchesChild;

                  return (
                    <div key={uniqueKey} className="space-y-1">
                      <button
                        onClick={() =>
                          setOpenDropdown(isOpen ? null : uniqueKey)
                        }
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isOpen
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          {displayLabel}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="ml-4 mt-1 flex flex-col space-y-1">
                          {item.children.map((child) => {
                            const childActive = isActive(child.path);
                            return (
                              <Link
                                key={child.label}
                                to={child.path}
                                onClick={() => {
                                  setSidebarOpen(false);
                                  setOpenDropdown(null);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                                  childActive
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-foreground hover:bg-blue-50 hover:text-blue-600"
                                }`}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Single Link
                return (
                  <Link
                    key={uniqueKey}
                    to={path}
                    onClick={() => {
                      setSidebarOpen(false);
                      setOpenDropdown(null);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {displayLabel}
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

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-background">
          <Outlet />
        </main>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
