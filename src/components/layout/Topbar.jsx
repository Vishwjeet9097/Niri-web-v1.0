import { Bell, Menu, X, Contrast } from "lucide-react";
import { useTheme } from "@/app/ThemeProvider";
import { useAuth } from "../../features/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";

/**
 * Topbar for NIRI dashboard, matching provided UI.
 * Props:
 *   - sidebarOpen: boolean (for mobile sidebar toggle)
 *   - setSidebarOpen: function (toggle sidebar)
 */
export function Topbar({ sidebarOpen, setSidebarOpen }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme
    ? useTheme()
    : { theme: "light", toggleTheme: () => {} };

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Logo and Title */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-primary-foreground hover:bg-primary-hover"
            onClick={() => setSidebarOpen && setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
              {/* White hexagon SVG */}
              <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">NIRI</h1>
              <p className="text-xs opacity-90 hidden sm:block">
                National Infrastructure Readiness Index
              </p>
            </div>
          </div>
        </div>
        {/* Right: Theme Toggle, Notification, and Profile */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button - always visible */}
          <button
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
            className={`px-2 py-1 rounded transition-colors bg-white/20 text-white hover:bg-white/40 hover:shadow-lg ${
              theme === "dark" ? "bg-blue-400" : ""
            }`}
            onClick={toggleTheme}
          >
            <Contrast size={18} />
          </button>
          <NotificationCenter />
          <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-primary-foreground/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center relative">
                <svg
                  className="w-8 h-8 text-primary-foreground/60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20c0-2.21 3.58-4 6-4s6 1.79 6 4" />
                </svg>
                <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-primary"></span>
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-lg font-bold leading-tight">
                  {user?.name || "User"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
