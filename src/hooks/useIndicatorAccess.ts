import { useState, useEffect, useMemo } from "react";
import { authService } from "@/services/auth.service";
import { apiService } from "@/services/api.service";
import type { IndicatorAccess, IndicatorSection, SectionAccess } from "@/types";

// NIRI Indicator Sections Configuration
const INDICATOR_SECTIONS: IndicatorSection[] = [
  {
    id: "infra-financing",
    name: "Infrastructure Financing",
    indicators: ["1.1", "1.2", "1.3", "1.4", "1.5"],
    points: 250,
    description: "Capital allocation and financial management indicators",
  },
  {
    id: "infra-development",
    name: "Infrastructure Development",
    indicators: ["2.1", "2.2", "2.3", "2.4", "2.5"],
    points: 250,
    description: "Infrastructure planning and development indicators",
  },
  {
    id: "ppp-development",
    name: "PPP Development",
    indicators: ["3.1", "3.2", "3.3", "3.4"],
    points: 250,
    description: "Public-Private Partnership development indicators",
  },
  {
    id: "infra-enablers",
    name: "Infrastructure Enablers",
    indicators: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"],
    points: 250,
    description: "Supporting infrastructure and policy enablers",
  },
];

export function useIndicatorAccess() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignedIndicators, setAssignedIndicators] = useState<string[]>([]);

  // Get current user
  const user = authService.getUser();
  const isNodalOfficer = user?.role === "NODAL_OFFICER";

  // Debug logging removed for performance

  // Cache key for localStorage - memoized to prevent re-renders
  const userId = user?._id || user?.id;
  const CACHE_KEY = useMemo(
    () => `niri_assigned_indicators_${userId}`,
    [userId]
  );
  const CACHE_EXPIRY_KEY = useMemo(
    () => `niri_assigned_indicators_expiry_${userId}`,
    [userId]
  );
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Load from cache or fetch from API
  useEffect(() => {
    const loadIndicators = async () => {
      console.log("🔍 useIndicatorAccess Debug:", {
        userId,
        isNodalOfficer,
        userRole: user?.role,
        shouldLoad: userId && isNodalOfficer,
      });

      if (!userId || !isNodalOfficer) {
        console.log("❌ Skipping indicator load:", { userId, isNodalOfficer });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
        const now = Date.now();

        console.log("🔍 Cache check:", {
          CACHE_KEY,
          cachedData: cachedData ? "exists" : "null",
          cacheExpiry,
          now,
          isExpired: cacheExpiry ? now >= parseInt(cacheExpiry) : "no expiry",
          willUseCache:
            cachedData && cacheExpiry && now < parseInt(cacheExpiry),
        });

        if (cachedData) {
          console.log("📦 Cached data found:", JSON.parse(cachedData));
        }

        if (cachedData && cacheExpiry && now < parseInt(cacheExpiry)) {
          console.log("✅ Using cached data, skipping API call");
          const indicators = JSON.parse(cachedData);
          setAssignedIndicators(indicators);

          // Update user object with cached indicators
          if (indicators.length > 0) {
            const currentUser = authService.getUser();
            if (currentUser) {
              const updatedUser = {
                ...currentUser,
                assignedIndicators: indicators,
              };
              authService.setAuth(updatedUser, authService.getTokens());
            }
          }
          setLoading(false);
          return;
        }

        // Fetch from API
        console.log("🚀 Making API call for indicators...");
        const indicators = await apiService.getUserAssignedIndicators(userId);
        console.log("✅ API call successful, indicators:", indicators);

        setAssignedIndicators(indicators);

        // Update user object with fresh indicators
        if (indicators.length > 0) {
          const currentUser = authService.getUser();
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              assignedIndicators: indicators,
            };
            authService.setAuth(updatedUser, authService.getTokens());
          }
        }

        // Cache the result
        localStorage.setItem(CACHE_KEY, JSON.stringify(indicators));
        localStorage.setItem(
          CACHE_EXPIRY_KEY,
          (now + CACHE_DURATION).toString()
        );
      } catch (err) {
        console.error("Failed to load assigned indicators:", err);
        setError(err.message || "Failed to load assigned indicators");
        setAssignedIndicators([]);
      } finally {
        setLoading(false);
      }
    };

    loadIndicators();
  }, [isNodalOfficer, userId, CACHE_KEY, CACHE_EXPIRY_KEY, CACHE_DURATION]); // Removed user from dependencies to prevent infinite loop

  // Calculate indicator access
  const indicatorAccess = useMemo((): IndicatorAccess => {
    if (!isNodalOfficer) {
      return {
        hasAccess: true,
        assignedIndicators: [],
        availableSections: INDICATOR_SECTIONS,
        restrictedSections: [],
      };
    }

    // For NODAL_OFFICER, check which sections they have access to
    const availableSections = INDICATOR_SECTIONS.filter((section) =>
      section.indicators.some((indicator) =>
        assignedIndicators.includes(indicator)
      )
    );

    const restrictedSections = INDICATOR_SECTIONS.filter(
      (section) => !availableSections.includes(section)
    ).map((section) => section.id);

    return {
      hasAccess: assignedIndicators.length > 0,
      assignedIndicators,
      availableSections,
      restrictedSections,
    };
  }, [isNodalOfficer, assignedIndicators]);

  // Check if user has access to specific indicator
  const hasIndicatorAccess = (indicatorCode: string): boolean => {
    if (!isNodalOfficer) {
      return true;
    }

    // For NODAL_OFFICER, check if they have access to the specific indicator
    return assignedIndicators.includes(indicatorCode);
  };

  // Clear cache function
  const clearCache = () => {
    if (userId) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
    }
  };

  // Check if user has access to specific section
  const hasSectionAccess = (sectionId: string): boolean => {
    if (!isNodalOfficer) return true;
    const section = INDICATOR_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return false;
    return section.indicators.some((indicator) =>
      assignedIndicators.includes(indicator)
    );
  };

  // Get section access details
  const getSectionAccess = (sectionId: string): SectionAccess => {
    if (!isNodalOfficer) {
      const section = INDICATOR_SECTIONS.find((s) => s.id === sectionId);
      return {
        sectionId,
        hasAccess: true,
        assignedIndicators: section?.indicators || [],
        hiddenIndicators: [],
      };
    }

    const section = INDICATOR_SECTIONS.find((s) => s.id === sectionId);
    if (!section) {
      return {
        sectionId,
        hasAccess: false,
        assignedIndicators: [],
        hiddenIndicators: [],
      };
    }

    const assignedInSection = section.indicators.filter((indicator) =>
      assignedIndicators.includes(indicator)
    );
    const hiddenInSection = section.indicators.filter(
      (indicator) => !assignedIndicators.includes(indicator)
    );

    return {
      sectionId,
      hasAccess: assignedInSection.length > 0,
      assignedIndicators: assignedInSection,
      hiddenIndicators: hiddenInSection,
    };
  };

  // Get all available sections
  const getAvailableSections = (): IndicatorSection[] => {
    return indicatorAccess.availableSections;
  };

  // Get restricted sections
  const getRestrictedSections = (): string[] => {
    return indicatorAccess.restrictedSections;
  };

  // Check if user has any assigned indicators
  const hasAnyAccess = (): boolean => {
    return indicatorAccess.hasAccess;
  };

  // Get first available section for navigation
  const getFirstAvailableSection = (): string | null => {
    const availableSections = getAvailableSections();
    return availableSections.length > 0 ? availableSections[0].id : null;
  };

  return {
    loading,
    error,
    assignedIndicators,
    indicatorAccess,
    hasIndicatorAccess,
    hasSectionAccess,
    getSectionAccess,
    getAvailableSections,
    getRestrictedSections,
    hasAnyAccess,
    getFirstAvailableSection,
    isNodalOfficer,
    clearCache,
  };
}
