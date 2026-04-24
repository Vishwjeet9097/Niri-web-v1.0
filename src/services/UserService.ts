import { apiV2 } from "./ApiService";
import { authService } from "./auth.service";
import { config } from "@/config/environment";
import type { User, AuthTokens, LoginApiResponse } from "@/types";
import type { AxiosResponse } from "axios";
import { notificationService } from "./notification.service";

export const UserService = {
  async fetchLoginEncryptionKey(): Promise<{
    keyId: string;
    publicKey: string;
    algorithm: string;
    expiresAt: string;
  }> {
    const res = await apiV2.get<unknown>("/auth/login-key");
    const body = res.data as Record<string, unknown>;
    const data = (body?.data ?? body) as Record<string, unknown>;
    const keyId = data?.keyId;
    const publicKey = data?.publicKey;
    const algorithm = data?.algorithm;
    const expiresAt = data?.expiresAt;
    if (
      typeof keyId === "string" &&
      typeof publicKey === "string" &&
      typeof algorithm === "string" &&
      typeof expiresAt === "string"
    ) {
      return { keyId, publicKey, algorithm, expiresAt };
    }
    throw new Error("Unable to load login encryption key.");
  },

  async encryptLoginPassword(
    password: string,
    publicKeyPem: string
  ): Promise<string> {
    const clean = publicKeyPem
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\s+/g, "");
    const binary = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      binary.buffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );
    const encrypted = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      cryptoKey,
      new TextEncoder().encode(password)
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  },

  async fetchLoginCaptcha(): Promise<{ captchaId: string; challenge: string }> {
    const res = await apiV2.get<unknown>("/auth/login-captcha");
    const body = res.data as Record<string, unknown>;
    const data = (body?.data ?? body) as Record<string, unknown>;
    const captchaId = data?.captchaId;
    const challenge = data?.challenge;
    if (
      typeof captchaId === "string" &&
      typeof challenge === "string" &&
      captchaId.length > 0 &&
      challenge.length === 6
    ) {
      return { captchaId, challenge };
    }
    throw new Error("Unable to load CAPTCHA. Please refresh the page.");
  },

  async login(
    email: string,
    password: string,
    captcha: { captchaId: string; captchaAnswer: string },
    _remember = true
  ): Promise<{
    success: boolean;
    user?: User;
    tokens?: AuthTokens;
    message?: string;
  }> {
    try {
      console.log("🔐 Attempting login for:", email);
      const key = await this.fetchLoginEncryptionKey();
      const encryptedPassword = await this.encryptLoginPassword(
        password,
        key.publicKey
      );
      const payload: Record<string, unknown> = {
        email,
        encryptedPassword,
        keyId: key.keyId,
        nonce: crypto.randomUUID(),
        timestamp: Date.now(),
        captchaId: captcha.captchaId,
        captchaAnswer: captcha.captchaAnswer,
      };

      const res: AxiosResponse<LoginApiResponse> =
        await apiV2.post<LoginApiResponse>(config.loginPath, payload);

      const response: any = res.data;
      console.log("🔐 Login response received:", response);

      // Handle both response formats: new format (status/data) and old format (success/user/tokens)
      let processedResponse: LoginApiResponse;

      if (response.status && response.data) {
        // New format: { status: true, data: { user, accessToken }, message }
        const { user, accessToken } = response.data;

        // Calculate expiration time from JWT token
        const calculateExpirationTime = (token: string): number => {
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload.exp * 1000; // Convert to milliseconds
          } catch (error) {
            console.warn("Failed to parse JWT expiration:", error);
            return Date.now() + 24 * 60 * 60 * 1000; // Default 24 hours
          }
        };

        processedResponse = {
          success: response.status,
          user: user,
          tokens: {
            accessToken: accessToken,
            refreshToken: "", // Not provided in new format
            tokenType: "Bearer",
            expiresIn: "24h", // Default expiration
            expiresAt: calculateExpirationTime(accessToken),
          },
          message: response.message,
        };
      } else {
        // Old format: { success, user, tokens }
        processedResponse = response;
      }

      if (
        processedResponse.success &&
        processedResponse.user &&
        processedResponse.tokens
      ) {
        // Process the login response using AuthService
        const { user, tokens } =
          authService.processLoginResponse(processedResponse);

        // Show success notification
        notificationService.success(
          `Welcome , ${user.firstName}! Login successful.`,
          "Login Successful"
        );

        return { success: true, user, tokens };
      } else {
        const errorMessage =
          processedResponse.message ||
          "Login failed. Please check your credentials.";
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
        const userFriendlyMessage =
          "No such username or password. Please recheck your credentials.";

        console.error(
          "🔐 Login error (401):",
          err?.response?.data?.message || "No server message"
        );
        notificationService.error(userFriendlyMessage, "Login Failed");
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

  async logout(options?: { reason?: "idle" | "manual" }) {
    await authService.logout();
    const idle = options?.reason === "idle";
    notificationService.info(
      idle
        ? "Your session has ended due to inactivity. Please sign in again."
        : "You have been logged out successfully.",
      idle ? "Session Timeout" : "Logged Out"
    );
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
