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
    console.log("dddddddddd======", nodalUserId, ministryUserId, indicatorsId)
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
