import { authService } from "@/services/auth.service";
import { notificationService } from "@/services/NotificationBus";

/**
 * TokenManager - Professional JWT token management utility
 * Handles automatic token refresh, expiration monitoring, and cleanup
 */
class TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private expirationTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  constructor() {
    this.initializeTokenMonitoring();
  }

  /**
   * Initialize token monitoring when tokens are available
   */
  private initializeTokenMonitoring(): void {
    const tokens = authService.getTokens();
    if (tokens) {
      this.startTokenMonitoring();
    }
  }

  /**
   * Start monitoring token expiration
   */
  startTokenMonitoring(): void {
    this.clearTimers();

    const tokens = authService.getTokens();
    if (!tokens) {
      return;
    }

    const now = Date.now();
    const timeUntilExpiration = tokens.expiresAt - now;
    const timeUntilRefresh = Math.max(timeUntilExpiration - 5 * 60 * 1000, 0); // 5 minutes before expiration

    // Only start monitoring if token has reasonable time left (more than 10 minutes)
    if (timeUntilExpiration < 10 * 60 * 1000) {
      return;
    }

    // Set timer for automatic refresh
    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => {
        this.handleTokenRefresh();
      }, timeUntilRefresh);
    }

    // Set timer for expiration warning
    if (timeUntilExpiration > 0) {
      this.expirationTimer = setTimeout(() => {
        this.handleTokenExpiration();
      }, timeUntilExpiration);
    }
  }

  /**
   * Handle automatic token refresh
   */
  private async handleTokenRefresh(): Promise<void> {
    if (this.isRefreshing) return;

    this.isRefreshing = true;

    try {
      await authService.refreshToken();

      // Restart monitoring with new tokens
      this.startTokenMonitoring();
    } catch (error) {
      console.error("❌ Token auto-refresh failed:", error);
      this.handleTokenExpiration();
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Handle token expiration
   */
  private handleTokenExpiration(): void {
    console.warn("⏰ Token expired, logging out user");

    authService.logout();
    this.clearTimers();

    notificationService.warning(
      "Your session has expired. Please login again.",
      "Session Expired"
    );
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }
  }

  /**
   * Stop token monitoring
   */
  stopTokenMonitoring(): void {
    this.clearTimers();
    this.isRefreshing = false;
  }

  /**
   * Get token status information
   */
  getTokenStatus(): {
    hasTokens: boolean;
    isExpired: boolean;
    isExpiringSoon: boolean;
    timeUntilExpiration: number | null;
    timeUntilRefresh: number | null;
  } {
    const tokens = authService.getTokens();
    const now = Date.now();

    if (!tokens) {
      return {
        hasTokens: false,
        isExpired: true,
        isExpiringSoon: false,
        timeUntilExpiration: null,
        timeUntilRefresh: null,
      };
    }

    const timeUntilExpiration = tokens.expiresAt - now;
    const timeUntilRefresh = Math.max(timeUntilExpiration - 5 * 60 * 1000, 0);
    const isExpired = timeUntilExpiration <= 0;
    const isExpiringSoon = timeUntilExpiration <= 5 * 60 * 1000; // 5 minutes

    return {
      hasTokens: true,
      isExpired,
      isExpiringSoon,
      timeUntilExpiration: isExpired ? 0 : timeUntilExpiration,
      timeUntilRefresh: timeUntilRefresh,
    };
  }

  /**
   * Force token refresh (manual)
   */
  async forceRefresh(): Promise<boolean> {
    try {
      await this.handleTokenRefresh();
      return true;
    } catch (error) {
      console.error("❌ Force refresh failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();

// Export class for testing
export { TokenManager };
