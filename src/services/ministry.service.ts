/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiService } from "./api.service";
import { config } from "@/config/environment";

/**
 * Add a comment to a ministry submission indicator
 * @param submissionIndicatorId - The submission indicator ID
 * @param text - The comment text
 * @returns Promise with the API response
 */
export async function addMinistrySubmissionComment(
  submissionIndicatorId: string,
  text: string
): Promise<any> {
  try {
    const url = getApiUrl(`/ministry/form/submission/comment`);

    const payload = {
      submissionIndicatorId,
      text,
    };

    console.log("📤 Adding ministry submission comment:", {
      submissionIndicatorId,
      text,
    });

    const response = await apiService.post(url, payload, {
      withCredentials: true,
    });
    return response.data?.data || response.data || response;
  } catch (error: any) {
    console.error("❌ Error in addMinistrySubmissionComment:", error);
    throw error;
  }
}

/**
 * Get all comments for a ministry submission indicator
 * @param submissionIndicatorId - The submission indicator ID
 * @returns Promise with the API response containing comments array
 */
export async function getMinistrySubmissionIndicatorComments(
  submissionIndicatorId: string
): Promise<{
  status: boolean;
  message: string;
  data: any[];
}> {
  try {
    const url = getApiUrl(
      `/ministry/form/submission/comment/${submissionIndicatorId}`
    );

    console.log("📥 Fetching ministry submission indicator comments:", {
      submissionIndicatorId,
    });

    const response = await apiService.get(url, { withCredentials: true });
    return response.data || response;
  } catch (error: any) {
    console.error("❌ Error in getMinistrySubmissionIndicatorComments:", error);
    throw error;
  }
}

/**
 * Submit ministry form to MOSPI (for Reviewer and Approver actions)
 * @param formId - The form ID (optional)
 * @param action - The action to perform: "send-back" | "accept" | "submit-to-approver"
 * @returns Promise with the API response
 */
export async function submitMospiFormAction(
  formId?: string,
  action: "send-back" | "accept" | "submit-to-approver" = "submit-to-approver"
): Promise<any> {
  try {
    const url = getApiUrl(`/ministry/form/submission/mospi-form-submit`);

    const payload: {
      formId?: string;
      action: "send-back" | "accept" | "submit-to-approver";
    } = {
      action,
    };

    // Only include formId if provided
    if (formId) {
      payload.formId = formId;
    }

    console.log("📤 Submitting MOSPI form action:", {
      formId,
      action,
      payload,
    });

    const response = await apiService.put(url, payload, {
      withCredentials: true,
    });
    return response.data?.data || response.data || response;
  } catch (error: any) {
    console.error("❌ Error in submitMospiFormAction:", error);
    throw error;
  }
}

/**
 * Update ministry submission indicator status
 * @param submissionIndicatorId - The submission indicator ID
 * @param status - The status to set (e.g., "RETURNED_FROM_MOSPI_APPROVER_DRAFT", "ACCEPTED_BY_MOSPI_APPROVER_DRAFT")
 * @returns Promise with the API response
 */
export async function updateMinistryIndicatorStatus(
  submissionIndicatorId: string,
  status: string
): Promise<any> {
  try {
    const url = getApiUrl(`/ministry/form/submission/indicator/status`);

    const payload = {
      submissionIndicatorId,
      status,
    };

    console.log("📤 Updating ministry indicator status:", {
      submissionIndicatorId,
      status,
      payload,
    });

    const response = await apiService.put(url, payload, {
      withCredentials: true,
    });
    return response.data?.data || response.data || response;
  } catch (error: any) {
    console.error("❌ Error in updateMinistryIndicatorStatus:", error);
    throw error;
  }
}

/**
 * Get form status statistics
 * @param formId - The form ID to get statistics for
 * @returns Promise with form status statistics
 */
export async function getFormStatusStatistics(formId: string): Promise<{
  status: boolean;
  data: {
    formId: string;
    total: number;
    totalSentBack: number;
    totalApproved: number;
    totalSubmitted: number;
  };
  message: string;
}> {
  try {
    const url = getApiUrl(`/ministry/form/submission/form-status-statistics/${formId}`);
    
    console.log("📤 Fetching form status statistics:", { formId });

    const response = await apiService.get(url, {
      withCredentials: true,
    });
    
    return response.data || response;
  } catch (error: any) {
    console.error("❌ Error in getFormStatusStatistics:", error);
    throw error;
  }
}

/**
 * Delete a file from ministry submission
 * @param payload - The delete payload with action and either submissionIndicatorId or primaryId
 * @returns Promise with the API response
 */
export async function deleteMinistrySubmissionFile(payload: {
  action: "by-submission-indicator" | "by-primary-id";
  submissionIndicatorId?: string;
  primaryId?: string;
}): Promise<any> {
  try {
    const url = getApiUrl(`/ministry/form/submission/file-data`);

    console.log("📤 Deleting ministry submission file:", payload);

    const response = await apiService.delete(url, {
      data: payload,
      withCredentials: true,
    });
    return response.data?.data || response.data || response;
  } catch (error: any) {
    console.error("❌ Error in deleteMinistrySubmissionFile:", error);
    throw error;
  }
}

// Helper to build full API URL
function getApiUrl(path: string) {
  const baseUrl = config.apiBaseUrl || "";
  return baseUrl ? `${baseUrl}${path}` : path;
}

// Fetch all ministries from the API
export async function getAllMinistries() {
  try {
    const url = getApiUrl("/ministries");
    try {
      const response = await apiService.get(url, { withCredentials: true });
      const data = response.data;
      if (Array.isArray(data?.data)) {
        return data.data;
      } else if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      console.error("[getAllMinistries] API Error:", error);
      return [];
    }
  } catch (error) {
    console.error("[getAllMinistries] API Error:", error);
    return [];
  }
}

// Fetch all ministryId values from the user table
export async function getAllAssignedMinistryIds() {
  try {
    const url = getApiUrl("/users");
    try {
      const response = await apiService.get(url);
      const data = response.data;
      const users = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      return users.map((user: any) => user.ministryId);
    } catch (error) {
      return [];
    }
  } catch (error) {
    return [];
  }
}

/**
 * Get ministry approver user ID for a given ministryId (used when nodal officer views their submission
 * to check if consolidated form is with MOSPI).
 * @param ministryId - The ministry ID
 * @returns Promise with ministry approver user ID or null
 */
export async function getMinistryApproverUserIdByMinistryId(ministryId: string): Promise<string | null> {
  try {
    const url = getApiUrl("/users");
    const response = await apiService.get(url);
    const data = response?.data;
    const users = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    const ministryApprover = users.find(
      (u: { role?: string; ministryId?: string; id?: string }) =>
        u.role === "MINISTRY_APPROVER" && String(u.ministryId || "") === String(ministryId)
    );
    return ministryApprover?.id ?? ministryApprover?._id ?? null;
  } catch {
    return null;
  }
}

// Fetch assigned ministry IDs filtered by role (to check if ministry is already assigned to a specific role)
// For MOSPI_REVIEWER, ministryId can be comma-separated, so we need to split and return individual IDs
export async function getAssignedMinistryIdsByRole(role: string, excludeUserId?: string) {
  try {
    const url = getApiUrl("/users");
    try {
      const response = await apiService.get(url);
      const data = response.data;
      const users = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      // Filter users by role and exclude the current user if editing
      const filteredUsers = users.filter((user: any) => {
        if (excludeUserId && user.id === excludeUserId) return false;
        return user.role === role && user.ministryId;
      });
      
      // Extract all ministry IDs, handling comma-separated values for MOSPI_REVIEWER
      const allMinistryIds: string[] = [];
      filteredUsers.forEach((user: any) => {
        if (user.ministryId) {
          const ministryIdStr = String(user.ministryId);
          // If it contains comma, split it (for MOSPI_REVIEWER with multiple ministries)
          if (ministryIdStr.includes(",")) {
            const splitIds = ministryIdStr.split(",").map((id: string) => id.trim()).filter((id: string) => id && id !== "");
            allMinistryIds.push(...splitIds);
          } else {
            allMinistryIds.push(ministryIdStr);
          }
        }
      });
      
      // Return unique ministry IDs
      return Array.from(new Set(allMinistryIds)).filter((id: any) => id && id !== "");
    } catch (error) {
      return [];
    }
  } catch (error) {
    return [];
  }
}

// Fetch indicators for ministry form creation
export async function getMinistryFormIndicators() {
  try {
    const url = getApiUrl("/ministry/form/create/indicators");
    const response = await apiService.get(url, { withCredentials: true });
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error("[getMinistryFormIndicators] API Error:", error);
    return [];
  }
}

/**
 * Registers a ministry form for a Ministry Approver
 * @param userId - The user ID of the Ministry Approver
 * @param userRole - The role of the user (should be 'MINISTRY_APPROVER')
 * @param ministryId - The ministry ID
 * @returns Promise<any>
 */
export async function minstryRegistrationForm(
  userId: string,
  userRole: string,
  ministryId: string
): Promise<any> {
  const url = getApiUrl("/ministry/form/create/form");

  const payload = {
    userId,
    userRole,
    ministryId,
  };
  try {
    const response = await apiService.post(url, payload, {
      withCredentials: true,
    });
    const apiData = response.data?.data || response.data || response;

    // Backend returns: { status, data: { form, submission: { id, submissionId, ... }, ... }, message }
    // Extract and flatten submission data for frontend compatibility
    if (apiData?.submission) {
      return {
        ...apiData,
        id: apiData.submission.id,
        submissionId: apiData.submission.submissionId,
        // Keep the full submission object for any other use cases
        submission: apiData.submission,
      };
    }

    // If structure is different, try to extract from nested data
    if (apiData?.data?.submission) {
      return {
        ...apiData,
        id: apiData.data.submission.id,
        submissionId: apiData.data.submission.submissionId,
        submission: apiData.data.submission,
      };
    }

    // Return as-is if structure doesn't match expected format
    return apiData;
  } catch (error) {
    console.error("❌ Error in minstryRegistrationForm:", error);
    throw error;
  }
}

/**
 * Assign indicators to a nodal officer by a ministry approver
 * @param nodalUserId - The ID of the nodal officer
 * @param ministryUserId - The ID of the ministry approver
 * @param indicatorsId - Array of indicator IDs to assign
 */
export async function assignIndicatorsToNodal(
  nodalUserId: string,
  ministryUserId: string,
  indicatorsId: string[]
) {
  const url = getApiUrl("/ministry/form/create/assign-indicator-to-nodal");
  return apiService.post(
    url,
    {
      nodalUserId,
      ministryUserId,
      indicatorsId,
    },
    { withCredentials: true }
  );
}

