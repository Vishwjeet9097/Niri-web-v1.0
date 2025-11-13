import { apiService } from "./api.service";
import { config } from "@/config/environment";

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
      const response = await fetch(`${config.apiBaseUrl}/states`);

      if (!response.ok) {
        throw new Error(`Failed to fetch states: ${response.status}`);
      }

      const data = await response.json();
      console.log("🌍 States API Response:", data);

      const normalizeArray = (items: any[]): State[] =>
        items.map((item, index) => {
          if (typeof item === "string") {
            const normalized = item.trim();
            return {
              id: (index + 1).toString(),
              name: normalized,
              code: normalized,
              isActive: true,
            };
          }

          const candidate = item || {};
          const name =
            candidate.name ||
            candidate.label ||
            candidate.value ||
            candidate.stateName ||
            candidate.state ||
            candidate.code ||
            `State ${index + 1}`;

          const code =
            candidate.code ||
            candidate.value ||
            candidate.label ||
            candidate.name ||
            String(index + 1);

          return {
            id: candidate.id?.toString() || (index + 1).toString(),
            name: String(name).trim(),
            code: String(code).trim(),
            isActive:
              typeof candidate.isActive === "boolean"
                ? candidate.isActive
                : true,
          };
        });

      const extractStates = (payload: any): State[] | null => {
        if (!payload) return null;

        if (Array.isArray(payload)) {
          return normalizeArray(payload);
        }

        if (Array.isArray(payload.states)) {
          return normalizeArray(payload.states);
        }

        if (Array.isArray(payload.data)) {
          return normalizeArray(payload.data);
        }

        if (
          payload.data &&
          Array.isArray(payload.data.states)
        ) {
          return normalizeArray(payload.data.states);
        }

        if (
          payload.data &&
          Array.isArray(payload.data.data)
        ) {
          return normalizeArray(payload.data.data);
        }

        if (typeof payload === "object") {
          const entries = Object.entries(payload);
          if (entries.length === 0) return null;

          const normalizedEntries = entries.map(([key, value], index) => {
            if (typeof value === "object" && value !== null) {
              return {
                id: value.id?.toString() || (index + 1).toString(),
                name:
                  value.name ||
                  value.label ||
                  value.value ||
                  value.stateName ||
                  key,
                code:
                  value.code ||
                  value.value ||
                  value.label ||
                  value.name ||
                  key,
                isActive:
                  typeof value.isActive === "boolean"
                    ? value.isActive
                    : true,
              };
            }

            const fallbackName =
              typeof value === "string" && value.trim().length > 0
                ? value
                : key;

            return {
              id: (index + 1).toString(),
              name: String(fallbackName).trim(),
              code: String(key).trim(),
              isActive: true,
            };
          });

          return normalizeArray(normalizedEntries);
        }

        return null;
      };

      const states = extractStates(data) || extractStates(data?.data);

      if (!states || states.length === 0) {
        throw new Error("Invalid states data format");
      }

      console.log("🌍 Processed states:", states.slice(0, 3));
      console.log("🌍 All states count:", states.length);
      console.log("🌍 Sample state structure:", states[0]);

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
