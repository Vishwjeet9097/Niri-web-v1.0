import { apiV2 } from "./ApiService";
import { authService } from "./auth.service";
import { config } from "@/config/environment";
import type { User, AuthTokens, LoginApiResponse } from "@/types";
import type { AxiosResponse } from "axios";
import { notificationService } from "./notification.service";

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

      const response: LoginApiResponse = res.data;
      console.log("🔐 Login response received:", response);

      if (response.success && response.user && response.tokens) {
        // Process the login response using AuthService
        const { user, tokens } = authService.processLoginResponse(response);

        // Show success notification
        notificationService.success(
          `Welcome back, ${user.firstName}! You have been successfully logged in.`,
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
        response?: {
          status?: number;
          data?: {
            message?: string;
            error?: string;
            statusCode?: number;
          };
        };
        message?: string;
      };

      // Handle specific 401 Unauthorized error
      if (
        err?.response?.status === 401 ||
        err?.response?.data?.statusCode === 401
      ) {
        const serverMessage = err?.response?.data?.message;
        let userFriendlyMessage = "Invalid credentials";
        let toastTitle = "Login Failed";

        // Map server messages to user-friendly messages
        if (serverMessage) {
          switch (serverMessage.toLowerCase()) {
            case "invalid credentials":
            case "unauthorized":
              userFriendlyMessage =
                "Login unsuccessful. Please recheck your credentials.";
              toastTitle = "Login Failed";
              break;
            case "user not found":
              userFriendlyMessage =
                "No account found with this email address. Please verify your email or contact your administrator.";
              toastTitle = "Account Not Found";
              break;
            case "account disabled":
            case "user disabled":
              userFriendlyMessage =
                "Your account has been disabled. Please contact your administrator for assistance.";
              toastTitle = "Account Disabled";
              break;
            case "account locked":
              userFriendlyMessage =
                "Your account has been temporarily locked due to multiple failed login attempts. Please try again later or contact support.";
              toastTitle = "Account Locked";
              break;
            default:
              userFriendlyMessage =
                "Login unsuccessful. Please recheck your credentials.";
              toastTitle = "Login Failed";
          }
        } else {
          userFriendlyMessage =
            "Login unsuccessful. Please recheck your credentials.";
          toastTitle = "Login Failed";
        }

        console.error(
          "🔐 Login error (401):",
          serverMessage || "No server message"
        );
        notificationService.error(userFriendlyMessage, toastTitle);
        return { success: false, message: userFriendlyMessage };
      }

      // Handle other errors
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