// Fetch remaining indicators for ministry form creation for a specific user
export async function getRemainingMinistryIndicators(userId?: string) {
  try {
    let url = getApiUrl("/ministry/form/create/indicators");
    if (userId) {
      url += `?userId=${encodeURIComponent(userId)}`;
      console.log("[getRemainingMinistryIndicators] Calling endpoint with userId:", userId);
    } else {
      console.log("[getRemainingMinistryIndicators] Calling endpoint without userId");
    }
    console.log("[getRemainingMinistryIndicators] Full URL:", url);
    
    const response = await apiService.get(url, { withCredentials: true });
    console.log("[getRemainingMinistryIndicators] Raw response:", response);
    console.log("[getRemainingMinistryIndicators] Response type:", typeof response);
    console.log("[getRemainingMinistryIndicators] Is array?", Array.isArray(response));
    
    // Handle response structure: API returns { status, data, message }
    // apiService.get may return the response directly or wrapped
    if (response) {
      // Check if response has the expected structure { status, data, message }
      if (typeof response === 'object' && !Array.isArray(response)) {
        if ('status' in response && 'data' in response) {
          console.log("[getRemainingMinistryIndicators] Found response with status and data");
          return response; // Return the full response object { status, data, message }
        }
        // If response.data exists, it might be nested
        if (response.data !== undefined) {
          console.log("[getRemainingMinistryIndicators] Found response.data");
          // If response.data has a 'data' property, it's the wrapped response
          if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            console.log("[getRemainingMinistryIndicators] Found nested response.data.data");
            return response.data; // Return { status, data, message }
          }
          // Otherwise, response.data might be the data directly
          return response.data;
        }
      }
      // If response is directly an array or object, return it
      return response;
    }
    console.warn("[getRemainingMinistryIndicators] No response data found");
    return { status: false, data: {}, message: "No data received" };
  } catch (error: any) {
    console.error("[getRemainingMinistryIndicators] API Error:", error);
    console.error("[getRemainingMinistryIndicators] Error details:", {
      message: error?.message,
      response: error?.response,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    return { status: false, data: {}, message: error?.message || "Failed to fetch indicators" };
  }
}

/**
 * Remove assigned indicators from a nodal officer and reassign them back to ministry user
 * @param ministryUserId - The ID of the ministry approver
 * @param indicatorsId - Array of indicator IDs to remove/reassign
 * @returns Promise with the API response
 */
export async function removeAssignedIndicators(
  ministryUserId: string,
  indicatorsId: string[]
) {
  try {
    const url = getApiUrl("/ministry/form/create/remove-assigned-indicator");
    console.log("[removeAssignedIndicators] Calling API:", url);
    console.log("[removeAssignedIndicators] Payload:", { ministryUserId, indicatorsId });
    
    const response = await apiService.post(
      url,
      {
        ministryUserId,
        indicatorsId,
      },
      { withCredentials: true }
    );
    
    console.log("[removeAssignedIndicators] Response:", response);
    return response.data?.data || response.data || response;
  } catch (error: any) {
    console.error("[removeAssignedIndicators] API Error:", error);
    throw error;
  }
}

/**
 * Reassign indicators to a nodal officer by a ministry approver
 * @param nodalUserId - The ID of the nodal officer
 * @param ministryUserId - The ID of the ministry approver
 * @param indicatorsId - Array of indicator IDs to reassign
 */
export async function reassignIndicatorsToNodal(
  nodalUserId: string,
  ministryUserId: string,
  indicatorsId: string[]
) {
  const url = getApiUrl("/ministry/form/create/reassign-indicator");
  return apiService.post(
    url,
    {
      nodalUserId,
      ministryUserId,
      indicatorsId,
    },
    { withCredentials: true }
  );
}

/**
 * Get ministry submission ID for a user (simpler endpoint)
 * @param userId - The ID of the user (Ministry Approver)
 * @returns Promise with submission ID
 */
export async function getMinistrySubmissionId(
  userId: string
): Promise<string | null> {
  try {
    const url = getApiUrl(`/ministry/form/retrieve/submission/${userId}`);
    const response = await apiService.get(url, { withCredentials: true });

    // Axios interceptor already unwraps to response.data, so 'response' is the backend object
    // Backend returns: { status: true, data: [...], message: "...", submissionId: "SUB-..." }
    console.log("[getMinistrySubmissionId] Response structure:", {
      isArray: Array.isArray(response),
      type: typeof response,
      keys:
        response && typeof response === "object" && !Array.isArray(response)
          ? Object.keys(response)
          : "N/A",
      hasSubmissionId: !!response?.submissionId,
      submissionId: response?.submissionId,
      hasStatus: !!response?.status,
      hasData: !!response?.data,
      sampleData: Array.isArray(response)
        ? "Array of " + response.length + " items"
        : response?.data
        ? "Has data array"
        : "No data",
    });

    // Backend returns: { status, data: [...], message, submissionId }
    // Check top level (axios interceptor already unwrapped)
    if (response?.submissionId) {
      console.log(
        "[getMinistrySubmissionId] ✅ Found submissionId:",
        response.submissionId
      );
      return response.submissionId;
    }

    // If response is directly an array (unexpected - backend should return object)
    if (Array.isArray(response)) {
      console.error(
        "[getMinistrySubmissionId] ❌ Response is directly an array - backend should return { status, data, submissionId }"
      );
      console.error(
        "[getMinistrySubmissionId] This indicates the backend response structure is incorrect"
      );
      // Cannot extract submissionId from array of indicators
      return null;
    }

    // Check if response has nested structure (shouldn't happen with interceptor, but handle it)
    if (
      response?.data &&
      Array.isArray(response.data) &&
      !response.submissionId
    ) {
      console.warn(
        "[getMinistrySubmissionId] Response has data array but no submissionId found"
      );
      console.warn(
        "[getMinistrySubmissionId] Full response keys:",
        Object.keys(response)
      );
      return null;
    }

    console.error(
      "[getMinistrySubmissionId] ❌ Could not extract submissionId from response"
    );
    return null;
  } catch (error: any) {
    console.error("[getMinistrySubmissionId] API Error:", error);
    // If it's a 404, that's okay - no submission exists
    if (error?.response?.status === 404) {
      console.log("[getMinistrySubmissionId] No submission found (404)");
      return null;
    }
    return null;
  }
}

/* Get Ministry Dashboard Data
 * Returns dummy data for now, can be switched to real API call
 * @param useDummyData - Set to true to use dummy data, false to call real API
 * @param userId - The user ID to fetch dashboard data for
 */
export async function getMinistryDashboardData(userId?: string): Promise<{
  totalIndicators: number;
  totalIndicatorSubmitted: number;
  totalAssignedMinistryApprover: number;
  totalIndicatorNodalMinistry: number;
  totalAccepted: number;
  totalPendingSubmission: number;
  totalReturnNodal: number;
  submittedToMospi: number;
  approvedByMospi: number;
  returnedFromMospi: number;
}> {
  try {
    const url = getApiUrl(`/ministry/dashboard/${userId}`);
    const response = await apiService.get(url, { withCredentials: true });
    const data = response?.data?.data || response?.data || response;

    // Transform API response to match expected format
    // Adjust these mappings based on your actual API response structure
    return {
      totalIndicators: data.totalIndicators || 0,
      totalIndicatorSubmitted: data.totalIndicatorSubmitted || 0,
      totalAssignedMinistryApprover: data.totalAssignedMinistryApprover || 0,
      totalIndicatorNodalMinistry: data.totalIndicatorNodalMinistry || 0,
      totalAccepted: data.totalAccepted || 0,
      totalPendingSubmission: data.totalPendingSubmission || 0,
      totalReturnNodal: data.totalReturnNodal || 0,
      submittedToMospi: data.submittedToMospi || 0,
      approvedByMospi: data.approvedByMospi || 0,
      returnedFromMospi: data.returnedFromMospi || 0,
    };
  } catch (error) {
    console.error("[getMinistryDashboardData] API Error:", error);
    // Return zeroed metrics so callers never get undefined
    return {
      totalIndicators: 0,
      totalIndicatorSubmitted: 0,
      totalAssignedMinistryApprover: 0,
      totalIndicatorNodalMinistry: 0,
      totalAccepted: 0,
      totalPendingSubmission: 0,
      totalReturnNodal: 0,
      submittedToMospi: 0,
      approvedByMospi: 0,
      returnedFromMospi: 0,
    };
  }
}

/**
 * Get Ministry Submissions
 * Returns dummy submissions data for now, can be switched to real API call
 * @param useDummyData - Set to true to use dummy data, false to call real API
 * @param userId - The user ID to fetch submissions for
 */
export async function getMinistrySubmissions(userId?: string): Promise<any[]> {
  // Real API call - using apiService directly
  try {
    const url = getApiUrl(`/ministry/dashboard/${userId}`);

    const response = await apiService.get(url, { withCredentials: true });
    const data = response?.data?.data || response?.data || response;

    // Return submissions array
    return Array.isArray(data) ? data : data.submissions || [];
  } catch (error) {
    console.error("[getMinistrySubmissions] API Error:", error);
    // Fallback to dummy data on error
  }
}

/**
 * Get Nodal Officer KPI Dashboard Data
 * Returns dummy data by default, automatically tries real API and falls back to dummy data if API fails
 * @param userId - The user ID
 * @param ministryId - The ministry ID
 * @returns Promise with nodal dashboard metrics
 */
export async function getNodalKpiData(userId?: string): Promise<{
  totalAllocated: number;
  totalSubmitted: number;
  underReview: number;
  approved: number;
  pending: number;
}> {
  // Dummy data
  const nodalMinistryDashboardData = {
    totalAllocated: 0,
    totalSubmitted: 0,
    underReview: 0,
    approved: 0,
    pending: 0,
  };

  // Try to fetch real API data
  try {
    const url = getApiUrl(`/ministry/dashboard/${userId}`);
    const response = await apiService.get(url, { withCredentials: true });
    const data = response?.data?.data || response?.data || response;

    // Use real API data if available
    if (data && typeof data === "object") {
      return {
        totalAllocated: data.totalAllocated ?? 0,
        totalSubmitted: data.totalSubmitted ?? 0,
        underReview: data.underReview ?? 0,
        approved: data.approved ?? 0,
        pending: data.pending ?? 0,
      };
    }

    return nodalMinistryDashboardData;
  } catch (error) {
    console.error("[getNodalKpiData] API Error, using dummy data:", error);
    // Fallback to dummy data on error
    return nodalMinistryDashboardData;
  }
}

/**
 * Get MOSPI Ministry Tab Metrics
 * Fetches ministry-specific metrics for MOSPI Approver/Reviewer dashboard
 * @param userId - The user ID to fetch metrics for
 * @returns Promise with ministry metrics - structure differs by role:
 *   MOSPI_APPROVER: { accepted, underReview, returnedToMinistry, total }
 *   MOSPI_REVIEWER: { fullSubmission, accepted, underReview, total }
 */
export async function mospiMinisteryTab(userId?: string): Promise<{
  // For MOSPI_APPROVER
  accepted?: number;
  underReview?: number;
  returnedToMinistry?: number;
  total?: number;
  // For MOSPI_REVIEWER
  fullSubmission?: number;
}> {
  try {
    const url = getApiUrl(`/ministry/dashboard/${userId}`);

    const response = await apiService.get(url, { withCredentials: true });
    const data = response?.data?.data || response?.data || response;

    // Return API response directly (structure differs by role)
    return {
      accepted: data.accepted || 0,
      underReview: data.underReview || 0,
      returnedToMinistry: data.returnedToMinistry || 0,
      fullSubmission: data.fullSubmission || 0,
      total: data.total || 0,
    };
  } catch (error) {
    console.error("[mospiMinisteryTab] API Error:", error);
    // Return empty data structure on error
    return {
      accepted: 0,
      underReview: 0,
      returnedToMinistry: 0,
      fullSubmission: 0,
      total: 0,
    };
  }
}

/**
 * Get Nodal Dashboard Submissions
 * Fetches ministry submissions for the Nodal Officer dashboard
 * @param userId - The user ID (Nodal Officer) to fetch submissions for
 * @returns Promise with submissions array (wraps single submission in array for consistency)
 */
export async function getNodalDashboardSubmissions(userId: string): Promise<{
  status: boolean;
  data: {
    submissions: Array<{
      id: string;
      submissionId: string;
      userId: string;
      formId: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      isConsolidated?: boolean;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        ministryId: string;
        ministryName: string;
      };
      form_data?: any;
      formData?: any;
      review_comments?: Array<{ text: string }>;
      reviewComments?: Array<{ text: string }>;
      stateUt?: string;
      state_ut?: string;
      rejection_count?: number;
      rejectionCount?: number;
      finalScore?: number;
      current_owner_role?: string;
      currentOwnerRole?: string;
      dueDate?: string;
    }>;
  };
  message: string;
}> {
  try {
    const url = getApiUrl(`/ministry/dashboard/submission-details/${userId}`);
    const response = await apiService.get(url, { withCredentials: true });
    console.log("[getNodalDashboardSubmissions] Raw Axios Response:", response);
    console.log(
      "[getNodalDashboardSubmissions] Response.data:",
      response?.data
    );

    // Axios wraps the response in response.data, so we need to extract it
    // The API returns: { status: true, data: { submission: {...}, ... }, message: "..." }
    const apiResponse = response || response;

    console.log(
      "[getNodalDashboardSubmissions] API Response (after extraction):",
      apiResponse
    );
    console.log(
      "[getNodalDashboardSubmissions] API Response status:",
      apiResponse?.status
    );
    console.log(
      "[getNodalDashboardSubmissions] API Response data:",
      apiResponse?.data
    );

    if (apiResponse?.status && apiResponse?.data) {
      // API returns: { status: true, data: { submission: {...}, submissionId: "...", user: {...} } }
      const submissionData = apiResponse.data;

      // Check if response has a single submission object
      if (submissionData?.submission) {
        // Combine submission data with user data
        const submission = {
          ...submissionData.submission,
          submissionId:
            submissionData.submissionId ||
            submissionData.submission.submissionId,
          user: submissionData.user || submissionData.submission.user,
        };

        console.log(
          "[getNodalDashboardSubmissions] Processed submission:",
          submission
        );
        console.log("[getNodalDashboardSubmissions] Returning:", {
          status: apiResponse.status,
          data: {
            submissions: [submission],
          },
          message: apiResponse.message || "Submission fetched successfully",
        });

        return {
          status: apiResponse.status,
          data: {
            submissions: [submission], // Wrap single submission in array
          },
          message: apiResponse.message || "Submission fetched successfully",
        };
      }

      // Handle if submissions is already an array
      if (Array.isArray(submissionData?.submissions)) {
        return {
          status: apiResponse.status,
          data: {
            submissions: submissionData.submissions,
          },
          message: apiResponse.message || "Submissions fetched successfully",
        };
      }

      // Handle if submission data is directly an array
      if (Array.isArray(submissionData)) {
        return {
          status: apiResponse.status,
          data: {
            submissions: submissionData,
          },
          message: apiResponse.message || "Submissions fetched successfully",
        };
      }
    }

    // Fallback: return empty array
    console.warn(
      "[getNodalDashboardSubmissions] Unexpected response structure:",
      apiResponse
    );
    return {
      status: false,
      data: {
        submissions: [],
      },
      message: apiResponse?.message || "Unexpected response structure",
    };
  } catch (error: any) {
    console.error("[getNodalDashboardSubmissions] API Error:", error);
    return {
      status: false,
      data: {
        submissions: [],
      },
      message:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch submissions",
    };
  }
}

