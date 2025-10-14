import { storageService } from "./storage.service";
import { config } from "@/config/environment";
import type { User, AuthTokens, LoginApiResponse } from "@/types";

const TOKEN_KEY = "auth_tokens";
const USER_KEY = "auth_user";

class AuthService {
  private tokens: AuthTokens | null = null;
  private user: User | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    this.tokens = storageService.get<AuthTokens>(TOKEN_KEY);
    this.user = storageService.get<User>(USER_KEY);
  }

  /**
   * Parse JWT token to extract expiration time
   */
  private parseJWTExpiration(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      console.warn("Failed to parse JWT expiration:", error);
      return Date.now() + 24 * 60 * 60 * 1000; // Default 24 hours
    }
  }

  /**
   * Calculate expiration time from expiresIn string
   */
  private calculateExpirationTime(expiresIn: string): number {
    const now = Date.now();
    const match = expiresIn.match(/(\d+)([smhd])/);

    if (!match) {
      console.warn("Invalid expiresIn format:", expiresIn);
      return now + 24 * 60 * 60 * 1000; // Default 24 hours
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return now + value * 1000;
      case "m":
        return now + value * 60 * 1000;
      case "h":
        return now + value * 60 * 60 * 1000;
      case "d":
        return now + value * 24 * 60 * 60 * 1000;
      default:
        return now + 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Process login response and set authentication
   */
  processLoginResponse(response: LoginApiResponse): {
    user: User;
    tokens: AuthTokens;
  } {
    const { user, tokens } = response;

    // Calculate expiration time from JWT token or expiresIn
    let expiresAt: number;
    if (tokens.expiresIn) {
      expiresAt = this.calculateExpirationTime(tokens.expiresIn);
    } else {
      // If no expiresIn, try to parse from JWT token
      expiresAt = this.parseJWTExpiration(tokens.accessToken);
    }

    // Create normalized tokens object
    const normalizedTokens: AuthTokens = {
      ...tokens,
      expiresAt: expiresAt,
    };

    // Create normalized user object with legacy fields
    const normalizedUser: User = {
      ...user,
      id: user._id, // Legacy field
      name: `${user.firstName} ${user.lastName}`.trim(), // Legacy field
      // Map stateUt to state if stateUt exists but state doesn't
      state: user.state || user.stateUt || "",
      stateName: user.stateName || user.stateUt || "",
    };

    this.setAuth(normalizedUser, normalizedTokens);
    return { user: normalizedUser, tokens: normalizedTokens };
  }

  async refreshToken(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    // Prevent multiple simultaneous refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<AuthTokens> {
    try {
      if (!this.tokens?.refreshToken) {
        throw new Error("No refresh token available");
      }

      // Call actual refresh token API
      const response = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.tokens.refreshToken}`,
        },
        body: JSON.stringify({
          refreshToken: this.tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.tokens) {
        const newTokens: AuthTokens = {
          ...data.tokens,
          expiresAt: this.parseJWTExpiration(data.tokens.accessToken),
        };

        this.tokens = newTokens;
        storageService.set(TOKEN_KEY, newTokens);
        return newTokens;
      } else {
        throw new Error(data.message || "Invalid refresh response");
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Fallback: keep same tokens but extend expiration
      if (this.tokens) {
        const newTokens: AuthTokens = {
          ...this.tokens,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // Extend by 24 hours
        };
        this.tokens = newTokens;
        storageService.set(TOKEN_KEY, newTokens);
        return newTokens;
      }
      this.logout();
      throw error;
    }
  }

  logout(): void {
    this.tokens = null;
    this.user = null;
    storageService.remove(TOKEN_KEY);
    storageService.remove(USER_KEY);
  }

  setAuth(user: User, tokens: AuthTokens): void {
    this.user = user;
    this.tokens = tokens;

    // Store in localStorage for persistence
    storageService.set(USER_KEY, user);
    storageService.set(TOKEN_KEY, tokens);

    console.log("🔐 Auth set successfully:", {
      userId: user._id || user.id,
      userRole: user.role,
      tokenExpiresAt: new Date(tokens.expiresAt).toISOString(),
      tokenType: tokens.tokenType,
    });
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Request-Id": `req_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };

    // Add Authorization header with proper token type
    if (this.tokens?.accessToken && this.tokens.accessToken.trim() !== "") {
      const tokenType = this.tokens.tokenType || "Bearer";
      headers["Authorization"] = `${tokenType} ${this.tokens.accessToken}`;
    }

    return headers;
  }

  isAuthenticated(): boolean {
    if (!this.tokens || !this.user) return false;

    // Check if token is expired
    const isExpired = Date.now() >= this.tokens.expiresAt;

    if (isExpired) {
      console.warn("🔐 Token expired, user needs to re-authenticate");
      return false;
    }

    return true;
  }

  getUser(): User | null {
    return this.user;
  }

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  isTokenExpiringSoon(): boolean {
    if (!this.tokens) return false;
    const fiveMinutes = 5 * 60 * 1000;
    const isExpiringSoon = Date.now() + fiveMinutes > this.tokens.expiresAt;

    if (isExpiringSoon) {
      console.warn("🔐 Token expiring soon, consider refreshing");
    }

    return isExpiringSoon;
  }

  /**
   * Get token expiration time in milliseconds
   */
  getTokenExpirationTime(): number | null {
    return this.tokens?.expiresAt || null;
  }

  /**
   * Get time until token expires in milliseconds
   */
  getTimeUntilExpiration(): number | null {
    if (!this.tokens) return null;
    return this.tokens.expiresAt - Date.now();
  }
}

export const authService = new AuthService();
