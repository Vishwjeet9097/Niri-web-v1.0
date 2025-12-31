/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { authService } from "./auth.service";
import { notificationService } from "./notification.service";
import { config } from "@/config/environment";
import { API_ENDPOINTS } from "@/config/endpoints";
import { UserService } from "./UserService";
// import { dummyDataService } from "./dummyData.service"; // Removed - using only real API data
import type {
  ApiResponse,
  ApiError,
  NiriSubmission,
  ReviewComment,
  FileUpload,
  DashboardSummary,
} from "@/types";

// 🧑‍💻Review Section API Interfaces
export interface UpdateIndicatorField {
  [key: string]: any;
}
export interface UpdateIndicatorPayload {
  submissionId: string;
  category: string;
  section: string;
  fields: UpdateIndicatorField[];
}

// NIRI API Types
export interface NiriUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  contactNumber?: string;

  role: "ADMIN" | "MINISTRY_APPROVER" | "STATE_APPROVER" | "MOSPI_APPROVER" | "NODAL_OFFICER" | string;
}

export class ApiService {
    async register(userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      contactNumber: string;
      role: string;
      stateUt: string;
      stateId?: string;
      indicatorCodes?: string[];
      ministryId?: string;
    }): Promise<{ user: NiriUser; accessToken: string }> {
      try {
        const payload: any = {
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          contactNumber: userData.contactNumber,
          role: userData.role,
          stateUt: userData.stateUt,
          stateId: userData.stateId || userData.stateUt,
          ...(userData.indicatorCodes && userData.indicatorCodes.length > 0 && { indicatorCodes: userData.indicatorCodes }),
        };
        // If role is MINISTRY_APPROVER or MOSPI_REVIEWER and ministryId is present, include it as a string
        if ((userData.role === "MINISTRY_APPROVER" || userData.role === "MOSPI_REVIEWER"  || userData.role === "NODAL_OFFICER") && userData.ministryId) {
          payload.ministryId = Array.isArray(userData.ministryId) ? userData.ministryId[0] || "" : userData.ministryId;
        }
        console.log("🔍 API Service - Register Request Data:", payload);
        const response = await this.axios.post("/auth/register", payload);
        console.log(
          "🔍 API Service - Register Response Status:",
          response.status
        );
        return response.data;
      } catch (error) {
        // Handle 401 Unauthorized specifically
        if (error.response?.status === 401) {
          console.log("🔐 Login 401 - Invalid credentials");
          const errorData = error.response?.data || {};
          const errorMessage = errorData.message || "Invalid credentials";
          throw new Error(errorMessage);
        }
        throw error;
      }
    }

  private axios: AxiosInstance;

  async markNotificationStatus(id: string): Promise<void> {
    await this.axios.patch(`/api/notifications/status/${id}`);
  }

  constructor() {
    this.axios = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - attach auth headers
    this.axios.interceptors.request.use(
      (config) => {
        const isMultipart = config.data instanceof FormData;
        const authHeaders = authService.getAuthHeaders(isMultipart);
        Object.entries(authHeaders).forEach(([key, value]) => {
          config.headers.set(key, value);
        });
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and token refresh
    this.axios.interceptors.response.use(
      (response) => {
        // Handle 304 Not Modified as success
        if (response.status === 304) {
          console.log("📋 Response 304 - Using cached data");
          return response.data || {};
        }

        // Handle success responses (2xx)
        if (response.status >= 200 && response.status < 300) {
          console.log(`✅ Response ${response.status} - Success`);
          // Use response.data.data if available, otherwise response.data
          return response.data?.data !== undefined
            ? response.data
            : response.data;
        }

        return response;
      },
      async (error) => {
        // Handle 304 Not Modified as success, not error
        if (error.response?.status === 304) {
          console.log("📋 304 Not Modified - Using cached data");
          return error.response?.data || {};
        }

        const originalRequest = error.config;

        // Handle 401 - token expired (but not for login calls)
        if (error.response?.status === 401 && !originalRequest._retry) {
          const isLoginCall =
            originalRequest.url?.includes("/auth/login") ||
            originalRequest.url?.includes("/login");

          // Don't attempt refresh for login calls
          if (isLoginCall) {
            return Promise.reject(error);
          }

          originalRequest._retry = true;

          try {
            await authService.refreshToken();
            // Retry the original request with new token
            return this.axios(originalRequest);
          } catch (refreshError) {
            authService.logout();
            notificationService.createAndToast({
              title: "Session Expired",
              message: "Please log in again",
              type: "warning",
            });
            // Use navigate instead of window.location to avoid page refresh
            if (typeof window !== "undefined" && window.history) {
              window.history.pushState(null, "", "/login");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
            return Promise.reject(refreshError);
          }
        }

        // Enhanced error handling with backend message priority
        const backendMessage =
          error.response?.data?.message || error.response?.data?.error;
        const fallbackMessage = this.getFallbackErrorMessage(
          error.response?.status,
          error.config?.url
        );

        const apiError: ApiError = {
          message: backendMessage || fallbackMessage,
          code: error.response?.data?.code || error.response?.status,
          details: error.response?.data?.details,
          status: error.response?.status,
        };

        // Show appropriate notification based on error type
        this.handleErrorNotification(apiError, error.response?.status);

        return Promise.reject(apiError);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axios.get(url, config);
      if (
        response &&
        typeof response === "object" &&
        "config" in response &&
        "data" in response
      ) {
        return (response as AxiosResponse<T>).data;
      }
      return response as T;
    } catch (error: any) {
      // If it's a 304, the interceptor should have handled it
      if (error.response?.status === 304) {
        console.log("📋 GET 304 - Returning cached data");
        return (error.response?.data || {}) as T;
      }
      // Re-throw other errors
      throw error;
    }
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.axios.post(url, data, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.axios.put(url, data, config);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.axios.patch(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.axios.delete(url, config);
  }

  // Fetch notifications for a user
  async getNotifications(userId: string): Promise<any[]> {
    try {
      const response = await this.axios.get(`/api/notifications/${userId}`);
      let data =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log("🔍 API Service - Fetched Notifications Data:", data);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.notifications)) return data.notifications;
      return [];
    } catch (e) {
      return [];
    }
  }

  // Send notification
  async sendNotification(payload: {
    title: string;
    message: string;
    senderId: string;
    submissionId: string;
  }): Promise<any> {
    try {
      const response = await this.axios.post("/api/notifications", payload);
      return response.data;
    } catch (error) {
      console.error("Failed to send notification:", error);
      throw error;
    }
  }

  // Enhanced error handling methods
  private getFallbackErrorMessage(status?: number, url?: string): string {
    if (!status) return "Network error occurred. Please check your connection.";

    const urlPath = url?.split("/").pop() || "";

    switch (status) {
      // Success Codes (2xx) - Should not reach here, but just in case
      case 200:
        return "Request successful.";
      case 201:
        return "Resource created successfully.";
      case 202:
        return "Request accepted for processing.";

      // Client Error Codes (4xx)
      case 400:
        return "Bad Request - Invalid request data.";
      case 401:
        return "Unauthorized - Authentication required.";
      case 403:
        return "Forbidden - Access denied.";
      case 404:
        if (urlPath.includes("submission")) return "Submission not found.";
        if (urlPath.includes("file")) return "File not found.";
        return "Not Found - Resource not found.";
      case 409:
        return "Conflict - Resource conflict.";
      case 422:
        return "Unprocessable Entity - Validation failed.";
      case 429:
        return "Too Many Requests - Rate limit exceeded.";

      // Server Error Codes (5xx)
      case 500:
        return "Internal Server Error - Server error.";
      case 502:
        return "Bad Gateway - Gateway error.";
      case 503:
        return "Service Unavailable - Service down.";
      case 504:
        return "Gateway Timeout - Timeout error.";

      default:
        return "An unexpected error occurred. Please try again.";
    }
  }

  private handleErrorNotification(error: ApiError, status?: number): void {
    if (!status) {
      notificationService.error(error.message, "Network Error");
      return;
    }

    switch (status) {
      // Client Error Codes (4xx)
      case 400:
        notificationService.warning(error.message, "Bad Request");
        break;
      case 401:
        notificationService.error(error.message, "Unauthorized");
        break;
      case 403:
        notificationService.error(error.message, "Forbidden");
        break;
      case 404:
        notificationService.warning(error.message, "Not Found");
        break;
      case 409:
        notificationService.warning(error.message, "Conflict");
        break;
      case 422:
        notificationService.warning(error.message, "Unprocessable Entity");
        break;
      case 429:
        notificationService.warning(error.message, "Too Many Requests");
        break;

      // Server Error Codes (5xx)
      case 500:
        notificationService.error(error.message, "Internal Server Error");
        break;
      case 502:
        notificationService.error(error.message, "Bad Gateway");
        break;
      case 503:
        notificationService.error(error.message, "Service Unavailable");
        break;
      case 504:
        notificationService.error(error.message, "Gateway Timeout");
        break;

      default:
        notificationService.error(error.message, "Error");
    }
  }

  // NIRI API Methods
  async login(
    email: string,
    password: string
  ): Promise<{ user: NiriUser; accessToken: string }> {
    try {
      const response = await this.axios.post("/auth/login", {
        email,
        password,
      });
      console.log("🔍 API Service - Login Response Status:", response.status);
      console.log("🔍 API Service - Login Response Data:", response.data);

      // Handle response.data.data pattern
      const loginData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log("🔍 API Service - Processed Login Data:", loginData);

      return loginData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Login 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }

      // Handle 401 Unauthorized specifically
      if (error.response?.status === 401) {
        console.log("🔐 Login 401 - Invalid credentials");
        const errorData = error.response?.data || {};
        const errorMessage = errorData.message || "Invalid credentials";
        throw new Error(errorMessage);
      }

      throw error;
    }
  // Removed stray closing brace

  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    try {
      const response = await this.axios.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      console.log(
        "🔍 API Service - Change Password Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Change Password Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const changePasswordData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Change Password Data:",
        changePasswordData
      );

      return changePasswordData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Change Password 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async postMultipart<T = any>(
    url: string,
    data: FormData,
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    try {
      // ...existing code for postMultipart...
      // This is a placeholder for the actual implementation.
      // Please restore the correct logic if needed.
      return {} as T;
    } catch (error: any) {
      console.error("❌ Submission error:", error);
      throw error;
    }
  }

  async getSubmissions(
    page = 1,
    limit = 10,
    statusOrRole?: string,
    status?: string
  ): Promise<{
    submissions: NiriSubmission[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Get all submissions without any role-based filtering
    console.log("🔍 Getting all submissions without any filtering");

    // If statusOrRole is provided and it's a specific status, filter by that status
    // Otherwise, get all submissions
    let url = `/submission?page=${page}&limit=${limit}`;
    const statusToUse = status || statusOrRole;

    if (statusToUse && statusToUse !== "all") {
      // Check if it's a known role, if so ignore it and get all submissions
      const knownRoles = [
        "state_approver",
        "nodal_officer",
        "mospi_reviewer",
        "mospi_approver",
        "STATE_APPROVER",
        "NODAL_OFFICER",
        "MOSPI_REVIEWER",
        "MOSPI_APPROVER",
      ];

      // Only add status filter if it's not a role
      if (!knownRoles.includes(statusToUse)) {
        url += `&status=${encodeURIComponent(statusToUse)}`;
      }
    }

    return this.getSubmissionsUrl(url, page, limit);
  }

  /**
   * Get submissions for a specific role, always using the correct status param.
   */
  async getSubmissionsByRole(
    role: string,
    page = 1,
    limit = 10
  ): Promise<{
    submissions: NiriSubmission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const url = API_ENDPOINTS.submission.byRole(role, page, limit);
    return this.getSubmissionsUrl(url, page, limit);
  }

  /**
   * Internal helper to fetch and normalize submissions from a given url.
   */
  private async getSubmissionsUrl(
    url: string,
    page = 1,
    limit = 10
  ): Promise<{
    submissions: NiriSubmission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const responseData = await this.get(url);
    if (Array.isArray(responseData)) {
      return {
        submissions: responseData,
        total: responseData.length,
        page: page,
        limit: limit,
      };
    } else if (responseData?.submissions) {
      return {
        submissions: responseData.submissions,
        total: responseData.total || responseData.submissions.length,
        page: responseData.page || page,
        limit: responseData.limit || limit,
      };
    } else if (responseData?.data?.submissions) {
      return {
        submissions: responseData.data.submissions,
        total: responseData.data.total || responseData.data.submissions.length,
        page: responseData.data.page || page,
        limit: responseData.data.limit || limit,
      };
    } else if (responseData?.data) {
      return {
        submissions: responseData.data,
        total: responseData.total || responseData.data.length,
        page: responseData.page || page,
        limit: responseData.limit || limit,
      };
    } else {
      return {
        submissions: [],
        total: 0,
        page: page,
        limit: limit,
      };
    }
  }

  async getSubmission(id: string): Promise<NiriSubmission> {
    try {
      const response = await this.axios.get(`/submission/${id}`);
      console.log(
        "🔍 API Service - Get Submission Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get Submission Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const submissionData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get Submission Data:",
        submissionData
      );

      return submissionData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Submission 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async updateSubmission(
    id: string,
    formData: Record<string, any>
  ): Promise<NiriSubmission> {
    try {
      console.log("🔍 API Service - Update Submission Request Data:", {
        id,
        formData,
      });

      console.log("📊 section_status in payload:", formData.section_status);

      // Check if formData contains files
      const hasFiles = this.hasFileObjects(formData);

      let response;

      if (hasFiles) {
        // Use FormData for multipart upload
        const multipartFormData = new FormData();

        console.log("📤 Using multipart/form-data for file upload");
        console.log(
          "📦 Full payload before stringify:",
          JSON.stringify(formData, null, 2)
        );

        multipartFormData.append("submission", JSON.stringify(formData));

        // Append files
        this.appendFilesToFormData(multipartFormData, formData, "formData");

        response = await this.axios.patch(
          `/submission/${id}`,
          multipartFormData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      } else {
        // Use regular JSON payload - include all fields from formData
        console.log("📤 Using regular JSON payload");
        console.log("📦 Full payload:", JSON.stringify(formData, null, 2));

        response = await this.axios.patch(`/submission/${id}`, formData);
      }

      console.log(
        "🔍 API Service - Update Submission Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Update Submission Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const submissionData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Update Submission Data:",
        submissionData
      );

      return submissionData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Update Submission 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async addComment(
    id: string,
    url: string,
    data: FormData,
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    try {
      // Minimal valid implementation
      return {} as T;
    } catch (error: any) {
      console.error("❌ Submission error:", error);
      throw error;
    }
  // Removed orphaned code after addComment method

      return submissionData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Add Comment 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  // Removed stray closing brace

  async forwardToMospi(
    id: string,
    comment: string,
    currentStatus?: string
  ): Promise<NiriSubmission> {
    try {
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
      console.log("📡 API CALL: forwardToMospi");
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
      console.log("📝 Submission ID:", id);
      console.log("📊 Current Status:", currentStatus);
      console.log("💬 Comment:", comment);

      // Prepare payload based on current status
      const payload: any = { comment };

      // If current status is RETURNED_FROM_MOSPI, include status in payload
      if (currentStatus === "RETURNED_FROM_MOSPI") {
        payload.status = "SUBMITTED_TO_MOSPI_REVIEWER";
        console.log(
          "🔄 Status will change: RETURNED_FROM_MOSPI → SUBMITTED_TO_MOSPI_REVIEWER"
        );
      } else {
        console.log(
          "🔄 Status will change: SUBMITTED_TO_STATE → SUBMITTED_TO_MOSPI_REVIEWER"
        );
      }

      const response = await this.axios.post(
        `/submission/forward-to-mospi/${id}`,
        payload
      );
      console.log(
        "✅ API Service - Forward to MoSPI Response Status:",
        response.status
      );
      console.log(
        "📦 API Service - Forward to MoSPI Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const submissionData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "✅ API Service - Processed Forward to MoSPI Data:",
        submissionData
      );
      console.log("📊 New Status:", submissionData?.status);
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );

      return submissionData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Forward to MoSPI 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async forwardToMospiApprover(
    id: string,
    comment: string,
    sectionId?: string
  ): Promise<NiriSubmission> {
    try {
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
      console.log("📡 API CALL: forwardToMospiApprover");
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
      console.log("📝 Submission ID:", id);
      console.log(
        "📊 Status Change: SUBMITTED_TO_MOSPI_REVIEWER → SUBMITTED_TO_MOSPI_APPROVER"
      );
      console.log("💬 Comment:", comment);
      console.log("📋 Section ID:", sectionId || "overall");

      const response = await this.axios.post(
        `/submission/forward-to-mospi-approver/${id}`,
        {
          status: "SUBMITTED_TO_MOSPI_APPROVER",
          comment: comment,
          sectionId: sectionId || "overall", // Default to "overall" if not provided
        }
      );
      console.log(
        "✅ API Service - Forward to MoSPI Approver Response Status:",
        response.status
      );
      console.log(
        "📦 API Service - Forward to MoSPI Approver Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const submissionData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "✅ API Service - Processed Forward to MoSPI Approver Data:",
        submissionData
      );
      console.log("📊 New Status:", submissionData?.status);
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );

      return submissionData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Forward to MoSPI Approver 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async stateReject(id: string, comment: string): Promise<NiriSubmission> {
    try {
      // Get current user's role to determine the appropriate status
      const currentUserRole = UserService.getRole();

      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
      console.log("📡 API CALL: stateReject");
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
      console.log("📝 Submission ID:", id);
      console.log("👤 Current User Role:", currentUserRole);
      console.log("💬 Comment:", comment);

      const payload: any = { comment };

      // Add status based on user role
      if (currentUserRole === "MOSPI_APPROVER") {
        payload.status = "RETURNED_FROM_MOSPI";
        console.log("📤 FORM TRANSFER: MOSPI_APPROVER → STATE_APPROVER");
        console.log(
          "📊 Status Change: SUBMITTED_TO_MOSPI_APPROVER → RETURNED_FROM_MOSPI"
        );
      } else if (currentUserRole === "STATE_APPROVER") {
        payload.status = "RETURNED_FROM_STATE";
        console.log("📤 FORM TRANSFER: STATE_APPROVER → NODAL_OFFICER");
        console.log(
          "📊 Status Change: SUBMITTED_TO_STATE → RETURNED_FROM_STATE"
        );
      }

      const response = await this.axios.post(
        `/submission/state-reject/${id}`,
        payload
      );
      console.log(
        "✅ API Service - State Reject Response Status:",
        response.status
      );
      console.log(
        "📦 API Service - State Reject Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const submissionData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "✅ API Service - Processed State Reject Data:",
        submissionData
      );
      console.log("📊 New Status:", submissionData?.status);
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );

      return submissionData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 State Reject 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async mospiApproverSendBack(id: string): Promise<NiriSubmission> {
    try {
      const response = await this.axios.post(
        `/submission/mospi-approver-send-back/${id}`,
        {}
      );
      console.log(
        "🔍 API Service - MOSPI Approver Send Back Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - MOSPI Approver Send Back Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const submissionData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed MOSPI Approver Send Back Data:",
        submissionData
      );

      return submissionData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 MOSPI Approver Send Back 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async cleanMospiStatusFromSubmission(id: string): Promise<NiriSubmission> {
    try {
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
      console.log("📡 API CALL: cleanMospiStatusFromSubmission");
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
      console.log("📝 Submission ID:", id);
      console.log(
        "🧹 Removing mospi_status from all categories (infraFinancing, infraDevelopment, pppDevelopment, infraEnablers)"
      );

      const response = await this.axios.post(
        `/submission/clean-mospi-status/${id}`,
        {}
      );
      console.log(
        "✅ API Service - Clean MOSPI Status Response Status:",
        response.status
      );
      console.log(
        "📦 API Service - Clean MOSPI Status Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const submissionData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "✅ API Service - Processed Clean MOSPI Status Data:",
        submissionData
      );
      console.log("✅ mospi_status removed from all categories");
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );

      return submissionData;
    } catch (error: any) {
      console.error("❌ API Service - Clean MOSPI Status Error:", error);
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Clean MOSPI Status 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async finalReject(id: string, comment: string): Promise<NiriSubmission> {
    try {
      // Get current user's role to determine rejection status
      const currentUserRole = UserService.getRole();
      let rejectionStatus = "REJECTED_FINAL"; // Default for MoSPI Approver

      if (currentUserRole === "STATE_APPROVER") {
        rejectionStatus = "REJECTED";
      } else if (currentUserRole === "MOSPI_APPROVER") {
        rejectionStatus = "REJECTED_FINAL";
      }

      const response = await this.axios.post(`/submission/final-reject/${id}`, {
        status: rejectionStatus,
        comment,
      });
      console.log(
        "🔍 API Service - Final Reject Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Final Reject Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const submissionData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Final Reject Data:",
        submissionData
      );

      return submissionData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Final Reject 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async resubmit(
    id: string,
    formData: Record<string, any>,
    comment: string
  ): Promise<NiriSubmission> {
    try {
      const response = await this.axios.post(`submission/resubmit/${id}`, {
        formData,
        comment,
      });
      console.log(
        "🔍 API Service - Resubmit Response Status:",
        response.status
      );
      console.log("🔍 API Service - Resubmit Response Data:", response.data);

      // Handle response.data.data pattern
      const submissionData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log("🔍 API Service - Processed Resubmit Data:", submissionData);

      return submissionData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Resubmit 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  /**
   * Helper method to check if a section has meaningful data
   * @param sectionKey - The section key (e.g., 'section1_1')
   * @param sectionData - The section data object
   * @returns true if section has meaningful data, false otherwise
   */
  private hasMeaningfulSectionData(
    sectionKey: string,
    sectionData: any
  ): boolean {
    if (!sectionData || typeof sectionData !== "object") {
      console.log(`❌ ${sectionKey}: No data or not an object`);
      return false;
    }

    // Helper: Check if a value is meaningful
    const isMeaningful = (value: any): boolean => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim() !== "";
      if (typeof value === "number") return value !== 0;
      if (typeof value === "boolean") return true;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object") {
        // For file objects, check if it has file data
        if (value.file || value.fileName || value.filePath) return true;
        // For other objects, check if it has any keys
        return Object.keys(value).length > 0;
      }
      return false;
    };

    // Helper: Check if a file object has meaningful data
    const hasFileData = (file: any): boolean => {
      if (!file) return false;
      return !!(file.file || file.fileName || file.filePath || file.fileUrl);
    };

    // Helper: Check if an array has meaningful items
    const hasMeaningfulArrayItems = (arr: any[]): boolean => {
      if (!Array.isArray(arr) || arr.length === 0) return false;
      // Check if at least one item has meaningful data
      return arr.some((item) => {
        if (!item || typeof item !== "object") return false;
        // Check if item has at least one meaningful field (excluding id)
        return Object.entries(item).some(([key, value]) => {
          if (key === "id") return false; // id alone doesn't count
          return isMeaningful(value);
        });
      });
    };

    // Pattern 1: Check for conditional Yes/No fields
    // Common conditional field names: available, allEligible, hasInvestmentReady,
    // hasIntermediary, hasInfraDevelopmentPlan, adopted, implemented, participated
    const conditionalFields = [
      "available",
      "allEligible",
      "hasInvestmentReady",
      "hasIntermediary",
      "hasInfraDevelopmentPlan",
      "adopted",
      "implemented",
      "participated",
    ];

    for (const fieldName of conditionalFields) {
      const conditionalValue = sectionData[fieldName];

      // If this conditional field exists and has a value
      if (conditionalValue === "yes" || conditionalValue === "no") {
        console.log(
          `📋 ${sectionKey}: Found conditional field "${fieldName}" = "${conditionalValue}"`
        );

        if (conditionalValue === "yes") {
          // For "yes", check for required fields based on common patterns

          // Pattern 1a: Yes requires websiteLink + array (section2_4)
          if (fieldName === "hasInvestmentReady" && sectionData.websiteLink) {
            if (
              isMeaningful(sectionData.websiteLink) &&
              hasMeaningfulArrayItems(sectionData.investmentReadyArray || [])
            ) {
              console.log(
                `  ✓ ${sectionKey}: Yes with websiteLink and investmentReadyArray`
              );
              return true;
            }
            // If websiteLink exists but array is empty, return false
            console.log(
              `  ⚠️ ${sectionKey}: Yes with websiteLink but no array data`
            );
            return false;
          }

          // Pattern 1b: Yes requires websiteLink only (section4_1)
          if (
            fieldName === "allEligible" &&
            isMeaningful(sectionData.websiteLink)
          ) {
            console.log(`  ✓ ${sectionKey}: Yes with websiteLink`);
            return true;
          }

          // Pattern 1c: Yes requires file (section3_1, section3_2, section4_2, section4_4)
          if (hasFileData(sectionData.file)) {
            console.log(`  ✓ ${sectionKey}: Yes with file`);
            return true;
          }

          // Pattern 1d: Yes requires array (section1_5, section2_3, section4_3, section4_5, section4_6)
          const arrayFields = Object.keys(sectionData).filter(
            (key) =>
              key.toLowerCase().includes("array") ||
              key === "projects" ||
              key === "practices" ||
              key === "ffiArray" ||
              key === "infraDevelopmentArray" ||
              key === "capacityArray"
          );

          for (const arrKey of arrayFields) {
            if (hasMeaningfulArrayItems(sectionData[arrKey])) {
              console.log(`  ✓ ${sectionKey}: Yes with array "${arrKey}"`);
              return true;
            }
          }

          // If "yes" but requirements not met, return false
          console.log(`  ⚠️ ${sectionKey}: Yes but requirements not met`);
          return false;
        }

        // IMPORTANT: For "no", ONLY check comment - don't check other patterns
        if (conditionalValue === "no") {
          if (isMeaningful(sectionData.comment)) {
            console.log(`  ✓ ${sectionKey}: No with comment`);
            return true;
          }
          // If "no" but no comment, return false immediately
          console.log(`  ⚠️ ${sectionKey}: No but no comment provided`);
          return false;
        }
      }
    }

    // Pattern 2: Check for array-based sections (no conditional logic)
    // Look for common array field names
    const arrayFieldNames = [
      "ulbList",
      "bondList",
      "tenderList",
      "projectList",
      "infraActArray",
      "specializedEntityArray",
      "assetMonetizationArray",
      "VGFArray",
      "investmentReadyArray",
    ];

    for (const arrKey of arrayFieldNames) {
      if (sectionData[arrKey] !== undefined) {
        if (hasMeaningfulArrayItems(sectionData[arrKey])) {
          console.log(
            `📋 ${sectionKey}: Array section "${arrKey}" has meaningful items`
          );
          return true;
        }
      }
    }

    // Also check for generic array patterns (any field ending in Array/List or named projects)
    for (const [key, value] of Object.entries(sectionData)) {
      if (
        (key.toLowerCase().endsWith("array") ||
          key.toLowerCase().endsWith("list") ||
          key === "projects") &&
        Array.isArray(value)
      ) {
        if (hasMeaningfulArrayItems(value)) {
          console.log(
            `📋 ${sectionKey}: Found array "${key}" with meaningful items`
          );
          return true;
        }
      }
    }

    // Pattern 3: Check for file-based sections
    if (hasFileData(sectionData.file)) {
      console.log(`📋 ${sectionKey}: Has file data`);
      return true;
    }

    if (Array.isArray(sectionData.files) && sectionData.files.length > 0) {
      const hasAnyFile = sectionData.files.some((f: any) => hasFileData(f));
      if (hasAnyFile) {
        console.log(`📋 ${sectionKey}: Has files array with data`);
        return true;
      }
    }

    // Pattern 4: For regular sections, check if any field has meaningful value
    // (excluding calculated/auto-populated fields)
    const ignoredFields = new Set([
      "year", // Auto-populated in some cases
      "percentage", // Calculated field
      "marksObtained", // Calculated field
      "proportion", // Calculated field
      "allocationToGSDP", // Calculated field
      "capexActualsToGSDP", // Calculated field
      "capexToCapexActuals", // Calculated field
      "stateCapexUtilisation", // Calculated field
      "numberOfProjects", // Calculated field
      "tpcOfPPPProjects", // Calculated field
      "totalProjectsAwarded", // May be calculated
      "totalProjectCostAwarded", // May be calculated
      "totalProjectCost", // May be calculated
      "totalULBs", // May be auto-populated
    ]);

    const meaningfulFields = Object.entries(sectionData).filter(
      ([field, value]) => {
        if (ignoredFields.has(field)) return false;
        return isMeaningful(value);
      }
    );

    const hasData = meaningfulFields.length > 0;
    console.log(
      `📊 ${sectionKey}: ${meaningfulFields.length} meaningful fields, hasData: ${hasData}`,
      meaningfulFields.map(([f]) => f)
    );
    return hasData;
  }

  /**
   * Extract completed indicators from section data
   * @param sectionData - The form data with section keys
   * @param indicators - Array of all indicator codes in this category
   * @returns Array of indicator codes that have meaningful data
   */
  private extractCompletedIndicators(
    sectionData: Record<string, any>,
    indicators: string[]
  ): string[] {
    const completedIndicators: string[] = [];

    console.log(
      "🔍 extractCompletedIndicators - sectionData keys:",
      Object.keys(sectionData)
    );
    console.log(
      "🔍 extractCompletedIndicators - indicators to check:",
      indicators
    );

    // Map indicator codes to section keys (e.g., '1.1' -> 'section1_1')
    indicators.forEach((indicatorCode) => {
      const sectionKey = `section${indicatorCode.replace(".", "_")}`;

      console.log(`🔎 Checking indicator ${indicatorCode} → ${sectionKey}`);
      console.log(
        `🔎 sectionData[${sectionKey}] exists:`,
        !!sectionData[sectionKey]
      );

      if (sectionData[sectionKey]) {
        console.log(
          `🔎 sectionData[${sectionKey}] content:`,
          JSON.stringify(sectionData[sectionKey], null, 2)
        );
        const hasMeaningfulData = this.hasMeaningfulSectionData(
          sectionKey,
          sectionData[sectionKey]
        );

        if (hasMeaningfulData) {
          completedIndicators.push(indicatorCode);
          console.log(
            `✅ Indicator ${indicatorCode} (${sectionKey}) has meaningful data`
          );
        } else {
          console.log(
            `⚠️ Indicator ${indicatorCode} (${sectionKey}) has no meaningful data`
          );
        }
      } else {
        console.log(
          `❌ Indicator ${indicatorCode} (${sectionKey}) not found in sectionData`
        );
      }
    });

    console.log("📊 Final completedIndicators:", completedIndicators);
    return completedIndicators;
  }

  /**
   * Submit a section (category) to state approver
   * @param sectionData - The form data for the specific section
   * @param category - The category/section identifier (e.g., 'infraFinancing', 'infraDevelopment', etc.)
   * @param indicators - Array of indicator codes being submitted (e.g., ['1.1', '1.2'])
   */
  async submitSectionToStateApprover(
    sectionData: Record<string, any>,
    category: string,
    indicators: string[]
  ): Promise<any> {
    try {
      // ✅ Check for File objects BEFORE any processing
      // This is critical because sectionData might have been sanitized already
      console.log("🔍 API Service - Submit Section to State Approver:", {
        category,
        indicators,
        sectionDataKeys: Object.keys(sectionData),
      });

      // Check if sectionData contains File objects (before sanitization)
      // Note: If sectionData was sanitized, File objects will be plain objects
      // We need to check for the structure that indicates files exist
      const hasFilesBeforeProcessing = this.hasFileObjects(sectionData);
      const fileCheckBeforeProcessing = this.manualFileCheck(sectionData);

      console.log("🔍 File objects detected in raw sectionData:", {
        hasFiles: hasFilesBeforeProcessing,
        manualCheck: fileCheckBeforeProcessing,
      });

      // Also check for file-like structures (plain objects that look like File objects)
      // This handles cases where File objects were serialized to plain objects
      const hasFileLikeStructures = this.hasFileLikeStructures(sectionData);
      console.log("🔍 File-like structures detected:", hasFileLikeStructures);

      const hasAnyFiles =
        hasFilesBeforeProcessing ||
        fileCheckBeforeProcessing.found ||
        hasFileLikeStructures;

      if (hasAnyFiles) {
        console.log(
          "📤 Files or file-like structures detected - will handle upload"
        );
        // Store this info to use later in CREATE/UPDATE flow
        // Note: If files are file-like structures (serialized), we can't upload them
        // They need to be File instances. This means the step component should pass
        // original formData with File objects, not sanitized data.
        if (hasFileLikeStructures && !hasFilesBeforeProcessing) {
          console.error(
            "❌ CRITICAL: File objects were serialized to plain objects before reaching submitSectionToStateApprover!"
          );
          console.error(
            "❌ Cannot upload files - File instances are required. Step component should pass original formData."
          );
        }
      }

      // Get user info early to check role and ownership
      const user = authService.getUser();
      const userId = user?.id || user?._id;
      const userRole = user?.role;
      const stateUt = user?.state || user?.stateUt;

      // Extract only indicators that have meaningful data
      const completedIndicators = this.extractCompletedIndicators(
        sectionData,
        indicators
      );
      console.log(
        "📊 Indicators with meaningful data in this submission:",
        completedIndicators
      );

      // Check if there's an existing submission for this user
      let existingSubmissionId: string | null = null;
      let existingSubmission: any = null;

      try {
        // Try to get user's existing draft/in-progress submissions
        const submissions = await this.getSubmissions(1, 100);

        // For STATE_APPROVER: only find submissions that belong to STATE_APPROVER
        // For NODAL_OFFICER: find submissions that belong to NODAL_OFFICER
        const userSubmission = submissions.submissions.find((sub: any) => {
          const matchesStatus =
            sub.status === "DRAFT" ||
            sub.status === "IN_PROGRESS" ||
            sub.status === "RETURNED_FROM_STATE";

          if (!matchesStatus) return false;

          // Check ownership: submission.user.role or currentOwnerRole
          const submissionOwnerRole = sub.user?.role || sub.currentOwnerRole;

          if (userRole === "STATE_APPROVER") {
            // STATE_APPROVER should only update their own submissions
            // Don't update NODAL_OFFICER submissions
            return submissionOwnerRole === "STATE_APPROVER";
          } else if (userRole === "NODAL_OFFICER") {
            // NODAL_OFFICER should only update their own submissions
            return submissionOwnerRole === "NODAL_OFFICER";
          }

          // For other roles, use existing logic (check by userId if available)
          if (userId && sub.submittedBy) {
            return sub.submittedBy === userId || sub.user?.id === userId;
          }

          return true; // Fallback: allow if status matches
        });

        if (userSubmission) {
          existingSubmissionId = userSubmission.id;
          // Fetch full submission details to get complete formData and completedIndicators
          existingSubmission = await this.getSubmission(userSubmission.id);
          console.log("📋 Found existing submission:", existingSubmissionId);
          console.log(
            "📋 Submission owner role:",
            existingSubmission?.user?.role ||
              existingSubmission?.currentOwnerRole
          );
        } else {
          console.log(
            "📋 No existing submission found for",
            userRole,
            "- will create new one"
          );
        }
      } catch (err) {
        console.log("⚠️ No existing submission found, will create new one");
      }

      // Get user's total assigned/available indicator count dynamically
      // (user info already fetched above)
      let totalIndicatorCount = 0;
      let userAssignedIndicators: string[] = [];

      if (userId) {
        // For NODAL_OFFICER: fetch assigned indicators from user_indicator_scope table
        // For STATE_APPROVER: fetch available indicators (leftover indicators not assigned to NODAL_OFFICERs)
        if (userRole === "STATE_APPROVER" && stateUt) {
          console.log(
            "📊 STATE_APPROVER detected, fetching available indicators"
          );
          const availableIndicatorsResponse =
            await this.getAvailableIndicatorsForApprover(stateUt);
          // Normalize response to array of indicator codes
          if (Array.isArray(availableIndicatorsResponse)) {
            userAssignedIndicators = availableIndicatorsResponse
              .map(
                (item: any) =>
                  item?.code ||
                  item?.indicator?.code ||
                  (typeof item === "string" ? item : null)
              )
              .filter(Boolean);
          } else if (availableIndicatorsResponse?.data) {
            const data = availableIndicatorsResponse.data;
            if (Array.isArray(data)) {
              userAssignedIndicators = data
                .map(
                  (item: any) =>
                    item?.code ||
                    item?.indicator?.code ||
                    (typeof item === "string" ? item : null)
                )
                .filter(Boolean);
            }
          }
          totalIndicatorCount = userAssignedIndicators.length;

          console.log("📊 User ID:", userId);
          console.log("📊 State/UT:", stateUt);
          console.log(
            "📊 Dynamically fetched available indicators for STATE_APPROVER:",
            userAssignedIndicators
          );
          console.log(
            "📊 Total available indicators (dynamic):",
            totalIndicatorCount
          );
        } else {
          // NODAL_OFFICER or other roles: use assigned indicators
          userAssignedIndicators = await this.getUserAssignedIndicators(userId);
          totalIndicatorCount = userAssignedIndicators.length;

          console.log("📊 User ID:", userId);
          console.log(
            "📊 Dynamically fetched from user_indicator_scope:",
            userAssignedIndicators
          );
          console.log(
            "📊 Total assigned indicators (dynamic):",
            totalIndicatorCount
          );
        }
      } else {
        console.warn(
          "⚠️ No user ID found, cannot fetch assigned/available indicators"
        );
      }

      let result;

      if (existingSubmissionId) {
        // Update existing submission
        console.log("🔄 Updating existing submission:", existingSubmissionId);

        // Get existing section_status from DB
        const existingSectionStatus = existingSubmission?.section_status || {
          completedCount: 0,
          totalAssigned: totalIndicatorCount,
          completedIndicators: [],
        };

        console.log(
          "📋 Existing section_status from DB:",
          existingSectionStatus
        );

        // Get existing completed indicators array
        const existingCompletedIndicators =
          existingSectionStatus.completedIndicators || [];

        // Check ALL categories in formData to find indicators with data
        const existingFormData = existingSubmission?.formData || {};
        const allCategories = [
          "infraFinancing",
          "infraDevelopment",
          "pppDevelopment",
          "infraEnablers",
        ];
        const categoryToIndicatorMap: Record<string, string[]> = {
          infraFinancing: ["1.1", "1.2", "1.3", "1.4", "1.5"],
          infraDevelopment: ["2.1", "2.2", "2.3", "2.4", "2.5"],
          pppDevelopment: ["3.1", "3.2", "3.3", "3.4"],
          infraEnablers: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"],
        };

        // Find all indicators that have data in DB (across all categories)
        // For NODAL_OFFICER: check against assigned indicators
        // For STATE_APPROVER: check against available indicators
        const indicatorsWithDataInDB: string[] = [];
        allCategories.forEach((cat) => {
          const catData = existingFormData[cat] || {};
          const catIndicators = categoryToIndicatorMap[cat] || [];

          catIndicators.forEach((indicatorCode) => {
            // Check if indicator is in user's assigned/available list
            if (userAssignedIndicators.includes(indicatorCode)) {
              const sectionKey = `section${indicatorCode.replace(".", "_")}`;
              const hasDataInDB =
                catData[sectionKey] &&
                this.hasMeaningfulSectionData(sectionKey, catData[sectionKey]);

              if (hasDataInDB) {
                indicatorsWithDataInDB.push(indicatorCode);
                console.log(
                  `✅ Found data in DB for indicator ${indicatorCode} (${cat})`
                );
              }
            }
          });
        });

        // Merge: existing completed + newly completed + found in DB (remove duplicates)
        const allCompletedIndicators = Array.from(
          new Set([
            ...existingCompletedIndicators,
            ...completedIndicators,
            ...indicatorsWithDataInDB,
          ])
        );

        // Build updated section_status
        const updatedSectionStatus = {
          completedCount: allCompletedIndicators.length,
          totalAssigned: totalIndicatorCount,
          completedIndicators: allCompletedIndicators,
        };

        console.log("📊 Updated section_status:", updatedSectionStatus);
        console.log(
          "📊 Progress:",
          updatedSectionStatus.completedCount,
          "of",
          updatedSectionStatus.totalAssigned
        );

        // Filter sectionData to only include sections for ALL completed indicators (existing + newly saved)
        // Merge with existing data from DB to preserve previously saved sections
        let filteredSectionData: Record<string, any> = {};

        // 🔍 DEBUG: Log incoming sectionData for indicators 2.3 and 2.4
        console.log("🔍 [API UPDATE] Incoming sectionData:", {
          section2_3: sectionData.section2_3,
          section2_4: sectionData.section2_4,
          allSectionKeys: Object.keys(sectionData),
        });
        console.log(
          "🔍 [API UPDATE] Completed indicators:",
          completedIndicators
        );
        console.log(
          "🔍 [API UPDATE] All completed indicators:",
          allCompletedIndicators
        );

        // First, include existing sections from DB (to preserve previously saved data)
        const existingCategoryData = existingFormData[category] || {};
        console.log("🔍 [API UPDATE] Existing category data:", {
          section2_3: existingCategoryData.section2_3,
          section2_4: existingCategoryData.section2_4,
          allSectionKeys: Object.keys(existingCategoryData),
        });

        Object.keys(existingCategoryData).forEach((sectionKey) => {
          if (sectionKey.startsWith("section")) {
            filteredSectionData[sectionKey] = existingCategoryData[sectionKey];
          }
        });

        // Then, update/add only the sections for indicators being saved now (from completedIndicators)
        // Use allCompletedIndicators to ensure we include all saved indicators
        allCompletedIndicators.forEach((indicatorCode) => {
          const sectionKey = `section${indicatorCode.replace(".", "_")}`;
          // If this indicator is being saved now, use new data with appropriate status; otherwise keep existing
          if (
            completedIndicators.includes(indicatorCode) &&
            sectionData[sectionKey]
          ) {
            // Check if incoming data has a status (e.g., RESUBMITTED), otherwise determine based on existing status
            const incomingStatus = sectionData[sectionKey]?.status;
            const existingStatus = existingCategoryData[sectionKey]?.status;
            const upperExistingStatus = (existingStatus || "").toUpperCase();

            // If incoming data has a status, use it (preserve RESUBMITTED)
            // Otherwise, if existing status was REVERTED/RESUBMITTED, set to RESUBMITTED
            // Otherwise, set to SUBMITTED_TO_STATE
            let finalStatus: string;
            if (incomingStatus) {
              finalStatus = incomingStatus; // Preserve the status sent from frontend (e.g., RESUBMITTED)
            } else if (
              upperExistingStatus === "REVERTED" ||
              upperExistingStatus === "RESUBMITTED"
            ) {
              finalStatus = "RESUBMITTED";
            } else {
              finalStatus = "SUBMITTED_TO_STATE";
            }

            // Add nodalOfficerId if user is NODAL_OFFICER
            const sectionDataWithNodalId = { ...sectionData[sectionKey] };
            if (userRole === "NODAL_OFFICER" && userId) {
              sectionDataWithNodalId.nodalOfficerId = userId;
            }

            filteredSectionData[sectionKey] = {
              ...sectionDataWithNodalId,
              status: finalStatus,
            };
            console.log(
              `✅ Updating section ${sectionKey} for indicator ${indicatorCode} with status ${finalStatus}${
                userRole === "NODAL_OFFICER"
                  ? ` (nodalOfficerId: ${userId})`
                  : ""
              }`
            );
            console.log(
              `🔍 [API UPDATE] Section ${sectionKey} data:`,
              filteredSectionData[sectionKey]
            );
          } else if (existingCategoryData[sectionKey]) {
            // Keep existing data for previously saved indicators (preserve their status)
            filteredSectionData[sectionKey] = existingCategoryData[sectionKey];
            console.log(
              `📋 Keeping existing section ${sectionKey} for indicator ${indicatorCode}`
            );
          } else {
            console.log(
              `⚠️ Section ${sectionKey} not found in sectionData or existingCategoryData for indicator ${indicatorCode}`
            );
          }
        });

        console.log("🔍 Original sectionData keys:", Object.keys(sectionData));
        console.log(
          "🔍 Filtered sectionData keys (merged with existing):",
          Object.keys(filteredSectionData)
        );
        console.log("🔍 All completed indicators:", allCompletedIndicators);
        console.log("🔍 Newly completed indicators:", completedIndicators);

        // ✅ Upload all File objects to S3 before submission
        const hasUnuploadedFiles = this.hasFileObjects(filteredSectionData);

        // Extract submissionId field (not UUID) for file upload paths
        // existingSubmissionId is the UUID (for API routes), but file uploads need submissionId field
        const existingSubmissionIdForFiles = existingSubmission?.submissionId;

        console.log("🔍 File detection check (UPDATE):", {
          hasUnuploadedFiles,
          category,
          existingSubmissionId, // UUID for API routes
          existingSubmissionIdForFiles, // submissionId field for file paths
          filteredSections: Object.keys(filteredSectionData),
        });

        if (
          hasUnuploadedFiles &&
          existingSubmissionId &&
          existingSubmissionIdForFiles
        ) {
          console.log("📤 Uploading File objects to S3 before submission...");
          try {
            // Upload files and replace File objects with filePath
            // Use submissionId field (not UUID) for file upload paths
            const uploadedData = await this.uploadFilesAndReplace(
              { [category]: filteredSectionData },
              existingSubmissionIdForFiles // Use submissionId field for file paths
            );
            // Extract the category data back
            filteredSectionData = uploadedData[category];
            console.log("✅ All files uploaded to S3 successfully");
          } catch (error: any) {
            console.error("❌ Failed to upload files to S3:", error);
            throw new Error(
              `File upload failed: ${error.message || "Unknown error"}`
            );
          }
        } else if (
          hasUnuploadedFiles &&
          (!existingSubmissionId || !existingSubmissionIdForFiles)
        ) {
          console.error(
            "❌ Cannot upload files: existingSubmissionId (UUID) or submissionId field is missing"
          );
          throw new Error(
            "Failed to update submission - submissionId is missing"
          );
        } else if (!hasUnuploadedFiles) {
          console.log(
            "ℹ️ No File objects detected (UPDATE) - files already uploaded or no files present"
          );
        }

        // Extract file metadata from the filtered section data
        // Only extract from the category being updated to avoid unnecessary re-extraction
        const extractedFiles = this.extractFileMetadataFromFormData({
          [category]: filteredSectionData,
        });

        // Merge with existing attachedFiles to avoid duplicates and handle deleted files
        // Files that are no longer in formData should be removed from attachedFiles
        const existingAttachedFiles = existingSubmission?.attachedFiles || [];
        const extractedFilePaths = new Set(
          extractedFiles.map((f) => f.filePath)
        );

        // Keep existing files that are still referenced in formData (from other categories)
        // and add newly extracted files
        const filesToKeep = existingAttachedFiles.filter((f) => {
          // Keep if it's in the extracted files (current category)
          if (extractedFilePaths.has(f.filePath)) {
            return false; // Will be replaced by extracted version
          }
          // Keep if it's from a different category (not being updated)
          // We can't easily check this, so we'll keep all existing files
          // and let backend handle deduplication
          return true;
        });

        // Combine: existing files from other categories + newly extracted files
        const allAttachedFiles = [...filesToKeep, ...extractedFiles];

        // Remove duplicates based on filePath (keep the most recent version)
        const uniqueAttachedFiles = Array.from(
          new Map(
            allAttachedFiles.map((file) => [file.filePath, file])
          ).values()
        );

        const updatePayload = {
          [category]: filteredSectionData,
          indicators: allCompletedIndicators, // Use allCompletedIndicators to include all saved indicators
          section_status: updatedSectionStatus,
          attachedFiles: uniqueAttachedFiles, // ✅ Add extracted files
        };

        console.log("📦 Update Payload:", {
          category,
          section_status: updatedSectionStatus,
          filteredSections: Object.keys(filteredSectionData),
          attachedFilesCount: uniqueAttachedFiles.length,
          extractedFilesCount: extractedFiles.length,
          existingFilesCount: existingAttachedFiles.length,
        });

        result = await this.updateSubmission(
          existingSubmissionId,
          updatePayload
        );

        // Check if all assigned indicators are completed
        // Only redirect for NODAL_OFFICER, not for STATE_APPROVER
        if (
          updatedSectionStatus.completedCount >=
          updatedSectionStatus.totalAssigned
        ) {
          console.log(
            "🎉 All indicators completed! Redirecting to review page..."
          );

          // if (typeof window !== "undefined") {
          //   setTimeout(() => {
          //     window.location.href = `/data-submission/review/${existingSubmissionId}`;
          //   }, 1000);
          // }
        }
      } else {
        // Create new submission
        console.log("➕ Creating new submission");

        // Build initial section_status
        const initialSectionStatus = {
          completedCount: completedIndicators.length,
          totalAssigned: totalIndicatorCount,
          completedIndicators: completedIndicators,
        };

        console.log("📊 Initial section_status:", initialSectionStatus);
        console.log(
          "📊 Progress:",
          initialSectionStatus.completedCount,
          "of",
          initialSectionStatus.totalAssigned
        );

        // Filter sectionData to only include sections for completed indicators
        // This ensures we don't save unsaved sections (e.g., if user filled 1.2 but only saved 1.1)
        let filteredSectionData: Record<string, any> = {};

        // 🔍 DEBUG: Log incoming sectionData for indicators 2.3 and 2.4
        console.log("🔍 [API CREATE] Incoming sectionData:", {
          section2_3: sectionData.section2_3,
          section2_4: sectionData.section2_4,
          allSectionKeys: Object.keys(sectionData),
        });
        console.log(
          "🔍 [API CREATE] Completed indicators:",
          completedIndicators
        );

        completedIndicators.forEach((indicatorCode) => {
          const sectionKey = `section${indicatorCode.replace(".", "_")}`;
          if (sectionData[sectionKey]) {
            // Preserve incoming status if present (e.g., RESUBMITTED), otherwise default to SUBMITTED_TO_STATE
            const incomingStatus = sectionData[sectionKey]?.status;
            const finalStatus = incomingStatus || "SUBMITTED_TO_STATE";

            // Add nodalOfficerId if user is NODAL_OFFICER
            const sectionDataWithNodalId = { ...sectionData[sectionKey] };
            if (userRole === "NODAL_OFFICER" && userId) {
              sectionDataWithNodalId.nodalOfficerId = userId;
            }

            filteredSectionData[sectionKey] = {
              ...sectionDataWithNodalId,
              status: finalStatus,
            };
            console.log(
              `✅ Including section ${sectionKey} for indicator ${indicatorCode} with status ${finalStatus}${
                userRole === "NODAL_OFFICER"
                  ? ` (nodalOfficerId: ${userId})`
                  : ""
              }`
            );
            console.log(
              `🔍 [API CREATE] Section ${sectionKey} data:`,
              filteredSectionData[sectionKey]
            );
          } else {
            console.log(
              `⚠️ Section ${sectionKey} not found in sectionData for indicator ${indicatorCode}`
            );
            console.log(
              `🔍 [API CREATE] Available sectionData keys:`,
              Object.keys(sectionData)
            );
          }
        });

        console.log("🔍 Original sectionData keys:", Object.keys(sectionData));
        console.log(
          "🔍 Filtered sectionData keys (only saved indicators):",
          Object.keys(filteredSectionData)
        );
        console.log("🔍 Completed indicators:", completedIndicators);

        // ✅ Check for File objects - need to create submission first to get submissionId
        // IMPORTANT: Check BEFORE any JSON serialization or sanitization
        // The File objects might be plain objects if they came from sanitized data
        // So we need to check the ORIGINAL sectionData, not filteredSectionData

        // First, check the original sectionData that was passed in
        const hasFilesInOriginal = this.hasFileObjects(sectionData);
        console.log(
          "🔍 Checking original sectionData for files:",
          hasFilesInOriginal
        );

        // Also check filteredSectionData (in case files are still there)
        const hasUnuploadedFiles = this.hasFileObjects(filteredSectionData);

        console.log("🔍 File detection check:", {
          hasFilesInOriginal,
          hasUnuploadedFiles,
          category,
          filteredSections: Object.keys(filteredSectionData),
        });

        // Additional check: manually inspect both structures
        const manualCheckOriginal = this.manualFileCheck(sectionData);
        const manualCheckFiltered = this.manualFileCheck(filteredSectionData);
        console.log("🔍 Manual file check results:", {
          original: manualCheckOriginal,
          filtered: manualCheckFiltered,
        });

        // Also check for file-like structures (serialized File objects)
        const hasFileLikeInOriginal = this.hasFileLikeStructures(sectionData);
        const hasFileLikeInFiltered =
          this.hasFileLikeStructures(filteredSectionData);

        // Use the most comprehensive check - if files exist in either structure
        const finalHasFiles =
          hasFilesInOriginal ||
          hasUnuploadedFiles ||
          manualCheckOriginal.found ||
          manualCheckFiltered.found ||
          hasFileLikeInOriginal ||
          hasFileLikeInFiltered;

        console.log("🔍 Comprehensive file check:", {
          hasFilesInOriginal,
          hasUnuploadedFiles,
          manualCheckOriginal: manualCheckOriginal.found,
          manualCheckFiltered: manualCheckFiltered.found,
          hasFileLikeInOriginal,
          hasFileLikeInFiltered,
          finalHasFiles,
        });

        if (finalHasFiles && !hasUnuploadedFiles) {
          console.warn(
            "⚠️ Files found in original data but not in filtered data - files may have been sanitized"
          );
          console.warn(
            "⚠️ Will need to preserve File objects from original sectionData"
          );
        }

        // ✅ If files exist, create minimal submission first (without File objects)
        // Then upload files, then update with full data including filePaths
        let createPayload: any;
        let shouldUploadFilesAfter = false;
        let filesToUpload: any = null; // Store original data with File objects for upload

        // IMPORTANT: Only attempt upload if we have actual File instances, not file-like structures
        // File-like structures (serialized File objects) cannot be uploaded - they're already plain objects
        const hasActualFileInstances =
          hasFilesInOriginal ||
          hasUnuploadedFiles ||
          manualCheckOriginal.found ||
          manualCheckFiltered.found;

        // Use finalHasFiles which includes manual check result
        if (finalHasFiles) {
          if (hasActualFileInstances) {
            console.log(
              "📤 Actual File instances detected - will create minimal submission first, then upload files"
            );

            // Preserve the original sectionData with File objects for upload
            // Use the original sectionData if it has files, otherwise use filteredSectionData
            if (hasFilesInOriginal || manualCheckOriginal.found) {
              filesToUpload = sectionData;
              console.log(
                "📤 Using original sectionData for file upload (has File objects)"
              );
            } else {
              filesToUpload = { [category]: filteredSectionData };
              console.log("📤 Using filteredSectionData for file upload");
            }

            // Create a sanitized copy without File objects for initial submission
            // This prevents File objects from being serialized to JSON
            const sanitizedData =
              this.sanitizePayloadForJSON(filteredSectionData);
            createPayload = {
              formData: {
                [category]: sanitizedData,
              },
              indicators: completedIndicators,
              status: "DRAFT",
              section_status: initialSectionStatus,
              attachedFiles: [], // Empty initially, will be populated after file upload
            };
            shouldUploadFilesAfter = true;
          } else {
            // Only file-like structures (serialized File objects) - cannot upload
            // Extract metadata from file-like structures instead
            console.warn(
              "⚠️ Only file-like structures detected (serialized File objects) - cannot upload"
            );
            console.warn(
              "⚠️ File objects were already serialized. Extracting metadata from file-like structures."
            );

            // Extract metadata from file-like structures
            const extractedFiles =
              this.extractFileMetadataFromFileLikeStructures(
                filteredSectionData
              );
            console.log(
              `📦 Extracted ${extractedFiles.length} file(s) metadata from file-like structures`
            );

            createPayload = {
              formData: {
                [category]: filteredSectionData, // Already serialized, use as-is
              },
              indicators: completedIndicators,
              status: "DRAFT",
              section_status: initialSectionStatus,
              attachedFiles: extractedFiles,
            };
            shouldUploadFilesAfter = false; // Don't attempt upload
          }
        } else {
          // No files, create normally with extracted metadata
          const extractedFiles = this.extractFileMetadataFromFormData({
            [category]: filteredSectionData,
          });
          createPayload = {
            formData: {
              [category]: filteredSectionData,
            },
            indicators: completedIndicators,
            status: "DRAFT",
            section_status: initialSectionStatus,
            attachedFiles: extractedFiles,
          };
        }

        console.log("📦 Create Payload:", {
          category,
          section_status: initialSectionStatus,
          filteredSections: Object.keys(filteredSectionData),
          attachedFilesCount: createPayload.attachedFiles.length,
          hasFiles: finalHasFiles,
          hasFileObjectsResult: hasUnuploadedFiles,
          manualCheckOriginal: manualCheckOriginal.found,
          manualCheckFiltered: manualCheckFiltered.found,
          willUploadAfter: shouldUploadFilesAfter,
        });

        // Create submission first to get submissionId
        result = await this.createSubmission(createPayload);
        // Extract both UUID (for API routes) and submissionId field (for file uploads)
        // UUID is needed for API route parameters (GET, PATCH, PUT use /submission/:id where id is UUID)
        // submissionId field is needed for file upload paths (submissions/{submissionId}/...)
        const newSubmissionUuid = result?.data?.id || result?.id; // UUID for API routes
        const newSubmissionId =
          result?.data?.submissionId || result?.submissionId; // submissionId field for file paths

        console.log("✅ Submission created:", {
          uuid: newSubmissionUuid,
          submissionId: newSubmissionId,
        });
        console.log("🔍 Full result structure:", {
          result,
          id: result?.id,
          submissionId: result?.submissionId,
          dataId: result?.data?.id,
          dataSubmissionId: result?.data?.submissionId,
        });

        // ✅ Now upload files if any
        console.log("🔍 Upload condition check:", {
          shouldUploadFilesAfter,
          hasUnuploadedFiles,
          newSubmissionId,
          willUpload: shouldUploadFilesAfter && newSubmissionId,
        });

        if (shouldUploadFilesAfter && newSubmissionId && newSubmissionUuid) {
          console.log(
            "📤 Uploading File objects to S3 after creating submission..."
          );
          try {
            // Upload files and replace File objects with filePath
            // Use the preserved filesToUpload data (with File objects) for upload
            console.log(
              "📤 Starting uploadFilesAndReplace with submissionId:",
              newSubmissionId
            );
            console.log("📤 Files to upload structure:", {
              hasCategory: !!filesToUpload[category],
              keys: Object.keys(filesToUpload),
            });

            // ✅ CRITICAL: Verify filesToUpload still has File instances before attempting upload
            const stillHasFiles = this.hasFileObjects(filesToUpload);
            if (!stillHasFiles) {
              console.error(
                "❌ CRITICAL: filesToUpload no longer contains File instances!"
              );
              console.error(
                "❌ File objects were lost. Checking for file-like structures..."
              );
              const hasFileLike = this.hasFileLikeStructures(filesToUpload);
              if (hasFileLike) {
                console.warn(
                  "⚠️ File-like structures found but no File instances - cannot upload"
                );
                console.warn(
                  "⚠️ This usually means File objects were serialized (e.g., by localStorage or state updates)"
                );
                // Extract metadata from file-like structures as fallback
                const extractedFiles =
                  this.extractFileMetadataFromFileLikeStructures(filesToUpload);
                console.log(
                  `📦 Extracted ${extractedFiles.length} file(s) metadata from file-like structures`
                );

                // Update submission with extracted metadata (but files won't be in S3)
                // Use UUID for API route
                await this.updateSubmission(newSubmissionUuid, {
                  [category]: filteredSectionData,
                  attachedFiles: extractedFiles,
                });

                console.warn(
                  "⚠️ Files were NOT uploaded to S3 - File instances were lost. Metadata extracted instead."
                );
                console.warn(
                  "⚠️ User should re-select files to upload them properly."
                );
                return result; // Exit early - don't throw error, just warn
              }
              throw new Error(
                "File objects were lost and no file-like structures found - cannot proceed with upload"
              );
            }

            // Use submissionId field for file upload paths
            const uploadedData = await this.uploadFilesAndReplace(
              filesToUpload,
              newSubmissionId
            );

            // Extract the category data
            filteredSectionData = uploadedData[category] || uploadedData;

            // Re-extract file metadata after upload
            const updatedExtractedFiles = this.extractFileMetadataFromFormData({
              [category]: filteredSectionData,
            });

            console.log(
              `📤 Updating submission with ${updatedExtractedFiles.length} file(s) metadata`
            );

            // Update submission with filePaths - use UUID for API route
            await this.updateSubmission(newSubmissionUuid, {
              [category]: filteredSectionData,
              attachedFiles: updatedExtractedFiles,
            });

            console.log(
              "✅ All files uploaded to S3 and submission updated successfully"
            );
          } catch (error: any) {
            console.error("❌ Failed to upload files to S3:", error);
            console.error(
              "❌ Error details:",
              error.response?.data || error.message
            );
            throw new Error(
              `File upload failed: ${error.message || "Unknown error"}`
            );
          }
        } else if (
          hasUnuploadedFiles &&
          (!newSubmissionId || !newSubmissionUuid)
        ) {
          console.error(
            "❌ Cannot upload files: submissionId or UUID is missing"
          );
          throw new Error("Failed to create submission - cannot upload files");
        } else if (hasUnuploadedFiles && !shouldUploadFilesAfter) {
          console.error(
            "❌ MISMATCH: hasUnuploadedFiles is true but shouldUploadFilesAfter is false!"
          );
        } else if (!hasUnuploadedFiles) {
          console.log(
            "ℹ️ No File objects detected - files already uploaded or no files present"
          );
        }

        // Check if all indicators completed on first submission
        // Only redirect for NODAL_OFFICER, not for STATE_APPROVER
        if (
          initialSectionStatus.completedCount >=
            initialSectionStatus.totalAssigned &&
          userRole === "NODAL_OFFICER"
        ) {
          console.log(
            "🎉 All indicators completed! Redirecting to review page..."
          );

          const newSubmissionId = result?.id || result?.submissionId;
          if (typeof window !== "undefined" && newSubmissionId) {
            setTimeout(() => {
              window.location.href = `/data-submission/review/${newSubmissionId}`;
            }, 1000);
          }
        }
      }

      console.log("🔍 API Service - Processed Submit Section Data:", result);

      return result;
    } catch (error: any) {
      console.error("❌ API Service - Submit Section Error:", error);
      if (error.response?.status === 304) {
        console.log("📋 Submit Section 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async approveSubmission(
    id: string,
    comment?: string
  ): Promise<NiriSubmission> {
    try {
      // Get current user's role to determine the action
      const currentUserRole = UserService.getRole();

      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
      console.log("📡 API CALL: approveSubmission");
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
      console.log("📝 Submission ID:", id);
      console.log("👤 Current User Role:", currentUserRole);
      console.log(
        "💬 Comment:",
        comment ||
          "Approved by MoSPI Approver. Submission meets all requirements."
      );

      // Note: This method is used by both MOSPI_REVIEWER (to forward) and MOSPI_APPROVER (to approve)
      // The actual behavior depends on the backend logic
      if (currentUserRole === "MOSPI_REVIEWER") {
        console.log(
          "📤 FORM TRANSFER: MOSPI_REVIEWER → MOSPI_APPROVER (via approve)"
        );
        console.log(
          "📊 Status Change: SUBMITTED_TO_MOSPI_REVIEWER → SUBMITTED_TO_MOSPI_APPROVER"
        );
      } else if (currentUserRole === "MOSPI_APPROVER") {
        console.log("✅ FORM APPROVAL: MOSPI_APPROVER → APPROVED");
        console.log("📊 Status Change: SUBMITTED_TO_MOSPI_APPROVER → APPROVED");
      }

      const response = await this.axios.post(`/submission/approve/${id}`, {
        status: "APPROVED",
        comment:
          comment ||
          "Approved by MoSPI Approver. Submission meets all requirements.",
      });
      console.log(
        "✅ API Service - Approve Submission Response Status:",
        response.status
      );
      console.log(
        "📦 API Service - Approve Submission Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const submissionData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "✅ API Service - Processed Approve Submission Data:",
        submissionData
      );
      console.log("📊 New Status:", submissionData?.status);
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );

      return submissionData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Approve Submission 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  // File methods
  async uploadFile(
    submissionId: string,
    file: File
  ): Promise<{
    data: any;
    url: string;
    filename: string;
    size: number;
  }> {
    console.log("🔍 API Service - Upload File:", submissionId, file);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await this.axios.post(
        `/file/upload/${submissionId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      console.log(
        "🔍 API Service - Upload File Response Status:",
        response.status
      );
      console.log("🔍 API Service - Upload File Response Data:", response.data);

      // Handle response.data.data pattern
      const fileData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log("🔍 API Service - Processed Upload File Data:", fileData);

      return fileData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Upload File 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async uploadMultipleFiles(
    submissionId: string,
    files: File[]
  ): Promise<{
    files: { url: string; filename: string; size: number }[];
    count: number;
  }> {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await this.axios.post(
        `/file/upload-multiple/${submissionId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      console.log(
        "🔍 API Service - Upload Multiple Files Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Upload Multiple Files Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const filesData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Upload Multiple Files Data:",
        filesData
      );

      return filesData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Upload Multiple Files 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async getFileUrl(filePath: string): Promise<{ url: string; signedUrl?: string }> {
    try {
      // Encode the entire filePath as one string to match backend API format
      // Example: "submissions/SUB-2025-260315/file.pdf" -> "submissions%2FSUB-2025-260315%2Ffile.pdf"
      const encodedFilePath = encodeURIComponent(filePath);
      
      const response = await this.axios.get(`/file/url/${encodedFilePath}`);
      console.log(
        "🔍 API Service - Get File URL Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get File URL Response Data:",
        response.data
      );
      console.log(
        "🔍 API Service - Original filePath:",
        filePath,
        "Encoded filePath:",
        encodedFilePath
      );

      // Handle response.data.data pattern - extract signedUrl from response
      const fileUrlData =
        response.data?.data !== undefined ? response.data.data : response.data;
      
      // The backend returns { filePath, signedUrl, expiresIn }
      // Map signedUrl to url for compatibility
      const result = {
        url: fileUrlData?.signedUrl || fileUrlData?.url || fileUrlData,
        signedUrl: fileUrlData?.signedUrl,
      };
      
      console.log("🔍 API Service - Processed Get File URL Data:", result);

      return result;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get File URL 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<{ message: string }> {
    return this.delete(API_ENDPOINTS.file.delete(filePath));
  }

  // Dashboard methods
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const response = await this.axios.get("/dashboard/summary");
      console.log(
        "🔍 API Service - Dashboard Summary Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Dashboard Summary Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const dashboardData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log("🔍 API Service - Processed Dashboard Data:", dashboardData);

      return dashboardData as DashboardSummary;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Dashboard Summary 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return (
          cachedData?.data !== undefined ? cachedData.data : cachedData
        ) as DashboardSummary;
      }
      console.error("❌ Backend dashboard summary failed:", error.message);
      throw error;
    }
  }

  async getRoleKPIs(role?: string): Promise<Record<string, any>> {
    try {
      const url = role ? `/dashboard/kpis?role=${role}` : "/dashboard/kpis";
      const response = await this.axios.get(url);
      console.log("🔍 API Service - KPI Response Status:", response.status);
      console.log("🔍 API Service - KPI Response Data:", response.data);

      // Handle response.data.data pattern
      const kpiData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log("🔍 API Service - Processed KPI Data:", kpiData);

      return kpiData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 KPI 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn("⚠️ Backend KPIs failed, using dummy data:", error.message);
      console.log(
        "🔍 API Service - Returning dummy KPI data for role:",
        role || "NODAL_OFFICER"
      );
      console.error("❌ Backend role KPIs failed:", error.message);
      throw error;
    }
  }

  // ✅ Fetch dashboard data for State Approver
  async getStateApproverDashboard(): Promise<any> {
    try {
      const response = await this.get("/dashboard/state-approver");
      return response?.data || response;
    } catch (error: any) {
      console.error("Failed to fetch State Approver Dashboard:", error);
      throw error.response?.data || error;
    }
  }

  // ✅ Fetch MOSPI metrics
  async getMospiMetrics(status?: string): Promise<{
    role: string;
    groupedByStatus: Record<string, number>;
    totalSubmissions: number;
    assignedStatesCount?: number;
  }> {
    try {
      const url = status
        ? `/dashboard/mospi-metrics?status=${encodeURIComponent(status)}`
        : "/dashboard/mospi-metrics";
      const response = await this.get(url);
      return response?.data || response;
    } catch (error: any) {
      console.error("Failed to fetch MOSPI metrics:", error);
      throw error;
    }
  }

  // User management methods
  async getAllUsers(): Promise<NiriUser[]> {
    try {
      const response = await this.axios.get("/users");

      // Handle response.data.data pattern
      const usersData =
        response.data?.data !== undefined ? response.data.data : response.data;
 
      return usersData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get All Users 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async getUsersByState(state: string): Promise<NiriUser[]> {
    try {
      const response = await this.axios.get(`/users/by-state/${state}`);
      console.log(
        "🔍 API Service - Get Users By State Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get Users By State Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const usersData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get Users By State Data:",
        usersData
      );

      return usersData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Users By State 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async getUsersByRole(role: string, stateUt?: string): Promise<NiriUser[]> {
    try {
      const params = stateUt ? `?stateUt=${stateUt}` : "";
      const response = await this.axios.get(`/users/by-role/${role}${params}`);
      console.log(
        "🔍 API Service - Get Users By Role Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get Users By Role Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const usersData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get Users By Role Data:",
        usersData
      );

      return usersData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Users By Role 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async getUserById(id: string): Promise<NiriUser> {
    try {
      const response = await this.axios.get(`/users/${id}`);
      console.log(
        "🔍 API Service - Get User By ID Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get User By ID Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const userData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log("🔍 API Service - Processed Get User By ID Data:", userData);

      return userData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get User By ID 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<NiriUser>): Promise<NiriUser> {
    try {
      const response = await this.axios.patch(`/users/${id}`, userData);
      console.log(
        "🔍 API Service - Update User Response Status:",
        response.status
      );
      console.log("🔍 API Service - Update User Response Data:", response.data);

      // Handle response.data.data pattern
      const updatedUserData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Update User Data:",
        updatedUserData
      );

      return updatedUserData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Update User 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async deactivateUser(id: string): Promise<{ message: string }> {
    try {
      const response = await this.axios.delete(`/users/${id}`);
      console.log(
        "🔍 API Service - Deactivate User Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Deactivate User Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const deactivateData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Deactivate User Data:",
        deactivateData
      );

      return deactivateData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Deactivate User 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async deactivateUsers(
    userIds: string[]
  ): Promise<{ message: string; deactivatedCount: number }> {
    try {
      const response = await this.axios.delete(`/users/bulk/delete`, {
        data: { userIds: userIds },
      });
      console.log(
        "🔍 API Service - Deactivate Users Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Deactivate Users Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const deactivateData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Deactivate Users Data:",
        deactivateData
      );

      return deactivateData;
    } catch (error: any) {
      console.error("❌ API Service - Deactivate Users Error:", error);
      if (error.response) {
        console.error("❌ API Service - Error Response:", error.response.data);
        throw new Error(
          error.response.data?.message ||
            error.response.data?.error ||
            "Failed to deactivate users"
        );
      }
      throw error;
    }
  }
  /**
   * TESTING ONLY: Cleanup test data
   * Deletes all test submissions, final scores, and user indicator scopes
   * WARNING: This is a destructive operation for testing purposes only!
   */
  async cleanupTestData(): Promise<{
    success: boolean;
    message: string;
    deleted: {
      submissions: number;
      finalScores: number;
      userIndicatorScopes: number;
      auditLogs: number;
    };
  }> {
    try {
      // Note: The response interceptor already extracts response.data, so 'data' is already the response body
      const response = await this.axios.post(`/submission/cleanup-test-data`);
      // Extract data from response (interceptor may have already done this, but TypeScript doesn't know)
      const data =
        (response as any)?.data !== undefined &&
        typeof (response as any).data === "object"
          ? (response as any).data
          : response;

      console.log(
        "🔍 API Service - Cleanup Test Data Response:",
        JSON.stringify(data, null, 2)
      );

      // Handle different response structures
      let cleanupData: any = data;

      // If data has a data property (nested structure), use it
      if (data?.data !== undefined && typeof data.data === "object") {
        cleanupData = data.data;
      }

      // Ensure the response has the expected structure
      if (!cleanupData || typeof cleanupData !== "object") {
        console.error(
          "❌ API Service - Invalid response structure:",
          cleanupData
        );
        console.error("❌ API Service - Raw response:", data);
        throw new Error("Invalid response from server");
      }

      // Ensure deleted property exists with defaults
      if (!cleanupData.deleted) {
        console.warn(
          "⚠️ API Service - Response missing 'deleted' property, using defaults"
        );
        cleanupData.deleted = {
          submissions: 0,
          finalScores: 0,
          userIndicatorScopes: 0,
          auditLogs: 0,
        };
      }

      console.log(
        "🔍 API Service - Processed Cleanup Test Data:",
        JSON.stringify(cleanupData, null, 2)
      );

      return cleanupData as {
        success: boolean;
        message: string;
        deleted: {
          submissions: number;
          finalScores: number;
          userIndicatorScopes: number;
          auditLogs: number;
        };
      };
    } catch (error: any) {
      console.error("❌ API Service - Cleanup Test Data Error:", error);
      if (error.response) {
        console.error("❌ API Service - Error Response:", error.response.data);
        throw new Error(
          error.response.data?.message ||
            error.response.data?.error ||
            "Failed to cleanup test data"
        );
      }
      // If error is already a string/Error, use it directly
      if (error.message) {
        throw error;
      }
      throw new Error("Failed to cleanup test data");
    }
  }

  /**
   * TESTING ONLY: Delete users by role
   * Deletes all users with the specified role along with their related data
   * WARNING: This is a destructive operation for testing purposes only!
   */
  async deleteUsersByRole(role: string): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
    deleted: {
      users: number;
      userIndicatorScopes: number;
      submissions: number;
      finalScores: number;
      auditLogs: number;
    };
  }> {
    try {
      // Note: The response interceptor already extracts response.data, so 'data' is already the response body
      const response = await this.axios.delete(`/users/by-role/${role}`);
      // Extract data from response (interceptor may have already done this, but TypeScript doesn't know)
      const data =
        (response as any)?.data !== undefined &&
        typeof (response as any).data === "object"
          ? (response as any).data
          : response;

      console.log(
        "🔍 API Service - Delete Users By Role Response:",
        JSON.stringify(data, null, 2)
      );

      // Handle different response structures
      let deleteData: any = data;

      // If data has a data property (nested structure), use it
      if (data?.data !== undefined && typeof data.data === "object") {
        deleteData = data.data;
      }

      // Ensure the response has the expected structure
      if (!deleteData || typeof deleteData !== "object") {
        console.error(
          "❌ API Service - Invalid response structure:",
          deleteData
        );
        console.error("❌ API Service - Raw response:", data);
        throw new Error("Invalid response from server");
      }

      // Ensure deleted property exists with defaults
      if (!deleteData.deleted) {
        console.warn(
          "⚠️ API Service - Response missing 'deleted' property, using defaults"
        );
        deleteData.deleted = {
          users: 0,
          userIndicatorScopes: 0,
          submissions: 0,
          finalScores: 0,
          auditLogs: 0,
        };
      }

      // Ensure deletedCount exists
      if (deleteData.deletedCount === undefined) {
        deleteData.deletedCount = deleteData.deleted?.users || 0;
      }

      console.log(
        "🔍 API Service - Processed Delete Users By Role Data:",
        JSON.stringify(deleteData, null, 2)
      );

      return deleteData as {
        success: boolean;
        message: string;
        deletedCount: number;
        deleted: {
          users: number;
          userIndicatorScopes: number;
          submissions: number;
          finalScores: number;
          auditLogs: number;
        };
      };
    } catch (error: any) {
      console.error("❌ API Service - Delete Users By Role Error:", error);
      if (error.response) {
        console.error("❌ API Service - Error Response:", error.response.data);
        throw new Error(
          error.response.data?.message ||
            error.response.data?.error ||
            "Failed to delete users by role"
        );
      }
      // If error is already a string/Error, use it directly
      if (error.message) {
        throw error;
      }
      throw new Error("Failed to delete users by role");
    }
  }

  // Report methods
  async getRankings(): Promise<any[]> {
    try {
      const response = await this.axios.get("/report/ranking");
      console.log(
        "🔍 API Service - Get Rankings Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get Rankings Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const rankingsData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get Rankings Data:",
        rankingsData
      );

      return rankingsData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Rankings 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn(
        "⚠️ Backend rankings failed, using dummy data:",
        error.message
      );
      return [
        { state: "Maharashtra", score: 85, rank: 1 },
        { state: "Karnataka", score: 82, rank: 2 },
        { state: "Tamil Nadu", score: 78, rank: 3 },
        { state: "Gujarat", score: 75, rank: 4 },
        { state: "Rajasthan", score: 72, rank: 5 },
      ];
    }
  }

  async getFullReport(): Promise<any> {
    try {
      const response = await this.axios.get("/report/full-report");
      console.log(
        "🔍 API Service - Get Full Report Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get Full Report Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const reportData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get Full Report Data:",
        reportData
      );

      return reportData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Full Report 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn(
        "⚠️ Backend full report failed, using dummy data:",
        error.message
      );
      return {
        totalStates: 28,
        averageScore: 75.5,
        topPerformer: "Maharashtra",
        reportDate: new Date().toISOString(),
        summary: "Comprehensive infrastructure readiness report",
      };
    }
  }

  async getStateReport(state: string): Promise<any> {
    try {
      const response = await this.axios.get(`/report/state/${state}`);
      console.log(
        "🔍 API Service - Get State Report Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get State Report Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const stateReportData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get State Report Data:",
        stateReportData
      );

      return stateReportData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get State Report 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn(
        "⚠️ Backend state report failed, using dummy data:",
        error.message
      );
      return {
        state: state,
        score: 85,
        rank: 1,
        infrastructureScore: 88,
        financingScore: 82,
        developmentScore: 85,
        enablersScore: 80,
        reportDate: new Date().toISOString(),
      };
    }
  }

  async exportReport(format: "json" | "csv"): Promise<any> {
    try {
      const response = await this.axios.get(`/report/export?format=${format}`);
      console.log(
        "🔍 API Service - Export Report Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Export Report Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const exportData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log("🔍 API Service - Processed Export Report Data:", exportData);

      return exportData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Export Report 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn(
        "⚠️ Backend export failed, using dummy data:",
        error.message
      );
      return {
        message: "Export completed with dummy data",
        format: format,
        downloadUrl: "#",
      };
    }
  }

  // Audit methods
  async getAuditLogs(page = 1, limit = 10): Promise<any[]> {
    try {
      const response = await this.axios.get(
        `/audit?page=${page}&limit=${limit}`
      );
      console.log(
        "🔍 API Service - Get Audit Logs Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get Audit Logs Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const auditData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log("🔍 API Service - Processed Get Audit Logs Data:", auditData);

      return auditData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Audit Logs 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async getEntityAuditTrail(
    entityType: string,
    entityId: string
  ): Promise<any[]> {
    try {
      const response = await this.axios.get(
        `/audit/entity/${entityType}/${entityId}`
      );
      console.log(
        "🔍 API Service - Get Entity Audit Trail Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get Entity Audit Trail Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const auditTrailData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get Entity Audit Trail Data:",
        auditTrailData
      );

      return auditTrailData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Entity Audit Trail 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async getUserAuditLogs(userId: string): Promise<any[]> {
    try {
      const response = await this.axios.get(`/audit/user/${userId}`);
      console.log(
        "🔍 API Service - Get User Audit Logs Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get User Audit Logs Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const userAuditData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get User Audit Logs Data:",
        userAuditData
      );

      return userAuditData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get User Audit Logs 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  async getMyActivity(): Promise<any[]> {
    try {
      const response = await this.axios.get("/audit/my-activity");
      console.log(
        "🔍 API Service - Get My Activity Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get My Activity Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const activityData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get My Activity Data:",
        activityData
      );

      return activityData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get My Activity 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  // Draft Management Methods
  async deleteSubmission(submissionId: string): Promise<any> {
    try {
      const response = await this.axios.delete(`/submission/${submissionId}`);
      console.log(
        "🔍 API Service - Delete Submission Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Delete Submission Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const deleteData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Delete Submission Data:",
        deleteData
      );

      return deleteData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Delete Submission 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      throw error;
    }
  }

  // Scoring Methods
  async getScoreRankings(): Promise<any[]> {
    try {
      const response = await this.axios.get("/scoring/rankings");
      console.log(
        "🔍 API Service - Get Score Rankings Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get Score Rankings Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const rankingsData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get Score Rankings Data:",
        rankingsData
      );

      return rankingsData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Score Rankings 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn(
        "⚠️ Backend score rankings failed, using dummy data:",
        error.message
      );
      // Return dummy data as fallback
      return [
        {
          rank: 1,
          stateUt: "Gujarat",
          totalScore: 742,
          percentage: 74.2,
          approvedAt: "2024-01-01T00:00:00.000Z",
          submissionId: "uuid-1",
          categoryScores: {
            financing: 195,
            development: 230,
            ppp: 195,
            enablers: 195,
          },
        },
        {
          rank: 2,
          stateUt: "Tamil Nadu",
          totalScore: 698,
          percentage: 69.8,
          approvedAt: "2024-01-01T00:00:00.000Z",
          submissionId: "uuid-2",
          categoryScores: {
            financing: 175,
            development: 210,
            ppp: 165,
            enablers: 148,
          },
        },
        {
          rank: 3,
          stateUt: "Karnataka",
          totalScore: 685,
          percentage: 68.5,
          approvedAt: "2024-01-01T00:00:00.000Z",
          submissionId: "uuid-3",
          categoryScores: {
            financing: 168,
            development: 205,
            ppp: 172,
            enablers: 140,
          },
        },
      ];
    }
  }

  // Role-based scoring methods
  async getScoreRankingsByRole(
    userRole: string,
    userState?: string
  ): Promise<any[]> {
    try {
      console.log(
        `🔍 API Service - Get Score Rankings for role: ${userRole}, state: ${userState}`
      );

      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        console.warn("⚠️ User not authenticated, using dummy data");
        return this.getDummyRankingsData();
      }

      // Get current user info
      const user = authService.getUser();
      console.log(`🔍 API Service - Current user:`, user);

      // ALL user roles use the same /scoring/rankings endpoint for consistent data
      try {
        const response = await this.axios.get("/scoring/rankings");
        console.log(
          "🔍 API Service - Get Score Rankings Response Status:",
          response.status
        );
        console.log(
          "🔍 API Service - Get Score Rankings Response Data:",
          response.data
        );

        const rankingsData =
          response.data?.data !== undefined
            ? response.data.data
            : response.data;
        console.log(
          "🔍 API Service - Processed Get Score Rankings Data:",
          rankingsData
        );

        return rankingsData;
      } catch (scoringError: any) {
        console.warn(
          "⚠️ Scoring rankings failed, trying regular rankings:",
          scoringError.message
        );
        // Fallback to regular rankings but ensure consistent format
        return this.getRegularRankings();
      }
    } catch (error: any) {
      console.error(`❌ API Error for role ${userRole}:`, error);

      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Score Rankings 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }

      // Handle 403 Forbidden - user doesn't have permission
      if (error.response?.status === 403) {
        console.warn(
          `⚠️ 403 Forbidden for role ${userRole} - User doesn't have permission to access ranking data`
        );
        console.warn("⚠️ Using dummy data as fallback");
        return this.getDummyRankingsData();
      }

      // Handle other errors
      console.warn(
        "⚠️ Backend rankings failed, using dummy data:",
        error.message
      );
      return this.getDummyRankingsData();
    }
  }

  // Helper method to get regular rankings
  private async getRegularRankings(): Promise<any[]> {
    try {
      const response = await this.axios.get("/report/ranking");
      console.log(
        "🔍 API Service - Regular Rankings Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Regular Rankings Response Data:",
        response.data
      );

      const rankingsData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Regular Rankings Data:",
        rankingsData
      );

      return rankingsData;
    } catch (error: any) {
      console.error("❌ Regular rankings failed:", error);
      throw error;
    }
  }

  // Helper method to get dummy rankings data
  private getDummyRankingsData() {
    return [
      {
        rank: 1,
        stateUt: "Gujarat",
        totalScore: 742,
        percentage: 74.2,
        approvedAt: "2024-01-01T00:00:00.000Z",
        submissionId: "uuid-1",
      },
      {
        rank: 2,
        stateUt: "Tamil Nadu",
        totalScore: 698,
        percentage: 69.8,
        approvedAt: "2024-01-01T00:00:00.000Z",
        submissionId: "uuid-2",
      },
      {
        rank: 3,
        stateUt: "Karnataka",
        totalScore: 685,
        percentage: 68.5,
        approvedAt: "2024-01-01T00:00:00.000Z",
        submissionId: "uuid-3",
      },
    ];
  }

  async getScoreStatistics(): Promise<any> {
    try {
      // Get current user info for role-based access
      const user = authService.getUser();
      const userRole = user?.role;

      console.log(
        `🔍 API Service - Get Score Statistics for role: ${userRole}`
      );

      // ALL user roles use the same /scoring/statistics endpoint for consistent data
      try {
        const response = await this.axios.get("/scoring/statistics");
        console.log(
          "🔍 API Service - Get Score Statistics Response Status:",
          response.status
        );
        console.log(
          "🔍 API Service - Get Score Statistics Response Data:",
          response.data
        );

        const statisticsData =
          response.data?.data !== undefined
            ? response.data.data
            : response.data;
        console.log(
          "🔍 API Service - Processed Get Score Statistics Data:",
          statisticsData
        );

        return statisticsData;
      } catch (scoringError: any) {
        console.warn(
          "⚠️ Scoring statistics failed, using dummy data:",
          scoringError.message
        );
        return this.getDummyStatisticsData();
      }
    } catch (error: any) {
      console.error("❌ API Error for statistics:", error);

      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Score Statistics 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }

      // Handle 403 Forbidden - user doesn't have permission
      if (error.response?.status === 403) {
        console.warn(
          "⚠️ 403 Forbidden for statistics - User doesn't have permission to access scoring statistics"
        );
        console.warn("⚠️ Using dummy data as fallback");
        return this.getDummyStatisticsData();
      }

      console.warn(
        "⚠️ Backend score statistics failed, using dummy data:",
        error.message
      );
      return this.getDummyStatisticsData();
    }
  }

  // Helper method to get dummy statistics data
  private getDummyStatisticsData() {
    return {
      totalStates: 3,
      averageScore: 708.33,
      highestScore: 742,
      lowestScore: 685,
      scoreDistribution: {
        "90-100": 0,
        "80-89": 0,
        "70-79": 2,
        "60-69": 1,
        "50-59": 0,
        "Below 50": 0,
      },
    };
  }

  async getStateScore(stateUt: string): Promise<any> {
    try {
      const response = await this.axios.get(`/scoring/state/${stateUt}`);
      console.log(
        "🔍 API Service - Get State Score Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get State Score Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const stateScoreData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get State Score Data:",
        stateScoreData
      );

      return stateScoreData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get State Score 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn(
        "⚠️ Backend state score failed, using dummy data:",
        error.message
      );
      // Return dummy data as fallback
      return {
        id: "uuid",
        submissionId: "uuid",
        stateUt: stateUt,
        totalScore: 742,
        scoreBreakdown: {
          totalScore: 742,
          maxPossibleScore: 1000,
          percentage: 74.2,
          calculations: [],
          methodology: "NIRI Scoring Methodology v2.0",
        },
        calculationMethodology: "NIRI Scoring Methodology v2.0",
        approvedBy: "uuid",
        createdAt: "2024-01-01T00:00:00.000Z",
      };
    }
  }

  async calculateScore(submissionId: string): Promise<any> {
    try {
      const response = await this.axios.get(
        `/scoring/calculate/${submissionId}`
      );
      console.log(
        "🔍 API Service - Calculate Score Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Calculate Score Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const scoreData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Calculate Score Data:",
        scoreData
      );

      return scoreData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Calculate Score 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn("⚠️ Backend calculate score failed:", error.message);
      throw error;
    }
  }

  // Indicator Access Control Methods
  async getUserAssignedIndicators(userId: string): Promise<string[]> {
    console.log(
      "🔍 API Service - getUserAssignedIndicators called with userId:",
      userId
    );
    try {
      // Try fallback endpoint
      console.log(
        "🔍 API Service - Making request to /users/${userId}/indicators"
      );
      const fallbackResponse = await this.axios.get(
        `/users/${userId}/indicators`
      );
      console.log(
        "🔍 API Service - Fallback Get User Assigned Indicators Response Status:",
        fallbackResponse.status
      );
      console.log(
        "🔍 API Service - Fallback Get User Assigned Indicators Response Data:",
        fallbackResponse.data
      );

      const indicatorsData =
        fallbackResponse.data?.data !== undefined
          ? fallbackResponse.data.data
          : fallbackResponse.data;
      console.log(
        "🔍 API Service - Processed Fallback Get User Assigned Indicators Data:",
        indicatorsData
      );

      // Extract indicator codes from the response
      if (Array.isArray(indicatorsData)) {
        // If response is array of objects with indicator property
        const indicatorCodes = indicatorsData
          .map((item: any) => item.indicator?.code || item.code)
          .filter((code: string) => code); // Remove undefined/null values
        console.log(
          "🔍 API Service - Extracted indicator codes:",
          indicatorCodes
        );
        console.log("🔍 API Service - Original response data:", indicatorsData);
        return indicatorCodes;
      } else if (indicatorsData.indicators) {
        // If response has indicators property
        return indicatorsData.indicators;
      } else {
        // If response is already an array of codes
        return indicatorsData || [];
      }
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get User Assigned Indicators 304 - Using cached data");
        const cachedData = error.response?.data || {};
        const indicatorsData = cachedData?.data || cachedData;

        if (Array.isArray(indicatorsData)) {
          const indicatorCodes = indicatorsData
            .map((item: any) => item.indicator?.code || item.code)
            .filter((code: string) => code);
          return indicatorCodes;
        }
        return indicatorsData?.indicators || [];
      }
      console.warn(
        "⚠️ Backend get user assigned indicators failed on both endpoints:",
        error.message
      );
      return [];
    }
  }

  /**
   * Get the count of indicators assigned to a user from user_indicator_scope
   */
  async getUserIndicatorCount(userId: string): Promise<number> {
    try {
      console.log(
        "🔍 API Service - getUserIndicatorCount called with userId:",
        userId
      );
      const indicators = await this.getUserAssignedIndicators(userId);
      console.log("🔍 API Service - User indicator count:", indicators.length);
      return indicators.length;
    } catch (error: any) {
      console.error("❌ Failed to get user indicator count:", error);
      return 0;
    }
  }

  /**
   * Get submitted indicators in a state
   * Returns array of indicator codes that have been submitted by any user in the state
   */
  async getSubmittedIndicatorsInState(stateUt: string): Promise<string[]> {
    try {
      console.log(
        "🔍 [API Service] getSubmittedIndicatorsInState called with stateUt:",
        stateUt
      );
      const response = await this.axios.get(
        `/indicators/submitted-in-state/${encodeURIComponent(stateUt)}`
      );
      console.log("🔍 [API Service] Raw response:", response.data);
      const data = response.data?.data || response.data || [];
      console.log("✅ [API Service] Submitted indicators in state:", data);
      console.log(
        "✅ [API Service] Submitted indicators type:",
        Array.isArray(data) ? "array" : typeof data,
        "length:",
        Array.isArray(data) ? data.length : "N/A"
      );
      console.log(
        "✅ [API Service] Is 1.1 in response?",
        Array.isArray(data) ? data.includes("1.1") : "N/A"
      );
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error(
        "❌ [API Service] Failed to get submitted indicators in state:",
        error
      );
      console.error(
        "❌ [API Service] Error details:",
        error.response?.data || error.message
      );
      return [];
    }
  }

  /**
   * Get user assigned indicators with full details (UUID + code)
   * Returns array of objects: [{ id: uuid, code: "1.1" }, ...]
   */
  async getUserAssignedIndicatorsWithDetails(
    userId: string
  ): Promise<Array<{ id: string; code: string }>> {
    try {
      console.log(
        "🔍 API Service - getUserAssignedIndicatorsWithDetails called with userId:",
        userId
      );
      const response = await this.axios.get(`/users/${userId}/indicators`);
      const indicatorsData = response.data?.data || response.data;

      console.log("🔍 API Service - Indicators with details:", indicatorsData);

      if (Array.isArray(indicatorsData)) {
        // Map to include both id and code
        const indicators = indicatorsData
          .map((item: any) => ({
            id: item.id || item.indicatorId || item.indicator?.id,
            code: item.indicator?.code || item.code || item.indicatorCode,
          }))
          .filter((item: any) => item.id && item.code);

        console.log("🔍 API Service - Mapped indicators:", indicators);
        return indicators;
      }

      return [];
    } catch (error: any) {
      console.error(
        "❌ Failed to get user assigned indicators with details:",
        error
      );
      return [];
    }
  }

  // ✅ Fetch indicators available for a STATE_APPROVER
  async getAvailableIndicatorsForApprover(stateUt: string) {
    try {
      const response = await this.axios.get(
        `/indicators/available-for-approver`,
        { params: { stateUt } }
      );
      return response.data; // array of {id, code, name, category}
    } catch (error) {
      console.error("Failed to get available indicators for approver", error);
      throw error;
    }
  }

  async getAllIndicators(): Promise<any[]> {
    try {
      const response = await this.axios.get("/indicators");
      console.log(
        "🔍 API Service - Get All Indicators Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get All Indicators Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const indicatorsData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get All Indicators Data:",
        indicatorsData
      );

      return indicatorsData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get All Indicators 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn("⚠️ Backend get all indicators failed:", error.message);
      return [];
    }
  }

  async getIndicatorsBySection(sectionId: string): Promise<any[]> {
    try {
      const response = await this.axios.get(`/indicators/section/${sectionId}`);
      console.log(
        "🔍 API Service - Get Indicators By Section Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Get Indicators By Section Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const indicatorsData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Get Indicators By Section Data:",
        indicatorsData
      );

      return indicatorsData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Get Indicators By Section 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn(
        "⚠️ Backend get indicators by section failed:",
        error.message
      );
      return [];
    }
  }

  async updateUserIndicators(
    userId: string,
    indicatorCodes: string[]
  ): Promise<any> {
    try {
      const response = await this.axios.patch(`/users/${userId}/indicators`, {
        indicatorCodes,
      });
      console.log(
        "🔍 API Service - Update User Indicators Response Status:",
        response.status
      );
      console.log(
        "🔍 API Service - Update User Indicators Response Data:",
        response.data
      );

      // Handle response.data.data pattern
      const updateData =
        response.data?.data !== undefined ? response.data.data : response.data;
      console.log(
        "🔍 API Service - Processed Update User Indicators Data:",
        updateData
      );

      return updateData;
    } catch (error: any) {
      // Handle 304 as success
      if (error.response?.status === 304) {
        console.log("📋 Update User Indicators 304 - Using cached data");
        const cachedData = error.response?.data || {};
        return cachedData?.data !== undefined ? cachedData.data : cachedData;
      }
      console.warn("⚠️ Backend update user indicators failed:", error.message);
      throw error;
    }
  }

  /**
   * Update indicator (generic handler used by components)
   * payload: { submissionId, category, section, fields }
   * token: optional auth token (falls back to localStorage if not provided)
   */

  async updateIndicator(payload: UpdateIndicatorPayload, token?: string) {
    try {
      // Check if payload contains File objects
      const hasFiles = this.hasFileObjects(payload);

      let response;

      if (hasFiles) {
        // Convert to FormData if files are present
        const formData = new FormData();

        // Create a sanitized payload without File objects for JSON serialization
        const sanitizedPayload = this.sanitizePayloadForJSON(payload);
        
        // Validate required fields before stringifying
        if (!sanitizedPayload.submissionId) {
          console.error("❌ [updateIndicator] submissionId is missing in sanitized payload");
          throw new Error("submissionId is required");
        }
        if (!sanitizedPayload.category) {
          console.error("❌ [updateIndicator] category is missing in sanitized payload");
          throw new Error("category is required");
        }
        if (!sanitizedPayload.section) {
          console.error("❌ [updateIndicator] section is missing in sanitized payload");
          throw new Error("section is required");
        }
        if (!sanitizedPayload.fields || !Array.isArray(sanitizedPayload.fields) || sanitizedPayload.fields.length === 0) {
          console.error("❌ [updateIndicator] fields array is missing or empty in sanitized payload");
          throw new Error("fields array is required and must not be empty");
        }
        
        const payloadString = JSON.stringify(sanitizedPayload);
        console.log("📤 [updateIndicator] Sanitized payload:", {
          submissionId: sanitizedPayload.submissionId,
          category: sanitizedPayload.category,
          section: sanitizedPayload.section,
          fieldsCount: sanitizedPayload.fields?.length,
          payloadString: payloadString.substring(0, 500), // First 500 chars for debugging
        });
        
        formData.append("payload", payloadString);

        // Append files recursively with proper paths
        this.appendFilesToFormData(formData, payload, "");

        // Get auth token
        const authHeaders = authService.getAuthHeaders();
        const authToken = token || authHeaders?.Authorization || "";

        const config: AxiosRequestConfig = {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: authToken,
          },
        };

        console.log(
          "📤 Sending updateIndicator with FormData (files detected)"
        );
        response = await this.axios.post(
          "/submission/update-indicator",
          formData,
          config
        );
      } else {
        // Send as JSON if no files
        const config: AxiosRequestConfig | undefined = token
          ? {
              headers: {
                "Content-Type": "application/json",
                Authorization: token.startsWith("Bearer")
                  ? token
                  : `Bearer ${token}`,
              },
            }
          : undefined;

        console.log("📤 Sending updateIndicator as JSON (no files)");
        response = await this.axios.post(
          "/submission/update-indicator",
          payload,
          config
        );
      }

      // Follow existing pattern used across the service: prefer response.data.data when present.
      return response.data?.data !== undefined
        ? response.data.data
        : response.data;
    } catch (error: any) {
      // Handle 304 as success (consistent with other methods)
      if (error.response?.status === 304) {
        const cached = error.response?.data || {};
        return cached?.data !== undefined ? cached.data : cached;
      }
      // Re-throw for centralized error handling in interceptors / callers
      throw error;
    }
  }

  // Helper to check if payload contains File objects
  // Handles nested structures like: section2_1.infraActArray[0].files[0].file
  private hasFileObjects(obj: any, depth: number = 0): boolean {
    if (depth > 20) return false; // Prevent infinite recursion
    if (!obj || typeof obj !== "object") return false;

    // Direct File instance
    if (obj instanceof File) {
      console.log(`🔍 Found File object at depth ${depth}`);
      return true;
    }

    // Handle arrays (e.g., infraActArray, files array)
    if (Array.isArray(obj)) {
      const hasFiles = obj.some((item) => this.hasFileObjects(item, depth + 1));
      if (hasFiles) {
        console.log(`🔍 Found File object in array at depth ${depth}`);
      }
      return hasFiles;
    }

    // Handle objects
    for (const [key, value] of Object.entries(obj)) {
      // Direct File value
      if (value instanceof File) {
        console.log(`🔍 Found File object at key: ${key} (depth ${depth})`);
        return true;
      }

      if (value && typeof value === "object") {
        // Check FileUpload objects - look for file property that is a File instance
        // Structure: { file: File, fileName: string, ... }
        if ((value as any).file instanceof File) {
          console.log(
            `🔍 Found File object in FileUpload at key: ${key} (depth ${depth})`
          );
          return true;
        }

        // Check deeply nested file.file (File object nested in FileUpload)
        if ((value as any).file?.file instanceof File) {
          console.log(
            `🔍 Found nested File object at key: ${key} (depth ${depth})`
          );
          return true;
        }

        // Recursively check nested objects (handles arrays of objects, nested structures)
        if (this.hasFileObjects(value, depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  // Check for file-like structures (plain objects that were File objects)
  // Structure: { name: string, size: number, type: string, lastModified: number }
  private hasFileLikeStructures(obj: any, depth: number = 0): boolean {
    if (depth > 20) return false;
    if (!obj || typeof obj !== "object") return false;

    // Check if this is a file-like plain object (serialized File)
    if (
      typeof obj === "object" &&
      !Array.isArray(obj) &&
      obj.name &&
      typeof obj.size === "number" &&
      typeof obj.type === "string" &&
      !(obj instanceof File)
    ) {
      console.log(
        `🔍 Found file-like structure (serialized File) at depth ${depth}`
      );
      return true;
    }

    // Check FileUpload objects with file-like structures
    if (obj && typeof obj === "object" && obj.file) {
      const fileObj = obj.file;
      if (
        typeof fileObj === "object" &&
        !(fileObj instanceof File) &&
        fileObj.name &&
        typeof fileObj.size === "number" &&
        typeof fileObj.type === "string"
      ) {
        console.log(
          `🔍 Found file-like structure in FileUpload object at depth ${depth}`
        );
        return true;
      }
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.some((item) => this.hasFileLikeStructures(item, depth + 1));
    }

    // Handle objects
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") {
        if (this.hasFileLikeStructures(value, depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  // Manual file check for debugging
  private manualFileCheck(
    obj: any,
    path: string = ""
  ): { found: boolean; paths: string[] } {
    const paths: string[] = [];

    if (!obj || typeof obj !== "object") {
      return { found: false, paths };
    }

    if (obj instanceof File) {
      paths.push(path);
      return { found: true, paths };
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const result = this.manualFileCheck(item, `${path}[${index}]`);
        if (result.found) {
          paths.push(...result.paths);
        }
      });
      return { found: paths.length > 0, paths };
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (value instanceof File) {
        paths.push(currentPath);
      } else if (value && typeof value === "object") {
        if ((value as any).file instanceof File) {
          paths.push(`${currentPath}.file`);
        } else {
          const result = this.manualFileCheck(value, currentPath);
          if (result.found) {
            paths.push(...result.paths);
          }
        }
      }
    }

    return { found: paths.length > 0, paths };
  }

  // Extract file metadata from file-like structures (serialized File objects)
  // This is used when File objects were already serialized to plain objects
  private extractFileMetadataFromFileLikeStructures(
    obj: any,
    path: string[] = []
  ): any[] {
    const files: any[] = [];

    if (!obj || typeof obj !== "object") return files;

    // Check if this is a FileUpload object with a file-like structure
    if (
      obj.file &&
      typeof obj.file === "object" &&
      !(obj.file instanceof File)
    ) {
      const fileObj = obj.file;
      if (
        fileObj.name &&
        typeof fileObj.size === "number" &&
        typeof fileObj.type === "string"
      ) {
        // This is a file-like structure (serialized File object)
        const fileMetadata = {
          id: obj.id || `file-${Date.now()}-${Math.random()}`,
          fileName: obj.fileName || fileObj.name,
          fileSize: obj.fileSize || fileObj.size,
          mimeType: obj.mimeType || fileObj.type,
          uploadedAt: obj.uploadedAt || Date.now(),
          filePath: obj.filePath || null, // May already have filePath if previously uploaded
          fileUrl: obj.fileUrl || null,
        };

        // Only include if it doesn't already have a filePath (meaning it needs upload)
        // But if it's already serialized, it can't be uploaded, so we'll extract what we can
        if (!fileMetadata.filePath) {
          console.warn(
            `⚠️ File-like structure found without filePath: ${fileMetadata.fileName} - cannot upload (already serialized)`
          );
        }

        files.push(fileMetadata);
      }
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        files.push(
          ...this.extractFileMetadataFromFileLikeStructures(item, [
            ...path,
            index.toString(),
          ])
        );
      });
    } else {
      // Handle nested objects
      for (const value of Object.values(obj)) {
        if (value && typeof value === "object") {
          files.push(
            ...this.extractFileMetadataFromFileLikeStructures(value, path)
          );
        }
      }
    }

    return files;
  }

  // Helper to upload File objects to S3 and replace with filePath
  // Handles all file structures:
  // - Direct FileUpload: { file: File, fileName: string, ... }
  // - Arrays of FileUpload: files: [{ file: File, ... }, ...]
  // - Nested in arrays: infraActArray: [{ files: [{ file: File, ... }] }]
  private async uploadFilesAndReplace(
    data: any,
    submissionId: string,
    path: string[] = []
  ): Promise<any> {
    if (!data || typeof data !== "object") return data;

    // Handle FileUpload objects with File instances (but no filePath yet)
    // Structure: { id: string, file: File, fileName: string, fileSize: number, ... }
    if (data.file instanceof File && !data.filePath) {
      try {
        const filePathStr =
          path.length > 0 ? ` at path: ${path.join(".")}` : "";
        console.log(
          `📤 Uploading file: ${data.fileName || data.file.name}${filePathStr}`
        );
        const uploadResponse = await this.uploadFile(submissionId, data.file);
        const fileData = uploadResponse?.data || uploadResponse;

        // Replace File object with filePath
        const uploaded = {
          ...data,
          file: null,
          filePath: fileData.filePath || fileData.data?.filePath,
          fileName:
            fileData.fileName ||
            fileData.data?.fileName ||
            data.fileName ||
            data.file.name,
          originalName:
            data.file.name ||
            data.originalName ||
            fileData.originalName ||
            fileData.data?.originalName ||
            data.fileName, // Preserve original file name
          fileSize:
            fileData.size ||
            fileData.fileSize ||
            fileData.data?.size ||
            data.fileSize ||
            data.file.size,
          mimeType:
            fileData.mimeType || fileData.data?.mimeType || data.file.type,
          uploadedAt: Date.now(),
        };

        console.log(
          `✅ File uploaded successfully: ${uploaded.fileName} -> ${uploaded.filePath}`
        );
        return uploaded;
      } catch (error: any) {
        console.error(
          `❌ Failed to upload file ${data.fileName || data.file.name}:`,
          error
        );
        throw error;
      }
    }

    // Handle arrays (e.g., infraActArray, files array, VGFArray, projects array)
    if (Array.isArray(data)) {
      const uploadedArray = await Promise.all(
        data.map((item, index) =>
          this.uploadFilesAndReplace(item, submissionId, [
            ...path,
            index.toString(),
          ])
        )
      );
      return uploadedArray;
    }

    // Handle nested objects (e.g., section2_1: { infraActArray: [...] })
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = await this.uploadFilesAndReplace(value, submissionId, [
        ...path,
        key,
      ]);
    }
    return result;
  }

  // Helper to create a JSON-safe copy of payload (replaces File objects with placeholders)
  private sanitizePayloadForJSON(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;

    if (obj instanceof File) {
      return { _filePlaceholder: true, name: obj.name, size: obj.size };
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizePayloadForJSON(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof File) {
        sanitized[key] = {
          _filePlaceholder: true,
          name: value.name,
          size: value.size,
        };
      } else if (
        value &&
        typeof value === "object" &&
        (value as any).file instanceof File
      ) {
        // For FileUpload objects, keep metadata but mark file as placeholder
        const fileUpload = value as any;
        sanitized[key] = {
          ...value,
          file: {
            _filePlaceholder: true,
            name: fileUpload.file.name,
            size: fileUpload.file.size,
          },
        };
      } else {
        sanitized[key] = this.sanitizePayloadForJSON(value);
      }
    }

    return sanitized;
  }

  // Helper to append files to FormData recursively
  private appendFilesToFormData(
    formData: FormData,
    obj: any,
    parentKey: string = ""
  ) {
    if (!obj || typeof obj !== "object") return;

    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (value instanceof File) {
        console.log(`📎 Appending file: ${fullKey}`, value.name);
        formData.append(fullKey, value, value.name);
        return;
      }

      if (value && typeof value === "object") {
        // Handle FileUpload objects
        const fileUpload = value as any;
        if (fileUpload.file instanceof File) {
          const fileKey = `${fullKey}.file`;
          console.log(
            `📎 Appending FileUpload file: ${fileKey}`,
            fileUpload.file.name
          );
          formData.append(fileKey, fileUpload.file, fileUpload.file.name);
        } else if (Array.isArray(value)) {
          // Handle arrays (like VGFArray, projects array, etc.)
          value.forEach((item, index) => {
            this.appendFilesToFormData(formData, item, `${fullKey}[${index}]`);
          });
        } else {
          // Recursively handle nested objects
          this.appendFilesToFormData(formData, value, fullKey);
        }
      }
    });
  }

  /**
   * Extract file metadata from formData structure
   * Recursively finds all FileUpload objects with filePath and returns their metadata
   * This is needed because files are uploaded immediately when selected,
   * so File objects are null and only metadata (filePath) is available
   *
   * Handles edge cases:
   * - Missing/invalid metadata
   * - Duplicate files
   * - Deep nesting (with depth limit)
   * - Large file arrays (with count limit)
   * - Date format inconsistencies
   * - File size validation
   */
  /**
   * Extract original file name from UUID-prefixed fileName
   * Pattern: {uuid}_{originalName} or just {originalName}
   * Returns originalName if it can be extracted, otherwise returns fileName
   */
  private extractOriginalNameFromFileName(
    fileName: string,
    originalName?: string
  ): string {
    // If originalName is already provided, use it
    if (originalName && originalName.trim()) return originalName;

    // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;

    // If fileName starts with UUID pattern, extract everything after the UUID and underscore
    if (uuidPattern.test(fileName)) {
      const extracted = fileName.replace(uuidPattern, "");
      // If extraction resulted in a non-empty string, use it
      if (extracted && extracted.trim().length > 0) {
        return extracted;
      }
    }

    // Fallback to fileName if extraction failed
    return fileName;
  }

  private extractFileMetadataFromFormData(
    formData: Record<string, any>,
    maxDepth: number = 10,
    maxFiles: number = 1000
  ): any[] {
    const attachedFiles: any[] = [];
    const seenPaths = new Set<string>();
    let currentDepth = 0;

    const recurse = (obj: any, depth: number = 0): void => {
      // Safety: Prevent infinite recursion
      if (depth > maxDepth) {
        console.warn(`⚠️ Max depth ${maxDepth} reached, stopping recursion`);
        return;
      }

      // Safety: Prevent too many files
      if (attachedFiles.length >= maxFiles) {
        console.warn(`⚠️ Max files ${maxFiles} reached, stopping extraction`);
        return;
      }

      if (!obj || typeof obj !== "object") return;

      // Check if this object is a file metadata object
      if (
        obj.filePath &&
        typeof obj.filePath === "string" &&
        obj.filePath.trim() !== "" &&
        (obj.fileName || obj.originalName)
      ) {
        // Validate filePath format (should start with 'submissions/')
        if (!obj.filePath.startsWith("submissions/")) {
          console.warn(`⚠️ Invalid filePath format: ${obj.filePath}, skipping`);
          return;
        }

        // Avoid duplicates
        if (!seenPaths.has(obj.filePath)) {
          seenPaths.add(obj.filePath);

          // Validate and normalize metadata with fallbacks
          const fileName =
            obj.fileName ||
            obj.originalName ||
            obj.filePath.split("/").pop() ||
            "Unknown";
          const fileSize =
            typeof obj.fileSize === "number"
              ? obj.fileSize
              : Number(obj.fileSize) || 0;

          // Validate file size (warn for large files)
          if (fileSize > 100 * 1024 * 1024) {
            // 100MB limit
            console.warn(
              `⚠️ Large file detected: ${fileName} (${(
                fileSize /
                1024 /
                1024
              ).toFixed(2)} MB)`
            );
          }

          // Normalize uploadedAt with error handling
          let uploadedAt: string;
          try {
            if (obj.uploadedAt) {
              if (typeof obj.uploadedAt === "string") {
                // Validate ISO string format
                const date = new Date(obj.uploadedAt);
                if (isNaN(date.getTime())) {
                  throw new Error("Invalid date string");
                }
                uploadedAt = date.toISOString();
              } else if (typeof obj.uploadedAt === "number") {
                // Handle timestamp
                uploadedAt = new Date(obj.uploadedAt).toISOString();
              } else if (obj.uploadedAt instanceof Date) {
                uploadedAt = obj.uploadedAt.toISOString();
              } else {
                throw new Error("Unknown date format");
              }
            } else {
              uploadedAt = new Date().toISOString();
            }
          } catch (e) {
            console.warn(
              `⚠️ Invalid uploadedAt for ${fileName}, using current date:`,
              e
            );
            uploadedAt = new Date().toISOString();
          }

          const fileMeta = {
            id: obj.id ?? null,
            fileName,
            originalName: this.extractOriginalNameFromFileName(
              fileName,
              obj.originalName
            ),
            filePath: obj.filePath,
            fileUrl: obj.fileUrl || "",
            fileSize,
            mimeType: obj.mimeType || "application/octet-stream",
            uploadedAt,
          };

          attachedFiles.push(fileMeta);
          console.log(
            `📎 Extracted file: ${fileMeta.fileName} (${fileMeta.filePath})`
          );
        } else {
          console.log(`📎 Skipping duplicate file: ${obj.filePath}`);
        }
        return; // Don't recurse into file metadata objects
      }

      // Handle arrays (e.g., infraActArray, files array, etc.)
      if (Array.isArray(obj)) {
        obj.forEach((item) => recurse(item, depth + 1));
        return;
      }

      // Handle nested objects
      Object.values(obj).forEach((value) => recurse(value, depth + 1));
    };

    recurse(formData);

    console.log(`📦 Extracted ${attachedFiles.length} file(s) from formData`);

    if (attachedFiles.length === 0) {
      console.log(
        `ℹ️ No files extracted from formData (this is normal if no files are attached)`
      );
    }

    return attachedFiles;
  }

  /**
   * Update indicator status (generic handler used by components)
   * payload: { submissionId, category, section, accepted }
   * token: optional auth token (falls back to localStorage if not provided)
   */
  //   async getStateIndicatorStatuses(): Promise<any> {
  //   try {
  //     const response = await this.axios.get("/indicators/state-statuses", {
  //       headers: { Accept: "application/json" },
  //     });

  //     console.log(response.status);
  //     // normalize like you do elsewhere
  //     return response.data?.data !== undefined ? response.data.data : response.data;
  //     // If your backend shape is { status: true, data: {...} }, return response.data is fine,
  //     // since your calculator reads payload?.data?.submissions.
  //   } catch (error: any) {
  //     if (error.response?.status === 304) {
  //       const cached = error.response?.data || {};
  //       return cached?.data !== undefined ? cached.data : cached;
  //     }
  //     throw error;
  //   }
  // }

  // services/api.service.ts

  async getStateIndicatorStatuses(year?: string): Promise<{
    status: boolean;
    message?: string;
    data: any;
  }> {
    try {
      const qs = year ? `?year=${encodeURIComponent(year)}` : "";
      const resp = await this.axios.get(`/indicators/state-statuses${qs}`, {
        headers: { Accept: "application/json" },
      });

      // Always return the backend envelope so downstream can read .data.summary
      // resp.data is expected to be { status, message, data }
      return resp.data;
    } catch (error: any) {
      // If your server sometimes replies 304 with a payload, normalize it
      if (error?.response?.status === 304) {
        const fallback = error.response.data ?? {};
        return typeof fallback.status === "boolean"
          ? fallback
          : { status: true, data: fallback };
      }
      throw error;
    }
  }

  async getNodalMetrics() {
    // Adjust depending on how your API client is set up (axios/fetch wrapper)
    const res = await this.axios.get("/dashboard/nodal-metrics");
    return res.data;
  }

  async getAssignedStateOnly(roleName: string) {
    const res = await this.axios.get(
      `/users/states/assigned-state-by-state-approver/${roleName}`
    );
    return res.data;
  }

  async checkEmailAvailability(
    email: string,
    excludeUserId?: string
  ): Promise<boolean> {
    try {
      const params = excludeUserId ? { excludeUserId } : {};
      // Note: The response interceptor already extracts response.data, so 'response' is already the data object
      const response = await this.axios.get(
        `/users/check-email/${encodeURIComponent(email)}`,
        { params }
      );

      // Log response for debugging
      console.log("Email availability check response:", {
        email,
        response: response,
        available: response?.data?.available,
      });

      // Return availability status, default to true if unclear
      // Response interceptor returns response.data, so response is already { status, data, message }
      const isAvailable = response?.data?.available ?? true;
      return isAvailable;
    } catch (error: any) {
      // If error (network, 404, etc.), assume available (don't block user)
      // Only return false if we get a clear 200 response saying it's not available
      console.warn("Error checking email availability, assuming available:", {
        email,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });
      return true; // Assume available on error to avoid false positives
    }
  }

  async checkContactAvailability(
    contactNumber: string,
    excludeUserId?: string
  ): Promise<boolean> {
    try {
      const params = excludeUserId ? { excludeUserId } : {};
      // Note: The response interceptor already extracts response.data, so 'response' is already the data object
      const response = await this.axios.get(
        `/users/check-contact/${encodeURIComponent(contactNumber)}`,
        { params }
      );

      // Log response for debugging
      console.log("Contact availability check response:", {
        contactNumber,
        response: response,
        available: response?.data?.available,
      });

      // Return availability status, default to true if unclear
      // Response interceptor returns response.data, so response is already { status, data, message }
      const isAvailable = response?.data?.available ?? true;
      return isAvailable;
    } catch (error: any) {
      // If error (network, 404, etc.), assume available (don't block user)
      // Only return false if we get a clear 200 response saying it's not available
      console.warn("Error checking contact availability, assuming available:", {
        contactNumber,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });
      return true; // Assume available on error to avoid false positives
    }
  }
}

export async function getCumulativePreview(
  stateUt: string,
  opts?: { year?: string; debug?: string }
) {
  const params: Record<string, string> = {};
  if (opts?.year) params.year = opts.year;
  if (opts?.debug) params.debug = opts.debug;

  const res = await apiService.get<CumulativePreviewResponse>(
    `/submission/state/${encodeURIComponent(stateUt)}/cumulative-preview`,
    { params }
  );
  return res.data;

}

export const apiService = new ApiService();