/**
 * Get Progress Bar Data for Ministry User
 * Fetches accepted and total indicator counts for progress bar
 * @param ministryUserId - The ministry user ID to fetch progress data for
 * @returns Promise with { accepted: number, total: number, formId: string | null }
 */
export async function getMinistryProgressBarData(
  ministryUserId: string
): Promise<{
  status: boolean;
  data: {
    accepted: number;
    total: number;
    formId: string | null;
  };
  message: string;
}> {
  try {
    const url = getApiUrl(`/ministry/dashboard/progress/${ministryUserId}`);
    const response = await apiService.get(url, { withCredentials: true });
    return response.data || response;
  } catch (error: any) {
    console.error("[getMinistryProgressBarData] API Error:", error);
    throw error;
  }
}

/**
 * Get preview data for ministry user
 * Uses the preview API endpoint that accepts userId directly
 * @param ministryUserId - The ministry user ID to fetch preview data for
 * @returns Promise with preview data array
 */
export async function getMinistryPreviewData(ministryUserId: string): Promise<{
  status: boolean;
  data: any[];
  message: string;
}> {
  try {
    const url = getApiUrl(`/ministry/form/retrieve/preview/${ministryUserId}`);
    const response = await apiService.get(url, { withCredentials: true });

    // Handle response structure
    if (response?.status && Array.isArray(response.data)) {
      return {
        status: response.status,
        data: response.data,
        message: response.message || "Preview data retrieved successfully",
      };
    }

    // If response is directly an array
    if (Array.isArray(response)) {
      return {
        status: true,
        data: response,
        message: "Preview data retrieved successfully",
      };
    }

    // If response.data is an array
    if (response?.data && Array.isArray(response.data)) {
      return {
        status: response.status ?? true,
        data: response.data,
        message: response.message || "Preview data retrieved successfully",
      };
    }

    return {
      status: false,
      data: [],
      message: "Unexpected response structure",
    };
  } catch (error: any) {
    console.error("[getMinistryPreviewData] API Error:", error);
    throw error;
  }
}

/**
 * Update ministry form status
 * @param formId - Optional form ID (if not provided, backend will find form for current user)
 * @param status - Form status to set (SUBMITTED_TO_MOSPI_REVIEWER, etc.)
 * @returns Promise with update result
 */
export async function updateMinistryFormStatus(
  formId: string | undefined,
  status: string
): Promise<{
  status: boolean;
  message: string;
  data?: any;
}> {
  try {
    const url = getApiUrl("/ministry/form/submission/form/status");
    const payload: { formId?: string; status: string } = { status };

    if (formId) {
      payload.formId = formId;
    }

    const response = await apiService.put(url, payload, {
      withCredentials: true,
    });

    // Handle response structure
    if (response?.status !== undefined) {
      return {
        status: response.status,
        message: response.message || "Form status updated successfully",
        data: response.data,
      };
    }

    return {
      status: true,
      message: "Form status updated successfully",
      data: response,
    };
  } catch (error: any) {
    console.error("[updateMinistryFormStatus] API Error:", error);
    throw error;
  }
}

/**
 * Get Ministry Submission Details for MOSPI Dashboard
 * Fetches ministry submissions for the MOSPI Approver/Reviewer dashboard table
 * @param userId - The user ID (MOSPI Approver/Reviewer) to fetch submissions for
 * @returns Promise with submissions array
 */
export async function getMospiMinistrySubmissionDetails(
  submissionId: string
): Promise<{
  status: boolean;
  data: {
    submissions: Array<{
      id: string;
      submissionId: string;
      userId: string;
      formId: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        ministryId: string;
        ministryName: string;
      };
      formStatus: string;
      formStatusLabel: string;
    }>;
  };
  message: string;
}> {
  try {
    const url = getApiUrl(
      `/ministry/dashboard/submission-details/${submissionId}`
    );
    const response = await apiService.get(url, { withCredentials: true });

    // Handle different response structures
    const apiResponse = response?.data || response;

    if (apiResponse?.status && apiResponse?.data) {
      return {
        status: apiResponse.status,
        data: apiResponse.data,
        message: apiResponse.message || "",
      };
    }

    // Fallback structure - handle if API returns single submission or array
    const submissions = Array.isArray(apiResponse?.data?.submissions)
      ? apiResponse.data.submissions
      : Array.isArray(apiResponse?.submissions)
      ? apiResponse.submissions
      : Array.isArray(apiResponse?.data)
      ? apiResponse.data
      : apiResponse?.data
      ? [apiResponse.data] // If single submission, wrap in array
      : [];

    return {
      status: true,
      data: {
        submissions: submissions,
      },
      message: apiResponse?.message || "",
    };
  } catch (error) {
    console.error("[getMospiMinistrySubmissionDetails] API Error:", error);
    return {
      status: false,
      data: { submissions: [] },
      message: "Failed to load ministry submissions",
    };
  }
}

/**
 * Retrieve submission details with indicators, subsections, and input fields
 * @param submissionId - The ID of the submission (preferred)
 * @param userId - Optional: The ID of the user (fallback if submissionId not available)
 * @returns Promise with submission form structure
 */
