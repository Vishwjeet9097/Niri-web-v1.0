/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { authService } from "@/services/auth.service";
import { apiService } from "@/services/api.service";
import type { IndicatorAccess, IndicatorSection, SectionAccess } from "@/types";

// All NIE-I indicator codes (19 total)
export const ALL_INDICATOR_CODES = [
  "1.1",
  "1.2",
  "1.3",
  "1.4",
  "1.5", // Infrastructure Financing
  "2.1",
  "2.2",
  "2.3",
  "2.4",
  "2.5", // Infrastructure Development
  "3.1",
  "3.2",
  "3.3",
  "3.4", // PPP Development
  "4.1",
  "4.2",
  "4.3",
  "4.4",
  "4.5", // Infrastructure Enablers
];

// NIE-I Indicator Sections Configuration
export const INDICATOR_SECTIONS: IndicatorSection[] = [
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
    indicators: ["4.1", "4.2", "4.3", "4.4", "4.5"],
    points: 250,
    description: "Supporting infrastructure and policy enablers",
  },
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
  const CACHE_KEY_ASSIGNED = useMemo(
    () => `niri_assigned_indicators_${userId}`,
    [userId]
  );
  const CACHE_EXPIRY_ASSIGNED = useMemo(
    () => `${CACHE_KEY_ASSIGNED}_expiry`,
    [CACHE_KEY_ASSIGNED]
  );

  // _v2: keep all state indicators visible on Create submission (submitted ones non-editable); old cache may have filtered list
  const CACHE_KEY_AVAILABLE = useMemo(
    () =>
      userId && stateUt
        ? `niri_available_indicators_${userId}_${stateUt}_v2`
        : null,
    [userId, stateUt]
  );
  const CACHE_EXPIRY_AVAILABLE = useMemo(
    () => (CACHE_KEY_AVAILABLE ? `${CACHE_KEY_AVAILABLE}_expiry` : null),
    [CACHE_KEY_AVAILABLE]
  );

  // Move CACHE_DURATION outside component or use useMemo to prevent recreation
  const CACHE_DURATION = useMemo(() => 5 * 60 * 1000, []); // 5 minutes - memoized to prevent recreation

  // normalize helper (same as before)
  const normalizeToCodes = (resp: any): string[] => {
    if (!resp) return [];
    let codes: string[] = [];
    if (Array.isArray(resp)) {
      if (resp.length === 0) return [];
      if (typeof resp[0] === "string") codes = resp as string[];
      else
        codes = resp
          .map(
            (r: any) =>
              r?.code ||
              r?.indicator?.code ||
              (typeof r === "string" ? r : null)
          )
          .filter(Boolean);
    } else if (Array.isArray(resp?.data)) {
      const d = resp.data;
      if (d.length === 0) return [];
      if (typeof d[0] === "string") codes = d as string[];
      else
        codes = d
          .map(
            (r: any) =>
              r?.code ||
              r?.indicator?.code ||
              (typeof r === "string" ? r : null)
          )
          .filter(Boolean);
    } else if (
      typeof resp === "object" &&
      (resp.code || resp.indicator?.code)
    ) {
      codes = [resp.code || resp.indicator?.code].filter(Boolean) as string[];
    }
    // Filter out invalid indicators (old 4.6 and any other invalid codes)
    return codes.filter((code: string) => ALL_INDICATOR_CODES.includes(code));
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
            console.log(
              "useIndicatorAccess: fetching assigned indicators",
              userId
            );
            const resp = await apiService.getUserAssignedIndicators(userId);
            const codes = normalizeToCodes(resp);
            setAssignedIndicators(codes);
            // persist
            localStorage.setItem(CACHE_KEY_ASSIGNED, JSON.stringify(codes));
            localStorage.setItem(
              CACHE_EXPIRY_ASSIGNED,
              (now + CACHE_DURATION).toString()
            );
            // update auth parity
            const currentUser = authService.getUser();
            if (currentUser) {
              authService.setAuth(
                { ...currentUser, assignedIndicators: codes },
                authService.getTokens()
              );
            }
          }
        } catch (err) {
          console.error(
            "useIndicatorAccess: failed loading assigned indicators",
            err
          );
          setAssignedIndicators([]);
        }
      }

      // STATE_APPROVER: available indicators must be fetched **for a valid stateUt**
      if (isStateApprover) {
        if (!stateUt || !stateUt.trim()) {
          console.warn(
            "useIndicatorAccess: stateUt not available yet; skipping available fetch (will retry when stateUt changes)"
          );
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
              const cachedCodes = Array.isArray(parsed) ? parsed : [];
              // Keep all indicators from cache visible on Create submission; submitted ones are made non-editable in step pages (like Nodal Officer)
              setAvailableIndicators(cachedCodes);
              console.log(
                "useIndicatorAccess: used available cache for stateUt",
                stateUt,
                cachedCodes
              );
            } else {
              console.log(
                "useIndicatorAccess: fetching available indicators for stateUt",
                stateUt
              );
              const resp = await apiService.getAvailableIndicatorsForApprover(
                stateUt
              );
              const codes = normalizeToCodes(resp);
              // Do not filter out submitted indicators: keep all state indicators visible on Create submission;
              // submitted ones are shown as non-editable in step pages (same behavior as Nodal Officer).
              setAvailableIndicators(codes);
              // cache since we have a valid stateUt
              localStorage.setItem(cachedKey, JSON.stringify(codes));
              localStorage.setItem(
                expiryKey,
                (now + CACHE_DURATION).toString()
              );
              console.log(
                "useIndicatorAccess: fetched & cached available indicators",
                codes
              );
            }
          } catch (err) {
            console.error(
              "useIndicatorAccess: failed loading available indicators",
              err
            );
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
    // CACHE_DURATION removed - it's a constant and doesn't need to be in deps
  ]);

  // Track last load to prevent duplicate calls
  const lastLoadRef = useRef<{
    userId: string | undefined;
    stateUt: string | undefined;
    role: string | undefined;
  } | null>(null);

  // initial + re-run on userId/stateUt/role changes
  useEffect(() => {
    // Check if values actually changed
    const currentValues = { userId, stateUt, role: user?.role };
    const lastValues = lastLoadRef.current;

    // Skip if values haven't changed - this is the main guard
    if (
      lastValues &&
      lastValues.userId === currentValues.userId &&
      lastValues.stateUt === currentValues.stateUt &&
      lastValues.role === currentValues.role
    ) {
      return; // Values haven't changed, skip
    }

    // Update tracking BEFORE calling
    lastLoadRef.current = currentValues;

    loadIndicators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, stateUt, user?.role]); // Use primitive values instead of loadIndicators function

  // Helper: Get effective indicators for NODAL_OFFICER
  // If no indicators assigned, return all indicators (fallback behavior)
  const effectiveIndicators = useMemo(() => {
    if (!isNodalOfficer) return [];
    // If no indicators assigned, show all indicators (fallback)
    if (assignedIndicators.length === 0) {
      return ALL_INDICATOR_CODES;
    }
    return assignedIndicators;
  }, [isNodalOfficer, assignedIndicators]);

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
    // Use effectiveIndicators (includes fallback to all if empty)
    const availableSections = INDICATOR_SECTIONS.filter((section) =>
      section.indicators.some((indicator) =>
        effectiveIndicators.includes(indicator)
      )
    );
    const restrictedSections = INDICATOR_SECTIONS.filter(
      (section) => !availableSections.includes(section)
    ).map((s) => s.id);
    return {
      hasAccess: effectiveIndicators.length > 0,
      assignedIndicators: effectiveIndicators,
      availableSections,
      restrictedSections,
    };
  }, [isNodalOfficer, effectiveIndicators]);

  const hasIndicatorAccess = (indicatorCode: string) => {
    // For non-restricted roles (MOSPI, ADMIN), allow all
    if (!isNodalOfficer && !isStateApprover) return true;

    // For NODAL_OFFICER: If no indicators assigned, allow access to all (fallback)
    if (isNodalOfficer) {
      if (assignedIndicators.length === 0) {
        return true;
      }
      return assignedIndicators.includes(indicatorCode);
    }

    // For STATE_APPROVER: Only allow access to available (unassigned) indicators
    if (isStateApprover) {
      return availableIndicators.includes(indicatorCode);
    }

    return false;
  };

  const clearCache = useCallback(() => {
    if (userId) {
      localStorage.removeItem(CACHE_KEY_ASSIGNED);
      localStorage.removeItem(CACHE_EXPIRY_ASSIGNED);
    }
    if (CACHE_KEY_AVAILABLE) {
      localStorage.removeItem(CACHE_KEY_AVAILABLE);
      localStorage.removeItem(CACHE_EXPIRY_AVAILABLE!);
    }
  }, [
    userId,
    CACHE_KEY_ASSIGNED,
    CACHE_EXPIRY_ASSIGNED,
    CACHE_KEY_AVAILABLE,
    CACHE_EXPIRY_AVAILABLE,
  ]);

  const getAvailableSections = (): IndicatorSection[] => {
    if (isNodalOfficer) {
      // Use effectiveIndicators (includes fallback to all if empty)
      return INDICATOR_SECTIONS.filter((section) =>
        section.indicators.some((i) => effectiveIndicators.includes(i))
      );
    }
    if (isStateApprover) {
      return INDICATOR_SECTIONS.filter((section) =>
        section.indicators.some((i) => availableIndicators.includes(i))
      );
    }
    return INDICATOR_SECTIONS;
  };

  const getRestrictedSections = (): string[] => {
    if (isNodalOfficer) return indicatorAccess.restrictedSections;
    if (isStateApprover) {
      const available = getAvailableSections();
      return INDICATOR_SECTIONS.filter((s) => !available.includes(s)).map(
        (s) => s.id
      );
    }
    return [];
  };

  const hasAnyAccess = (): boolean => {
    if (isNodalOfficer) {
      // If no indicators assigned, show all (has access)
      return assignedIndicators.length === 0 || assignedIndicators.length > 0;
    }
    if (isStateApprover) return availableIndicators.length > 0;
    return true;
  };

  const getFirstAvailableSection = (): string | null => {
    const available = getAvailableSections();
    return available.length > 0 ? available[0].id : null;
  };

  const refresh = useCallback(
    async (opts?: { clearCache?: boolean }) => {
      if (opts?.clearCache) {
        // Clear both caches including available for this (userId,stateUt)
        clearCache();
      }
      await loadIndicators();
    },
    [loadIndicators, clearCache]
  );

  // Listen for indicator update events and refresh cache
  useEffect(() => {
    const handleIndicatorUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventDetail = customEvent.detail || {};

      // Determine if we should refresh based on event details
      let shouldRefresh = false;

      // Do NOT refresh when STATE_APPROVER submits an indicator (indicator_submitted or submission_created).
      // We keep all indicators visible on Create submission and show submitted ones as non-editable;
      // refetching would reload availableIndicators from API (which may return only unsubmitted), causing indicators to disappear.
      if (
        isStateApprover &&
        eventDetail.userId === userId &&
        (eventDetail.action === "indicator_submitted" ||
          eventDetail.action === "submission_created")
      ) {
        console.log(
          "[useIndicatorAccess] STATE_APPROVER own submit: skipping refresh so submitted indicators stay visible (non-editable)"
        );
        return;
      }

      // Check if userId matches (for the user whose indicators changed)
      if (eventDetail.userId && eventDetail.userId === userId) {
        shouldRefresh = true;
      }

      // Also check if this is a NODAL_OFFICER indicator change
      // For STATE_APPROVERs: always refresh when any NODAL_OFFICER indicators change
      // (backend API will filter by stateUt, so we'll only get indicators for our state)
      // For NODAL_OFFICERs: refresh if it's their state
      if (!shouldRefresh && eventDetail.role === "NODAL_OFFICER") {
        if (isStateApprover) {
          // STATE_APPROVER should always refresh when any NODAL_OFFICER indicators change
          // The backend API getAvailableIndicatorsForApprover filters by stateUt anyway
          shouldRefresh = true;
          console.log(
            "[useIndicatorAccess] STATE_APPROVER refreshing due to NODAL_OFFICER indicator change",
            {
              eventStateUt: eventDetail.stateUt,
              currentStateUt: stateUt,
            }
          );
        } else if (isNodalOfficer && eventDetail.stateUt) {
          // NODAL_OFFICER should refresh if it's their state
          // Normalize state names for comparison (case-insensitive, trim whitespace)
          const normalizeState = (s: string) => (s || "").trim().toLowerCase();
          const eventStateUt = normalizeState(eventDetail.stateUt);
          const currentStateUt = normalizeState(stateUt || "");

          // Handle comma-separated states (e.g., "State1, State2")
          const eventStates = eventStateUt
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const currentStates = currentStateUt
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          // Check if any state matches
          const stateMatches =
            eventStates.some((es) =>
              currentStates.some(
                (cs) => cs === es || cs.includes(es) || es.includes(cs)
              )
            ) ||
            eventStates.some((es) => currentStateUt.includes(es)) ||
            currentStates.some((cs) => eventStateUt.includes(cs));

          shouldRefresh = stateMatches || eventStateUt === currentStateUt;

          console.log("[useIndicatorAccess] NODAL_OFFICER state comparison", {
            eventStateUt: eventDetail.stateUt,
            currentStateUt: stateUt,
            normalizedEvent: eventStateUt,
            normalizedCurrent: currentStateUt,
            stateMatches,
            shouldRefresh,
          });
        }
      }

      // If no userId or stateUt specified, refresh for all users (e.g., when admin assigns indicators globally)
      if (!shouldRefresh && !eventDetail.userId && !eventDetail.stateUt) {
        shouldRefresh = true;
      }

      if (!shouldRefresh) {
        console.log(
          "[useIndicatorAccess] Indicators updated event received but skipping refresh",
          {
            eventDetail,
            currentUserId: userId,
            currentStateUt: stateUt,
            role: user?.role,
          }
        );
        return;
      }

      console.log(
        "[useIndicatorAccess] Indicators updated event received, refreshing cache...",
        {
          eventDetail,
          currentUserId: userId,
          currentStateUt: stateUt,
          role: user?.role,
          isNodalOfficer,
          isStateApprover,
        }
      );

      // Clear cache and refresh indicators
      console.log("[useIndicatorAccess] Calling refresh with clearCache=true");
      refresh({ clearCache: true })
        .then(() => {
          console.log("[useIndicatorAccess] Refresh completed");
        })
        .catch((err) => {
          console.error("[useIndicatorAccess] Refresh failed:", err);
        });
    };

    window.addEventListener("indicatorsUpdated", handleIndicatorUpdate);

    return () => {
      window.removeEventListener("indicatorsUpdated", handleIndicatorUpdate);
    };
  }, [refresh, userId, stateUt, user?.role, isNodalOfficer, isStateApprover]);

  return {
    loading,
    error,
    assignedIndicators,
    availableIndicators,
    effectiveIndicators, // Expose effective indicators (includes fallback)
    indicatorAccess,
    hasIndicatorAccess,
    hasSectionAccess: (sectionId: string) => {
      if (!isNodalOfficer) return true;
      const section = INDICATOR_SECTIONS.find((s) => s.id === sectionId);
      if (!section) return false;
      // If no indicators assigned, allow access to all sections (fallback)
      if (assignedIndicators.length === 0) {
        return true;
      }
      return section.indicators.some((indicator) =>
        assignedIndicators.includes(indicator)
      );
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
      if (!section)
        return {
          sectionId,
          hasAccess: false,
          assignedIndicators: [],
          hiddenIndicators: [],
        } as SectionAccess;

      // If no indicators assigned, show all indicators in section (fallback)
      if (assignedIndicators.length === 0) {
        return {
          sectionId,
          hasAccess: true,
          assignedIndicators: section.indicators,
          hiddenIndicators: [],
        } as SectionAccess;
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
      } as SectionAccess;
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
