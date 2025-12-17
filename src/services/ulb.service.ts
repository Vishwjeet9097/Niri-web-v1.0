import { config } from "@/config/environment";
import { API_ENDPOINTS } from "@/config/endpoints";

export interface ULB {
  id: string;
  ulb_name: string;
  city_name: string;
  ulb_type: string;
  state_code: string;
  state_name: string;
}

class ULBService {
  private ulbCache: Map<string, ULB[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch ULBs for a specific state
   * @param stateCode - The state code to filter ULBs
   * @returns Promise<ULB[]>
   */
  async getULBsByState(stateName: string): Promise<ULB[]> {
    // Check cache first
    // const cacheKey = stateName.toLowerCase();
    // const cachedData = this.ulbCache.get(cacheKey);
    // const expiry = this.cacheExpiry.get(cacheKey);

    // if (cachedData && expiry && Date.now() < expiry) {
    //   console.log(`🏢 Returning cached ULBs for state: ${stateName}`);
    //   return cachedData;
    // }

    try {
      const response = await fetch(API_ENDPOINTS.ulb.byState(stateName));
      if (!response.ok) {
        throw new Error(`Failed to fetch ULBs: ${response.status}`);
      }
      const data = await response.json();
      console.log("🏢 ULB API Response:", data);

      let ulbs: ULB[] = [];
      // Support for API response: { status, data: { total, data: [...] } }
      if (data && data.data && Array.isArray(data.data.data)) {
        ulbs = data.data.data;
      } else if (Array.isArray(data)) {
        ulbs = data;
      } else if (data.data && Array.isArray(data.data)) {
        ulbs = data.data;
      } else {
        console.error("Invalid ULB data format:", data);
        return [];
      }

      // Cache the data
      // const cacheKey = stateName.toLowerCase();
      // this.ulbCache.set(cacheKey, ulbs);
      // this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      console.log(`🏢 Cached ${ulbs.length} ULBs for state: ${stateName}`);
      return ulbs;
    } catch (error) {
      console.error("Error fetching ULBs:", error);
      return [];
    }
  }

  /**
   * Get all ULBs (without state filter)
   * @returns Promise<ULB[]>
   */
  async getAllULBs(): Promise<ULB[]> {
    const cacheKey = "all";
    const cachedData = this.ulbCache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey);

    if (cachedData && expiry && Date.now() < expiry) {
      console.log("🏢 Returning all cached ULBs");
      return cachedData;
    }

    try {
      console.log("🏢 Fetching all ULBs from API");
      const response = await fetch(API_ENDPOINTS.ulb.root);

      if (!response.ok) {
        throw new Error(`Failed to fetch ULBs: ${response.status}`);
      }

      const data = await response.json();
      console.log("🏢 All ULB API Response:", data);

      let ulbs: ULB[];
      if (Array.isArray(data)) {
        ulbs = data;
      } else if (data.data && Array.isArray(data.data)) {
        ulbs = data.data;
      } else {
        console.error("Invalid ULB data format:", data);
        return [];
      }

      // Cache the data
      this.ulbCache.set(cacheKey, ulbs);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      console.log(`🏢 Cached ${ulbs.length} ULBs`);
      return ulbs;
    } catch (error) {
      console.error("Error fetching all ULBs:", error);
      return [];
    }
  }

  /**
   * Format ULB display name
   * @param ulb - ULB object
   * @returns Formatted string: "ULB Name - City Name (Type)"
   */
  formatULBDisplay(ulb: ULB): string {
    return `${ulb.ulb_name} - ${ulb.city_name} (${ulb.ulb_type})`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.ulbCache.clear();
    this.cacheExpiry.clear();
    console.log("🏢 ULB cache cleared");
  }
}

export const ulbService = new ULBService();