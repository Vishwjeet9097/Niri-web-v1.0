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
  User,
  Menu,
  X,
  Users,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { notificationService } from "@/services/notification.service";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { useUserSubmissionStatus } from "@/hooks/useUserSubmissionStatus";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";

import { MENU_CONFIG } from "../../utils/roles";
import { getPublicAssetPath } from "@/config/environment";

const ICONS = {
  dashboard: LayoutDashboard,
  submission: FileText,
  ranking: BarChart3,
  support: HelpCircle,
  settings: Settings,
  users: Users,
};

const RoutedContent = React.memo(function RoutedContent() {
  return <Outlet />;
});

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [allowCurrentPasswordInput, setAllowCurrentPasswordInput] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    form: "",
  });
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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleMyProfile = () => {
    navigate("/user-management", { state: { openMyProfile: true } });
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswords({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
    setAllowCurrentPasswordInput(false);
    setPasswordErrors({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      form: "",
    });
  };

  const blockPasswordPaste = (e) => {
    e.preventDefault();
  };

  const blockPasswordPasteShortcuts = (e) => {
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === "v") {
      e.preventDefault();
      return;
    }
    if (e.shiftKey && e.key === "Insert") {
      e.preventDefault();
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    const nextErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      form: "",
    };

    if (!currentPassword.trim()) nextErrors.currentPassword = "Current password is required.";
    if (!newPassword.trim()) nextErrors.newPassword = "New password is required.";
    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Confirm new password is required.";
    }

    if (newPassword && newPassword.length < 8) {
      nextErrors.newPassword = "New password must be at least 8 characters.";
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      nextErrors.confirmPassword =
        "New password and confirm password must match.";
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setPasswordErrors(nextErrors);
      return;
    }

    try {
      setPasswordErrors({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        form: "",
      });
      setIsChangingPassword(true);
      await apiService.changePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );
      await logout();
      navigate("/login");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to change password.";
      const lowered = String(message).toLowerCase();
      if (lowered.includes("current password")) {
        setPasswordErrors((prev) => ({ ...prev, currentPassword: message }));
      } else if (lowered.includes("new password")) {
        setPasswordErrors((prev) => ({ ...prev, newPassword: message }));
      } else {
        setPasswordErrors((prev) => ({ ...prev, form: message }));
      }
    } finally {
      setIsChangingPassword(false);
    }
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
                  onClick={handleMyProfile}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="cursor-pointer"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
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
          <RoutedContent />
        </main>
      </div>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Dialog
        open={isChangePasswordOpen}
        onOpenChange={(open) => {
          setIsChangePasswordOpen(open);
          if (!open) resetPasswordForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={user?.email || ""}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
          />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="current-password-manual"
                  type={showPasswords.currentPassword ? "text" : "password"}
                  autoComplete="new-password"
                  readOnly={!allowCurrentPasswordInput}
                  onFocus={() => setAllowCurrentPasswordInput(true)}
                  onPointerDown={() => setAllowCurrentPasswordInput(true)}
                  onPaste={blockPasswordPaste}
                  onKeyDown={blockPasswordPasteShortcuts}
                  onDrop={(e) => e.preventDefault()}
                  value={passwordForm.currentPassword}
                  onChange={(e) => {
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }));
                    setPasswordErrors((prev) => ({
                      ...prev,
                      currentPassword: "",
                      form: "",
                    }));
                  }}
                  className={`pr-10 ${
                    passwordErrors.currentPassword ? "border-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      currentPassword: !prev.currentPassword,
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showPasswords.currentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                >
                  {showPasswords.currentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-sm text-destructive">{passwordErrors.currentPassword}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showPasswords.newPassword ? "text" : "password"}
                  autoComplete="new-password"
                  onPaste={blockPasswordPaste}
                  onKeyDown={blockPasswordPasteShortcuts}
                  onDrop={(e) => e.preventDefault()}
                  value={passwordForm.newPassword}
                  onChange={(e) => {
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }));
                    setPasswordErrors((prev) => ({
                      ...prev,
                      newPassword: "",
                      form: "",
                    }));
                  }}
                  className={`pr-10 ${
                    passwordErrors.newPassword ? "border-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      newPassword: !prev.newPassword,
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showPasswords.newPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                >
                  {showPasswords.newPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPasswords.confirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  onPaste={blockPasswordPaste}
                  onKeyDown={blockPasswordPasteShortcuts}
                  onDrop={(e) => e.preventDefault()}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => {
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }));
                    setPasswordErrors((prev) => ({
                      ...prev,
                      confirmPassword: "",
                      form: "",
                    }));
                  }}
                  className={`pr-10 ${
                    passwordErrors.confirmPassword ? "border-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      confirmPassword: !prev.confirmPassword,
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showPasswords.confirmPassword
                      ? "Hide confirm new password"
                      : "Show confirm new password"
                  }
                >
                  {showPasswords.confirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
              )}
            </div>
            {passwordErrors.form && (
              <p className="text-sm text-destructive">{passwordErrors.form}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsChangePasswordOpen(false);
                resetPasswordForm();
              }}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
