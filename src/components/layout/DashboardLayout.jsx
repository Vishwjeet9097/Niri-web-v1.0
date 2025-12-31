import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { getRoleDisplayName } from "@/utils/roles";
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
import { useUserSubmissionStatus } from "@/hooks/useUserSubmissionStatus";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";

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
  const [openDropdown, setOpenDropdown] = useState(null);
  const { hasSubmission } = useUserSubmissionStatus();
  const {
    availableIndicators,
    loading: indicatorLoading,
    refresh: refreshIndicators,
  } = useIndicatorAccess();

  // ✅ Use ref to store refresh function to prevent effect re-runs
  const refreshIndicatorsRef = useRef(refreshIndicators);
  useEffect(() => {
    refreshIndicatorsRef.current = refreshIndicators;
  }, [refreshIndicators]);

  // Memoize the disabled state calculation to prevent flickering
  // Only recalculate when the actual values change, not during loading states
  const isCreateSubmissionDisabled = useMemo(() => {
    if (user?.role !== "STATE_APPROVER") return false;

    const hasNoIndicators =
      !availableIndicators || availableIndicators.length === 0;
    return hasSubmission || hasNoIndicators;
  }, [user?.role, hasSubmission, availableIndicators?.length]);

  // Track indicator count separately to detect changes without causing re-renders
  const indicatorCount = useMemo(
    () => availableIndicators?.length || 0,
    [availableIndicators?.length]
  );

  // Refresh indicators when location changes (e.g., coming back from User Management)
  useEffect(() => {
    if (
      user?.role === "STATE_APPROVER" &&
      location.pathname !== "/user-management"
    ) {
      // Small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        console.log(
          "[DashboardLayout] Location changed, refreshing indicators"
        );
        refreshIndicatorsRef.current({ clearCache: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, user?.role]); // ✅ No refreshIndicators in deps - using ref instead

  // Auto-refresh indicators when window regains focus or storage changes
  useEffect(() => {
    // Only setup auto-refresh for STATE_APPROVER
    if (user?.role !== "STATE_APPROVER") return;

    // ✅ Helper function uses ref to avoid dependency issues
    const refreshAndUpdate = async (clearCache = false) => {
      console.log(
        "[DashboardLayout] Refreshing indicators, clearCache:",
        clearCache
      );
      await refreshIndicatorsRef.current({ clearCache });
      // State will update automatically through the hook, no need to force re-render
    };

    // Debounce ref for focus handler
    let focusTimeout = null;

    // Refresh on window focus (when user switches back to tab) - debounced
    const handleFocus = () => {
      // Debounce focus refresh to prevent rapid calls
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      focusTimeout = setTimeout(() => {
        console.log("[DashboardLayout] Window focused, refreshing indicators");
        refreshAndUpdate(true);
      }, 500);
    };

    // Listen for storage events (when cache is cleared elsewhere)
    const handleStorageChange = (e) => {
      // Check if it's related to indicator cache
      if (
        e.key &&
        (e.key.startsWith("niri_available_indicators_") ||
          e.key.startsWith("niri_assigned_indicators_"))
      ) {
        console.log(
          "[DashboardLayout] Storage change detected for indicator cache:",
          e.key
        );
        refreshAndUpdate(true);
      }
    };

    // Listen for custom events (when indicators are updated via User Management)
    const handleIndicatorUpdate = () => {
      console.log("[DashboardLayout] Indicators updated event received");
      refreshAndUpdate(true);
    };

    // Setup event listeners
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("indicatorsUpdated", handleIndicatorUpdate);

    // Cleanup
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("indicatorsUpdated", handleIndicatorUpdate);
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
    };
  }, [user?.role]); // ✅ Only depend on user?.role - refreshIndicators removed from deps (using ref instead)

  const navigation = MENU_CONFIG.filter((item) =>
    item.roles.includes(user?.role)
  ).map((item) => ({
    ...item, // keep label, path, children, roles
    icon: ICONS[item.icon] ?? LayoutDashboard, // icon as a component
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
    // Handle array of paths (like ["/submissions", "/data-submission/review"])
    if (Array.isArray(path)) {
      return path.some((p) => location.pathname.startsWith(p));
    }

    // Default single string path
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
                src="/images/logo.png"
                alt="NIE-I Logo"
                className=" h-12 rounded-lg object-contain bg-white"
              />
              {/* <div>
                <h1 className="text-lg font-bold">NIE-I</h1>
                <p className="text-xs opacity-90 hidden sm:block">
                  National Infrastructure Enablement Index
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
                  {getRoleDisplayName(user?.role) || "Nodal Officer"}

                  {(user?.role === "NODAL_OFFICER" ||
                    user?.role === "STATE_APPROVER") &&
                    (" | " + user?.stateName || "")}
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
                // use item.path (not item.href). Also handle Dashboard special path
                const path = Array.isArray(item.path)
                  ? item.path[0]
                  : item.path;
                const active = isActive(item.path);

                // If item has children -> render dropdown
                if (item.children && item.children.length > 0) {
                  // auto-open if current path matches any child
                  const matchesChild = item.children.some((c) =>
                    location.pathname.startsWith(c.path)
                  );
                  const isOpen = openDropdown === item.label || matchesChild;

                  return (
                    <div key={item.label} className="space-y-1">
                      <button
                        onClick={() =>
                          setOpenDropdown(
                            openDropdown === item.label ? null : item.label
                          )
                        }
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isOpen
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          {item.icon && <item.icon className="h-5 w-5" />}
                          {item.label}
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
                            const isCreateSubmission =
                              child.path === "/submissions";

                            // Use memoized disabled state - only disable if already disabled, don't add loading state
                            // This prevents flickering during refresh
                            const isDisabled =
                              isCreateSubmission && isCreateSubmissionDisabled;
                            const hasNoIndicators =
                              user?.role === "STATE_APPROVER" &&
                              indicatorCount === 0;

                            return (
                              <button
                                key={child.label} // Stable key prevents flickering
                                onClick={() => {
                                  if (isDisabled) {
                                    // Show helpful message if disabled due to no indicators
                                    if (hasNoIndicators) {
                                      notificationService.warning(
                                        "At least one indicator must be assigned to the State Approver before creating a submission."
                                      );
                                    }
                                    return; // prevent navigation
                                  }
                                  navigate(child.path);
                                  setSidebarOpen(false);
                                  setOpenDropdown(null);
                                }}
                                disabled={isDisabled}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 w-full text-left ${
                                  childActive
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-foreground hover:bg-blue-50 hover:text-blue-600"
                                } ${
                                  isDisabled
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                title={
                                  isDisabled && hasNoIndicators
                                    ? "At least one indicator must be assigned to the State Approver before creating a submission."
                                    : undefined
                                }
                              >
                                {child.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // default single link
                return (
                  <Link
                    key={item.label}
                    to={path}
                    onClick={() => {
                      setSidebarOpen(false);
                      setOpenDropdown(null); // make sure any open dropdown is closed
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                    {item.label}
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
