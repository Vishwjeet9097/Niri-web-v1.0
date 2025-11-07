/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from "react";
import { authService } from "@/services/auth.service";
import { apiService } from "@/services/api.service";
import type { IndicatorAccess, IndicatorSection, SectionAccess } from "@/types";

// NIRI Indicator Sections Configuration (unchanged)
const INDICATOR_SECTIONS: IndicatorSection[] = [
  { id: "infra-financing", name: "Infrastructure Financing", indicators: ["1.1", "1.2", "1.3", "1.4", "1.5"], points: 250, description: "Capital allocation and financial management indicators" },
  { id: "infra-development", name: "Infrastructure Development", indicators: ["2.1", "2.2", "2.3", "2.4", "2.5"], points: 250, description: "Infrastructure planning and development indicators" },
  { id: "ppp-development", name: "PPP Development", indicators: ["3.1", "3.2", "3.3", "3.4"], points: 250, description: "Public-Private Partnership development indicators" },
  { id: "infra-enablers", name: "Infrastructure Enablers", indicators: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"], points: 250, description: "Supporting infrastructure and policy enablers" },
];

export function useIndicatorAccess() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignedIndicators, setAssignedIndicators] = useState<string[]>([]);
  const [availableIndicators, setAvailableIndicators] = useState<string[]>([]);

  // user info (watch stateUt)
  const user = authService.getUser();
  const userId = user?._id || user?.id;
  const stateUt = user?.state || user?.stateUt;
  const isNodalOfficer = user?.role === "NODAL_OFFICER";
  const isStateApprover = user?.role === "STATE_APPROVER";

  // cache keys - available indicators cache will include stateUt (if present)
  const CACHE_KEY_ASSIGNED = useMemo(() => `niri_assigned_indicators_${userId}`, [userId]);
  const CACHE_EXPIRY_ASSIGNED = useMemo(() => `${CACHE_KEY_ASSIGNED}_expiry`, [CACHE_KEY_ASSIGNED]);

  const CACHE_KEY_AVAILABLE = useMemo(() => (userId && stateUt ? `niri_available_indicators_${userId}_${stateUt}` : null), [userId, stateUt]);
  const CACHE_EXPIRY_AVAILABLE = useMemo(() => (CACHE_KEY_AVAILABLE ? `${CACHE_KEY_AVAILABLE}_expiry` : null), [CACHE_KEY_AVAILABLE]);

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // normalize helper (same as before)
  const normalizeToCodes = (resp: any): string[] => {
    if (!resp) return [];
    if (Array.isArray(resp)) {
      if (resp.length === 0) return [];
      if (typeof resp[0] === "string") return resp as string[];
      return resp.map((r: any) => r?.code || r?.indicator?.code || (typeof r === "string" ? r : null)).filter(Boolean);
    }
    if (Array.isArray(resp?.data)) {
      const d = resp.data;
      if (d.length === 0) return [];
      if (typeof d[0] === "string") return d as string[];
      return d.map((r: any) => r?.code || r?.indicator?.code || (typeof r === "string" ? r : null)).filter(Boolean);
    }
    if (typeof resp === "object" && (resp.code || resp.indicator?.code)) {
      return [resp.code || resp.indicator?.code].filter(Boolean) as string[];
    }
    return [];
  };

  // load function - now depends on stateUt and userId so it will re-run when stateUt becomes available
  const loadIndicators = useCallback(async () => {
    console.group("useIndicatorAccess: loadIndicators");
    console.log({ userId, stateUt, role: user?.role });

    setLoading(true);
    setError(null);

    try {
      const now = Date.now();

      // NODAL assigned indicators (cache by userId)
      if (isNodalOfficer && userId) {
        try {
          const cached = localStorage.getItem(CACHE_KEY_ASSIGNED);
          const expiry = localStorage.getItem(CACHE_EXPIRY_ASSIGNED);
          const useCache = cached && expiry && now < parseInt(expiry, 10);

          if (useCache) {
            const parsed = JSON.parse(cached || "[]");
            setAssignedIndicators(Array.isArray(parsed) ? parsed : []);
            console.log("useIndicatorAccess: used assigned cache", parsed);
          } else {
            console.log("useIndicatorAccess: fetching assigned indicators", userId);
            const resp = await apiService.getUserAssignedIndicators(userId);
            const codes = normalizeToCodes(resp);
            setAssignedIndicators(codes);
            // persist
            localStorage.setItem(CACHE_KEY_ASSIGNED, JSON.stringify(codes));
            localStorage.setItem(CACHE_EXPIRY_ASSIGNED, (now + CACHE_DURATION).toString());
            // update auth parity
            const currentUser = authService.getUser();
            if (currentUser) {
              authService.setAuth({ ...currentUser, assignedIndicators: codes }, authService.getTokens());
            }
          }
        } catch (err) {
          console.error("useIndicatorAccess: failed loading assigned indicators", err);
          setAssignedIndicators([]);
        }
      }

      // STATE_APPROVER: available indicators must be fetched **for a valid stateUt**
      if (isStateApprover) {
        if (!stateUt || !stateUt.trim()) {
          console.warn("useIndicatorAccess: stateUt not available yet; skipping available fetch (will retry when stateUt changes)");
          // do not set cache or empty persist — allow re-run when stateUt appears
          setAvailableIndicators([]);
        } else {
          try {
            // attempt cached available only when stateUt present and we have a key
            const cachedKey = CACHE_KEY_AVAILABLE!;
            const expiryKey = CACHE_EXPIRY_AVAILABLE!;
            const cached = localStorage.getItem(cachedKey);
            const expiry = localStorage.getItem(expiryKey);
            const useCache = cached && expiry && now < parseInt(expiry, 10);

            if (useCache) {
              const parsed = JSON.parse(cached || "[]");
              setAvailableIndicators(Array.isArray(parsed) ? parsed : []);
              console.log("useIndicatorAccess: used available cache for stateUt", stateUt, parsed);
            } else {
              console.log("useIndicatorAccess: fetching available indicators for stateUt", stateUt);
              const resp = await apiService.getAvailableIndicatorsForApprover(stateUt);
              const codes = normalizeToCodes(resp);
              setAvailableIndicators(codes);
              // cache since we have a valid stateUt
              localStorage.setItem(cachedKey, JSON.stringify(codes));
              localStorage.setItem(expiryKey, (now + CACHE_DURATION).toString());
              console.log("useIndicatorAccess: fetched & cached available indicators", codes);
            }
          } catch (err) {
            console.error("useIndicatorAccess: failed loading available indicators", err);
            setAvailableIndicators([]);
          }
        }
      }

    } catch (err) {
      console.error("useIndicatorAccess: unexpected error", err);
      setError((err as any)?.message || "Failed to load indicators");
    } finally {
      setLoading(false);
      console.log("useIndicatorAccess: load finished");
      console.groupEnd();
    }
  }, [
    userId,
    stateUt,
    isNodalOfficer,
    isStateApprover,
    CACHE_KEY_ASSIGNED,
    CACHE_EXPIRY_ASSIGNED,
    CACHE_KEY_AVAILABLE,
    CACHE_EXPIRY_AVAILABLE,
    CACHE_DURATION,
  ]);

  // initial + re-run on userId/stateUt/role changes
  useEffect(() => {
    loadIndicators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadIndicators]);

  // existing derived utilities (unchanged logic, but uses availableIndicators when approver)
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
      section.indicators.some((indicator) => assignedIndicators.includes(indicator))
    );
    const restrictedSections = INDICATOR_SECTIONS.filter((section) => !availableSections.includes(section)).map((s) => s.id);
    return {
      hasAccess: assignedIndicators.length > 0,
      assignedIndicators,
      availableSections,
      restrictedSections,
    };
  }, [isNodalOfficer, assignedIndicators]);

  const hasIndicatorAccess = (indicatorCode: string) => {
    if (!isNodalOfficer) return true;
    return assignedIndicators.includes(indicatorCode);
  };

  const clearCache = () => {
    if (userId) {
      localStorage.removeItem(CACHE_KEY_ASSIGNED);
      localStorage.removeItem(CACHE_EXPIRY_ASSIGNED);
    }
    if (CACHE_KEY_AVAILABLE) {
      localStorage.removeItem(CACHE_KEY_AVAILABLE);
      localStorage.removeItem(CACHE_EXPIRY_AVAILABLE!);
    }
  };

  const getAvailableSections = (): IndicatorSection[] => {
    if (isNodalOfficer) {
      return INDICATOR_SECTIONS.filter((section) => section.indicators.some((i) => assignedIndicators.includes(i)));
    }
    if (isStateApprover) {
      return INDICATOR_SECTIONS.filter((section) => section.indicators.some((i) => availableIndicators.includes(i)));
    }
    return INDICATOR_SECTIONS;
  };

  const getRestrictedSections = (): string[] => {
    if (isNodalOfficer) return indicatorAccess.restrictedSections;
    if (isStateApprover) {
      const available = getAvailableSections();
      return INDICATOR_SECTIONS.filter((s) => !available.includes(s)).map((s) => s.id);
    }
    return [];
  };

  const hasAnyAccess = (): boolean => {
    if (isNodalOfficer) return assignedIndicators.length > 0;
    if (isStateApprover) return availableIndicators.length > 0;
    return true;
  };

  const getFirstAvailableSection = (): string | null => {
    const available = getAvailableSections();
    return available.length > 0 ? available[0].id : null;
  };

  const refresh = async (opts?: { clearCache?: boolean }) => {
    if (opts?.clearCache) {
      // Clear both caches including available for this (userId,stateUt)
      clearCache();
    }
    await loadIndicators();
  };

  return {
    loading,
    error,
    assignedIndicators,
    availableIndicators,
    indicatorAccess,
    hasIndicatorAccess,
    hasSectionAccess: (sectionId: string) => {
      if (!isNodalOfficer) return true;
      const section = INDICATOR_SECTIONS.find((s) => s.id === sectionId);
      if (!section) return false;
      return section.indicators.some((indicator) => assignedIndicators.includes(indicator));
    },
    getSectionAccess: (sectionId: string) => {
      if (!isNodalOfficer) {
        const section = INDICATOR_SECTIONS.find((s) => s.id === sectionId);
        return {
          sectionId,
          hasAccess: true,
          assignedIndicators: section?.indicators || [],
          hiddenIndicators: [],
        } as SectionAccess;
      }
      const section = INDICATOR_SECTIONS.find((s) => s.id === sectionId);
      if (!section) return { sectionId, hasAccess: false, assignedIndicators: [], hiddenIndicators: [] } as SectionAccess;
      const assignedInSection = section.indicators.filter((indicator) => assignedIndicators.includes(indicator));
      const hiddenInSection = section.indicators.filter((indicator) => !assignedIndicators.includes(indicator));
      return { sectionId, hasAccess: assignedInSection.length > 0, assignedIndicators: assignedInSection, hiddenIndicators: hiddenInSection } as SectionAccess;
    },
    getAvailableSections,
    getRestrictedSections,
    hasAnyAccess,
    getFirstAvailableSection,
    isNodalOfficer,
    isStateApprover,
    clearCache,
    refresh,
  };
}
