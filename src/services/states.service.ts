import { apiService } from "./api.service";

export interface State {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

class StatesService {
  private statesCache: State[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getStates(): Promise<State[]> {
    // Check if we have valid cached data
    if (this.statesCache && Date.now() < this.cacheExpiry) {
      return this.statesCache;
    }

    try {
      console.log("🌍 Fetching states from API...");
      const response = await fetch("http://localhost:3000/states");

      if (!response.ok) {
        throw new Error(`Failed to fetch states: ${response.status}`);
      }

      const data = await response.json();
      console.log("🌍 States API Response:", data);

      // Handle different response formats
      let states: State[];
      if (Array.isArray(data)) {
        states = data;
      } else if (data.data && Array.isArray(data.data)) {
        // Direct API response - use value as both id and name
        states = data.data.map((state: any, index: number) => ({
          id: state.value || state.label, // Use state name as id directly
          name: state.value || state.label,
          code: state.value || state.label,
          isActive: true,
        }));

        console.log("🌍 Processed states:", states.slice(0, 3)); // Log first 3 states for debugging
      } else if (data.states && Array.isArray(data.states)) {
        states = data.states;
      } else {
        throw new Error("Invalid states data format");
      }

      // Cache the data
      this.statesCache = states;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return states;
    } catch (error) {
      console.error("❌ Error fetching states:", error);

      // Return fallback states if API fails
      return [
        { id: "1", name: "Andhra Pradesh", code: "AP", isActive: true },
        { id: "2", name: "Arunachal Pradesh", code: "AR", isActive: true },
        { id: "3", name: "Assam", code: "AS", isActive: true },
        { id: "4", name: "Bihar", code: "BR", isActive: true },
        { id: "5", name: "Chhattisgarh", code: "CG", isActive: true },
        { id: "6", name: "Goa", code: "GA", isActive: true },
        { id: "7", name: "Gujarat", code: "GJ", isActive: true },
        { id: "8", name: "Haryana", code: "HR", isActive: true },
        { id: "9", name: "Himachal Pradesh", code: "HP", isActive: true },
        { id: "10", name: "Jharkhand", code: "JH", isActive: true },
        { id: "11", name: "Karnataka", code: "KA", isActive: true },
        { id: "12", name: "Kerala", code: "KL", isActive: true },
        { id: "13", name: "Madhya Pradesh", code: "MP", isActive: true },
        { id: "14", name: "Maharashtra", code: "MH", isActive: true },
        { id: "15", name: "Manipur", code: "MN", isActive: true },
        { id: "16", name: "Meghalaya", code: "ML", isActive: true },
        { id: "17", name: "Mizoram", code: "MZ", isActive: true },
        { id: "18", name: "Nagaland", code: "NL", isActive: true },
        { id: "19", name: "Odisha", code: "OD", isActive: true },
        { id: "20", name: "Punjab", code: "PB", isActive: true },
        { id: "21", name: "Rajasthan", code: "RJ", isActive: true },
        { id: "22", name: "Sikkim", code: "SK", isActive: true },
        { id: "23", name: "Tamil Nadu", code: "TN", isActive: true },
        { id: "24", name: "Telangana", code: "TG", isActive: true },
        { id: "25", name: "Tripura", code: "TR", isActive: true },
        { id: "26", name: "Uttar Pradesh", code: "UP", isActive: true },
        { id: "27", name: "Uttarakhand", code: "UK", isActive: true },
        { id: "28", name: "West Bengal", code: "WB", isActive: true },
        {
          id: "29",
          name: "Andaman and Nicobar Islands",
          code: "AN",
          isActive: true,
        },
        { id: "30", name: "Chandigarh", code: "CH", isActive: true },
        {
          id: "31",
          name: "Dadra and Nagar Haveli and Daman and Diu",
          code: "DN",
          isActive: true,
        },
        { id: "32", name: "Delhi", code: "DL", isActive: true },
        { id: "33", name: "Jammu and Kashmir", code: "JK", isActive: true },
        { id: "34", name: "Ladakh", code: "LA", isActive: true },
        { id: "35", name: "Lakshadweep", code: "LD", isActive: true },
        { id: "36", name: "Puducherry", code: "PY", isActive: true },
      ];
    }
  }

  getStateById(id: string): State | undefined {
    return this.statesCache?.find((state) => state.id === id);
  }

  getStateByName(name: string): State | undefined {
    return this.statesCache?.find(
      (state) => state.name.toLowerCase() === name.toLowerCase()
    );
  }

  clearCache(): void {
    this.statesCache = null;
    this.cacheExpiry = 0;
  }
}

export const statesService = new StatesService();
