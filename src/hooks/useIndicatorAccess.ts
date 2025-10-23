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
    indicators: ["3.1", "3.2", "3.3", "3.4", "3.5"],
    points: 250,
    description: "Public-Private Partnership development indicators",
  },
  {
    id: "infra-enablers",
    name: "Infrastructure Enablers",
    indicators: ["4.1", "4.2", "4.3", "4.4", "4.5"],
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

  // Debug logging
  console.log("🔍 useIndicatorAccess: Hook initialized", {
    user: user
      ? { id: user._id || user.id, role: user.role, name: user.name }
      : null,
    isNodalOfficer,
    assignedIndicators,
    loading,
    error,
  });

  // Force immediate API call for NODAL_OFFICER
  if (isNodalOfficer && assignedIndicators.length === 0) {
    console.log(
      "🔍 useIndicatorAccess: NODAL_OFFICER detected, making immediate API call"
    );
    const immediateApiCall = async () => {
      try {
        setLoading(true);
        setError(null);

        const userId = user?._id || user?.id;
        console.log(
          "🔍 useIndicatorAccess: Immediate API call - User ID:",
          userId
        );

        if (userId) {
          const indicators = await apiService.getUserAssignedIndicators(userId);
          console.log(
            "🔍 useIndicatorAccess: Immediate API response - indicators:",
            indicators
          );
          setAssignedIndicators(indicators);

          if (indicators.length > 0) {
            const updatedUser = { ...user, assignedIndicators: indicators };
            authService.setAuth(updatedUser, authService.getTokens());
            console.log(
              "🔍 useIndicatorAccess: Immediate updated user with indicators:",
              indicators
            );
          }
        }
      } catch (err) {
        console.error("🔍 useIndicatorAccess: Immediate API call failed:", err);
        setError(err.message || "Failed to load assigned indicators");
      } finally {
        setLoading(false);
      }
    };

    immediateApiCall();
  }

  // Load assigned indicators when component mounts (page visit)
  useEffect(() => {
    const loadAssignedIndicators = async () => {
      console.log("🔍 useIndicatorAccess: useEffect triggered", {
        isNodalOfficer,
        userId: user?._id || user?.id,
        userRole: user?.role,
      });

      if (!isNodalOfficer) {
        console.log(
          "🔍 useIndicatorAccess: Not a NODAL_OFFICER, skipping indicator fetch"
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(
          "🔍 useIndicatorAccess: Fetching assigned indicators on page visit for NODAL_OFFICER:",
          user?.id
        );

        // Always fetch fresh indicators from API when visiting submission page
        const userId = user?._id || user?.id;
        console.log("🔍 useIndicatorAccess: User ID for API call:", userId);

        if (userId) {
          console.log(
            "🔍 useIndicatorAccess: Making API call to getUserAssignedIndicators"
          );
          const indicators = await apiService.getUserAssignedIndicators(userId);
          console.log(
            "🔍 useIndicatorAccess: API response - indicators:",
            indicators
          );
          setAssignedIndicators(indicators);

          // Update user object with fresh indicators
          if (indicators.length > 0) {
            const updatedUser = {
              ...user,
              assignedIndicators: indicators,
            };
            authService.setAuth(updatedUser, authService.getTokens());
            console.log(
              "🔍 useIndicatorAccess: Updated user with fresh indicators:",
              indicators
            );
          } else {
            console.log(
              "🔍 useIndicatorAccess: No indicators returned from API"
            );
          }
        } else {
          console.log(
            "🔍 useIndicatorAccess: No user ID found, setting empty indicators"
          );
          setAssignedIndicators([]);
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error("Failed to load assigned indicators:", err);
        setError(error.message || "Failed to load assigned indicators");
        setAssignedIndicators([]);
      } finally {
        setLoading(false);
      }
    };

    // Only run if we have a user and they are a NODAL_OFFICER
    if (user && isNodalOfficer) {
      console.log(
        "🔍 useIndicatorAccess: User found, starting indicator fetch"
      );
      loadAssignedIndicators();
    } else {
      console.log(
        "🔍 useIndicatorAccess: No user or not NODAL_OFFICER, skipping"
      );
      setLoading(false);
    }
  }, [isNodalOfficer, user?._id, user?.id, user]); // Include user dependencies to ensure it runs when user changes

  // Additional useEffect to ensure API call on every page visit
  useEffect(() => {
    console.log("🔍 useIndicatorAccess: Page visit useEffect triggered", {
      isNodalOfficer,
      userId: user?._id || user?.id,
      userRole: user?.role,
      assignedIndicatorsLength: assignedIndicators.length,
    });

    // Force API call if user is NODAL_OFFICER and no indicators loaded yet
    if (
      isNodalOfficer &&
      assignedIndicators.length === 0 &&
      !loading &&
      !error
    ) {
      console.log(
        "🔍 useIndicatorAccess: Force triggering API call for NODAL_OFFICER"
      );
      const forceLoadIndicators = async () => {
        try {
          setLoading(true);
          setError(null);

          const userId = user?._id || user?.id;
          if (userId) {
            console.log(
              "🔍 useIndicatorAccess: Force API call - User ID:",
              userId
            );
            const indicators = await apiService.getUserAssignedIndicators(
              userId
            );
            console.log(
              "🔍 useIndicatorAccess: Force API response - indicators:",
              indicators
            );
            setAssignedIndicators(indicators);

            // Update user object with fresh indicators
            if (indicators.length > 0) {
              const updatedUser = {
                ...user,
                assignedIndicators: indicators,
              };
              authService.setAuth(updatedUser, authService.getTokens());
              console.log(
                "🔍 useIndicatorAccess: Force updated user with indicators:",
                indicators
              );
            }
          }
        } catch (err: unknown) {
          const error = err as { message?: string };
          console.error("🔍 useIndicatorAccess: Force API call failed:", err);
          setError(error.message || "Failed to load assigned indicators");
        } finally {
          setLoading(false);
        }
      };

      forceLoadIndicators();
    }
  }, [
    isNodalOfficer,
    user?._id,
    user?.id,
    assignedIndicators.length,
    loading,
    error,
  ]); // Trigger on page visit

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
    if (!isNodalOfficer) return true;
    return assignedIndicators.includes(indicatorCode);
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
  };
}
