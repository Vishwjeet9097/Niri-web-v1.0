import { apiV2 } from "./ApiService";
import { authService } from "./auth.service";
import { config } from "@/config/environment";
import type { User, AuthTokens, LoginApiResponse } from "@/types";
import type { AxiosResponse } from "axios";
import { notificationService } from "./NotificationBus";

export const UserService = {
  async login(
    email: string,
    password: string,
    remember = true
  ): Promise<{
    success: boolean;
    user?: User;
    tokens?: AuthTokens;
    message?: string;
  }> {
    try {
      console.log("🔐 Attempting login for:", email);

      const res: AxiosResponse<LoginApiResponse> =
        await apiV2.post<LoginApiResponse>(config.loginPath, {
          email,
          password,
        });

      const response: any = res.data;
      console.log("🔐 Login response received:", response);
      console.log("🔐 Response success:", response.success);
      console.log("🔐 Response status:", response.status);
      console.log("🔐 Response data:", response.data);

      // Check for both success and status fields, and data structure
      if (
        (response.success || response.status) &&
        response.data &&
        response.data.user &&
        response.data.accessToken
      ) {
        // Transform the response to match expected format
        const transformedResponse = {
          success: true,
          user: response.data.user,
          tokens: {
            accessToken: response.data.accessToken,
            refreshToken: "",
            tokenType: "Bearer",
            expiresIn: "3600",
            expiresAt: Date.now() + 3600000, // 1 hour
          },
        };

        // Process the login response using AuthService
        const { user, tokens } =
          authService.processLoginResponse(transformedResponse);

        // Show success notification
        notificationService.success(
          `Welcome back, ${user.firstName}! Login successful.`,
          "Login Successful"
        );

        return { success: true, user, tokens };
      } else {
        const errorMessage =
          response.message || "Login failed. Please check your credentials.";
        notificationService.error(errorMessage, "Login Failed");
        return { success: false, message: errorMessage };
      }
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const serverMsg = err?.response?.data?.message;
      const message =
        serverMsg ||
        err?.message ||
        "Network Error. Please check your connection.";

      console.error("🔐 Login error:", message);
      notificationService.error(message, "Login Failed");
      return { success: false, message };
    }
  },

  async logout() {
    try {
      // TODO: Call logout API endpoint if available
      // await apiV2.post(`/auth/logout`);
    } finally {
      authService.logout();
      notificationService.info(
        "You have been logged out successfully.",
        "Logged Out"
      );
    }
  },

  getUser(): User | null {
    return authService.getUser();
  },

  isLoggedIn(): boolean {
    return authService.isAuthenticated();
  },

  getRole(): User["role"] | null {
    return authService.getUser()?.role ?? null;
  },

  /**
   * Get user's full name
   */
  getFullName(): string | null {
    const user = authService.getUser();
    if (!user) return null;
    return `${user.firstName} ${user.lastName}`.trim();
  },

  /**
   * Get user's state information
   */
  getStateInfo(): { stateId: string; stateName: string } | null {
    const user = authService.getUser();
    if (!user) return null;
    return {
      stateId: user.state,
      stateName: user.stateName,
    };
  },

  /**
   * Check if user is MoSPI user
   */
  isMospiUser(): boolean {
    const user = authService.getUser();
    return user?.isMospiUser || false;
  },

  /**
   * Get token expiration info
   */
  getTokenInfo(): {
    isExpired: boolean;
    expiresAt: number | null;
    timeUntilExpiration: number | null;
    isExpiringSoon: boolean;
  } {
    const tokens = authService.getTokens();
    if (!tokens) {
      return {
        isExpired: true,
        expiresAt: null,
        timeUntilExpiration: null,
        isExpiringSoon: false,
      };
    }

    const now = Date.now();
    const expiresAt = tokens.expiresAt;
    const timeUntilExpiration = expiresAt - now;
    const isExpired = timeUntilExpiration <= 0;
    const isExpiringSoon = authService.isTokenExpiringSoon();

    return {
      isExpired,
      expiresAt,
      timeUntilExpiration: isExpired ? 0 : timeUntilExpiration,
      isExpiringSoon,
    };
  },
};