export async function getMinistrySubmissionDetails(
  submissionId?: string,
  userId?: string
): Promise<{
  status: boolean;
  data: any[];
  message: string;
  submissionId?: string;
  id?: string; // UUID of the submission (for calling submission-with-data endpoint)
}> {
  try {
    console.log("[getMinistrySubmissionDetails] Called with:", {
      submissionId,
      userId,
    });

    // If submissionId is provided, use it directly
    const targetSubmissionId = submissionId;

    console.log(
      "[getMinistrySubmissionDetails] targetSubmissionId:",
      targetSubmissionId
    );

    // If submissionId is not provided but userId is, use the endpoint that returns data directly
    if (!targetSubmissionId && userId) {
      console.log(
        "[getMinistrySubmissionDetails] No submissionId, using userId path"
      );
      console.log(
        "[getMinistrySubmissionDetails] No submissionId provided, fetching from userId:",
        userId
      );

      // Call the endpoint that returns submission details with data
      // Backend returns: { status, data: [...], message, submissionId }
      // Axios interceptor returns response.data, so 'response' is already the backend object
      const url = getApiUrl(`/ministry/form/retrieve/submission/${userId}`);
      const response = await apiService.get(url, { withCredentials: true });

      // Axios interceptor already unwraps to response.data, so 'response' is the backend object
      // Backend returns: { status: true, data: [...], message: "...", submissionId: "SUB-..." }
      console.log(
        "[getMinistrySubmissionDetails] Response from /submission/:userId:",
        {
          isArray: Array.isArray(response),
          type: typeof response,
          keys:
            response && typeof response === "object" && !Array.isArray(response)
              ? Object.keys(response)
              : "N/A",
          hasStatus: !!response?.status,
          hasData: !!response?.data,
          hasSubmissionId: !!response?.submissionId,
          submissionId: response?.submissionId,
          dataIsArray: Array.isArray(response?.data),
          dataLength: Array.isArray(response?.data)
            ? response.data.length
            : "not array",
        }
      );

      // If response has the expected structure with submissionId
      if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response)
      ) {
        if (
          response.submissionId &&
          response.data &&
          Array.isArray(response.data)
        ) {
          console.log(
            "[getMinistrySubmissionDetails] ✅ Got submissionId from userId endpoint:",
            response.submissionId
          );
          console.log(
            "[getMinistrySubmissionDetails] ✅ Got UUID id from userId endpoint:",
            response.id
          );

          // Check if we have UUID to call submission-with-data endpoint
          if (response.id) {
            console.log(
              "[getMinistrySubmissionDetails] 🔄 Now calling submission-with-data endpoint to get submitted indicators"
            );

            // Call the submission-with-data endpoint using UUID
            const submissionWithDataUrl = getApiUrl(
              `/ministry/form/retrieve/submission-with-data/${response.id}`
            );
            console.log(
              "[getMinistrySubmissionDetails] 📡 Calling submission-with-data:",
              submissionWithDataUrl
            );

            try {
              const submissionWithDataResponse = await apiService.get(
                submissionWithDataUrl,
                { withCredentials: true }
              );
              console.log(
                "[getMinistrySubmissionDetails] ✅ Got response from submission-with-data endpoint"
              );

              // Handle the response from submission-with-data endpoint
              let apiResponse = submissionWithDataResponse.data;

              // Handle nested response structure
              if (
                apiResponse?.data &&
                typeof apiResponse.data === "object" &&
                "status" in apiResponse &&
                Array.isArray(apiResponse.data)
              ) {
                console.log(
                  "[getMinistrySubmissionDetails] Found nested structure with status in submission-with-data response"
                );
              } else if (Array.isArray(apiResponse)) {
                if (
                  submissionWithDataResponse?.data?.data &&
                  Array.isArray(submissionWithDataResponse.data.data)
                ) {
                  apiResponse = submissionWithDataResponse.data;
                  console.log(
                    "[getMinistrySubmissionDetails] Found nested data structure in submission-with-data response"
                  );
                }
              }

              // If the response has the expected structure
              if (
                apiResponse &&
                typeof apiResponse === "object" &&
                !Array.isArray(apiResponse) &&
                "status" in apiResponse
              ) {
                console.log(
                  "[getMinistrySubmissionDetails] ✅ Using submission-with-data response with submitted indicators"
                );
                return {
                  status: apiResponse.status ?? true,
                  data: apiResponse.data || [],
                  message: apiResponse.message || "",
                  submissionId:
                    apiResponse.submissionId || response.submissionId,
                  id: response.id, // Preserve UUID
                };
              }

              // Fallback: if response.data is directly the array
              if (Array.isArray(apiResponse)) {
                console.log(
                  "[getMinistrySubmissionDetails] ✅ Using submission-with-data response (array format)"
                );
                return {
                  status: true,
                  data: apiResponse,
                  message: "Retrieved indicators with submitted data",
                  submissionId: response.submissionId,
                  id: response.id, // Preserve UUID
                };
              }

              // Fallback: if response.data.data exists
              if (apiResponse?.data && Array.isArray(apiResponse.data)) {
                console.log(
                  "[getMinistrySubmissionDetails] ✅ Using submission-with-data response (nested data)"
                );
                return {
                  status: apiResponse.status ?? true,
                  data: apiResponse.data,
                  message: apiResponse.message || "",
                  submissionId:
                    apiResponse.submissionId || response.submissionId,
                  id: response.id, // Preserve UUID
                };
              }

              // If submission-with-data response is unexpected, fall back to original response
              console.warn(
                "[getMinistrySubmissionDetails] ⚠️ Unexpected submission-with-data response structure, using original response"
              );
              return {
                status: response.status ?? true,
                data: response.data,
                message: response.message || "",
                submissionId: response.submissionId,
                id: response.id,
              };
            } catch (submissionWithDataError: any) {
              console.error(
                "[getMinistrySubmissionDetails] ⚠️ Error calling submission-with-data endpoint:",
                submissionWithDataError
              );
              console.warn(
                "[getMinistrySubmissionDetails] ⚠️ Falling back to original response without submitted data"
              );
              // Fall back to original response if submission-with-data fails
              return {
                status: response.status ?? true,
                data: response.data,
                message: response.message || "",
                submissionId: response.submissionId,
                id: response.id,
              };
            }
          } else {
            console.warn(
              "[getMinistrySubmissionDetails] ⚠️ No UUID (id) in response, cannot call submission-with-data endpoint"
            );
            // Return the blank form structure if UUID is missing
            return {
              status: response.status ?? true,
              data: response.data,
              message: response.message || "",
              submissionId: response.submissionId,
            };
          }
        }

        // If submissionId is missing but we have data, the backend might not be including it
        if (
          response.data &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          console.warn(
            "[getMinistrySubmissionDetails] ⚠️ Response has data but no submissionId in response object"
          );
          console.warn(
            "[getMinistrySubmissionDetails] This suggests the backend response structure is missing submissionId"
          );
          // We can't proceed without submissionId for the submission-with-data endpoint
          throw new Error(
            "Backend response missing submissionId. Cannot proceed without submission ID."
          );
        }
      }

      // If response is directly an array (unexpected - backend should return object)
      if (Array.isArray(response) && response.length > 0) {
        console.error(
          "[getMinistrySubmissionDetails] ❌ Response is directly an array - backend should return { status, data, submissionId }"
        );
        console.error(
          "[getMinistrySubmissionDetails] This indicates the backend response structure is incorrect"
        );
        throw new Error(
          "Backend returned array instead of object with submissionId. Please check backend implementation."
        );
      }

      // If we still don't have submissionId, throw error
      const errorMsg =
        "Could not retrieve submissionId from userId. The submission may not exist or the backend response format is unexpected.";
      console.error("[getMinistrySubmissionDetails] ❌", errorMsg);
      throw new Error(errorMsg);
    }

    if (!targetSubmissionId) {
      console.error(
        "[getMinistrySubmissionDetails] ❌ No targetSubmissionId found"
      );
      throw new Error("Either submissionId or userId must be provided");
    }

    // Call the submission-with-data endpoint to get indicators with submitted data
    // This is the endpoint that shows submitted indicators with their data
    console.log(
      "[getMinistrySubmissionDetails] ✅ SubmissionId provided - will call submission-with-data endpoint"
    );
    console.log(
      "[getMinistrySubmissionDetails] 📋 targetSubmissionId:",
      targetSubmissionId
    );
    console.log(
      "[getMinistrySubmissionDetails] 📋 targetSubmissionId type:",
      typeof targetSubmissionId
    );
    console.log(
      "[getMinistrySubmissionDetails] 📋 targetSubmissionId truthy?",
      !!targetSubmissionId
    );

    const url = getApiUrl(
      `/ministry/form/retrieve/submission-with-data/${targetSubmissionId}`
    );
    console.log(
      "[getMinistrySubmissionDetails] 📡 Calling submission-with-data endpoint"
    );
    console.log("[getMinistrySubmissionDetails] 📡 Full URL:", url);
    console.log(
      "[getMinistrySubmissionDetails] 📡 Endpoint: GET /ministry/form/retrieve/submission-with-data/" +
        targetSubmissionId
    );

    const response = await apiService.get(url, { withCredentials: true });

    console.log(
      "[getMinistrySubmissionDetails] ✅ Successfully called submission-with-data endpoint"
    );

    console.log("[getMinistrySubmissionDetails] Raw axios response:", {
      hasData: !!response.data,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      dataKeys:
        response.data &&
        typeof response.data === "object" &&
        !Array.isArray(response.data)
          ? Object.keys(response.data)
          : "N/A",
      fullResponse: response,
    });

    // The API returns { status: true, data: [...], message: "...", submissionId: "..." }
    // response.data should be the entire object from the backend
    let apiResponse = response.data;

    // CRITICAL: Check if response.data is nested (some axios configurations nest it)
    if (
      apiResponse?.data &&
      typeof apiResponse.data === "object" &&
      "status" in apiResponse &&
      Array.isArray(apiResponse.data)
    ) {
      // This is the expected structure: { status, data: [...], message, submissionId }
      console.log(
        "[getMinistrySubmissionDetails] Found nested structure with status"
      );
    } else if (Array.isArray(apiResponse)) {
      // If response.data is directly an array, the backend response might be wrapped differently
      // Try to get the actual response from response.data or response
      console.warn(
        "[getMinistrySubmissionDetails] Response.data is an array, checking for nested structure..."
      );

      // Check if there's a nested response structure
      if (response?.data?.data && Array.isArray(response.data.data)) {
        apiResponse = response.data; // Use the outer object
        console.log(
          "[getMinistrySubmissionDetails] Found nested data structure"
        );
      }
    }

    // If the response has the expected structure
    if (
      apiResponse &&
      typeof apiResponse === "object" &&
      !Array.isArray(apiResponse) &&
      "status" in apiResponse
    ) {
      console.log("[getMinistrySubmissionDetails] API Response structure:", {
        hasStatus: "status" in apiResponse,
        hasData: "data" in apiResponse,
        hasSubmissionId: "submissionId" in apiResponse,
        submissionId: apiResponse.submissionId,
        allKeys: Object.keys(apiResponse),
        fullResponse: JSON.stringify(apiResponse, null, 2),
      });

      // CRITICAL: Log the actual submissionId value
      if (apiResponse.submissionId) {
        console.log(
          "[getMinistrySubmissionDetails] ✅ Found submissionId:",
          apiResponse.submissionId
        );
      } else {
        console.error(
          "[getMinistrySubmissionDetails] ❌ submissionId is missing from API response!"
        );
        console.error(
          "[getMinistrySubmissionDetails] Response keys:",
          Object.keys(apiResponse)
        );
        console.error(
          "[getMinistrySubmissionDetails] Full response:",
          JSON.stringify(apiResponse, null, 2)
        );
      }

      return {
        status: apiResponse.status ?? true,
        data: apiResponse.data || [],
        message: apiResponse.message || "",
        submissionId: apiResponse.submissionId, // Include submissionId if available
      };
    }

    // Fallback: if response.data is directly the array
    if (Array.isArray(apiResponse)) {
      console.warn(
        "[getMinistrySubmissionDetails] Response is directly an array, no submissionId available"
      );
      console.warn(
        "[getMinistrySubmissionDetails] This means the backend response structure is different than expected"
      );
      console.warn(
        "[getMinistrySubmissionDetails] Raw response.data:",
        response.data
      );
      return {
        status: true,
        data: apiResponse,
        message: "Retrieved indicators for submission",
      };
    }

    // Fallback: if response.data.data exists
    if (apiResponse?.data && Array.isArray(apiResponse.data)) {
      console.log("[getMinistrySubmissionDetails] Nested data structure:", {
        hasSubmissionId: "submissionId" in apiResponse,
        submissionId: apiResponse.submissionId,
      });
      return {
        status: apiResponse.status ?? true,
        data: apiResponse.data,
        message: apiResponse.message || "",
        submissionId: apiResponse.submissionId, // Check top level too
      };
    }

    console.error(
      "[getMinistrySubmissionDetails] Unexpected response structure:",
      apiResponse
    );
    return {
      status: false,
      data: [],
      message: "Unexpected response structure",
    };
  } catch (error) {
    console.error("[getMinistrySubmissionDetails] API Error:", error);
    throw error;
  }
}

