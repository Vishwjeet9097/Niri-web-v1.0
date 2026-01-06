import { apiService } from "./api.service";
import { config } from "@/config/environment";

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
            console.error('[getAllMinistries] API Error:', error);
            return [];
        }
    } catch (error) {
        console.error('[getAllMinistries] API Error:', error);
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
 
// Fetch indicators for ministry form creation
export async function getMinistryFormIndicators() {
    try {
        const url = getApiUrl("/ministry/form/create/indicators");
        const response = await apiService.get(url, { withCredentials: true });
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('[getMinistryFormIndicators] API Error:', error);
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
export async function minstryRegistrationForm(userId: string, userRole: string, ministryId: string): Promise<any> {
    const url = getApiUrl("/ministry/form/create/form");

    const payload = {
        userId,
        userRole,
        ministryId,
    };
    try {
        const response = await apiService.post(url, payload, { withCredentials: true });
        // Try to return the most useful data
        return response.data?.data || response.data || response;
    } catch (error) {
        console.error('❌ Error in minstryRegistrationForm:', error);
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
        }
        const response = await apiService.get(url, { withCredentials: true });
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('[getRemainingMinistryIndicators] API Error:', error);
        return [];
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
 * Get Ministry Dashboard Data
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
            let url = getApiUrl(`/ministry/dashboard/${userId}`); 
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
            console.error('[getMinistryDashboardData] API Error:', error);
            // Fallback to dummy data on error
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
            let url = getApiUrl(`/ministry/dashboard/${userId}`);
  
            const response = await apiService.get(url, { withCredentials: true });
            const data = response?.data?.data || response?.data || response;
            
            // Return submissions array
            return Array.isArray(data) ? data : data.submissions || [];
        } catch (error) {
            console.error('[getMinistrySubmissions] API Error:', error);
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
                pending: data.pending ?? 0
            };
        }
 
        return nodalMinistryDashboardData;
    } catch (error) {
        console.error('[getNodalKpiData] API Error, using dummy data:', error);
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
        let url = getApiUrl(`/ministry/dashboard/${userId}`);
    
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
        console.error('[mospiMinisteryTab] API Error:', error);
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


