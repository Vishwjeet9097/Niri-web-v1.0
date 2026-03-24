import { FloatingThemeToggle } from "@/app/ThemeProvider";
import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { getPublicAssetPath } from "@/config/environment";
import { getRemainingMinistryIndicators, getMinistryDashboardData } from "@/services/ministry.service";
import { useAuth } from "@/features/auth/AuthProvider";

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
  const { user } = useAuth();
  
  console.log("🔍 [DashboardLayout.tsx] Component rendering, user role:", user?.role);
  const [ministryDashboardData, setMinistryDashboardData] = useState<{
    totalIndicators: number;
    totalAssignedMinistryApprover: number;
    totalIndicatorNodalMinistry: number;
  }>({
    totalIndicators: 0,
    totalAssignedMinistryApprover: 0,
    totalIndicatorNodalMinistry: 0,
  });
  const [isMinistryDashboardDataLoading, setIsMinistryDashboardDataLoading] = useState(true);
  const [remainingMinistryIndicators, setRemainingMinistryIndicators] = useState<any[] | null>(null);
  const hasInitiallyLoadedRef = useRef(false);

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

  // Load remaining indicators for MINISTRY_APPROVER - matches useMinistrySubmission logic
  useEffect(() => {
    const loadRemainingIndicators = async () => {
      if (user?.role === "MINISTRY_APPROVER" && user?.id) {
        setIsMinistryDashboardDataLoading(true);
        try {
          console.log("🔍 [DashboardLayout.tsx] Loading remaining indicators for user:", user.id);
          // Use getRemainingMinistryIndicators to match the page component logic
          const remaining = await getRemainingMinistryIndicators(user.id);
          console.log("🔍 [DashboardLayout.tsx] Remaining indicators received:", remaining);
          console.log("🔍 [DashboardLayout.tsx] availableIndicators:", remaining?.availableIndicators);
          console.log("🔍 [DashboardLayout.tsx] availableIndicators length:", remaining?.availableIndicators?.length);
          
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
          
          console.log("🔍 [DashboardLayout.tsx] State updated, loading: false");
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

  // Memoize the disabled state calculation to prevent flickering
  // Use getRemainingMinistryIndicators to match the page component logic
  const isMinistryCreateSubmissionDisabled = useMemo(() => {
    console.log("🔍 [DashboardLayout.tsx] useMemo EXECUTING on mount/update", {
      userRole: user?.role,
      isMinistryDashboardDataLoading,
      remainingMinistryIndicators,
      remainingMinistryIndicatorsType: typeof remainingMinistryIndicators,
      isNull: remainingMinistryIndicators === null,
    });

    if (user?.role !== "MINISTRY_APPROVER") {
      console.log("🔍 [DashboardLayout.tsx] Not MINISTRY_APPROVER, returning false");
      return false;
    }

    // If still loading, default to disabled (data not ready yet)
    if (isMinistryDashboardDataLoading || remainingMinistryIndicators === null) {
      console.log("🔍 [DashboardLayout.tsx] Loading or null, returning true", {
        isMinistryDashboardDataLoading,
        remainingMinistryIndicators,
        isNull: remainingMinistryIndicators === null,
      });
      return true;
    }

    // Extract availableIndicators directly from the response
    const availableIndicators = (remainingMinistryIndicators as any)?.availableIndicators;
    const availableIndicatorsLength = Array.isArray(availableIndicators) ? availableIndicators.length : -1;

    console.log("🔍 [DashboardLayout.tsx] Computing isMinistryCreateSubmissionDisabled", {
      remainingMinistryIndicators,
      availableIndicators,
      availableIndicatorsLength,
      hasAvailableIndicators: !!availableIndicators,
      isArray: Array.isArray(availableIndicators),
      totalAssignedMinistryApprover: ministryDashboardData.totalAssignedMinistryApprover,
      isMinistryDashboardDataLoading,
    });

    // Disable if availableIndicators array exists and has length 0
    // Explicitly check: if availableIndicators is an array with length 0, disable the button
    const shouldDisable = !!(availableIndicators && Array.isArray(availableIndicators) && availableIndicators.length === 0);
    
    console.log("🔍 [DashboardLayout.tsx] Should disable?", shouldDisable, {
      availableIndicatorsLength,
      condition: availableIndicators && Array.isArray(availableIndicators) && availableIndicators.length === 0,
      breakdown: {
        hasAvailableIndicators: !!availableIndicators,
        isArray: Array.isArray(availableIndicators),
        length: availableIndicators?.length,
        lengthEqualsZero: availableIndicators?.length === 0,
      },
    });
    return shouldDisable;
  }, [user?.role, remainingMinistryIndicators, isMinistryDashboardDataLoading, ministryDashboardData.totalAssignedMinistryApprover]);

  // Force recalculation on mount to ensure useMemo runs immediately
  useEffect(() => {
    console.log("🔍 [DashboardLayout.tsx] Component mounted, useMemo should have run");
    console.log("🔍 [DashboardLayout.tsx] Current disabled state:", isMinistryCreateSubmissionDisabled);
  }, []);

  // Refresh dashboard data when location changes (especially after coming from User Management)
  // Only run this AFTER initial load is complete to prevent double-loading and flickering
  useEffect(() => {
    if (
      user?.role === "MINISTRY_APPROVER" && 
      user?.id &&
      hasInitiallyLoadedRef.current // Only run if initial load has completed
    ) {
      const timer = setTimeout(async () => {
        try {
          setIsMinistryDashboardDataLoading(true);
          console.log("🔍 [DashboardLayout.tsx] Refreshing remaining indicators on location change");
          const remaining = await getRemainingMinistryIndicators(user.id);
          console.log("🔍 [DashboardLayout.tsx] Refreshed remaining indicators:", remaining);
          
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
          console.log("🔍 [DashboardLayout.tsx] Indicators updated event received, refreshing remaining indicators");
          const remaining = await getRemainingMinistryIndicators(user.id);
          
          setRemainingMinistryIndicators(remaining);
          setIsMinistryDashboardDataLoading(false);
          console.log("🔍 [DashboardLayout.tsx] Remaining indicators updated from event:", remaining);
          
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
  const menuConfig = getMenuConfig();
  const menus = (Array.isArray(menuConfig) ? menuConfig : []).filter((item) => {
    // Check if user role matches
    if (!item?.roles || !Array.isArray(item.roles) || !item.roles.includes(role)) {
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
  let filteredMenus = Array.isArray(menus) ? menus : [];
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
                className="h-10 bg-white rounded object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-primary">NIE-I</h1>
                <p className="text-xs text-gray-600 hidden sm:block">
                  National Infrastructure Enablement Index
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
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <nav className="flex flex-col h-full p-4">
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
                if (item.children && Array.isArray(item.children) && item.children.length > 0) {
                  const matchesChild = item.children.some((c) =>
                    c?.path && location.pathname.startsWith(c.path)
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
                            const isMinistryCreateSubmission = child.path === "/ministry/submission";
                            
                            // Use memoized disabled state - similar to STATE_APPROVER pattern
                            const isDisabled = isMinistryCreateSubmission && isMinistryCreateSubmissionDisabled;

                            // Debug logging for ministry create submission
                            if (isMinistryCreateSubmission) {
                              const availableIndicators = (remainingMinistryIndicators as any)?.availableIndicators;
                              console.log("🔍 [DashboardLayout.tsx] Button rendering:", {
                                isMinistryCreateSubmission,
                                isMinistryCreateSubmissionDisabled,
                                isDisabled,
                                remainingMinistryIndicators,
                                availableIndicators,
                                availableIndicatorsLength: availableIndicators?.length,
                                ministryDashboardData,
                                userRole: user?.role,
                                childPath: child.path,
                                willDisable: isDisabled,
                              });
                            }

                            return (
                              <button
                                key={child.label}
                                onClick={(e) => {
                                  // Double-check disabled state to prevent any navigation
                                  if (isDisabled) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    notificationService.warning(
                                      "No indicators are available for you. Please contact your administrator to assign indicators before creating a submission."
                                    );
                                    return; // prevent navigation
                                  }
                                  navigate(child.path);
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
                                  isDisabled && isMinistryCreateSubmission
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
