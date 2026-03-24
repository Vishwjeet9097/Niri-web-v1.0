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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { useUserSubmissionStatus } from "@/hooks/useUserSubmissionStatus";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { getMenuConfig } from "@/utils/roles";
import { getPublicAssetPath } from "@/config/environment";
import { getRemainingMinistryIndicators, getMinistryDashboardData } from "@/services/ministry.service";

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
  
  console.log("🔍 [DashboardLayout.jsx] Component rendering, user role:", user?.role, "user id:", user?.id);
  const [openDropdown, setOpenDropdown] = useState(null);
  const { hasSubmission } = useUserSubmissionStatus();
  const {
    availableIndicators,
    loading: indicatorLoading,
    refresh: refreshIndicators,
  } = useIndicatorAccess();
  const [ministryDashboardData, setMinistryDashboardData] = useState({
    totalIndicators: 0,
    totalAssignedMinistryApprover: 0,
    totalIndicatorNodalMinistry: 0,
  });
  const [isMinistryDashboardDataLoading, setIsMinistryDashboardDataLoading] = useState(true);
  const [remainingMinistryIndicators, setRemainingMinistryIndicators] = useState(null);
  const hasInitiallyLoadedRef = useRef(false);

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

  // Memoize the disabled state for MINISTRY_APPROVER - similar to STATE_APPROVER
  // Use getRemainingMinistryIndicators to match the page component logic
  const isMinistryCreateSubmissionDisabled = useMemo(() => {
    if (user?.role !== "MINISTRY_APPROVER") return false;

    // During loading, always disable (prevents flickering)
    if (isMinistryDashboardDataLoading || remainingMinistryIndicators === null) return true;

    // Check if remaining indicators is empty or has no items (same logic as useMinistrySubmission)
    const isEmpty = 
      remainingMinistryIndicators == null ||
      (Array.isArray(remainingMinistryIndicators) && remainingMinistryIndicators.length === 0) ||
      (typeof remainingMinistryIndicators === 'object' && !Array.isArray(remainingMinistryIndicators) && Object.keys(remainingMinistryIndicators).length === 0);

    console.log("🔍 [DashboardLayout.jsx] Computing isMinistryCreateSubmissionDisabled", {
      remainingMinistryIndicators,
      isEmpty,
      totalAssignedMinistryApprover: ministryDashboardData.totalAssignedMinistryApprover,
      isMinistryDashboardDataLoading,
    });

    // Disable if no remaining indicators available (all assigned to nodals)
    const availableIndicators = remainingMinistryIndicators?.availableIndicators;
    const shouldDisable = !availableIndicators || !Array.isArray(availableIndicators) || availableIndicators.length === 0;
    
    console.log("🔍 [DashboardLayout.jsx] Should disable?", shouldDisable, "isEmpty:", isEmpty, "remainingIndicatorsLength:", Array.isArray(remainingMinistryIndicators) ? remainingMinistryIndicators.length : 'not array');
    return shouldDisable;
  }, [user?.role, remainingMinistryIndicators, isMinistryDashboardDataLoading]);

  // Load remaining indicators for MINISTRY_APPROVER - matches useMinistrySubmission logic
  useEffect(() => {
    const loadRemainingIndicators = async () => {
      if (user?.role === "MINISTRY_APPROVER" && user?.id) {
        setIsMinistryDashboardDataLoading(true);
        try {
          console.log("🔍 [DashboardLayout.jsx] Loading remaining indicators for user:", user.id);
          // Use getRemainingMinistryIndicators to match the page component logic
          const remaining = await getRemainingMinistryIndicators(user.id);
          console.log("🔍 [DashboardLayout.jsx] Remaining indicators received:", remaining);
          
          setRemainingMinistryIndicators(remaining);
          setIsMinistryDashboardDataLoading(false);
          hasInitiallyLoadedRef.current = true; // Mark initial load as complete
          
          // Also load dashboard data for other purposes
          const dashboardData = await getMinistryDashboardData(user.id);
          setMinistryDashboardData({
            totalIndicators: dashboardData?.totalIndicators || 0,
            totalAssignedMinistryApprover: dashboardData?.totalAssignedMinistryApprover || 0,
            totalIndicatorNodalMinistry: dashboardData?.totalIndicatorNodalMinistry || 0,
          });
          
          console.log("🔍 [DashboardLayout.jsx] State updated, loading: false");
        } catch (error) {
          console.error("⚠️ Error loading remaining indicators:", error);
          setRemainingMinistryIndicators([]);
          setIsMinistryDashboardDataLoading(false);
        }
      } else {
        setRemainingMinistryIndicators(null);
        setIsMinistryDashboardDataLoading(false);
      }
    };

    loadRemainingIndicators();
  }, [user?.role, user?.id]);

  // Refresh dashboard data when location changes (e.g., coming back from User Management)
  // Only run this AFTER initial load is complete to prevent double-loading and flickering
  useEffect(() => {
    if (
      user?.role === "MINISTRY_APPROVER" &&
      location.pathname !== "/user-management" &&
      user?.id &&
      hasInitiallyLoadedRef.current // Only run if initial load has completed
    ) {
      // Small delay to ensure the component is fully mounted
      const timer = setTimeout(async () => {
        try {
          setIsMinistryDashboardDataLoading(true);
          console.log("🔍 [DashboardLayout.jsx] Refreshing remaining indicators on location change");
          const remaining = await getRemainingMinistryIndicators(user.id);
          console.log("🔍 [DashboardLayout.jsx] Refreshed remaining indicators:", remaining);
          
          setRemainingMinistryIndicators(remaining);
          setIsMinistryDashboardDataLoading(false);
          
          // Also refresh dashboard data
          const dashboardData = await getMinistryDashboardData(user.id);
          setMinistryDashboardData({
            totalIndicators: dashboardData?.totalIndicators || 0,
            totalAssignedMinistryApprover: dashboardData?.totalAssignedMinistryApprover || 0,
            totalIndicatorNodalMinistry: dashboardData?.totalIndicatorNodalMinistry || 0,
          });
        } catch (error) {
          console.error("⚠️ Error refreshing ministry dashboard data:", error);
          setIsMinistryDashboardDataLoading(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, user?.role, user?.id]);

  // Listen for indicators updated event (from User Management)
  useEffect(() => {
    if (user?.role === "MINISTRY_APPROVER" && user?.id) {
      const handleIndicatorUpdate = async () => {
        try {
          setIsMinistryDashboardDataLoading(true);
          console.log("🔍 [DashboardLayout.jsx] Indicators updated event received, refreshing remaining indicators");
          const remaining = await getRemainingMinistryIndicators(user.id);
          
          setRemainingMinistryIndicators(remaining);
          setIsMinistryDashboardDataLoading(false);
          console.log("🔍 [DashboardLayout.jsx] Remaining indicators updated from event:", remaining);
          
          // Also refresh dashboard data
          const dashboardData = await getMinistryDashboardData(user.id);
          setMinistryDashboardData({
            totalIndicators: dashboardData?.totalIndicators || 0,
            totalAssignedMinistryApprover: dashboardData?.totalAssignedMinistryApprover || 0,
            totalIndicatorNodalMinistry: dashboardData?.totalIndicatorNodalMinistry || 0,
          });
        } catch (error) {
          console.error("⚠️ Error checking ministry dashboard data on event:", error);
          setIsMinistryDashboardDataLoading(false);
        }
      };

      window.addEventListener("indicatorsUpdated", handleIndicatorUpdate);
      return () => {
        window.removeEventListener("indicatorsUpdated", handleIndicatorUpdate);
      };
    }
  }, [user?.role, user?.id]);

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
    // Setup auto-refresh for STATE_APPROVER
    if (user?.role === "STATE_APPROVER") {

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
    }
  }, [user?.role]); // ✅ Only depend on user?.role - refreshIndicators removed from deps (using ref instead)


  const menuConfig = getMenuConfig();
  const navigation = (Array.isArray(menuConfig) ? menuConfig : []).filter((item) =>
    item?.roles && Array.isArray(item.roles) && item.roles.includes(user?.role)
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
    if (!path) return false;
    
    // Handle array of paths (like ["/submissions", "/data-submission/review"])
    if (Array.isArray(path)) {
      return path.some((p) => p && location.pathname.startsWith(p));
    }

    // Default single string path
    if (path === "/") {
      return location.pathname === "/";
    }

    return typeof path === 'string' && location.pathname.startsWith(path);
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
                src={getPublicAssetPath("/images/logo.png")}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 ml-4 pl-4 border-l border-primary-foreground/20 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary-foreground/30 focus:ring-offset-2 focus:ring-offset-primary rounded-lg py-1 pr-1 min-w-0"
                  aria-label="Open profile menu"
                >
                  <div className="text-left hidden sm:block min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.firstName + " " + user?.lastName || "User"}
                    </p>
                    <p className="text-xs opacity-75">
                      {getRoleDisplayName(user?.role) || "User"}
                      {(user?.role === "NODAL_OFFICER" ||
                        user?.role === "STATE_APPROVER") &&
                        (user?.stateName ? " | " + user?.stateName : "")}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXpyVx-TONLYRr4sdABziFMNLrDqytASysNQ&s"
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <ChevronDown
                    className="h-4 w-4 opacity-75 shrink-0 hidden sm:block"
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56 z-[100]">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer focus:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                const path = item?.path 
                  ? (Array.isArray(item.path) ? item.path[0] : item.path)
                  : "/";
                const active = item?.path ? isActive(item.path) : false;

                // If item has children -> render dropdown
                if (item.children && Array.isArray(item.children) && item.children.length > 0) {
                  // auto-open if current path matches any child
                  const matchesChild = item.children.some((c) =>
                    c?.path && location.pathname.startsWith(c.path)
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
                            const childPath = child?.path || "/";
                            const childActive = isActive(childPath);
                            const isCreateSubmission =
                              childPath === "/submissions";
                            const isMinistryCreateSubmission =
                              childPath === "/ministry/submission";

                            // Use memoized disabled state - only disable if already disabled, don't add loading state
                            // This prevents flickering during refresh
                            const isDisabled =
                              (isCreateSubmission && isCreateSubmissionDisabled) ||
                              (isMinistryCreateSubmission && isMinistryCreateSubmissionDisabled);
                            const hasNoIndicators =
                              user?.role === "STATE_APPROVER" &&
                              indicatorCount === 0;

                            // Debug logging for ministry create submission
                            if (isMinistryCreateSubmission) {
                              console.log("🔍 [DashboardLayout.jsx] Button rendering:", {
                                isMinistryCreateSubmission,
                                isCreateSubmissionDisabled,
                                isMinistryCreateSubmissionDisabled,
                                isDisabled,
                                ministryDashboardData,
                                childPath: childPath,
                                userRole: user?.role,
                                willBeDisabled: isDisabled,
                              });
                            }

                            return (
                              <button
                                key={child.label} // Stable key prevents flickering
                                onClick={(e) => {
                                  // Double-check disabled state to prevent any navigation
                                  if (isDisabled) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Show helpful message if disabled due to no indicators
                                    if (hasNoIndicators) {
                                      notificationService.warning(
                                        "At least one indicator must be assigned to the State Approver before creating a submission."
                                      );
                                    } else if (isMinistryCreateSubmission && isMinistryCreateSubmissionDisabled) {
                                      notificationService.warning(
                                        "No indicators are available for you. Please contact your administrator to assign indicators before creating a submission."
                                      );
                                    }
                                    return; // prevent navigation
                                  }
                                  if (childPath) {
                                    navigate(childPath);
                                  }
                                  setSidebarOpen(false);
                                  setOpenDropdown(null);
                                }}
                                disabled={isDisabled}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 w-full text-left ${
                                  childActive && !isDisabled
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-foreground"
                                } ${
                                  !isDisabled
                                    ? "hover:bg-blue-50 hover:text-blue-600"
                                    : ""
                                } ${
                                  isDisabled
                                    ? "opacity-50 cursor-not-allowed pointer-events-none"
                                    : ""
                                }`}
                                title={
                                  isDisabled && hasNoIndicators
                                    ? "At least one indicator must be assigned to the State Approver before creating a submission."
                                    : isDisabled && isMinistryCreateSubmission && isMinistryCreateSubmissionDisabled
                                    ? "No indicators are available. Please contact your administrator to assign indicators before creating a submission."
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
            {/* Sign Out moved to profile dropdown (top right) */}
            {/* <Button
              variant="ghost"
              className="justify-start gap-3 text-destructive  hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button> */}
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
