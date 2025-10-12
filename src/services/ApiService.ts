import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { config } from "@/config/environment";
import { authService } from "./auth.service";
import { notificationService } from "./NotificationBus";

export class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 20000,
      withCredentials: true,
    });

    this.client.interceptors.request.use((cfg) => {
      const headers = authService.getAuthHeaders();
      // Attach Authorization only if token exists; cookies are sent via withCredentials
      cfg.headers = { ...(cfg.headers || {}), ...headers } as any;
      cfg.withCredentials = true;

      // Debug log for forms endpoint
      if (cfg.url?.includes("/forms")) {
        console.log("🔐 Forms API Request Headers:", cfg.headers);
        console.log("🔐 Forms API Request URL:", cfg.url);
      }

      return cfg;
    });

    this.client.interceptors.response.use(
      (res) => res,
      async (error: AxiosError) => {
        const status = error.response?.status;
        const original = error.config as any;
        const url = (original?.url || "").toString();
        const isLoginCall = url.includes("/login");
        const isRefreshCall = url.includes("/refresh");

        // Do not attempt refresh on login or refresh endpoints
        if (isLoginCall || isRefreshCall) {
          const errorMsg =
            (error.response as any)?.data?.message ||
            error.message ||
            (isLoginCall ? "Login failed" : "Token refresh failed");
          return Promise.reject(new Error(errorMsg));
        }

        // Handle 401 Unauthorized - No refresh, just logout
        if (status === 401) {
          console.log("🚨 401 Unauthorized - Session Expired");

          // Logout user immediately
          authService.logout();

          // Show session expired message
          notificationService.error(
            "Your session has expired. Please login again.",
            "Session Expired"
          );

          return Promise.reject(new Error("Session expired"));
        }

        const message =
          (error.response as any)?.data?.message ||
          error.message ||
          "Unexpected error";
        switch (status) {
          case 400:
            notificationService.warning(message, "Bad Request");
            break;
          case 403:
            notificationService.error(message, "Forbidden");
            break;
          case 404:
            notificationService.warning(message, "Not Found");
            break;
          case 500:
            notificationService.error(message, "Server Error");
            break;
          default:
            notificationService.error(message, "Error");
        }

        return Promise.reject(error);
      }
    );
  }

  get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config) as Promise<AxiosResponse<T>>;
  }
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config) as Promise<AxiosResponse<T>>;
  }
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config) as Promise<AxiosResponse<T>>;
  }
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.patch<T>(url, data, config) as Promise<AxiosResponse<T>>;
  }
  delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config) as Promise<AxiosResponse<T>>;
  }
}

export const apiV2 = new ApiService();
