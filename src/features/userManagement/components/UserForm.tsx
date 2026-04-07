/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { getRoleDisplayName } from "@/utils/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { NodalOfficer } from "../services/userManagement.service";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/AuthProvider";
import { statesService, State } from "@/services/states.service";
import { apiService } from "@/services/api.service";
import { INDICATOR_SECTIONS } from "@/utils/indicatorUtils";
import { ALL_INDICATOR_CODES } from "@/hooks/useIndicatorAccess";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";

interface UserFormProps {
  officer: NodalOfficer | null;
  onSave: (
    data: Omit<
      NodalOfficer,
      "id" | "state" | "createdAt" | "assignedIndicator"
    > & {
      password?: string;
      assignedIndicators?: string[];
      stateId?: string | string[];
    }
  ) => void;
  onCancel: () => void;
  // parent passes full indicator objects (or at least objects with `.code`)
  allIndicators?: { code?: string }[];
  officers?: NodalOfficer[];
  loadingIndicators?: boolean;
  stateApproverHasSubmission?: boolean;
  submittedIndicatorsInState?: string[];
}

function UserFormComponent({
  officer,
  onSave,
  onCancel,
  allIndicators = [],
  officers = [],
  loadingIndicators = false,
  stateApproverHasSubmission = false,
  submittedIndicatorsInState = [],
}: UserFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Local state for submitted indicators (fallback if not provided)
  const [localSubmittedIndicators, setLocalSubmittedIndicators] = useState<
    string[]
  >(() =>
    Array.isArray(submittedIndicatorsInState) ? submittedIndicatorsInState : []
  );

  // Use provided submittedIndicatorsInState or fallback to local state
  // Memoized to prevent unnecessary recalculations
  const effectiveSubmittedIndicators = useMemo(() => {
    const submitted = Array.isArray(submittedIndicatorsInState)
      ? submittedIndicatorsInState
      : [];
    return submitted.length > 0 ? submitted : localSubmittedIndicators;
  }, [submittedIndicatorsInState, localSubmittedIndicators]);

  // Debug: Log when component receives submittedIndicatorsInState
  useEffect(() => {
    console.log("🔍 [UserForm] Component mounted/re-rendered");
    console.log(
      "🔍 [UserForm] submittedIndicatorsInState prop:",
      submittedIndicatorsInState
    );
    console.log(
      "🔍 [UserForm] localSubmittedIndicators:",
      localSubmittedIndicators
    );
    console.log(
      "🔍 [UserForm] effectiveSubmittedIndicators:",
      effectiveSubmittedIndicators
    );
    console.log("🔍 [UserForm] Officer stateUt:", officer?.stateUt);
    console.log("🔍 [UserForm] Officer state:", officer?.state);
    console.log("🔍 [UserForm] Current user stateUt:", user?.stateUt);
    console.log("🔍 [UserForm] Current user state:", user?.state);
    console.log("🔍 [UserForm] Current user:", user);
  }, [
    submittedIndicatorsInState,
    localSubmittedIndicators,
    effectiveSubmittedIndicators,
    officer?.stateUt,
    officer?.state,
    user?.stateUt,
    user?.state,
    user,
  ]);

  // Fallback: Fetch submitted indicators if not provided and we have a stateUt
  useEffect(() => {
    const fetchIfNeeded = async () => {
      // Only fetch if:
      // 1. No submitted indicators provided
      // 2. We have a stateUt (from officer or user)
      // 3. We haven't already fetched for this stateUt
      const stateUt =
        officer?.stateUt || officer?.state || user?.stateUt || user?.state;
      const cacheKey = `${stateUt || "none"}`;

      if (
        submittedIndicatorsInState.length === 0 &&
        localSubmittedIndicators.length === 0 &&
        stateUt &&
        fetchedSubmittedIndicatorsRef.current !== cacheKey
      ) {
        fetchedSubmittedIndicatorsRef.current = cacheKey;

        try {
          const submitted = await apiService.getSubmittedIndicatorsInState(
            stateUt
          );
          setLocalSubmittedIndicators(submitted);
        } catch (error) {
          console.error(
            "❌ [UserForm] Error fetching submitted indicators (fallback):",
            error
          );
          fetchedSubmittedIndicatorsRef.current = ""; // Reset on error to allow retry
        }
      }
    };

    fetchIfNeeded();
  }, [
    submittedIndicatorsInState.length,
    localSubmittedIndicators.length,
    officer?.stateUt,
    officer?.state,
    user?.stateUt,
    user?.state,
  ]);

  // Update local state when prop changes
  useEffect(() => {
    if (submittedIndicatorsInState.length > 0) {
      setLocalSubmittedIndicators(submittedIndicatorsInState);
    }
  }, [submittedIndicatorsInState]);

  // Debug user info (temporarily enabled)
  // console.log("🔍 UserForm - User info:", {
  //   userRole: user?.role,
  //   userState: user?.state,
  //   userEmail: user?.email,
  //   isAdmin: user?.role === "ADMIN",
  // });

  // const [formData, setFormData] = useState({
  //   firstName: "",
  //   lastName: "",
  //   contactNumber: "",
  //   email: "",
  //   password: "",
  //   role: "NODAL_OFFICER",
  //   stateId: "",
  //   stateUt: "",
  //   assignedIndicators: [] as string[],
  // });

  // Initialize formData - restore from sessionStorage if available (for persistence across tab switches/page refresh)
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    contactNumber: string;
    email: string;
    password: string;
    role: string;
    stateId: string | string[]; // Allow array for multiple states
    assignedIndicators: string[];
    stateUt: string | string[];
  }>(() => {
    // Helper function to get default role based on current user
    const getDefaultRole = () => {
      let defaultRole = "NODAL_OFFICER";
      if (typeof window !== "undefined") {
        try {
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          if (currentUser?.role === "STATE_APPROVER") {
            defaultRole = "NODAL_OFFICER";
          } else if (currentUser?.role === "MOSPI_APPROVER") {
            defaultRole = "MOSPI_REVIEWER";
          } else if (currentUser?.role === "ADMIN") {
            defaultRole = "STATE_APPROVER";
          }
        } catch (e) {
          // Ignore errors
        }
      }
      return defaultRole;
    };

    // Helper function to get available role values based on current user
    const getAvailableRoleValues = () => {
      if (typeof window !== "undefined") {
        try {
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          const userRole = currentUser?.role;

          if (userRole === "STATE_APPROVER") {
            return ["NODAL_OFFICER"];
          } else if (userRole === "MOSPI_APPROVER") {
            return ["MOSPI_REVIEWER", "STATE_APPROVER"];
          } else if (userRole === "ADMIN") {
            return [
              "STATE_APPROVER",
              "MOSPI_REVIEWER",
              "MOSPI_APPROVER",
              "ADMIN",
            ];
          }
        } catch (e) {
          // Ignore errors
        }
      }
      return ["NODAL_OFFICER"]; // Default fallback
    };

    // Try to restore from sessionStorage if creating a new user (not editing)
    if (typeof window !== "undefined" && !officer) {
      const savedFormData = sessionStorage.getItem("userManagementFormDraft");
      if (savedFormData) {
        try {
          const parsed = JSON.parse(savedFormData);
          // Only restore if it's recent (within last hour) and has valid data
          if (
            parsed.timestamp &&
            Date.now() - parsed.timestamp < 3600000 &&
            parsed.data
          ) {
            const restoredData = parsed.data;
            const availableRoles = getAvailableRoleValues();
            const defaultRole = getDefaultRole();

            // Validate that the restored role is in the available roles list
            // If not, replace it with the default role
            if (
              !restoredData.role ||
              !availableRoles.includes(restoredData.role)
            ) {
              restoredData.role = defaultRole;
            }

            return restoredData;
          } else {
            // Clear old data
            sessionStorage.removeItem("userManagementFormDraft");
          }
        } catch (e) {
          console.warn("Failed to parse saved form data:", e);
          sessionStorage.removeItem("userManagementFormDraft");
        }
      }
    }

    // Default initial state
    const defaultRole = getDefaultRole();

    return {
      firstName: "",
      lastName: "",
      contactNumber: "",
      email: "",
      password: "",
      role: defaultRole,
      stateId: "",
      assignedIndicators: [],
      stateUt: "",
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [states, setStates] = useState<State[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAllSelectedIndicators, setShowAllSelectedIndicators] =
    useState(false);
  const [disabledStateNames, setDisabledStateNames] = useState<string[]>([]);
  const [nodalHasSubmission, setNodalHasSubmission] = useState(false);
  const [checkingNodalSubmission, setCheckingNodalSubmission] = useState(false);

  // State for API response
  const [availableIndicatorsForState, setAvailableIndicatorsForState] =
    useState<any[]>([]);

  // State for checking duplicates
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingContact, setCheckingContact] = useState(false);

  // Debounced values for real-time validation (increased debounce time to reduce API calls)
  const debouncedEmail = useDebounce(formData.email, 1000);
  const debouncedContactNumber = useDebounce(formData.contactNumber, 1000);

  // Refs to track if we've already fetched data to prevent duplicate calls
  const fetchedIndicatorsRef = useRef<string>("");
  const fetchedDisabledStatesRef = useRef<string>("");
  const fetchedSubmittedIndicatorsRef = useRef<string>("");
  const formDataInitializedRef = useRef(false); // Track if form data has been initialized to prevent unnecessary updates
  const lastFetchTimeRef = useRef<number>(0); // Track last fetch time to prevent rapid successive calls
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce timeout ref

  // Track last fetched values to prevent duplicate calls
  const lastFetchedRef = useRef<{
    stateName: string;
    officerId: string | undefined;
    role: string;
  } | null>(null);

  // Stabilize user role and state to prevent unnecessary re-renders
  const userRole = user?.role;
  const userState = user?.state;

  // Compute available indicators for selected state (using backend API for real-time data)
  useEffect(() => {
    // Skip during initialization to prevent unnecessary API calls
    if (isInitializingRef.current) {
      return;
    }

    // Early return checks BEFORE async function to prevent unnecessary calls
    // Only compute indicators if creating a NODAL_OFFICER
    if (formData.role !== "NODAL_OFFICER") {
      // Only reset if role actually changed
      if (lastFetchedRef.current?.role === "NODAL_OFFICER") {
        setAvailableIndicatorsForState([]);
        fetchedIndicatorsRef.current = ""; // Reset cache
        lastFetchedRef.current = null;
      }
      return;
    }

    // Admin should have access to all indicators - no need to fetch filtered list
    if (userRole === "ADMIN") {
      // For admin, use allIndicators directly but filter to only valid indicator codes
      if (allIndicators.length > 0) {
        // Only update if not already set or if allIndicators changed
        const validIndicators = allIndicators.filter(
          (ind: any) => ind.code && ALL_INDICATOR_CODES.includes(ind.code)
        );
        const formattedAvailable = validIndicators.map((ind: any) => ({
          code: ind.code,
          name: ind.name || getIndicatorDisplayName(ind.code),
          category: ind.category || ind.section || "",
          id: ind.id,
        }));
        setAvailableIndicatorsForState(formattedAvailable);
      }
      return;
    }

    // For non-admin users (STATE_APPROVER, etc.), fetch filtered indicators
    const stateName = userState || "";

    if (!stateName) {
      setAvailableIndicatorsForState([]);
      return;
    }

    // Create cache key to prevent duplicate API calls
    // Use a stable key based on state and officer only (not allIndicators.length)
    const cacheKey = `${stateName}-${officer?.id || "new"}`;

    // Check if we've already fetched for this exact scenario BEFORE async function
    // Compare with last fetched values to prevent duplicate calls
    if (
      fetchedIndicatorsRef.current === cacheKey &&
      lastFetchedRef.current?.stateName === stateName &&
      lastFetchedRef.current?.officerId === (officer?.id || "new") &&
      lastFetchedRef.current?.role === formData.role
    ) {
      return; // Already fetched, skip
    }

    // Throttle: Only as a safety mechanism - prevent rapid successive calls
    // This should NOT trigger periodic calls, only prevent duplicate rapid calls
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    const THROTTLE_MS = 1000; // 1 second safety throttle - only prevents rapid duplicates

    // Only throttle if we've fetched very recently (within 1 second)
    // This prevents duplicate calls from rapid state updates, not periodic calls
    if (
      timeSinceLastFetch < THROTTLE_MS &&
      fetchedIndicatorsRef.current === cacheKey
    ) {
      // Skip only if cache key matches AND it's been less than 1 second
      // This means it's a duplicate rapid call, not a legitimate change
      return;
    }

    // Update last fetch time BEFORE async call
    lastFetchTimeRef.current = now;

    const computeAvailableIndicators = async () => {
      try {
        // Use backend API to get real-time available indicators
        const availableIndicators: any =
          await apiService.getAvailableIndicatorsForApprover(stateName);

        // Handle response structure (interceptor may have extracted data)
        let indicators: any = availableIndicators;
        if (
          availableIndicators &&
          typeof availableIndicators === "object" &&
          !Array.isArray(availableIndicators)
        ) {
          // If response has data property, extract it
          if (
            availableIndicators.data &&
            Array.isArray(availableIndicators.data)
          ) {
            indicators = availableIndicators.data;
          } else if (Array.isArray(availableIndicators)) {
            indicators = availableIndicators;
          } else {
            indicators = [];
          }
        }

        // Ensure we have an array
        if (!Array.isArray(indicators)) {
          console.warn(
            "⚠️ API returned invalid indicators format:",
            indicators
          );
          indicators = [];
        }

        // Filter out indicators that have been submitted by STATE_APPROVERs in this state
        // This prevents submitted indicators (like 4.5) from appearing in the assignment list
        try {
          const submissionsResp = await apiService.getSubmissions(1, 100);
          const submissionsArray = Array.isArray(submissionsResp)
            ? submissionsResp
            : submissionsResp?.submissions || [];

          // Find STATE_APPROVER submissions for this state
          const stateApproverSubmissions = submissionsArray.filter(
            (sub: any) => {
              const isStateApprover =
                sub.user?.role === "STATE_APPROVER" ||
                sub.currentOwnerRole === "STATE_APPROVER";
              const isSameState =
                !stateName ||
                (sub.stateUt || sub.user?.stateUt || "").toUpperCase() ===
                  stateName.toUpperCase();
              return isStateApprover && isSameState;
            }
          );

          // Extract submitted indicator codes
          const submittedIndicatorCodes = new Set<string>();
          stateApproverSubmissions.forEach((submission: any) => {
            const formData = submission.formData || {};
            const categories = [
              "infraFinancing",
              "infraDevelopment",
              "pppDevelopment",
              "infraEnablers",
            ];

            categories.forEach((category) => {
              const categoryData = formData[category] || {};
              Object.keys(categoryData).forEach((sectionKey) => {
                if (sectionKey.startsWith("section")) {
                  const sectionData = categoryData[sectionKey];
                  const status = sectionData?.status?.toUpperCase() || "";

                  // If indicator has been submitted (not DRAFT or empty), exclude it
                  if (
                    status &&
                    status !== "DRAFT" &&
                    status !== "NOT_STARTED"
                  ) {
                    const indicatorCode = sectionKey
                      .replace("section", "")
                      .replace("_", ".");
                    if (ALL_INDICATOR_CODES.includes(indicatorCode)) {
                      submittedIndicatorCodes.add(indicatorCode);
                    }
                  }
                }
              });
            });
          });

          // Filter out submitted indicators
          if (submittedIndicatorCodes.size > 0) {
            const beforeFilter = indicators.length;
            indicators = indicators.filter((ind: any) => {
              const code = ind?.code || ind;
              return !submittedIndicatorCodes.has(code);
            });
            console.log(
              `[UserForm] Filtered out ${
                beforeFilter - indicators.length
              } submitted indicators from available list for state ${stateName}`
            );
            console.log(
              `[UserForm] Submitted indicators excluded:`,
              Array.from(submittedIndicatorCodes)
            );
          }
        } catch (submissionErr) {
          console.warn(
            "[UserForm] Failed to filter submitted indicators, using all available indicators:",
            submissionErr
          );
          // Continue with all available indicators if filtering fails
        }

        setAvailableIndicatorsForState(indicators);
        fetchedIndicatorsRef.current = cacheKey; // Cache the result to prevent duplicate API calls
        // Track what we just fetched
        lastFetchedRef.current = {
          stateName,
          officerId: officer?.id || "new",
          role: formData.role,
        };
      } catch (error) {
        console.error(
          "❌ Failed to fetch available indicators from API, falling back to frontend filtering:",
          error
        );

        // Strict behavior: do not fall back to showing *all* indicators.
        // If the API for "available indicators" fails/returns empty, we prefer an empty list
        // so users don't see indicators already assigned to other nodal officers as selectable.
        setAvailableIndicatorsForState([]);
        fetchedIndicatorsRef.current = cacheKey; // Cache the result
        // Track what we just fetched
        lastFetchedRef.current = {
          stateName,
          officerId: officer?.id || "new",
          role: formData.role,
        };
      }
    };

    computeAvailableIndicators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.role, userRole, userState, officer?.id]); // Use stabilized userRole/userState instead of user?.role/user?.state

  // Build the options list - always include ALL valid indicators from ALL_INDICATOR_CODES
  // This ensures indicators don't disappear when deselected
  const indicatorOptions: MultiSelectOption[] = useMemo(() => {
    // Collect all codes from API response (available indicators)
    let apiCodes: string[] = [];
    if (
      !availableIndicatorsForState ||
      availableIndicatorsForState.length === 0
    ) {
      apiCodes = [];
    } else if (
      availableIndicatorsForState.length > 0 &&
      typeof availableIndicatorsForState[0] === "object"
    ) {
      apiCodes = availableIndicatorsForState
        .map((item: any) => item.code)
        .filter(Boolean);
    } else {
      apiCodes = availableIndicatorsForState.filter(Boolean);
    }

    // Get currently assigned indicators
    const assigned = formData.assignedIndicators || [];

    // Get submitted indicators that are currently assigned - these MUST always appear
    const submittedAssigned = effectiveSubmittedIndicators.filter((code) =>
      assigned.includes(code)
    );

    // Get original assigned indicators from officer (when editing)
    // This ensures indicators remain visible even after deselection
    const originalAssigned = officer?.assignedIndicators
      ? Array.isArray(officer.assignedIndicators)
        ? officer.assignedIndicators
        : [officer.assignedIndicators]
      : [];

    // CRITICAL: Build allCodes to ensure indicators are always visible
    // This prevents indicators from disappearing when deselected
    let allCodes: string[] = [];

    if (user?.role === "ADMIN") {
      // Admin can see and assign all valid indicators
      allCodes = [...ALL_INDICATOR_CODES];
    } else {
      // For non-admin users (STATE_APPROVER, etc.):
      // Show indicators that are available from API (not assigned to other users)
      // OR currently assigned to the user being edited
      // OR originally assigned to the user being edited (to allow re-selection after deselection)

      // Start with API codes (available indicators that aren't assigned to others)
      if (apiCodes.length > 0) {
        allCodes = [...apiCodes];
      }

      // CRITICAL: Always include ALL currently assigned indicators
      // This ensures they remain visible even if API doesn't return them
      assigned.forEach((code) => {
        if (!allCodes.includes(code) && ALL_INDICATOR_CODES.includes(code)) {
          allCodes.push(code);
        }
      });

      // CRITICAL: When editing, always include originally assigned indicators
      // This allows re-selection after deselection
      if (officer && originalAssigned.length > 0) {
        originalAssigned.forEach((code) => {
          if (!allCodes.includes(code) && ALL_INDICATOR_CODES.includes(code)) {
            allCodes.push(code);
          }
        });
      }

      // If API returned nothing, keep list empty (no showing all indicators).
      // Already assigned indicators are still included below (assigned/originalAssigned/submittedAssigned).
    }

    // CRITICAL: Ensure ALL submitted indicators that are assigned are ALWAYS in allCodes
    // This prevents them from disappearing even if they're temporarily removed from assigned
    submittedAssigned.forEach((code) => {
      if (!allCodes.includes(code) && ALL_INDICATOR_CODES.includes(code)) {
        allCodes.unshift(code); // Add at beginning to keep them visible
      }
    });

    // Remove duplicates while preserving order (submitted/assigned first, then others)
    allCodes = Array.from(new Set(allCodes));

    // Build name map - prioritize frontend mapping for 4.x indicators, then API response, then allIndicators, then fallback
    const indicatorNameMap: Record<string, string> = {};
    const indicatorCategoryMap: Record<string, string> = {};

    // First, set frontend display names for Infrastructure Enablers (4.1-4.5) to ensure correct names
    // This overrides any incorrect names from the backend API
    const infraEnablersCodes = ["4.1", "4.2", "4.3", "4.4", "4.5"];
    infraEnablersCodes.forEach((code) => {
      indicatorNameMap[code] = getIndicatorDisplayName(code);
    });

    // Then, add from API response (but don't override 4.x indicators we just set)
    if (
      availableIndicatorsForState &&
      availableIndicatorsForState.length > 0 &&
      typeof availableIndicatorsForState[0] === "object"
    ) {
      availableIndicatorsForState.forEach((item: any) => {
        if (item && item.code) {
          // Only use API name if it's not a 4.x indicator (we want frontend names for those)
          if (!infraEnablersCodes.includes(item.code) && item.name) {
            indicatorNameMap[item.code] = item.name;
          }
          if (item.category) indicatorCategoryMap[item.code] = item.category;
        }
      });
    }

    // Then, add from allIndicators for any missing ones (especially assigned indicators)
    allIndicators.forEach((ind: any) => {
      const code = ind.code;
      if (code) {
        // Only use allIndicators name if it's not a 4.x indicator and not already set
        if (
          !infraEnablersCodes.includes(code) &&
          !indicatorNameMap[code] &&
          ind.name
        ) {
          indicatorNameMap[code] = ind.name;
        }
        if (!indicatorCategoryMap[code] && (ind.category || ind.section)) {
          indicatorCategoryMap[code] = ind.category || ind.section || "";
        }
      }
    });

    // Finally, fallback to getIndicatorDisplayName for any remaining codes
    allCodes.forEach((code: string) => {
      if (!indicatorNameMap[code]) {
        indicatorNameMap[code] = getIndicatorDisplayName(code);
      }
    });

    // Build options array - ensure ALL codes (especially assigned ones) are included
    const options = allCodes.map((code: string) => {
      // Try to get category from availableIndicatorsForState first
      let section = indicatorCategoryMap[code] || "";
      let description = indicatorNameMap[code];

      // If not found in maps, try to find in API response
      if (
        !section &&
        availableIndicatorsForState &&
        availableIndicatorsForState.length > 0 &&
        typeof availableIndicatorsForState[0] === "object"
      ) {
        const found = availableIndicatorsForState.find(
          (item: any) => item.code === code
        );
        if (found) {
          section = found.category || section;
          description = found.name || description;
        }
      }

      const isSubmitted = effectiveSubmittedIndicators.includes(code);

      // Debug logging for indicator 1.1 specifically
      if (code === "1.1") {
        console.log("🔍 [UserForm] Indicator 1.1 Debug:", {
          code,
          isSubmitted,
          submittedIndicatorsInState,
          effectiveSubmittedIndicators,
          inArray: effectiveSubmittedIndicators.includes(code),
          assigned: assigned.includes(code),
          allCodesIncludes: allCodes.includes(code),
          submittedIndicatorsLength: submittedIndicatorsInState.length,
        });
      }

      return {
        value: code,
        label: isSubmitted
          ? `${code} - ${indicatorNameMap[code]} (Submitted)`
          : `${code} - ${indicatorNameMap[code]}`,
        section,
        description,
        disabled: isSubmitted,
      };
    });

    // Debug logging to help troubleshoot
    if (formData.assignedIndicators && formData.assignedIndicators.length > 0) {
      console.log("🔍 [UserForm] Indicator Options Debug:", {
        assignedIndicators: formData.assignedIndicators,
        availableFromAPI: apiCodes.length,
        allCodesCount: allCodes.length,
        optionsCount: options.length,
        assignedInOptions: options
          .filter((opt) => formData.assignedIndicators.includes(opt.value))
          .map((opt) => opt.value),
        submittedIndicatorsInState: submittedIndicatorsInState,
        effectiveSubmittedIndicators: effectiveSubmittedIndicators,
        localSubmittedIndicators: localSubmittedIndicators,
        submittedIndicatorsCount: effectiveSubmittedIndicators.length,
        disabledOptions: options
          .filter((opt) => opt.disabled)
          .map((opt) => opt.value),
      });
    }

    return options;
  }, [
    availableIndicatorsForState,
    formData.assignedIndicators,
    allIndicators,
    effectiveSubmittedIndicators,
  ]);

  // Memoize the MultiSelect value to ensure submitted indicators are always included
  const multiSelectValue = useMemo(() => {
    // Ensure submitted indicators are always in the value, even if somehow removed
    const currentAssigned = formData.assignedIndicators || [];
    // Always include submitted indicators that are assigned to this user
    const submittedAssigned = effectiveSubmittedIndicators.filter((code) =>
      currentAssigned.includes(code)
    );
    // Merge: current assigned + ensure submitted ones are included
    const finalValue = Array.from(
      new Set([...currentAssigned, ...submittedAssigned])
    );
    return finalValue;
  }, [formData.assignedIndicators, effectiveSubmittedIndicators]);

  // Removed useEffect syncing stateUt from stateId; now handled only in handleStateChange

  // Debug: Log indicator options to verify 4.6 is included
  useEffect(() => {
    // console.log("🔍 Indicator Options:", indicatorOptions);
    // console.log(
    //   "🔍 4.6 in options:",
    //   indicatorOptions.find((opt) => opt.value === "4.6")
    // );
  }, []);

  // Handle indicator selection change - memoized to prevent re-renders
  const handleIndicatorChange = useCallback(
    (selectedIndicators: string[]) => {
      console.log("🔍 [UserForm] handleIndicatorChange called:", {
        selectedIndicators,
        currentAssigned: formData.assignedIndicators,
        submittedIndicatorsInState,
        effectiveSubmittedIndicators,
      });

      // Always preserve submitted indicators that are currently assigned
      const currentlySelected = formData.assignedIndicators || [];
      const submittedAssigned = currentlySelected.filter((ind) =>
        effectiveSubmittedIndicators.includes(ind)
      );

      console.log(
        "🔍 [UserForm] handleIndicatorChange - submittedAssigned:",
        submittedAssigned
      );

      // Check if user tried to remove any submitted indicators
      const beingRemoved = currentlySelected.filter(
        (ind) => !selectedIndicators.includes(ind)
      );
      const cannotRemove = beingRemoved.filter((ind) =>
        effectiveSubmittedIndicators.includes(ind)
      );

      console.log(
        "🔍 [UserForm] handleIndicatorChange - beingRemoved:",
        beingRemoved
      );
      console.log(
        "🔍 [UserForm] handleIndicatorChange - cannotRemove:",
        cannotRemove
      );

      // If user tried to remove submitted indicators, show error and prevent change
      if (cannotRemove.length > 0) {
        console.warn(
          "⚠️ [UserForm] Attempted to remove submitted indicators:",
          cannotRemove
        );
        toast({
          title: "Cannot Remove Indicators",
          description: `The following indicators are already submitted and cannot be removed: ${cannotRemove.join(
            ", "
          )}`,
          variant: "destructive",
        });
        // Don't update state - keep submitted indicators
        return;
      }

      // Merge: keep submitted indicators + new selection (excluding submitted ones from new selection to avoid duplicates)
      const newSelectionWithoutSubmitted = selectedIndicators.filter(
        (ind) => !effectiveSubmittedIndicators.includes(ind)
      );
      const finalSelection = [
        ...submittedAssigned,
        ...newSelectionWithoutSubmitted,
      ];

      console.log(
        "🔍 [UserForm] handleIndicatorChange - finalSelection:",
        finalSelection
      );

      // Always update with final selection (includes submitted indicators)
      setFormData((prev) => ({
        ...prev,
        assignedIndicators: finalSelection,
      }));
    },
    [effectiveSubmittedIndicators, toast, formData.assignedIndicators]
  );

  // Fetch assigned indicators from API for editing
  const fetchAssignedIndicators = async (userId: string) => {
    try {
      // console.log("🔍 Fetching assigned indicators for user:", userId);
      const indicators = await apiService.getUserAssignedIndicators(userId);
      //console.log("🔍 Fetched indicators:", indicators);

      if (Array.isArray(indicators) && indicators.length > 0) {
        setFormData((prev) => ({
          ...prev,
          assignedIndicators: indicators,
        }));
      }
    } catch (error) {
      console.error("❌ Failed to fetch assigned indicators:", error);
      // Don't show error to user as this is for edit mode
    }
  };

  // Check if nodal officer has submitted their form
  const checkNodalOfficerSubmission = async (userId: string) => {
    if (!userId || formData.role !== "NODAL_OFFICER") {
      setNodalHasSubmission(false);
      return;
    }

    setCheckingNodalSubmission(true);
    try {
      const response = await apiService.get(`/submission/user/${userId}`);
      const submission = response?.data?.data || response?.data;

      if (submission?.id && submission?.formData) {
        const formData = submission.formData;
        // Check if any step has data
        const hasData = Object.keys(formData).some((stepKey) => {
          const stepData = formData[stepKey];
          if (typeof stepData === "object" && stepData !== null) {
            return Object.keys(stepData).length > 0;
          }
          return false;
        });
        setNodalHasSubmission(hasData);
      } else {
        setNodalHasSubmission(false);
      }
    } catch (error: any) {
      // If 404 or no submissions, set to false
      if (error?.response?.status === 404) {
        setNodalHasSubmission(false);
      } else {
        console.warn("⚠️ Error checking nodal officer submission:", error);
        setNodalHasSubmission(false);
      }
    } finally {
      setCheckingNodalSubmission(false);
    }
  };

  // Get available roles based on current user's role
  const getAvailableRoles = useCallback(() => {
    const currentUserRole = user?.role;

    // console.log("🔍 getAvailableRoles - Current user role:", currentUserRole);

    switch (currentUserRole) {
      case "STATE_APPROVER":
        // State Approver can only create Nodal Officers
        return [
          {
            value: "NODAL_OFFICER",
            label: getRoleDisplayName("NODAL_OFFICER"),
          },
        ];
      case "MOSPI_APPROVER":
        // MoSPI Approver can create MoSPI Reviewers and State Approvers
        return [
          {
            value: "MOSPI_REVIEWER",
            label: getRoleDisplayName("MOSPI_REVIEWER"),
          },
          {
            value: "STATE_APPROVER",
            label: getRoleDisplayName("STATE_APPROVER"),
          },
        ];
      case "ADMIN":
        // Admin can create all roles (for system administration)
        return [
          {
            value: "STATE_APPROVER",
            label: getRoleDisplayName("STATE_APPROVER"),
          },
          {
            value: "MOSPI_REVIEWER",
            label: getRoleDisplayName("MOSPI_REVIEWER"),
          },
          {
            value: "MOSPI_APPROVER",
            label: getRoleDisplayName("MOSPI_APPROVER"),
          },
          { value: "ADMIN", label: getRoleDisplayName("ADMIN") },
        ];
      default:
        // Default fallback - no roles available
        return [];
    }
  }, [user?.role]);

  // Track if we've already fixed the role to prevent infinite loops
  const roleFixedRef = useRef(false);
  const isInitializingRef = useRef(false); // Track if form is initializing

  // Validate and fix role if it's not in available roles (only once)
  // Skip during initialization to prevent cascading updates
  useEffect(() => {
    // Skip if form is initializing or if role is already fixed
    if (isInitializingRef.current || roleFixedRef.current) {
      return;
    }

    if (!officer && formData.role) {
      const availableRoles = getAvailableRoles();
      const availableRoleValues = availableRoles.map((r) => r.value);

      // If current role is not in available roles, fix it (only once)
      if (!availableRoleValues.includes(formData.role)) {
        const defaultRole =
          availableRoles.length > 0 ? availableRoles[0].value : "NODAL_OFFICER";
        roleFixedRef.current = true; // Mark as fixed to prevent loop
        // Use setTimeout to batch this update and prevent immediate re-render
        setTimeout(() => {
          setFormData((prev) => ({ ...prev, role: defaultRole }));
        }, 0);
      } else {
        roleFixedRef.current = true; // Role is valid, mark as checked
      }
    }

    // Reset flag when officer changes or when creating new user
    if (!officer && !formData.role) {
      roleFixedRef.current = false;
    }
  }, [formData.role, user?.role, officer, getAvailableRoles]);

  useEffect(() => {
    // Reset initialization flag when officer changes (switching between edit/new)
    formDataInitializedRef.current = false;
    isInitializingRef.current = true; // Mark as initializing
    roleFixedRef.current = false; // Reset role fixed flag

    if (officer) {
      // console.log("🔍 Setting form data for officer:", {
      //   officer,
      //   stateId: officer.stateId,
      //   state: officer.state,
      // });
      const stateIdsRaw = officer.state
        ? officer.state
            .split(",")
            .map((name) => {
              const match = states.find((s) => s.name.trim() === name.trim());
              return match ? match.id : officer.state;
            })
            .filter(Boolean)
        : [];
      // Deduplicate stateIds
      const stateIds = Array.from(new Set(stateIdsRaw));
      // Get unique state names for stateUt
      const uniqueStateNames = Array.from(
        new Set(
          stateIds.map((id) => {
            const found = states.find((s) => s.id === id);
            return found ? found.name : id;
          })
        )
      );
      // Only update form data if it hasn't been initialized for this officer
      if (!formDataInitializedRef.current) {
        setFormData({
          firstName: officer.firstName || "",
          lastName: officer.lastName || "",
          contactNumber: officer.contactNumber || "",
          email: officer.email || "",
          password: "", // Don't show password for existing users
          role: officer.role || "NODAL_OFFICER",
          stateId: stateIds, // Will be set after states are loaded
          stateUt: uniqueStateNames.join(", "), // Always unique, comma-separated string
          assignedIndicators: (() => {
            if (Array.isArray(officer.assignedIndicators)) {
              return officer.assignedIndicators as string[];
            }
            if (
              officer.assignedIndicators &&
              typeof officer.assignedIndicators === "object"
            ) {
              try {
                const arr = officer.assignedIndicators as any;
                if (Array.isArray(arr)) {
                  return arr
                    .map(
                      (ai: any) => ai.indicator?.code || ai.indicatorId || ai
                    )
                    .filter(Boolean) as string[];
                }
              } catch (e) {
                // Ignore
              }
            }
            return [];
          })(),
        });
        formDataInitializedRef.current = true;
      }

      // Fetch assigned indicators from API for NODAL_OFFICER
      if (officer.role === "NODAL_OFFICER" && officer.id) {
        fetchAssignedIndicators(officer.id);
        // Check if nodal officer has submitted
        checkNodalOfficerSubmission(officer.id);
      } else {
        setNodalHasSubmission(false);
      }
    } else {
      // For new user: Restore from sessionStorage if available, otherwise use defaults
      // Don't clear sessionStorage here - it should only be cleared on save or cancel
      // This allows form data to persist across tab switches and page refreshes

      // Check if we have saved data in sessionStorage
      const savedFormData =
        typeof window !== "undefined"
          ? sessionStorage.getItem("userManagementFormDraft")
          : null;

      if (savedFormData) {
        try {
          const parsed = JSON.parse(savedFormData);
          // Only restore if it's recent (within last hour) and has valid data
          if (
            parsed.timestamp &&
            Date.now() - parsed.timestamp < 3600000 &&
            parsed.data
          ) {
            // Get available roles to validate restored role
            const availableRoles = getAvailableRoles();
            const availableRoleValues = availableRoles.map((r) => r.value);
            const defaultRole =
              availableRoles.length > 0
                ? availableRoles[0].value
                : "NODAL_OFFICER";

            // Validate that the restored role is in the available roles list
            // If not, replace it with the first available role (default)
            const restoredData = { ...parsed.data };
            if (
              !restoredData.role ||
              !availableRoleValues.includes(restoredData.role)
            ) {
              restoredData.role = defaultRole;
            }

            // Only restore if form hasn't been initialized yet
            if (!formDataInitializedRef.current) {
              // Restore form data from sessionStorage (with validated role)
              setFormData(restoredData);
              formDataInitializedRef.current = true;
              roleFixedRef.current = true; // Mark role as fixed since it's restored
              // Reset cache refs to allow fresh API calls with restored data
              fetchedIndicatorsRef.current = "";
              fetchedDisabledStatesRef.current = "";
              fetchedSubmittedIndicatorsRef.current = "";
              lastCheckedEmailRef.current = "";
              lastCheckedContactRef.current = "";
              // Clear errors when restoring
              setErrors({});
              setNodalHasSubmission(false);

              // Mark initialization complete after a brief delay
              setTimeout(() => {
                isInitializingRef.current = false;
              }, 100);

              return; // Exit early - form data restored from sessionStorage
            }
          } else {
            // Clear old/stale data
            sessionStorage.removeItem("userManagementFormDraft");
          }
        } catch (e) {
          console.warn("Failed to parse saved form data:", e);
          sessionStorage.removeItem("userManagementFormDraft");
        }
      }

      // No saved data or data is stale - use default values
      // Reset cache refs to allow fresh API calls
      fetchedIndicatorsRef.current = "";
      fetchedDisabledStatesRef.current = "";
      fetchedSubmittedIndicatorsRef.current = "";
      lastCheckedEmailRef.current = "";
      lastCheckedContactRef.current = "";

      // Determine default role based on user role
      let defaultRole = "NODAL_OFFICER";
      if (user?.role === "STATE_APPROVER") {
        defaultRole = "NODAL_OFFICER";
      } else if (user?.role === "MOSPI_APPROVER") {
        defaultRole = "MOSPI_REVIEWER";
      } else if (user?.role === "ADMIN") {
        defaultRole = "STATE_APPROVER";
      }

      // Only set default form values if form hasn't been initialized yet
      if (!formDataInitializedRef.current) {
        // Set default form values
        setFormData({
          firstName: "",
          lastName: "",
          contactNumber: "",
          email: "",
          password: "",
          role: defaultRole,
          stateId: user?.role === "ADMIN" ? "" : user?.state || "",
          assignedIndicators: [],
          stateUt: "",
        });
        formDataInitializedRef.current = true;
        roleFixedRef.current = false; // Reset role fixed flag for new user

        // Clear errors
        setErrors({});

        // Reset nodal submission check for new user
        setNodalHasSubmission(false);

        // Mark initialization complete after a brief delay
        setTimeout(() => {
          isInitializingRef.current = false;
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    officer?.id,
    officer?.firstName,
    officer?.lastName,
    officer?.email,
    officer?.contactNumber,
    officer?.role,
    officer?.state,
    user?.state,
    user?.role,
  ]); // Removed states array to prevent frequent re-renders

  // Debounce ref for sessionStorage saves to prevent excessive writes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save form data to sessionStorage whenever it changes (only for new users) - debounced
  // Skip during initialization to prevent unnecessary saves
  useEffect(() => {
    // Skip if form is initializing or if editing an existing user
    if (isInitializingRef.current || officer || typeof window === "undefined") {
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save to prevent excessive sessionStorage writes and UI flickering
    // Increased debounce time to 1000ms to reduce frequency
    saveTimeoutRef.current = setTimeout(() => {
      // Only save if form has meaningful data (not empty form)
      const hasData =
        formData.firstName ||
        formData.lastName ||
        formData.email ||
        formData.contactNumber ||
        formData.password ||
        (Array.isArray(formData.assignedIndicators) &&
          formData.assignedIndicators.length > 0);

      if (hasData) {
        const dataToSave = {
          data: formData,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(
          "userManagementFormDraft",
          JSON.stringify(dataToSave)
        );
      } else {
        // Clear sessionStorage if form is empty
        sessionStorage.removeItem("userManagementFormDraft");
      }
    }, 1000); // Increased debounce to 1000ms to reduce frequency
    // Cleanup timeout on unmount or when officer changes
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, officer]);

  // Load states on component mount
  useEffect(() => {
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const statesData = await statesService.getStates();
        // console.log("🔍 States loaded in UserForm:", {
        //   statesCount: statesData.length,
        //   firstState: statesData[0],
        //   userRole: user?.role,
        // });
        setStates(statesData);

        // If we have an officer but no stateId, try to find it by stateUt/state name
        if (
          officer &&
          (!officer.stateId || officer.stateId === "") &&
          officer.state
        ) {
          const foundState = statesData.find(
            (state) =>
              state.name.toLowerCase() === officer.state.toLowerCase() ||
              state.code.toLowerCase() === officer.state.toLowerCase()
          );

          if (foundState) {
            // console.log("🔍 Found matching state:", foundState);
            setFormData((prev) => ({
              ...prev,
              stateId: foundState.id,
            }));
          } else {
            console.warn("⚠️ No matching state found for:", officer.state);
          }
        }
      } catch (error) {
        console.error("Error loading states:", error);
      } finally {
        setLoadingStates(false);
      }
    };

    loadStates();
  }, [officer, user?.role]);

  // Set stateId after states are loaded and officer is available
  useEffect(() => {
    if (officer && states.length > 0 && !formData.stateId) {
      const foundState = states.find(
        (state) =>
          state.name.toLowerCase() === officer.state.toLowerCase() ||
          state.code.toLowerCase() === officer.state.toLowerCase()
      );

      if (foundState) {
        setFormData((prev) => ({
          ...prev,
          stateId: foundState.id,
        }));
      } else {
        console.warn("⚠️ No matching state found for form:", officer.state);
      }
    }
  }, [officer, states, formData.stateId]);

  // Helper function to validate alphabets only (letters, spaces, hyphens, apostrophes)
  const isAlphabetsOnly = (value: string): boolean => {
    if (!value || typeof value !== "string") return false;
    // Allow letters, spaces, hyphens, apostrophes (for names like "O'Brien", "Mary-Jane")
    // Unicode regex for letters including accented characters
    return /^[\p{L}\s'-]+$/u.test(value.trim());
  };

  const validateStrongPassword = (password: string): string | null => {
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password) ||
      !/[^A-Za-z\d]/.test(password)
    ) {
      return "Password must be at least 8 characters and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.";
    }
    return null;
  };

  const GENERIC_EMAIL_VALIDATION_MESSAGE =
    "Unable to verify this email. Please check and try again.";
  const GENERIC_CONTACT_VALIDATION_MESSAGE =
    "Unable to verify this contact number. Please check and try again.";

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (!isAlphabetsOnly(formData.firstName)) {
      newErrors.firstName =
        "First name should contain only letters, spaces, hyphens, and apostrophes";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (!isAlphabetsOnly(formData.lastName)) {
      newErrors.lastName =
        "Last name should contain only letters, spaces, hyphens, and apostrophes";
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    } else if (!/^\d{10}$/.test(formData.contactNumber.replace(/\s/g, ""))) {
      newErrors.contactNumber = "Please enter a valid 10-digit phone number";
    }
    // Note: Duplicate check is done via API in handleSubmit, not here
    // This prevents false positives from incomplete local officers array

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    } else if (!/@(gov\.in|nic\.in)$/i.test(formData.email)) {
      newErrors.email = "Only @gov.in and @nic.in email addresses are allowed";
    }

    // Password is required only for new users
    if (!officer && !formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (!officer) {
      const passwordError = validateStrongPassword(formData.password);
      if (passwordError) {
        newErrors.password = passwordError;
      }
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    // Indicator assignment is optional for NODAL_OFFICER
    // If no indicators are assigned, the user will see all indicators (via effectiveIndicators logic)

    // ✅ State validation - ADMIN and MOSPI_APPROVER roles don't require state
    if (user?.role === "ADMIN" || user?.role === "MOSPI_APPROVER") {
      if (formData.role === "MOSPI_REVIEWER") {
        // Validate multiple states for MOSPI_REVIEWER
        if (!Array.isArray(formData.stateId) || formData.stateId.length === 0) {
          newErrors.stateId = "Please select at least one state";
        }
      } else if (
        formData.role !== "MOSPI_APPROVER" &&
        formData.role !== "ADMIN"
      ) {
        // Validate single state for other roles (excluding MOSPI_APPROVER and ADMIN)
        if (
          !formData.stateId ||
          (Array.isArray(formData.stateId) && formData.stateId.length === 0)
        ) {
          newErrors.stateId = "State is required";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit1 = () => {
    if (!validate()) return;

    const normalizedStateId =
      formData.role === "MOSPI_REVIEWER"
        ? Array.isArray(formData.stateId)
          ? formData.stateId.filter(Boolean)
          : formData.stateId
          ? [formData.stateId]
          : []
        : Array.isArray(formData.stateId)
        ? [formData.stateId[0] ?? ""].filter(Boolean)
        : formData.stateId
        ? [formData.stateId]
        : [];

    const stateNames = normalizedStateId.map(
      (id) => states.find((s) => s.id === id)?.name ?? id
    );

    const payload = {
      ...formData,
      stateUt: stateNames.join(", "), // string for backend
      stateId: normalizedStateId, // ✅ string for backend
    };
    type SubmitPayload = Omit<
      NodalOfficer,
      "id" | "state" | "createdAt" | "assignedIndicator"
    > & {
      password?: string;
      assignedIndicators?: string[];
      stateId?: string | string[];
      stateUt?: string; // ✅ string, since we're joining
    };

    // Clear saved draft before saving
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("userManagementFormDraft");
    }

    console.log("payload", formData);

    onSave(payload as SubmitPayload); // Make sure onSave type includes stateUt
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // Always check email via API before saving (even if unchanged)
    // This ensures we verify against the full database, not just local officers array
    if (
      formData.email.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      try {
        console.log(
          "🔍 [handleSubmit] Checking email availability via API...",
          {
            email: formData.email,
            officerId: officer?.id,
            isEditing: !!officer,
          }
        );

        setCheckingEmail(true);
        const isEmailAvailable = await apiService.checkEmailAvailability(
          formData.email,
          officer?.id // This excludes current user when editing
        );

        console.log("🔍 [handleSubmit] Email API response:", {
          isAvailable: isEmailAvailable,
          email: formData.email,
        });

        if (!isEmailAvailable) {
          setErrors((prev) => ({
            ...prev,
            email: GENERIC_EMAIL_VALIDATION_MESSAGE,
          }));
          setCheckingEmail(false);
          // Error is shown inline in the UI, no toast needed
          return; // Stop submission
        }

        // Clear any existing email errors if API check passes
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (
            newErrors.email ===
            GENERIC_EMAIL_VALIDATION_MESSAGE
          ) {
            delete newErrors.email;
          }
          return newErrors;
        });
      } catch (error: any) {
        console.error(
          "❌ [handleSubmit] Error checking email availability:",
          error
        );
        // On error, set error state to show in UI, but allow submission (fail open)
        setErrors((prev) => ({
          ...prev,
          email: GENERIC_EMAIL_VALIDATION_MESSAGE,
        }));
      } finally {
        setCheckingEmail(false);
      }
    }

    // Always check contact number via API before saving (even if unchanged)
    // This ensures we verify against the full database, not just local officers array
    const normalizedContact = formData.contactNumber.replace(/\s/g, "");
    if (normalizedContact && /^\d{10}$/.test(normalizedContact)) {
      try {
        console.log(
          "🔍 [handleSubmit] Checking contact availability via API...",
          {
            contactNumber: normalizedContact,
            officerId: officer?.id,
            isEditing: !!officer,
          }
        );

        setCheckingContact(true);
        const isContactAvailable = await apiService.checkContactAvailability(
          normalizedContact,
          officer?.id // This excludes current user when editing
        );

        console.log("🔍 [handleSubmit] API response:", {
          isAvailable: isContactAvailable,
          contactNumber: normalizedContact,
        });

        if (!isContactAvailable) {
          setErrors((prev) => ({
            ...prev,
            contactNumber: GENERIC_CONTACT_VALIDATION_MESSAGE,
          }));
          setCheckingContact(false);
          // Error is shown inline in the UI, no toast needed
          return; // Stop submission
        }

        // Clear any existing contact number errors if API check passes
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (
            newErrors.contactNumber ===
              GENERIC_CONTACT_VALIDATION_MESSAGE ||
            newErrors.contactNumber ===
              GENERIC_CONTACT_VALIDATION_MESSAGE
          ) {
            delete newErrors.contactNumber;
          }
          return newErrors;
        });
      } catch (error: any) {
        console.error(
          "❌ [handleSubmit] Error checking contact availability:",
          error
        );
        console.error("❌ [handleSubmit] Error details:", {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
          url: error?.config?.url,
        });
        // On error, set error state to show in UI, but allow submission (fail open)
        setErrors((prev) => ({
          ...prev,
          contactNumber: GENERIC_CONTACT_VALIDATION_MESSAGE,
        }));
      } finally {
        setCheckingContact(false);
      }
    }

    const normalizedStateId =
      formData.role === "MOSPI_REVIEWER"
        ? Array.isArray(formData.stateId)
          ? formData.stateId.filter(Boolean)
          : formData.stateId
          ? [formData.stateId]
          : []
        : Array.isArray(formData.stateId)
        ? [formData.stateId[0] ?? ""].filter(Boolean)
        : formData.stateId
        ? [formData.stateId]
        : [];

    // Get unique state names only for stateUt
    const stateNames = Array.from(
      new Set(
        normalizedStateId.map(
          (id) => states.find((s) => s.id === id)?.name ?? id
        )
      )
    );

    const payload = {
      ...formData,
      stateUt: stateNames.join(", "), // always only the selected unique state(s)
      stateId: normalizedStateId,
    };

    type SubmitPayload = Omit<
      NodalOfficer,
      "id" | "state" | "createdAt" | "assignedIndicator"
    > & {
      password?: string;
      assignedIndicators?: string[];
      stateId?: string | string[];
      stateUt?: string; // string joined for backend
    };

    // Clear saved draft before saving
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("userManagementFormDraft");
    }

    // Call onSave - the parent component will handle redirect and form clearing
    onSave(payload as SubmitPayload);

    // Note: Form clearing is now handled by the parent component (UserManagementPage)
    // to ensure it happens simultaneously with redirect, preventing visible form clearing
  };

  // Get selected state name for display
  const getSelectedStateName1 = () => {
    if (!formData.stateId) return "";
    const selectedState = states.find((state) => state.id === formData.stateId);
    return selectedState ? selectedState.name : formData.stateId; // Fallback to stateId if not found
  };
  const getSelectedStateName = () => {
    if (!formData.stateId) return "";
    const id = Array.isArray(formData.stateId)
      ? formData.stateId[0]
      : formData.stateId;
    const state = states.find((s) => s.id === id);
    return state ? state.name : id; // fallback to ID if name not found
  };

  const handleStateChange = useCallback(
    (values: string | string[]) => {
      // Always update stateId and stateUt to reflect the latest selection, not keeping previous state
      if (!values || (Array.isArray(values) && values.length === 0)) {
        setFormData((prev) => ({
          ...prev,
          stateId: formData.role === "MOSPI_REVIEWER" ? [] : "",
          stateUt: "",
        }));
        return;
      }
      if (formData.role === "MOSPI_REVIEWER") {
        // Multiple selection
        const stateValues = Array.isArray(values)
          ? values.filter(Boolean)
          : [values].filter(Boolean);
        // Get unique state names only
        const uniqueNames = Array.from(
          new Set(
            stateValues.map((id) => states.find((s) => s.id === id)?.name ?? id)
          )
        );
        setFormData((prev) => ({
          ...prev,
          stateId: stateValues, // always array for reviewer
          stateUt: uniqueNames.join(", "),
        }));
      } else {
        // Single selection
        const singleValue = Array.isArray(values) ? values[0] : values;
        const name = singleValue
          ? states.find((s) => s.id === singleValue)?.name ?? singleValue
          : "";
        setFormData((prev) => ({
          ...prev,
          stateId: singleValue || "",
          stateUt: name,
        }));
      }
    },
    [formData.role, states]
  );

  // Fetch assigned states by role to disable them in dropdown
  useEffect(() => {
    const fetchDisabledStates = async () => {
      try {
        // Use the selected role from formData, default to empty if no role selected
        if (!formData.role) {
          setDisabledStateNames([]);
          fetchedDisabledStatesRef.current = "";
          return;
        }

        // Only fetch for roles that can have state assignments checked
        // Skip NODAL_OFFICER as they don't need this check (they are assigned to states, not the other way around)
        if (formData.role === "NODAL_OFFICER") {
          setDisabledStateNames([]);
          fetchedDisabledStatesRef.current = "";
          return;
        }

        // Check if we've already fetched for this role
        if (fetchedDisabledStatesRef.current === formData.role) {
          return; // Skip duplicate API call
        }

        const response = await apiService.getAssignedStateOnly(formData.role);

        // Extract state names from the response
        if (response && Array.isArray(response)) {
          const stateNames = response
            .map((item: any) => item.stateName || item.name || item)
            .filter(Boolean);
          setDisabledStateNames(stateNames);
          fetchedDisabledStatesRef.current = formData.role; // Cache the role we fetched for
        }
      } catch (error) {
        console.error("Error fetching assigned states:", error);
        setDisabledStateNames([]);
        fetchedDisabledStatesRef.current = ""; // Reset on error
      }
    };

    fetchDisabledStates();
  }, [formData.role]); // Re-fetch when role changes

  // Track last checked email to prevent duplicate API calls
  const lastCheckedEmailRef = useRef<string>("");

  // Real-time email availability check (only when creating new user or email changed)
  useEffect(() => {
    let isCancelled = false;

    const checkEmail = async () => {
      // Skip if editing and email hasn't changed
      if (officer && debouncedEmail === officer.email) {
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.email;
            return newErrors;
          });
        }
        return;
      }

      // Skip if we've already checked this exact email
      if (debouncedEmail && lastCheckedEmailRef.current === debouncedEmail) {
        return;
      }

      // Clear duplicate error if email is empty or invalid format
      if (!debouncedEmail || !/@(gov\.in|nic\.in)$/i.test(debouncedEmail)) {
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            // Only clear duplicate error, keep format errors
            if (
              newErrors.email ===
              GENERIC_EMAIL_VALIDATION_MESSAGE
            ) {
              delete newErrors.email;
            }
            return newErrors;
          });
        }
        lastCheckedEmailRef.current = ""; // Reset cache
        return; // Don't check if email format is invalid
      }

      if (!isCancelled) {
        setCheckingEmail(true);
        lastCheckedEmailRef.current = debouncedEmail; // Cache the email we're checking
      }

      try {
        const isAvailable = await apiService.checkEmailAvailability(
          debouncedEmail,
          officer?.id
        );

        // Only update state if this request hasn't been cancelled
        if (!isCancelled) {
          if (!isAvailable) {
            setErrors((prev) => ({
              ...prev,
              email: GENERIC_EMAIL_VALIDATION_MESSAGE,
            }));
          } else {
            setErrors((prev) => {
              const newErrors = { ...prev };
              // Only clear email error if it's a duplicate error, keep format errors
              if (
                newErrors.email ===
                GENERIC_EMAIL_VALIDATION_MESSAGE
              ) {
                delete newErrors.email;
              }
              return newErrors;
            });
          }
        }
      } catch (error) {
        console.error("Error checking email availability:", error);
        // On error, clear the duplicate error (assume available)
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            if (
              newErrors.email ===
              GENERIC_EMAIL_VALIDATION_MESSAGE
            ) {
              delete newErrors.email;
            }
            return newErrors;
          });
          lastCheckedEmailRef.current = ""; // Reset cache on error
        }
      } finally {
        if (!isCancelled) {
          setCheckingEmail(false);
        }
      }
    };

    checkEmail();

    // Cleanup: cancel this effect if email changes
    return () => {
      isCancelled = true;
    };
  }, [debouncedEmail, officer?.id, officer?.email]);

  // Track last checked contact to prevent duplicate API calls
  const lastCheckedContactRef = useRef<string>("");

  // Real-time contact number availability check (only when creating new user or contact changed)
  useEffect(() => {
    let isCancelled = false;

    const checkContact = async () => {
      // Skip if editing and contact number hasn't changed
      if (officer && debouncedContactNumber === officer.contactNumber) {
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.contactNumber;
            return newErrors;
          });
        }
        return;
      }

      // Only check if it's a valid 10-digit number
      const normalizedContact = debouncedContactNumber.replace(/\s/g, "");

      // Skip if we've already checked this exact contact number
      if (
        normalizedContact &&
        lastCheckedContactRef.current === normalizedContact
      ) {
        return;
      }

      if (!normalizedContact || !/^\d{10}$/.test(normalizedContact)) {
        // Clear duplicate error if contact number is empty or invalid format
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            // Only clear duplicate error, keep format errors
            if (
              newErrors.contactNumber ===
              GENERIC_CONTACT_VALIDATION_MESSAGE
            ) {
              delete newErrors.contactNumber;
            }
            return newErrors;
          });
        }
        lastCheckedContactRef.current = ""; // Reset cache
        return; // Don't check if format is invalid
      }

      if (!isCancelled) {
        setCheckingContact(true);
        lastCheckedContactRef.current = normalizedContact; // Cache the contact we're checking
      }

      try {
        const isAvailable = await apiService.checkContactAvailability(
          normalizedContact,
          officer?.id
        );

        // Only update state if this request hasn't been cancelled
        if (!isCancelled) {
          if (!isAvailable) {
            setErrors((prev) => ({
              ...prev,
              contactNumber: GENERIC_CONTACT_VALIDATION_MESSAGE,
            }));
          } else {
            setErrors((prev) => {
              const newErrors = { ...prev };
              // Only clear duplicate error, keep format errors
              if (
                newErrors.contactNumber ===
                GENERIC_CONTACT_VALIDATION_MESSAGE
              ) {
                delete newErrors.contactNumber;
              }
              return newErrors;
            });
          }
        }
      } catch (error) {
        console.error("Error checking contact availability:", error);
        // On error, clear the duplicate error (assume available)
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            if (
              newErrors.contactNumber ===
              GENERIC_CONTACT_VALIDATION_MESSAGE
            ) {
              delete newErrors.contactNumber;
            }
            return newErrors;
          });
          lastCheckedContactRef.current = ""; // Reset cache on error
        }
      } finally {
        if (!isCancelled) {
          setCheckingContact(false);
        }
      }
    };

    checkContact();

    // Cleanup: cancel this effect if contact number changes
    return () => {
      isCancelled = true;
    };
  }, [debouncedContactNumber, officer?.id, officer?.contactNumber]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          User Management
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="flex items-center gap-2">
            First Name
            <span className="text-destructive">*</span>
            {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter the officer's first name</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}
          </Label>
          <Input
            id="firstName"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, firstName: e.target.value }));
              // Clear error when user starts typing
              if (errors.firstName) {
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.firstName;
                  return newErrors;
                });
              }
            }}
            className={errors.firstName ? "border-destructive" : ""}
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="flex items-center gap-2">
            Last Name
            <span className="text-destructive">*</span>
            {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter the officer's last name</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}
          </Label>
          <Input
            id="lastName"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, lastName: e.target.value }));
              // Clear error when user starts typing
              if (errors.lastName) {
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.lastName;
                  return newErrors;
                });
              }
            }}
            className={errors.lastName ? "border-destructive" : ""}
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactNumber" className="flex items-center gap-2">
            Contact Number
            <span className="text-destructive">*</span>
            {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter 10-digit mobile number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}
          </Label>
          <Input
            id="contactNumber"
            placeholder="Enter your 10-digit phone number"
            type="tel"
            maxLength={10}
            value={formData.contactNumber}
            onChange={(e) => {
              // Only allow numeric characters
              const inputValue = e.target.value.replace(/\D/g, "");

              // Limit to 10 digits
              const contactNumber = inputValue.slice(0, 10);

              setFormData((prev) => ({ ...prev, contactNumber }));

              // Real-time validation
              const newErrors: Record<string, string> = { ...errors };

              if (!contactNumber.trim()) {
                // Only show required error if there was a previous error (user has interacted)
                if (errors.contactNumber) {
                  newErrors.contactNumber = "Contact number is required";
                } else {
                  // Clear error if field is empty and no previous error
                  delete newErrors.contactNumber;
                }
              } else if (contactNumber.length !== 10) {
                // Show error if not exactly 10 digits
                newErrors.contactNumber =
                  "Please enter a valid 10-digit phone number";
              } else {
                // Valid format (10 digits) - check for local duplicates (quick check)
                const normalizedContactNumber = contactNumber.replace(
                  /\s/g,
                  ""
                );
                const duplicateContact = officers.find(
                  (o) =>
                    o.id !== officer?.id && // Exclude current officer if editing
                    o.contactNumber &&
                    o.contactNumber.replace(/\s/g, "") ===
                      normalizedContactNumber
                );
                if (duplicateContact) {
                  newErrors.contactNumber = GENERIC_CONTACT_VALIDATION_MESSAGE;
                } else {
                  // Clear format errors, but preserve API duplicate error if it exists
                  // The checkContactAvailability function will handle API-level duplicate checking
                  if (
                    newErrors.contactNumber ===
                    "Please enter a valid 10-digit phone number"
                  ) {
                    delete newErrors.contactNumber;
                  }
                  // Note: We preserve the generic contact validation error
                  // which is set by the checkContactAvailability function
                }
              }

              setErrors(newErrors);
            }}
            onBlur={() => {
              // Show required error on blur if field is empty
              if (!formData.contactNumber.trim()) {
                setErrors((prev) => ({
                  ...prev,
                  contactNumber: "Contact number is required",
                }));
              }
            }}
            className={errors.contactNumber ? "border-destructive" : ""}
          />
          {checkingContact && (
            <p className="text-sm text-muted-foreground">
              Checking availability...
            </p>
          )}
          {errors.contactNumber && (
            <p className="text-sm text-destructive">{errors.contactNumber}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            Email
            <span className="text-destructive">*</span>
            {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Only @gov.in and @nic.in email addresses are allowed</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="e.g. user@gov.in or user@nic.in"
            value={formData.email}
            disabled={!!officer} // Disable email field when editing existing user
            onChange={(e) => {
              const email = e.target.value;
              setFormData((prev) => ({ ...prev, email }));

              // Real-time validation
              const newErrors: Record<string, string> = { ...errors };

              if (!email.trim()) {
                // Only show required error if there was a previous error (user has interacted)
                if (errors.email && errors.email === "Email is required") {
                  newErrors.email = "Email is required";
                } else {
                  // Clear error if field is empty and no previous required error
                  delete newErrors.email;
                }
              } else {
                // Check email format first
                const emailFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailFormatRegex.test(email)) {
                  // Invalid email format
                  newErrors.email = "Please enter a valid email address";
                } else if (!/@(gov\.in|nic\.in)$/i.test(email)) {
                  // Valid format but wrong domain
                  newErrors.email =
                    "Only @gov.in and @nic.in email addresses are allowed";
                } else {
                  // Valid email with correct domain - clear format/domain errors
                  // But preserve duplicate error if it exists (will be checked by checkEmailAvailability)
                  if (
                    newErrors.email &&
                    (newErrors.email === "Please enter a valid email address" ||
                      newErrors.email ===
                        "Only @gov.in and @nic.in email addresses are allowed")
                  ) {
                    delete newErrors.email;
                  }
                  // Note: We preserve the generic email validation error
                  // which is set by the checkEmailAvailability function
                }
              }

              setErrors(newErrors);
            }}
            onBlur={() => {
              // Show required error on blur if field is empty
              if (!formData.email.trim()) {
                setErrors((prev) => ({
                  ...prev,
                  email: "Email is required",
                }));
              }
            }}
            className={
              errors.email
                ? "border-destructive"
                : officer
                ? "bg-muted cursor-not-allowed"
                : ""
            }
          />
          {checkingEmail && !officer && (
            <p className="text-sm text-muted-foreground">
              Checking availability...
            </p>
          )}
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        {!officer && (
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              Password
              <span className="text-destructive">*</span>
              {/* <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter password for the new user</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider> */}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 chars, upper/lower/number/special"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                className={
                  errors.password ? "border-destructive pr-10" : "pr-10"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="role" className="flex items-center gap-2">
            Role
            <span className="text-destructive">*</span>
            {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select the officer's role</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}
          </Label>
          {(() => {
            const availableRoles = getAvailableRoles();
            const availableRoleValues = availableRoles.map((r) => r.value);
            const defaultRole =
              availableRoles.length > 0
                ? availableRoles[0].value
                : "NODAL_OFFICER";

            // Ensure formData.role is valid - if not, use default (useEffect will fix it)
            const currentRole =
              formData.role && availableRoleValues.includes(formData.role)
                ? formData.role
                : defaultRole;

            return (
              <Select
                value={currentRole}
                disabled={user?.role === "STATE_APPROVER"}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    role: value,
                    stateId: value === "MOSPI_REVIEWER" ? [] : "",
                    stateUt: "",
                  }));
                  // Reset nodal submission check when role changes
                  if (value !== "NODAL_OFFICER") {
                    setNodalHasSubmission(false);
                  } else if (officer?.id && value === "NODAL_OFFICER") {
                    // Re-check if switching back to NODAL_OFFICER
                    checkNodalOfficerSubmission(officer.id);
                  }
                }}
              >
                <SelectTrigger
                  className={errors.role ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role}</p>
          )}
        </div>

        <div className="space-y-2">
          {formData?.role !== "MOSPI_APPROVER" &&
            formData?.role !== "ADMIN" && (
              <>
                <Label htmlFor="stateId" className="flex items-center gap-2">
                  State/UT
                  <span className="text-destructive">*</span>
                  {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {formData?.role === "ADMIN"
                      ? "Select the state/union territory for the user"
                      : "State will be automatically set to your current state"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}
                </Label>
              </>
            )}

          {/* {user?.role === "ADMIN"  || user?.role === "MOSPI_APPROVER" ? (
            <Select
              value={formData.stateId}
              onValueChange={(value) => {
                console.log("🔍 State selected in UserForm:", {
                  selectedValue: value,
                  valueType: typeof value,
                  valueLength: value.length,
                  currentUserRole: user?.role,
                  currentUserState: user?.state,
                  formDataBefore: formData,
                  availableStates: states.length,
                  matchingState: states.find((s) => s.id === value),
                });
 

                setFormData((prev) => ({ ...prev, stateId: value }));
              }}
              disabled={loadingStates}
            >
              <SelectTrigger
                className={errors.stateId ? "border-destructive" : ""}
              >
                <SelectValue
                  placeholder={
                    loadingStates ? "Loading states..." : "Select state/UT"
                  }
                >
                  {formData.stateId
                    ? getSelectedStateName()
                    : loadingStates
                    ? "Loading states..."
                    : "Select state/UT"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {loadingStates ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading states...
                  </div>
                ) : (
                  states.map((state) => (
                    <SelectItem
                      key={state.id}
                      value={state.id}
                      disabled={!state.isActive}
                    >
                      {state.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="stateId"
              value={user?.state || "Loading..."}
              disabled={true}
              className="bg-muted"
              placeholder="Your current state"
            />
          )} */}

          {user?.role === "ADMIN" || user?.role === "MOSPI_APPROVER" ? (
            formData.role === "MOSPI_REVIEWER" ? (
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <MultiSelect
                  options={states.map((state) => {
                    const isAssigned = (officers || []).some(
                      (o) =>
                        o.role === "MOSPI_REVIEWER" &&
                        o.id !== officer?.id &&
                        ((Array.isArray(o.stateId) &&
                          o.stateId.includes(state.id)) ||
                          (!Array.isArray(o.stateId) && o.stateId === state.id))
                    );

                    const stateNameNorm = (state.name || "")
                      .trim()
                      .toLowerCase();
                    const normalizedDisabledNames = disabledStateNames.map(
                      (n) => n.toString().trim().toLowerCase()
                    );
                    const isDisabledByName =
                      normalizedDisabledNames.includes(stateNameNorm);

                    return {
                      value: state.id,
                      label: state.name,
                      disabled:
                        !state.isActive || isAssigned || isDisabledByName,
                    };
                  })}
                  value={
                    Array.isArray(formData.stateId)
                      ? formData.stateId
                      : [formData.stateId].filter(Boolean)
                  }
                  onChange={(selected) => {
                    // Only keep the current selection, do not merge with previous state
                    handleStateChange(selected);
                  }}
                  placeholder={
                    loadingStates
                      ? "Loading states..."
                      : "Select multiple states"
                  }
                  searchPlaceholder="Search states..."
                  showSearch
                  className={errors.stateId ? "border-destructive" : ""}
                  disabled={loadingStates}
                  showSelectAll
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStateChange([])}
                  disabled={loadingStates}
                >
                  Clear
                </Button>
              </div>
            ) : formData.role !== "MOSPI_APPROVER" &&
              formData.role !== "ADMIN" ? (
              <Select
                value={
                  typeof formData.stateId === "string"
                    ? formData.stateId
                    : Array.isArray(formData.stateId)
                    ? formData.stateId[0]
                    : ""
                }
                onValueChange={(value) => handleStateChange(value)}
                disabled={loadingStates}
              >
                <SelectTrigger
                  className={errors.stateId ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Please select a state/UT">
                    {formData.stateId
                      ? getSelectedStateName()
                      : loadingStates
                      ? "Loading states..."
                      : "Select state/UT"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {loadingStates ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading states...
                    </div>
                  ) : (
                    states.map((state) => {
                      // Disable if not active or in disabledStateNames (case-insensitive, trimmed)
                      const isDisabledByName = disabledStateNames.some(
                        (n) =>
                          n.trim().toLowerCase() ===
                          state.name.trim().toLowerCase()
                      );

                      // Check if STATE_APPROVER already exists for this state
                      // Each state can have only one active STATE_APPROVER
                      const hasStateApprover =
                        formData.role === "STATE_APPROVER" &&
                        (officers || []).some(
                          (o) =>
                            o.role === "STATE_APPROVER" &&
                            o.id !== officer?.id && // Exclude current officer if editing
                            o.isActive !== false && // Only check active STATE_APPROVERs (exclude explicitly deactivated ones)
                            ((typeof o.state === "string" &&
                              o.state.trim().toLowerCase() ===
                                state.name.trim().toLowerCase()) ||
                              (typeof o.stateId === "string" &&
                                o.stateId === state.id) ||
                              (Array.isArray(o.stateId) &&
                                o.stateId.includes(state.id)))
                        );

                      return (
                        <SelectItem
                          key={state.id}
                          value={state.id}
                          disabled={
                            !state.isActive ||
                            isDisabledByName ||
                            hasStateApprover
                          }
                        >
                          {state.name}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            ) : null
          ) : (
            <Input
              id="stateId"
              value={user?.state || "Loading..."}
              disabled={true}
              className="bg-muted"
              placeholder="Your current state"
            />
          )}

          {formData?.role !== "ADMIN" &&
            formData?.role !== "MOSPI_APPROVER" && (
              <p className="text-sm text-muted-foreground">
                {/* Users will be created in your current state:{" "} */}
                {/* <strong>{user?.state}</strong> */}
              </p>
            )}

          {errors.stateId && (
            <p className="text-sm text-destructive">{errors.stateId}</p>
          )}
        </div>

        {/* Indicator Assignment Section - Only for NODAL_OFFICER */}
        {formData.role === "NODAL_OFFICER" && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Assign Indicators
              {/* <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Select indicators that this Nodal Officer will be
                      responsible for
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider> */}
            </Label>

            {/* Warning if state approver has submitted */}
            {stateApproverHasSubmission && officer && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Indicator reassignment is disabled
                  because you have already submitted your consolidated
                  submission.
                </p>
              </div>
            )}

            {/* Warning if nodal officer has submitted */}
            {nodalHasSubmission && officer && !stateApproverHasSubmission && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> Indicator modification is disabled
                  because this nodal officer has already submitted their
                  submission. No indicator changes are allowed.
                </p>
              </div>
            )}

            {checkingNodalSubmission && (
              <p className="text-sm text-muted-foreground">
                Checking submission status...
              </p>
            )}

            {/* Warning about submitted indicators - only show if at least one submitted indicator is present in the options list */}
            {(() => {
              // Check if any submitted indicators are actually present in the options list
              const submittedInOptions = indicatorOptions.some(
                (opt) =>
                  effectiveSubmittedIndicators.includes(opt.value) &&
                  opt.disabled
              );
              return submittedInOptions;
            })() && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Some indicators are disabled because
                  they have already been submitted by the nodal officer in your
                  state. These indicators cannot be reassigned to prevent
                  duplicate submissions.
                </p>
              </div>
            )}

            <MultiSelect
              options={indicatorOptions}
              value={multiSelectValue}
              onChange={handleIndicatorChange}
              placeholder={
                loadingIndicators
                  ? "Loading indicators..."
                  : "Search and select indicators..."
              }
              searchPlaceholder="Type to search indicators..."
              showSearch={true}
              showSelectAll={!loadingIndicators}
              showSectionHeaders={true}
              groupBySection={true}
              className="w-full"
              maxHeight="250px"
              disabled={
                loadingIndicators ||
                (stateApproverHasSubmission && !!officer) ||
                (nodalHasSubmission && !!officer)
              }
            />
            {loadingIndicators && (
              <p className="text-sm text-muted-foreground mt-1">
                Fetching available indicators...
              </p>
            )}

            {errors.assignedIndicators && (
              <p className="text-sm text-destructive">
                {errors.assignedIndicators}
              </p>
            )}

            {/* Selected Indicators Summary */}
            {formData.assignedIndicators.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Selected ({formData.assignedIndicators.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(showAllSelectedIndicators
                    ? formData.assignedIndicators
                    : formData.assignedIndicators.slice(0, 3)
                  ).map((indicator, index) => (
                    <Badge
                      key={`indicator-${index}-${indicator}`}
                      variant="secondary"
                      className="text-xs bg-blue-100 text-blue-800"
                    >
                      {indicator}
                    </Badge>
                  ))}
                  {formData.assignedIndicators.length > 3 &&
                    !showAllSelectedIndicators && (
                      <button
                        type="button"
                        onClick={() => setShowAllSelectedIndicators(true)}
                        className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                      >
                        +{formData.assignedIndicators.length - 3} more
                      </button>
                    )}
                  {showAllSelectedIndicators &&
                    formData.assignedIndicators.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllSelectedIndicators(false)}
                        className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                      >
                        Show less
                      </button>
                    )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <Button
          variant="outline"
          onClick={() => {
            // Clear saved draft on cancel
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("userManagementFormDraft");
            }
            onCancel();
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save User</Button>
      </div>
    </div>
  );
}

// Memoize UserForm to prevent unnecessary re-renders when props haven't changed
export const UserForm = memo(UserFormComponent);

// Helper function to get indicator display name
function getIndicatorDisplayName(indicatorCode: string): string {
  const indicatorNames: Record<string, string> = {
    "1.1": "Capex to GSDP Ratio",
    "1.2": "Capex Utilization",
    "1.3": "Credit Rated ULBs",
    "1.4": "ULBs Issuing Bonds",
    "1.5": "Functional Financial Intermediary For Infra Development",
    "2.1": "Infrastructure Act/Policy",
    "2.2": "Availability of Specialised Entity for Infrastructure Development",
    "2.3": "Sector Infrastructure Plan",
    "2.4": "Investment Ready Pipeline",
    "2.5": "Asset Monetization Pipeline",
    "3.1": "PPP Act/Policy",
    "3.2": "PPP Cell",
    "3.3": "VGF/IIPDF Proposals",
    "3.4": "PPP Bankable Projects",
    "3.5": "PPP Project Monitoring",
    "4.1":
      "Availability and use of a State/UT Project Monitoring Portal on the lines of GoI (Government Of India)",
    "4.2":
      "Adoption of PM GatiShakti National Master Plan in infrastructure planning",
    "4.3": "Adoption of ADR",
    "4.4": "Any Innovative Practice undertaken for promotion",
    "4.5": "Capacity Building – Officer Participation",
  };

  return indicatorNames[indicatorCode] || indicatorCode;
}