/**
 * Retrieve consolidated ministry submission details by submission ID (for MOSPI Approver/Reviewer)
 * @param submissionId - The ID of the submission
 * @returns Promise with submission form structure
 */
export async function getMinistrySubmissionDetailsConsolidated(
  submissionId: string
): Promise<{
  status: boolean;
  data: any[];
  message: string;
  submissionId?: string;
}> {
  try {
    const url = getApiUrl(
      `/ministry/form/retrieve/submission-with-data/consolidated/${submissionId}`
    );
    const response = await apiService.get(url, { withCredentials: true });

    console.log(
      "[getMinistrySubmissionDetailsConsolidated] Raw axios response:",
      {
        hasData: !!response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        dataKeys:
          response.data &&
          typeof response.data === "object" &&
          !Array.isArray(response.data)
            ? Object.keys(response.data)
            : "N/A",
      }
    );

    let apiResponse = response.data;

    // Handle nested response structure
    if (
      apiResponse?.data &&
      typeof apiResponse.data === "object" &&
      "status" in apiResponse &&
      Array.isArray(apiResponse.data)
    ) {
      console.log(
        "[getMinistrySubmissionDetailsConsolidated] Found nested structure with status"
      );
    } else if (Array.isArray(apiResponse)) {
      if (response?.data?.data && Array.isArray(response.data.data)) {
        apiResponse = response.data;
        console.log(
          "[getMinistrySubmissionDetailsConsolidated] Found nested data structure"
        );
      }
    }

    // If the response has the expected structure
    if (
      apiResponse &&
      typeof apiResponse === "object" &&
      !Array.isArray(apiResponse) &&
      "status" in apiResponse
    ) {
      console.log(
        "[getMinistrySubmissionDetailsConsolidated] API Response structure:",
        {
          hasStatus: "status" in apiResponse,
          hasData: "data" in apiResponse,
          hasSubmissionId: "submissionId" in apiResponse,
          submissionId: apiResponse.submissionId,
        }
      );

      return {
        status: apiResponse.status ?? true,
        data: apiResponse.data || [],
        message: apiResponse.message || "",
        submissionId: apiResponse.submissionId || submissionId,
      };
    }

    // Fallback: if response.data is directly the array
    if (Array.isArray(apiResponse)) {
      console.warn(
        "[getMinistrySubmissionDetailsConsolidated] Response is directly an array"
      );
      return {
        status: true,
        data: apiResponse,
        message: "Retrieved indicators for review",
        submissionId: submissionId,
      };
    }

    // Fallback: if response.data.data exists
    if (apiResponse?.data && Array.isArray(apiResponse.data)) {
      return {
        status: apiResponse.status ?? true,
        data: apiResponse.data,
        message: apiResponse.message || "",
        submissionId: apiResponse.submissionId || submissionId,
      };
    }

    console.error(
      "[getMinistrySubmissionDetailsConsolidated] Unexpected response structure:",
      apiResponse
    );
    return {
      status: false,
      data: [],
      message: "Unexpected response structure",
    };
  } catch (error) {
    console.error(
      "[getMinistrySubmissionDetailsConsolidated] API Error:",
      error
    );
    throw error;
  }
}

/**
 * Retrieve submission details with indicators for review (read-only mode)
 * @param submissionId - The ID of the submission (preferred)
 * @param userId - Optional: The ID of the user (fallback if submissionId not available)
 * @returns Promise with submission form structure
 */
export async function getMinistrySubmissionDetailsForReview(
  submissionId?: string,
  userId?: string
): Promise<{
  status: boolean;
  data: any[];
  message: string;
  submissionId?: string;
}> {
  try {
    // If submissionId is provided, use it directly
    let targetSubmissionId = submissionId;

    // If submissionId is not provided but userId is, fetch submissionId first
    if (!targetSubmissionId && userId) {
      console.log(
        "[getMinistrySubmissionDetailsForReview] No submissionId provided, fetching from userId:",
        userId
      );
      targetSubmissionId = await getMinistrySubmissionId(userId);

      // If we still don't have submissionId, we cannot proceed
      // The backend endpoint requires submissionId, not userId
      if (!targetSubmissionId) {
        const errorMsg =
          "Could not retrieve submissionId from userId. The submission may not exist or the backend response format is unexpected.";
        console.error("[getMinistrySubmissionDetailsForReview] ❌", errorMsg);
        throw new Error(errorMsg);
      }
    }

    if (!targetSubmissionId) {
      throw new Error("Either submissionId or userId must be provided");
    }

    const url = getApiUrl(
      `/ministry/form/retrieve/submission-with-data/${targetSubmissionId}?forReview=true`
    );
    const response = await apiService.get(url, { withCredentials: true });

    console.log("[getMinistrySubmissionDetailsForReview] Raw axios response:", {
      hasData: !!response.data,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      dataKeys:
        response.data &&
        typeof response.data === "object" &&
        !Array.isArray(response.data)
          ? Object.keys(response.data)
          : "N/A",
    });

    let apiResponse = response.data;

    // Handle nested response structure
    if (
      apiResponse?.data &&
      typeof apiResponse.data === "object" &&
      "status" in apiResponse &&
      Array.isArray(apiResponse.data)
    ) {
      console.log(
        "[getMinistrySubmissionDetailsForReview] Found nested structure with status"
      );
    } else if (Array.isArray(apiResponse)) {
      if (response?.data?.data && Array.isArray(response.data.data)) {
        apiResponse = response.data;
        console.log(
          "[getMinistrySubmissionDetailsForReview] Found nested data structure"
        );
      }
    }

    // If the response has the expected structure
    if (
      apiResponse &&
      typeof apiResponse === "object" &&
      !Array.isArray(apiResponse) &&
      "status" in apiResponse
    ) {
      console.log(
        "[getMinistrySubmissionDetailsForReview] API Response structure:",
        {
          hasStatus: "status" in apiResponse,
          hasData: "data" in apiResponse,
          hasSubmissionId: "submissionId" in apiResponse,
          submissionId: apiResponse.submissionId,
        }
      );

      return {
        status: apiResponse.status ?? true,
        data: apiResponse.data || [],
        message: apiResponse.message || "",
        submissionId: apiResponse.submissionId,
      };
    }

    // Fallback: if response.data is directly the array
    if (Array.isArray(apiResponse)) {
      console.warn(
        "[getMinistrySubmissionDetailsForReview] Response is directly an array"
      );
      return {
        status: true,
        data: apiResponse,
        message: "Retrieved indicators for review",
      };
    }

    // Fallback: if response.data.data exists
    if (apiResponse?.data && Array.isArray(apiResponse.data)) {
      return {
        status: apiResponse.status ?? true,
        data: apiResponse.data,
        message: apiResponse.message || "",
        submissionId: apiResponse.submissionId,
      };
    }

    console.error(
      "[getMinistrySubmissionDetailsForReview] Unexpected response structure:",
      apiResponse
    );
    return {
      status: false,
      data: [],
      message: "Unexpected response structure",
    };
  } catch (error) {
    console.error("[getMinistrySubmissionDetailsForReview] API Error:", error);
    throw error;
  }
}

/**
 * Upload files in section data to S3 and replace File objects with filePath
 * Similar to state submission flow
 */
