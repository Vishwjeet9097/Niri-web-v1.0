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
 */
export async function getMinistryDashboardData(useDummyData: boolean = true): Promise<{
    totalIndicators: number;
    totalUnassigned: number;
    totalAssigned: number;
    totalIndicatorsSubmitted: number;
    pendingSubmission: number;
    acceptedByStateApprover: number;
    returnedToNodal: number;
    submittedToMoSPI: number;
    approvedByMoSPI: number;
    returnedFromMoSPI: number;
    averageReviewTime: number;
}> {
    if (useDummyData) {
        // Return dummy data with a delay to simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    totalIndicators: 19,
                    totalUnassigned: 4,
                    totalAssigned: 15,
                    totalIndicatorsSubmitted: 20,
                    pendingSubmission: 0,
                    acceptedByStateApprover: 19,
                    returnedToNodal: 0,
                    submittedToMoSPI: 0,
                    approvedByMoSPI: 1,
                    returnedFromMoSPI: 0,
                    averageReviewTime: 3,
                });
            }, 300); // Simulate network delay
        });
    } else {
        // Real API call - using apiService directly
        try {
            const url = getApiUrl("/dashboard/ministry-approver");
            const response = await apiService.get(url, { withCredentials: true });
            const data = response?.data?.data || response?.data || response;
            
            // Transform API response to match expected format
            // Adjust these mappings based on your actual API response structure
            return {
                totalIndicators: data.totalIndicators || 0,
                totalUnassigned: data.totalUnassigned || 0,
                totalAssigned: data.totalAssigned || 0,
                totalIndicatorsSubmitted: data.totalIndicatorsSubmitted || 0,
                pendingSubmission: data.pendingSubmission || 0,
                acceptedByStateApprover: data.acceptedByStateApprover || 0,
                returnedToNodal: data.returnedToNodal || 0,
                submittedToMoSPI: data.submittedToMoSPI || 0,
                approvedByMoSPI: data.approvedByMoSPI || 0,
                returnedFromMoSPI: data.returnedFromMoSPI || 0,
                averageReviewTime: data.averageReviewTime || 3,
            };
        } catch (error) {
            console.error('[getMinistryDashboardData] API Error:', error);
            // Fallback to dummy data on error
            return getMinistryDashboardData(true);
        }
    }
}

/**
 * Get Ministry Submissions
 * Returns dummy submissions data for now, can be switched to real API call
 * @param useDummyData - Set to true to use dummy data, false to call real API
 */
export async function getMinistrySubmissions(useDummyData: boolean = true): Promise<any[]> {
    if (useDummyData) {
        // Return dummy submissions data with a delay to simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: "1",
                        title: "Digital Infrastructure Survey - Q1 2025",
                        status: "SUBMITTED_TO_STATE",
                        submissionDate: "15-01-2025",
                        deadline: "22-01-2025",
                        progress: 85,
                        submittedBy: "Mumbai Nodal Officer",
                        stateUt: "Maharashtra",
                        submission: {},
                    },
                    {
                        id: "2",
                        title: "PPP Project Assessment - Q1 2025",
                        status: "APPROVED",
                        submissionDate: "14-01-2025",
                        deadline: "21-01-2025",
                        progress: 100,
                        submittedBy: "Pune Nodal Officer",
                        stateUt: "Maharashtra",
                        submission: {},
                    },
                    {
                        id: "3",
                        title: "Infrastructure Development Report",
                        status: "SUBMITTED_TO_MOSPI_REVIEWER",
                        submissionDate: "13-01-2025",
                        deadline: "20-01-2025",
                        progress: 90,
                        submittedBy: "Delhi Nodal Officer",
                        stateUt: "Delhi",
                        submission: {},
                    },
                ]);
            }, 300); // Simulate network delay
        });
    } else {
        // Real API call - using apiService directly
        try {
            const url = getApiUrl("/dashboard/ministry-approver/submissions");
            const response = await apiService.get(url, { withCredentials: true });
            const data = response?.data?.data || response?.data || response;
            
            // Return submissions array
            return Array.isArray(data) ? data : data.submissions || [];
        } catch (error) {
            console.error('[getMinistrySubmissions] API Error:', error);
            // Fallback to dummy data on error
            return getMinistrySubmissions(true);
        }
    }
}

/**
 * Get Nodal Officer KPI Dashboard Data
 * Returns dummy data by default, automatically tries real API and falls back to dummy data if API fails
 * @param userId - The user ID
 * @param ministryId - The ministry ID
 * @returns Promise with nodal dashboard metrics
 */
export async function getNodalKpiData(userId?: string, ministryId?: string): Promise<{
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
        const url = getApiUrl("/ministry/nodal-ministery-dashboard");
        const response = await apiService.get(url, { withCredentials: true });
        const data = response?.data?.data || response?.data || response;

        // Use real API data if available
        if (data && typeof data === "object") {
            return {
                totalAllocated: data.totalAssigned ?? data.totalAllocated ?? 0,
                totalSubmitted: data.totalSubmitted ?? 0,
                underReview: data.underReview ?? 0,
                approved: data.approved ?? 0,
                pending: data.pendingSubmission ?? data.pending ?? 0,
            };
        }
 
        return nodalMinistryDashboardData;
    } catch (error) {
        console.error('[getNodalKpiData] API Error, using dummy data:', error);
        // Fallback to dummy data on error
        return nodalMinistryDashboardData;
    }
}


