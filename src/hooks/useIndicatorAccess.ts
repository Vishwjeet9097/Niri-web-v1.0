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

  // Load assigned indicators
  useEffect(() => {
    const loadAssignedIndicators = async () => {
      if (!isNodalOfficer) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First try to get from user profile
        if (user?.assignedIndicators && user.assignedIndicators.length > 0) {
          setAssignedIndicators(user.assignedIndicators);
          setLoading(false);
          return;
        }

        // If not in profile, fetch from API
        const userId = user?._id || user?.id;
        if (userId) {
          const indicators = await apiService.getUserAssignedIndicators(userId);
          setAssignedIndicators(indicators);
        } else {
          setAssignedIndicators([]);
        }
      } catch (err: any) {
        console.error("Failed to load assigned indicators:", err);
        setError(err.message || "Failed to load assigned indicators");
        setAssignedIndicators([]);
      } finally {
        setLoading(false);
      }
    };

    loadAssignedIndicators();
  }, [isNodalOfficer, user?._id, user?.assignedIndicators]);

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