async function uploadFilesInSectionData(
  sectionData: Record<string, any>,
  submissionId: string
): Promise<Record<string, any>> {
  if (!submissionId) {
    console.warn("⚠️ No submissionId provided, skipping file upload");
    return sectionData;
  }

  // Check if sectionData has any File objects
  const hasFiles = (obj: any, depth = 0): boolean => {
    if (depth > 20) return false;
    if (!obj || typeof obj !== "object") return false;

    if (obj instanceof File) {
      return true;
    }

    // Check FileUpload objects: { file: File, fileName: string, ... }
    if (obj.file instanceof File && !obj.filePath) {
      return true;
    }

    if (Array.isArray(obj)) {
      return obj.some((item) => hasFiles(item, depth + 1));
    }

    for (const value of Object.values(obj)) {
      if (hasFiles(value, depth + 1)) {
        return true;
      }
    }

    return false;
  };

  if (!hasFiles(sectionData)) {
    console.log("ℹ️ No File objects found in sectionData, skipping upload");
    return sectionData;
  }

  console.log("📤 Uploading files to S3 before submitting indicator...");

  // Recursively upload files and replace with filePath
  const uploadFilesAndReplace = async (
    data: any,
    path: string[] = []
  ): Promise<any> => {
    if (!data || typeof data !== "object") return data;

    // Handle FileUpload objects with File instances (but no filePath yet)
    if (data.file instanceof File && !data.filePath) {
      try {
        const filePathStr =
          path.length > 0 ? ` at path: ${path.join(".")}` : "";
        console.log(
          `📤 Uploading file: ${data.fileName || data.file.name}${filePathStr}`
        );

        const uploadResponse = await apiService.uploadFile(
          submissionId,
          data.file
        );
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
            data.fileName,
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

    // Handle arrays (e.g., subsection arrays with file uploads)
    if (Array.isArray(data)) {
      const uploadedArray = await Promise.all(
        data.map((item, index) =>
          uploadFilesAndReplace(item, [...path, index.toString()])
        )
      );
      return uploadedArray;
    }

    // Handle nested objects
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = await uploadFilesAndReplace(value, [...path, key]);
    }
    return result;
  };

  try {
    const uploadedData = await uploadFilesAndReplace(sectionData);
    console.log("✅ All files uploaded to S3 successfully");
    return uploadedData;
  } catch (error: any) {
    console.error("❌ Failed to upload files to S3:", error);
    throw new Error(`File upload failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Transform form data to API format for ministry submission
 * @param sectionData - The form data for the specific section/indicator
 * @param currentSection - The section object from assignedIndicators containing inputs and subsections
 */
function transformFormDataToApiFormat(
  sectionData: Record<string, any>,
  currentSection: any
): {
  inputs: Array<{ inputId: string; value: any }>;
  subsection: Array<Array<{ inputId: string; value: any }>>;
} {
  const inputs: Array<{ inputId: string; value: any }> = [];
  const subsection: Array<Array<{ inputId: string; value: any }>> = [];

  // Helper function to normalize value based on field dataType
  const normalizeValue = (value: any, dataType?: string): any => {
    if (value === null || value === undefined || value === "") {
      return value;
    }

    // If dataType is 'number', ensure it's a number (not a string)
    if (dataType === "number") {
      const numValue =
        typeof value === "string" ? parseFloat(value) : Number(value);
      return isNaN(numValue) ? value : numValue;
    }

    // For string fields, ensure it's a string
    if (dataType === "string") {
      return String(value);
    }

    // For other types, return as-is
    return value;
  };

  // Helper function to check if a field is "No document available"
  const isNoDocumentAvailableField = (field: any): boolean => {
    const label = field.label || "";
    return (
      label.toLowerCase().includes("no document available") ||
      label.toLowerCase() === "no document available"
    );
  };

  // Helper function to check if "No document available" value is set
  const isNoDocumentAvailableValue = (value: any): boolean => {
    if (!value) return false;
    const valueStr = String(value).toLowerCase().trim();
    return valueStr === "no document available" || valueStr.includes("no document available");
  };

  // Helper function to check if a value is a file (FileUpload object)
  const isFileValue = (value: any): boolean => {
    if (!value) return false;
    // Check if it's a FileUpload object (has file, fileName, or filePath properties)
    return (
      typeof value === "object" &&
      (value.file !== undefined ||
        value.fileName !== undefined ||
        value.filePath !== undefined)
    );
  };

  // Helper function to check if a field is a file field (by type, label, or other indicators)
  const isFileField = (field: any, value?: any): boolean => {
    // Check by type first
    if (field.type === "file") {
      return true;
    }
    
    // Check by value (if provided)
    if (value !== undefined && isFileValue(value)) {
      return true;
    }
    
    // Check by label keywords (fallback for when type is not set)
    const label = (field.label || "").toLowerCase();
    const fileKeywords = [
      "upload",
      "file",
      "evidence",
      "document",
      "attachment",
      "pdf",
      "image",
      "photo",
    ];
    
    // Check if label contains file-related keywords
    // But exclude "No document available" field
    if (!isNoDocumentAvailableField(field)) {
      const hasFileKeyword = fileKeywords.some((keyword) =>
        label.includes(keyword)
      );
      if (hasFileKeyword) {
        return true;
      }
    }
    
    return false;
  };

  // Check if there are any file fields with actual files
  // Also track which file fields have uploads to find associated "No document available" fields
  let hasFileUpload = false;
  const fileFieldIds = new Set<string>();
  
  console.log(
    `[transformFormDataToApiFormat] Checking for file uploads. Section inputs:`,
    currentSection.inputs?.map((f: any) => ({ id: f.id, type: f.type, label: f.label }))
  );
  
  if (currentSection.inputs && Array.isArray(currentSection.inputs)) {
    currentSection.inputs.forEach((inputField: any) => {
      const fieldId = inputField.id;
      const fieldValue = sectionData[fieldId];
      
      console.log(
        `[transformFormDataToApiFormat] Checking field: ${fieldId}, type: ${inputField.type}, label: ${inputField.label}, value:`,
        fieldValue
      );
      
      // Check if it's a file field (by type, value, or label)
      if (isFileField(inputField, fieldValue)) {
        if (isFileValue(fieldValue)) {
          hasFileUpload = true;
          fileFieldIds.add(fieldId);
          console.log(
            `[transformFormDataToApiFormat] ✅ Found file upload in field: ${fieldId} (type: ${inputField.type}, label: ${inputField.label})`,
            fieldValue
          );
        } else {
          console.log(
            `[transformFormDataToApiFormat] Field ${fieldId} is a file field but value is not a file:`,
            fieldValue
          );
        }
      }
    });
  }
  
  console.log(
    `[transformFormDataToApiFormat] File upload check complete. hasFileUpload: ${hasFileUpload}, fileFieldIds:`,
    Array.from(fileFieldIds)
  );

  // Also check subsections for file uploads
  if (currentSection.subsection && Array.isArray(currentSection.subsection)) {
    currentSection.subsection.forEach((subsectionObj: any) => {
      const subsectionName = Object.keys(subsectionObj)[0];
      const subsectionData = subsectionObj[subsectionName];
      const subsectionItems = sectionData[subsectionName];

      if (Array.isArray(subsectionItems) && subsectionItems.length > 0) {
        subsectionItems.forEach((item: any) => {
          if (subsectionData.inputs && Array.isArray(subsectionData.inputs)) {
            subsectionData.inputs.forEach((inputField: any) => {
              if (inputField.type === "file") {
                const fieldId = inputField.id;
                const fileValue = item[fieldId];
                if (isFileValue(fileValue)) {
                  hasFileUpload = true;
                  fileFieldIds.add(fieldId);
                }
              }
            });
          }
        });
      }
    });
  }

  // Process direct inputs
  // Track "No document available" fields that need to be set to null (when file is uploaded)
  // Track file fields that need to be set to null (when "No document available" is checked)
  const noDocAvailableFieldsToNull = new Set<string>();
  const fileFieldsToNull = new Set<string>();
  
  // First pass: Check if "No document available" is checked, then mark file fields to null
  if (currentSection.inputs && Array.isArray(currentSection.inputs)) {
    currentSection.inputs.forEach((inputField: any) => {
      const fieldId = inputField.id;
      const rawValue = sectionData[fieldId];
      
      if (isNoDocumentAvailableField(inputField) && isNoDocumentAvailableValue(rawValue)) {
        // "No document available" is checked - find all file fields and mark them to be set to null
        console.log(
          `[transformFormDataToApiFormat] "No document available" is checked (${fieldId}), finding file fields to null`
        );
        
        currentSection.inputs.forEach((otherField: any) => {
          if (otherField.type === "file" || isFileValue(sectionData[otherField.id])) {
            fileFieldsToNull.add(otherField.id);
            console.log(
              `[transformFormDataToApiFormat] Marking file field (${otherField.id}) to be set to null because "No document available" is checked`
            );
          }
        });
      }
    });
  }
  
  console.log(
    `[transformFormDataToApiFormat] Processing inputs. hasFileUpload: ${hasFileUpload}, total inputs: ${currentSection.inputs?.length || 0}, fileFieldsToNull:`,
    Array.from(fileFieldsToNull)
  );
  
  if (currentSection.inputs && Array.isArray(currentSection.inputs)) {
    currentSection.inputs.forEach((inputField: any) => {
      const fieldId = inputField.id;
      const rawValue = sectionData[fieldId];
      const isNoDocField = isNoDocumentAvailableField(inputField);
      const isFileField = inputField.type === "file" || isFileValue(rawValue);

      console.log(
        `[transformFormDataToApiFormat] Processing field: ${fieldId}, label: "${inputField.label}", isNoDocField: ${isNoDocField}, isFileField: ${isFileField}, hasFileUpload: ${hasFileUpload}, rawValue:`,
        rawValue
      );

      // If a file is uploaded and this is the "No document available" field, set it to null
      if (hasFileUpload && isNoDocField) {
        noDocAvailableFieldsToNull.add(fieldId);
        // Explicitly set "No document available" to null when file is uploaded
        // Always include it in the payload, even if it's not in sectionData
        console.log(
          `[transformFormDataToApiFormat] ✅ Setting "No document available" field (${fieldId}) to null because file is uploaded`
        );
        inputs.push({
          inputId: fieldId,
          value: null,
        });
        return; // Skip the normal processing for this field
      }

      // If "No document available" is checked and this is a file field, set it to null
      if (isFileField && fileFieldsToNull.has(fieldId)) {
        console.log(
          `[transformFormDataToApiFormat] ✅ Setting file field (${fieldId}) to null because "No document available" is checked`
        );
        inputs.push({
          inputId: fieldId,
          value: null,
        });
        return; // Skip the normal processing for this field
      }

      // Only include if value exists (not null, undefined, or empty string)
      // But skip if this is a "No document available" field that should be null
      // Or if this is a file field that should be null
      if (!noDocAvailableFieldsToNull.has(fieldId) && !fileFieldsToNull.has(fieldId)) {
        if (rawValue !== null && rawValue !== undefined && rawValue !== "") {
          // Normalize value based on field dataType
          const normalizedValue = normalizeValue(rawValue, inputField.dataType);

          inputs.push({
            inputId: fieldId,
            value: normalizedValue,
          });
        }
      }
    });
  }

  // Process subsections
  if (currentSection.subsection && Array.isArray(currentSection.subsection)) {
    currentSection.subsection.forEach((subsectionObj: any) => {
      const subsectionName = Object.keys(subsectionObj)[0];
      const subsectionData = subsectionObj[subsectionName];

      // Get subsection items from formData (array of objects)
      const subsectionItems = sectionData[subsectionName];

      console.log(
        `[transformFormDataToApiFormat] Processing subsection: ${subsectionName}, items: ${subsectionItems?.length || 0}`
      );

      if (Array.isArray(subsectionItems) && subsectionItems.length > 0) {
        subsectionItems.forEach((item: any, itemIndex: number) => {
          const subsectionInputs: Array<{ inputId: string; value: any }> = [];

          // Check if this subsection item (row) has any file uploads
          // Check both by type and by value to catch all file uploads
          let subsectionHasFile = false;
          const subsectionNoDocFieldsToNull = new Set<string>();
          const subsectionFileFieldsToNull = new Set<string>();
          
          console.log(
            `[transformFormDataToApiFormat] Processing subsection item ${itemIndex} of ${subsectionName}:`,
            item
          );
          
          if (subsectionData.inputs && Array.isArray(subsectionData.inputs)) {
            // First pass: Check for file uploads and "No document available" values
            subsectionData.inputs.forEach((inputField: any) => {
              const fieldId = inputField.id;
              const fieldValue = item[fieldId];
              
              // Check if field is explicitly a file type OR if the value is a file object
              if (inputField.type === "file" || isFileValue(fieldValue)) {
                if (isFileValue(fieldValue)) {
                  subsectionHasFile = true;
                  console.log(
                    `[transformFormDataToApiFormat] ✅ Found file upload in subsection item ${itemIndex}, field: ${fieldId} (type: ${inputField.type})`,
                    fieldValue
                  );
                }
              }
              
              // Check if "No document available" is checked in this row
              if (isNoDocumentAvailableField(inputField) && isNoDocumentAvailableValue(fieldValue)) {
                console.log(
                  `[transformFormDataToApiFormat] 🔍 "No document available" is checked in subsection item ${itemIndex} (field: ${fieldId}), scanning all fields in this item to find file fields`
                );
                console.log(
                  `[transformFormDataToApiFormat] All fields in subsection definition:`,
                  subsectionData.inputs?.map((f: any) => ({ id: f.id, type: f.type, label: f.label }))
                );
                
                // Find all file fields in this subsection row and mark them to be set to null
                // Check by field type first (primary check), then by value to catch all file fields
                subsectionData.inputs.forEach((otherField: any) => {
                  const otherFieldId = otherField.id;
                  const otherFieldValue = item[otherFieldId];
                  
                  // Use the isFileField helper which checks type, value, and label
                  const isFile = isFileField(otherField, otherFieldValue);
                  const isNoDocField = isNoDocumentAvailableField(otherField);
                  
                  console.log(
                    `[transformFormDataToApiFormat] Checking field ${otherFieldId} (type: ${otherField.type}, label: ${otherField.label}): isFile=${isFile}, isNoDocField=${isNoDocField}, value:`,
                    otherFieldValue
                  );
                  
                  // Don't mark the "No document available" field itself
                  if (!isNoDocField) {
                    if (isFile) {
                      subsectionFileFieldsToNull.add(otherFieldId);
                      console.log(
                        `[transformFormDataToApiFormat] ✅ Marking file field (${otherFieldId}, type: ${otherField.type}, label: ${otherField.label}) to be set to null in subsection item ${itemIndex} because "No document available" is checked`
                      );
                    } else {
                      console.log(
                        `[transformFormDataToApiFormat] ⏭️ Skipping field ${otherFieldId} - not a file field (type: ${otherField.type}, label: ${otherField.label})`
                      );
                    }
                  } else {
                    console.log(
                      `[transformFormDataToApiFormat] ⏭️ Skipping field ${otherFieldId} - this is the "No document available" field itself`
                    );
                  }
                });
                
                console.log(
                  `[transformFormDataToApiFormat] After scanning, fileFieldsToNull for item ${itemIndex}:`,
                  Array.from(subsectionFileFieldsToNull)
                );
              }
            });
          }

          console.log(
            `[transformFormDataToApiFormat] Subsection item ${itemIndex} hasFile: ${subsectionHasFile}, fileFieldsToNull:`,
            Array.from(subsectionFileFieldsToNull)
          );

          // Second pass: Process all fields
          if (subsectionData.inputs && Array.isArray(subsectionData.inputs)) {
            subsectionData.inputs.forEach((inputField: any) => {
              const fieldId = inputField.id;
              const rawValue = item[fieldId];
              const isNoDocField = isNoDocumentAvailableField(inputField);
              // Check if it's a file field (by type, value, or label)
              const isFile = isFileField(inputField, rawValue);

              console.log(
                `[transformFormDataToApiFormat] Processing subsection field ${itemIndex}.${fieldId}, label: "${inputField.label}", type: ${inputField.type}, isNoDocField: ${isNoDocField}, isFile: ${isFile}, hasFile: ${subsectionHasFile}, shouldNull: ${subsectionFileFieldsToNull.has(fieldId)}, rawValue:`,
                rawValue
              );

              // If a file is uploaded in this subsection row and this is the "No document available" field, set it to null
              if (subsectionHasFile && isNoDocField) {
                subsectionNoDocFieldsToNull.add(fieldId);
                // Explicitly set "No document available" to null when file is uploaded in this row
                // Always include it in the payload, even if it's not in the item
                console.log(
                  `[transformFormDataToApiFormat] ✅ Setting "No document available" field (${fieldId}) to null in subsection item ${itemIndex} because file is uploaded`
                );
                subsectionInputs.push({
                  inputId: fieldId,
                  value: null,
                });
                return; // Skip the normal processing for this field
              }

              // If "No document available" is checked in this row and this is a file field, set it to null
              // Check both by field type and by whether it's marked to be null
              if (subsectionFileFieldsToNull.has(fieldId)) {
                console.log(
                  `[transformFormDataToApiFormat] ✅ Setting file field (${fieldId}, type: ${inputField.type}, label: ${inputField.label}) to null in subsection item ${itemIndex} because "No document available" is checked`
                );
                subsectionInputs.push({
                  inputId: fieldId,
                  value: null,
                });
                return; // Skip the normal processing for this field
              }

              // Only include if value exists
              // But skip if this is a "No document available" field that should be null
              // Or if this is a file field that should be null
              // Note: File fields that should be null are already handled above and return early
              if (!subsectionNoDocFieldsToNull.has(fieldId) && !subsectionFileFieldsToNull.has(fieldId)) {
                if (
                  rawValue !== null &&
                  rawValue !== undefined &&
                  rawValue !== ""
                ) {
                  // Normalize value based on field dataType
                  const normalizedValue = normalizeValue(
                    rawValue,
                    inputField.dataType
                  );

                  subsectionInputs.push({
                    inputId: fieldId,
                    value: normalizedValue,
                  });
                }
              } else if (subsectionFileFieldsToNull.has(fieldId)) {
                // This should not happen as we return early above, but just in case
                console.warn(
                  `[transformFormDataToApiFormat] File field ${fieldId} in subsection item ${itemIndex} should be null but wasn't handled above`
                );
              }
            });
          }

          // Only add subsection entry if it has inputs
          if (subsectionInputs.length > 0) {
            console.log(
              `[transformFormDataToApiFormat] Adding subsection item ${itemIndex} with ${subsectionInputs.length} inputs`
            );
            subsection.push(subsectionInputs);
          } else {
            console.log(
              `[transformFormDataToApiFormat] Skipping subsection item ${itemIndex} - no inputs to add`
            );
          }
        });
      }
    });
  }

  return { inputs, subsection };
}

