


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
 