/**
 * Submit an indicator to Ministry Approver
 * @param submissionIndicatorId - The submission indicator ID
 * @param sectionData - The form data for the specific section/indicator
 * @param currentSection - The section object from assignedIndicators containing inputs and subsections
 * @param submissionId - The ministry submission ID (for file uploads)
 * @param status - The status to submit with (default: "SUBMITTED_TO_MINISTRY", can be "DRAFT" for save as draft)
 */
export async function submitIndicatorToMinistryApprover(
  submissionIndicatorId: string,
  sectionData: Record<string, any>,
  currentSection: any,
  submissionId?: string, // Add submissionId parameter
  status: string = "SUBMITTED_TO_MINISTRY" // Add status parameter with default
): Promise<any> {
  try {
    // Step 1: Upload files to S3 if any exist
    let processedSectionData = sectionData;
    if (submissionId && submissionId !== "exists") {
      try {
        processedSectionData = await uploadFilesInSectionData(
          sectionData,
          submissionId
        );
      } catch (error: any) {
        console.error("❌ Error uploading files:", error);
        throw new Error(
          `File upload failed: ${error.message || "Unknown error"}`
        );
      }
    } else if (submissionId === "exists") {
      // CRITICAL: Don't allow file uploads with "exists" placeholder
      console.error('❌ Invalid submissionId: "exists" - cannot upload files');
      throw new Error(
        "Invalid submission ID. Please refresh the page to get the correct submission ID."
      );
    } else {
      console.warn("⚠️ No submissionId provided, files will not be uploaded");
      throw new Error(
        "Submission ID is required for file uploads. Please refresh the page."
      );
    }

    const url = getApiUrl(`/ministry/form/submission/data`);

    // Step 2: Transform form data to API format (after files are uploaded)
    const transformedData = transformFormDataToApiFormat(
      processedSectionData,
      currentSection
    );

    const payload = {
      submissionIndicatorId,
      data: transformedData,
      status: status, // Include status in payload
    };

    console.log("📤 Submitting indicator to Ministry Approver:", {
      submissionIndicatorId,
      status,
      payload,
    });

    const response = await apiService.post(url, payload, {
      withCredentials: true,
    });
    return response.data?.data || response.data || response;
  } catch (error) {
    console.error("❌ Error in submitIndicatorToMinistryApprover:", error);
    throw error;
  }
}

/**
 * Update ministry form data (PUT request)
 * Updates existing submission data
 * @param submissionIndicatorId - The submission indicator ID
 * @param sectionData - The form data for the specific section/indicator
 * @param currentSection - The section object from assignedIndicators containing inputs and subsections
 * @param submissionId - The ministry submission ID (for file uploads)
 * @param status - The status to update with (default: "DRAFT")
 */
export async function updateMinistryIndicatorData(
  submissionIndicatorId: string,
  sectionData: Record<string, any>,
  currentSection: any,
  submissionId?: string,
  status: string = "SUBMITTED_TO_MINISTRY"
): Promise<any> {
  try {
    // Step 1: Upload files to S3 if any exist
    let processedSectionData = sectionData;
    if (submissionId && submissionId !== "exists") {
      try {
        processedSectionData = await uploadFilesInSectionData(
          sectionData,
          submissionId
        );
      } catch (error: any) {
        console.error("❌ Error uploading files:", error);
        throw new Error(
          `File upload failed: ${error.message || "Unknown error"}`
        );
      }
    } else if (submissionId === "exists") {
      console.error('❌ Invalid submissionId: "exists" - cannot upload files');
      throw new Error(
        "Invalid submission ID. Please refresh the page to get the correct submission ID."
      );
    } else {
      console.warn("⚠️ No submissionId provided, files will not be uploaded");
      throw new Error(
        "Submission ID is required for file uploads. Please refresh the page."
      );
    }

    const url = getApiUrl(`/ministry/form/submission/data`);

    // Step 2: Transform form data to API format (after files are uploaded)
    const transformedData = transformFormDataToApiFormat(
      processedSectionData,
      currentSection
    );

    const payload = {
      submissionIndicatorId,
      data: transformedData,
      status: status, // Include status in payload
    };

    console.log("📤 Updating ministry indicator data:", {
      submissionIndicatorId,
      status,
      payload,
    });

    // Use PUT request for update
    const response = await apiService.put(url, payload, {
      withCredentials: true,
    });
    return response.data?.data || response.data || response;
  } catch (error) {
    console.error("❌ Error in updateMinistryIndicatorData:", error);
    throw error;
  }
}

/**
 * Update submission indicator status
 * @param submissionIndicatorId - The submission indicator ID
 * @param status - The status to update (e.g., "ACCEPTED_BY_MINISTRY", "ACCEPTED_BY_MOSPI", "RETURNED_FROM_MINISTRY", "RETURNED_FROM_MOSPI")
 */
export async function updateSubmissionIndicatorStatus(
  submissionIndicatorId: string,
  status: string
): Promise<{
  status: boolean;
  message: string;
  data?: any;
}> {
  try {
    const url = getApiUrl(`/ministry/form/submission/indicator/status`);

    const payload = {
      submissionIndicatorId,
      status,
    };

    console.log("📤 Updating submission indicator status:", {
      submissionIndicatorId,
      status,
      payload,
    });

    const response = await apiService.put(url, payload, {
      withCredentials: true,
    });

    return response.data?.data || response.data || response;
  } catch (error) {
    console.error("❌ Error in updateSubmissionIndicatorStatus:", error);
    throw error;
  }
}

/**
 * Get all ministry submissions for review
 * Returns the latest submission for each ministry approver
 */
export async function getAllMinistrySubmissions(): Promise<{
  status: boolean;
  data: any[];
  message: string;
}> {
  try {
    const url = getApiUrl(`/ministry/form/retrieve/all-submissions`);
    console.log("[getAllMinistrySubmissions] Calling API:", url);
    const response = await apiService.get(url, { withCredentials: true });
    console.log("[getAllMinistrySubmissions] Raw response:", response);
    console.log("[getAllMinistrySubmissions] Response type:", typeof response);
    console.log("[getAllMinistrySubmissions] Response.data:", response.data);
    console.log(
      "[getAllMinistrySubmissions] Response.data type:",
      typeof response.data
    );

    // Handle different response structures from axios
    if (response && typeof response === "object") {
      // If response has data property, use it
      if (response.data !== undefined) {
        return response.data;
      }
      // Otherwise return the response itself
      return response;
    }

    return response;
  } catch (error: any) {
    console.error("[getAllMinistrySubmissions] API Error:", error);
    console.error("[getAllMinistrySubmissions] Error details:", {
      message: error.message,
      response: error.response,
      data: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

/**
 * Get submissions for the current logged-in user
 * Returns all submissions where the user has submitted indicators
 */
export async function getSubmissionsForCurrentUser(): Promise<{
  status: boolean;
  data: any[];
  message: string;
}> {
  try {
    const url = getApiUrl(`/ministry/form/retrieve/submissions/current-user`);
    console.log("[getSubmissionsForCurrentUser] Calling API:", url);
    const response = await apiService.get(url, { withCredentials: true });
    console.log(
      "[getSubmissionsForCurrentUser] Response from apiService.get:",
      response
    );
    console.log(
      "[getSubmissionsForCurrentUser] Response type:",
      typeof response
    );
    console.log(
      "[getSubmissionsForCurrentUser] Is array?",
      Array.isArray(response)
    );

    // The axios interceptor already extracts response.data, so 'response' is already the API response object
    // The API returns: {status: true, data: Array(1), message: '...'}
    if (response && typeof response === "object" && !Array.isArray(response)) {
      console.log("[getSubmissionsForCurrentUser] API Response structure:", {
        hasStatus: !!response.status,
        hasData: !!response.data,
        dataIsArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data)
          ? response.data.length
          : "not array",
        message: response.message,
        responseKeys: Object.keys(response),
      });

      // Return the API response object which has {status, data, message}
      return response;
    }

    // If response is directly an array (unexpected but handle it)
    if (Array.isArray(response)) {
      console.warn(
        "[getSubmissionsForCurrentUser] Response is directly an array, wrapping it"
      );
      return {
        status: true,
        data: response,
        message: "Retrieved submissions successfully",
      };
    }

    // Fallback: return response if structure is different
    console.warn(
      "[getSubmissionsForCurrentUser] Unexpected response structure, returning as-is"
    );
    return response;
  } catch (error: any) {
    console.error("[getSubmissionsForCurrentUser] API Error:", error);
    console.error("[getSubmissionsForCurrentUser] Error details:", {
      message: error.message,
      response: error.response,
      data: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

/**
 * Get ministry score for a specific submission
 * @param submissionId - The ministry submission ID
 * @returns Promise with the ministry score data
 */
export async function getMinistryScore(submissionId: string): Promise<any> {
    try {
        const url = getApiUrl(`/scoring/ministry/${submissionId}`);
        const response = await apiService.get(url, { withCredentials: true });
        
        console.log(
            "🔍 Ministry Service - Get Ministry Score Response Status:",
            response.status
        );
        console.log(
            "🔍 Ministry Service - Get Ministry Score Response Data:",
            response.data
        );

        // Handle response.data.data pattern
        const ministryScoreData =
            response.data?.data !== undefined ? response.data.data : response.data;
        console.log(
            "🔍 Ministry Service - Processed Get Ministry Score Data:",
            ministryScoreData
        );

        return ministryScoreData;
    } catch (error: any) {
        // Handle 304 as success
        if (error.response?.status === 304) {
            console.log("📋 Get Ministry Score 304 - Using cached data");
            const cachedData = error.response?.data || {};
            return cachedData?.data !== undefined ? cachedData.data : cachedData;
        }
        console.warn(
            "⚠️ Backend ministry score failed, using dummy data:",
            error.message
        );
        // Return dummy data as fallback
        return {
            id: "uuid",
            submissionId: submissionId,
            ministryId: "ministry-id",
            ministryName: "Ministry Name",
            totalScore: 742,
            scoreBreakdown: {
                totalScore: 742,
                maxPossibleScore: 1000,
                percentage: 74.2,
                calculations: [],
                methodology: "NIRI Ministry Scoring Methodology v1.0",
            },
            calculationMethodology: "NIRI Ministry Scoring Methodology v1.0",
            approvedBy: "uuid",
            createdAt: "2024-01-01T00:00:00.000Z",
        };
    }
}

/**
 * Get ministry dashboard indicators for a specific user
 * @param userId - The user ID (ministry approver ID)
 * @returns Promise with the indicator dashboard data
 */
export async function getMinistryDashboardIndicators(userId: string): Promise<{
    status: boolean;
    data: {
        accepted: Array<{ code: string; name: string; status: string }>;
        underReview: Array<{ code: string; name: string; status: string }>;
        pending: Array<{ code: string; name: string; status: string | null }>;
    };
    message: string;
}> {
    try {
        const url = getApiUrl(`/ministry/dashboard/indicators/${userId}`);
        console.log("[getMinistryDashboardIndicators] Calling API:", url);
        const response = await apiService.get(url, { withCredentials: true });
        console.log("[getMinistryDashboardIndicators] Response:", response.data);
        
        // Handle response.data.data pattern
        const dashboardData = response.data?.data !== undefined ? response.data.data : response.data;
        
        return {
            status: response.data?.status ?? true,
            data: dashboardData || {
                accepted: [],
                underReview: [],
                pending: []
            },
            message: response.data?.message || "Ministry user indicators dashboard retrieved successfully"
        };
    } catch (error: any) {
        console.error("[getMinistryDashboardIndicators] API Error:", error);
        console.error("[getMinistryDashboardIndicators] Error details:", {
            message: error.message,
            response: error.response,
            data: error.response?.data,
            status: error.response?.status,
        });
        throw error;
    }
}

/**
 * Calculate score for a ministry submission
 * @param submissionId - The ministry submission ID
 * @returns Promise with the calculated ministry score data
 */
export async function calculateMinistryScore(submissionId: string): Promise<any> {
    try {
        const url = getApiUrl(`/scoring/ministry/calculate/${submissionId}`);
        const response = await apiService.post(url, {}, { withCredentials: true });
        return response.data?.data !== undefined ? response.data.data : response.data;
    } catch (error: any) {
        if (error.response?.status === 304) {
            const cached = error.response?.data || {};
            return cached?.data !== undefined ? cached.data : cached;
        }
        throw error;
    }
}

/**
 * Get indicator score for a specific ministry indicator
 * @param submissionId - The ministry submission ID
 * @param indicatorCode - The indicator code (e.g., "1.1", "2.3")
 * @returns Promise with the indicator score data
 */
export async function getMinistryIndicatorScore(
    submissionId: string,
    indicatorCode: string
): Promise<any> {
    try {
        const url = getApiUrl(`/scoring/ministry/indicator-scores/${submissionId}/${indicatorCode}`);
        const response = await apiService.get(url, { withCredentials: true });
        const scoreData = response.data?.data !== undefined ? response.data.data : response.data;
        
        // Log for debugging
        console.log(`[Ministry Scoring] Fetched score for ${indicatorCode}:`, scoreData);
        
        // Ensure score values are numbers
        if (scoreData) {
            if (typeof scoreData.score === 'string') {
                scoreData.score = parseFloat(scoreData.score);
            }
            if (typeof scoreData.maxScore === 'string') {
                scoreData.maxScore = parseFloat(scoreData.maxScore);
            }
        }
        
        return scoreData;
    } catch (error: any) {
        console.error(`[Ministry Scoring] Error fetching score for ${indicatorCode}:`, error);
        if (error.response?.status === 304) {
            const cached = error.response?.data || {};
            return cached?.data !== undefined ? cached.data : cached;
        }
        // Return null instead of throwing to allow UI to show 0.00
        if (error.response?.status === 404) {
            console.warn(`[Ministry Scoring] No score found for indicator ${indicatorCode}`);
            return null;
        }
        throw error;
    }
}

/**
 * Get all indicator scores for a ministry submission
 * @param submissionId - The ministry submission ID
 * @returns Promise with array of indicator scores
 */
export async function getMinistryIndicatorScores(submissionId: string): Promise<any> {
    try {
        const url = getApiUrl(`/scoring/ministry/indicator-scores/${submissionId}`);
        const response = await apiService.get(url, { withCredentials: true });
        return response.data?.data !== undefined ? response.data.data : response.data;
    } catch (error: any) {
        if (error.response?.status === 304) {
            const cached = error.response?.data || {};
            return cached?.data !== undefined ? cached.data : cached;
        }
        throw error;
    }
}

/**
 * Get latest manual score update for a ministry indicator
 * @param submissionId - The ministry submission ID
 * @param indicatorCode - The indicator code (e.g., "1.1", "2.3")
 * @returns Promise with the manual score update data or null if not found
 */
export async function getLatestMinistryManualScoreUpdate(
    submissionId: string,
    indicatorCode: string
): Promise<any> {
    try {
        const url = getApiUrl(`/scoring/ministry/manual-update/${submissionId}/${indicatorCode}`);
        const response = await apiService.get(url, { withCredentials: true });
        return response.data?.data !== undefined ? response.data.data : response.data;
    } catch (error: any) {
        if (error.response?.status === 304) {
            const cached = error.response?.data || {};
            return cached?.data !== undefined ? cached.data : cached;
        }
        // Return null if no manual update exists (404 is expected)
        if (error.response?.status === 404) {
            return null;
        }
        return null;
    }
}

/**
 * Get manual score update history for a ministry indicator
 * @param submissionId - The ministry submission ID
 * @param indicatorCode - The indicator code (e.g., "1.1", "2.3")
 * @returns Promise with array of manual score update history
 */
export async function getMinistryManualScoreUpdateHistory(
    submissionId: string,
    indicatorCode: string
): Promise<any> {
    try {
        const url = getApiUrl(`/scoring/ministry/manual-update-history/${submissionId}/${indicatorCode}`);
        const response = await apiService.get(url, { withCredentials: true });
        return response.data?.data !== undefined ? response.data.data : response.data;
    } catch (error: any) {
        if (error.response?.status === 304) {
            const cached = error.response?.data || {};
            return cached?.data !== undefined ? cached.data : cached;
        }
        throw error;
    }
}

/**
 * Save manual score update for a ministry indicator
 * @param submissionId - The ministry submission ID
 * @param indicatorCode - The indicator code (e.g., "1.1", "2.3")
 * @param category - The category (e.g., "infraFinancing", "infraDevelopment")
 * @param updatedScore - The manually updated score
 * @param maxScore - The maximum score for this indicator
 * @param updateReason - The reason for updating the score
 * @returns Promise with the saved manual score update data
 */
export async function saveMinistryManualScoreUpdate(
    submissionId: string,
    indicatorCode: string,
    category: string,
    updatedScore: number,
    maxScore: number,
    updateReason: string
): Promise<any> {
    try {
        const url = getApiUrl(`/scoring/ministry/manual-update`);
        const response = await apiService.post(
            url,
            {
                submissionId,
                indicatorCode,
                category,
                updatedScore,
                maxScore,
                updateReason,
            },
            { withCredentials: true }
        );
        return response.data?.data !== undefined ? response.data.data : response.data;
    } catch (error: any) {
        throw error;
    }
}