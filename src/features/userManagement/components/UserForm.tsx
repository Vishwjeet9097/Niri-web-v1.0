/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";

interface UserFormProps {
  officer: NodalOfficer | null;
  onSave: (
    data: Omit<
      NodalOfficer,
      "id" | "state" | "createdAt" | "assignedIndicator"
    > & { password?: string; assignedIndicators?: string[];stateId?: string | string[] }
  ) => void;
  onCancel: () => void;
  // parent passes full indicator objects (or at least objects with `.code`)
  allIndicators?: { code?: string }[];
  officers?: NodalOfficer[];
  loadingIndicators?: boolean;
  stateApproverHasSubmission?: boolean;
  submittedIndicatorsInState?: string[];
}


export function UserForm({
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
  const [localSubmittedIndicators, setLocalSubmittedIndicators] = useState<string[]>(() => 
    Array.isArray(submittedIndicatorsInState) ? submittedIndicatorsInState : []
  );
  
  // Use provided submittedIndicatorsInState or fallback to local state
  // Memoized to prevent unnecessary recalculations
  const effectiveSubmittedIndicators = useMemo(() => {
    const submitted = Array.isArray(submittedIndicatorsInState) ? submittedIndicatorsInState : [];
    return submitted.length > 0 ? submitted : localSubmittedIndicators;
  }, [submittedIndicatorsInState, localSubmittedIndicators]);
  
  // Debug: Log when component receives submittedIndicatorsInState
  useEffect(() => {
    console.log("🔍 [UserForm] Component mounted/re-rendered");
    console.log("🔍 [UserForm] submittedIndicatorsInState prop:", submittedIndicatorsInState);
    console.log("🔍 [UserForm] localSubmittedIndicators:", localSubmittedIndicators);
    console.log("🔍 [UserForm] effectiveSubmittedIndicators:", effectiveSubmittedIndicators);
    console.log("🔍 [UserForm] Officer stateUt:", officer?.stateUt);
    console.log("🔍 [UserForm] Officer state:", officer?.state);
    console.log("🔍 [UserForm] Current user stateUt:", user?.stateUt);
    console.log("🔍 [UserForm] Current user state:", user?.state);
    console.log("🔍 [UserForm] Current user:", user);
  }, [submittedIndicatorsInState, localSubmittedIndicators, effectiveSubmittedIndicators, officer?.stateUt, officer?.state, user?.stateUt, user?.state, user]);
  
  // Fallback: Fetch submitted indicators if not provided and we have a stateUt
  useEffect(() => {
    const fetchIfNeeded = async () => {
      // Only fetch if:
      // 1. No submitted indicators provided
      // 2. We have a stateUt (from officer or user)
      // 3. We haven't already fetched
      if (submittedIndicatorsInState.length === 0 && localSubmittedIndicators.length === 0) {
        // Priority: officer.stateUt > officer.state > user.stateUt > user.state
        // For state approvers managing officers, use their own state (since officers are in the same state)
        const stateUt = officer?.stateUt || officer?.state || user?.stateUt || user?.state;
        
        console.log("🔍 [UserForm] Determining stateUt for submitted indicators fetch:", {
          officerStateUt: officer?.stateUt,
          officerState: officer?.state,
          userStateUt: user?.stateUt,
          userState: user?.state,
          resolvedStateUt: stateUt,
        });
        
        if (stateUt) {
          console.log("🔍 [UserForm] Fetching submitted indicators as fallback for stateUt:", stateUt);
          console.log("🔍 [UserForm] NOTE: This query is STATE-SCOPED - only finds submissions within state:", stateUt);
          try {
            const submitted = await apiService.getSubmittedIndicatorsInState(stateUt);
            console.log("✅ [UserForm] Fetched submitted indicators (fallback):", submitted);
            console.log("✅ [UserForm] These indicators are submitted within state:", stateUt, "only (not globally)");
            setLocalSubmittedIndicators(submitted);
          } catch (error) {
            console.error("❌ [UserForm] Error fetching submitted indicators (fallback):", error);
          }
        } else {
          console.warn("⚠️ [UserForm] Cannot fetch submitted indicators - no stateUt available from officer or user");
        }
      }
    };
    
    fetchIfNeeded();
  }, [submittedIndicatorsInState.length, localSubmittedIndicators.length, officer?.stateUt, officer?.state, user?.stateUt, user?.state]);
  
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
}>({
  firstName: "",
  lastName: "",
  contactNumber: "",
  email: "",
  password: "",
  role: "NODAL_OFFICER",
  stateId: "",
  assignedIndicators: [],
  stateUt: "",
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
  const [availableIndicatorsForState, setAvailableIndicatorsForState] = useState<any[]>([]);

  // State for checking duplicates
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingContact, setCheckingContact] = useState(false);

  // Debounced values for real-time validation
  const debouncedEmail = useDebounce(formData.email, 500);
  const debouncedContactNumber = useDebounce(formData.contactNumber, 500);

  // Compute available indicators for selected state (using backend API for real-time data)
  useEffect(() => {
    const computeAvailableIndicators = async () => {
      // Only compute indicators if creating a NODAL_OFFICER
      if (formData.role !== "NODAL_OFFICER") {
        setAvailableIndicatorsForState([]);
        return;
      }

      // Admin should have access to all indicators - no need to fetch filtered list
      if (user?.role === "ADMIN") {
        // For admin, use allIndicators directly (no filtering needed)
        if (allIndicators.length > 0) {
          const formattedAvailable = allIndicators.map((ind: any) => ({
            code: ind.code,
            name: ind.name || getIndicatorDisplayName(ind.code),
            category: ind.category || ind.section || '',
            id: ind.id,
          }));
          setAvailableIndicatorsForState(formattedAvailable);
        }
        return;
      }

      // For non-admin users (STATE_APPROVER, etc.), fetch filtered indicators
      const stateName = user?.state || "";
      
      if (!stateName) {
        setAvailableIndicatorsForState([]);
        return;
      }

      try {
        // Use backend API to get real-time available indicators
        const availableIndicators: any = await apiService.getAvailableIndicatorsForApprover(stateName);
        
        // Handle response structure (interceptor may have extracted data)
        let indicators: any = availableIndicators;
        if (availableIndicators && typeof availableIndicators === 'object' && !Array.isArray(availableIndicators)) {
          // If response has data property, extract it
          if (availableIndicators.data && Array.isArray(availableIndicators.data)) {
            indicators = availableIndicators.data;
          } else if (Array.isArray(availableIndicators)) {
            indicators = availableIndicators;
          } else {
            indicators = [];
          }
        }
        
        // Ensure we have an array
        if (!Array.isArray(indicators)) {
          console.warn("⚠️ API returned invalid indicators format:", indicators);
          indicators = [];
        }
        
        setAvailableIndicatorsForState(indicators);
      } catch (error) {
        console.error("❌ Failed to fetch available indicators from API, falling back to frontend filtering:", error);
        
        // Fallback to frontend filtering if API fails
        if (allIndicators.length === 0) {
          console.warn("⚠️ allIndicators is empty, cannot show indicators. Please wait for indicators to load.");
          setAvailableIndicatorsForState([]);
          return;
        }

        // Build a set of codes that are already assigned in this state to all users (except current officer)
        const assignedSet = new Set<string>();

        // Officers array already contains users for the current scope (for Admin it may contain all states)
        officers.forEach((o) => {
          // Only consider assigned indicators of users in the same state
          const officerState = o.state || o.stateId || "";
          if (!stateName || officerState === stateName) {
            // assignedIndicators may be an array of codes
            const assigned =
              o.assignedIndicators ||
              (o.assignedIndicator ? [o.assignedIndicator] : []);
            // Exclude current officer being edited
            if (o.id !== officer?.id) {
              assigned.forEach((code) => {
                if (code) assignedSet.add(code);
              });
            }
          }
        });

        // Return indicators whose code is NOT in assignedSet
        // Convert to the same format as API response (array of objects with code, name, category)
        const available = allIndicators.filter((ind: any) => !assignedSet.has(ind.code));
        
        // Transform to match API response format
        const formattedAvailable = available.map((ind: any) => ({
          code: ind.code,
          name: ind.name || getIndicatorDisplayName(ind.code),
          category: ind.category || ind.section || '',
          id: ind.id,
        }));
        
        setAvailableIndicatorsForState(formattedAvailable);
      }
    };
    
    computeAvailableIndicators();
  }, [formData.role, user?.role, user?.state, allIndicators, officers, officer?.id, states]);

  // Build the options list from INDICATOR_SECTIONS but only include:
  //  - indicators present in availableIndicatorCodes OR
  //  - indicators already selected for this form (so editing doesn't drop them)
  const indicatorOptions: MultiSelectOption[] = useMemo(() => {
    // Collect all codes from API response
    let apiCodes: string[] = [];
    if (!availableIndicatorsForState || availableIndicatorsForState.length === 0) {
      apiCodes = [];
    } else if (availableIndicatorsForState.length > 0 && typeof availableIndicatorsForState[0] === 'object') {
      apiCodes = availableIndicatorsForState.map((item: any) => item.code);
    } else {
      apiCodes = availableIndicatorsForState;
    }

    // Sort: assigned indicators first (in their order), then API indicators (in their order, excluding duplicates)
    // CRITICAL: Always include submitted indicators that are in the current assigned list
    // This ensures they remain visible even if user tries to remove them
    const assigned = formData.assignedIndicators || [];
    const apiUnique = apiCodes.filter(code => !assigned.includes(code));
    
    // Get submitted indicators that are currently assigned - these MUST always appear
    const submittedAssigned = effectiveSubmittedIndicators.filter(code => 
      assigned.includes(code)
    );
    
    // Build allCodes: assigned first, then unassigned from API
    let allCodes = [...assigned, ...apiUnique];
    
    // CRITICAL: Ensure ALL submitted indicators that are assigned are ALWAYS in allCodes
    // This prevents them from disappearing even if they're temporarily removed from assigned
    // Add them at the beginning to ensure they're always visible
    submittedAssigned.forEach(code => {
      if (!allCodes.includes(code)) {
        allCodes.unshift(code); // Add at beginning to keep them visible
      }
    });

    // Build name map - prioritize API response, then allIndicators, then fallback
    const indicatorNameMap: Record<string, string> = {};
    const indicatorCategoryMap: Record<string, string> = {};
    
    // First, add from API response
    if (availableIndicatorsForState && availableIndicatorsForState.length > 0 && typeof availableIndicatorsForState[0] === 'object') {
      availableIndicatorsForState.forEach((item: any) => {
        if (item && item.code) {
          if (item.name) indicatorNameMap[item.code] = item.name;
          if (item.category) indicatorCategoryMap[item.code] = item.category;
        }
      });
    }
    
    // Then, add from allIndicators for any missing ones (especially assigned indicators)
    allIndicators.forEach((ind: any) => {
      const code = ind.code;
      if (code) {
        if (!indicatorNameMap[code] && ind.name) {
          indicatorNameMap[code] = ind.name;
        }
        if (!indicatorCategoryMap[code] && (ind.category || ind.section)) {
          indicatorCategoryMap[code] = ind.category || ind.section || '';
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
      let section = indicatorCategoryMap[code] || '';
      let description = indicatorNameMap[code];
      
      // If not found in maps, try to find in API response
      if (!section && availableIndicatorsForState && availableIndicatorsForState.length > 0 && typeof availableIndicatorsForState[0] === 'object') {
        const found = availableIndicatorsForState.find((item: any) => item.code === code);
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
        assignedInOptions: options.filter(opt => formData.assignedIndicators.includes(opt.value)).map(opt => opt.value),
        submittedIndicatorsInState: submittedIndicatorsInState,
        effectiveSubmittedIndicators: effectiveSubmittedIndicators,
        localSubmittedIndicators: localSubmittedIndicators,
        submittedIndicatorsCount: effectiveSubmittedIndicators.length,
        disabledOptions: options.filter(opt => opt.disabled).map(opt => opt.value),
      });
    }

    return options;
  }, [availableIndicatorsForState, formData.assignedIndicators, allIndicators, effectiveSubmittedIndicators]);

  // Memoize the MultiSelect value to ensure submitted indicators are always included
  const multiSelectValue = useMemo(() => {
    // Ensure submitted indicators are always in the value, even if somehow removed
    const currentAssigned = formData.assignedIndicators || [];
    // Always include submitted indicators that are assigned to this user
    const submittedAssigned = effectiveSubmittedIndicators.filter(code => 
      currentAssigned.includes(code)
    );
    // Merge: current assigned + ensure submitted ones are included
    const finalValue = Array.from(new Set([...currentAssigned, ...submittedAssigned]));
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

  // Handle indicator selection change
  const handleIndicatorChange = (selectedIndicators: string[]) => {
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

    console.log("🔍 [UserForm] handleIndicatorChange - submittedAssigned:", submittedAssigned);

    // Check if user tried to remove any submitted indicators
    const beingRemoved = currentlySelected.filter(
      (ind) => !selectedIndicators.includes(ind)
    );
    const cannotRemove = beingRemoved.filter((ind) =>
      effectiveSubmittedIndicators.includes(ind)
    );

    console.log("🔍 [UserForm] handleIndicatorChange - beingRemoved:", beingRemoved);
    console.log("🔍 [UserForm] handleIndicatorChange - cannotRemove:", cannotRemove);

    // If user tried to remove submitted indicators, show error and prevent change
    if (cannotRemove.length > 0) {
      console.warn("⚠️ [UserForm] Attempted to remove submitted indicators:", cannotRemove);
      toast({
        title: "Cannot Remove Indicators",
        description: `The following indicators are already submitted and cannot be removed: ${cannotRemove.join(", ")}`,
        variant: "destructive",
      });
      // Don't update state - keep submitted indicators
      return;
    }

    // Merge: keep submitted indicators + new selection (excluding submitted ones from new selection to avoid duplicates)
    const newSelectionWithoutSubmitted = selectedIndicators.filter(
      (ind) => !effectiveSubmittedIndicators.includes(ind)
    );
    const finalSelection = [...submittedAssigned, ...newSelectionWithoutSubmitted];

    console.log("🔍 [UserForm] handleIndicatorChange - finalSelection:", finalSelection);

    // Always update with final selection (includes submitted indicators)
    setFormData((prev) => ({
      ...prev,
      assignedIndicators: finalSelection,
    }));
  };

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

  useEffect(() => {
     if (officer) {
      // console.log("🔍 Setting form data for officer:", {
      //   officer,
      //   stateId: officer.stateId,
      //   state: officer.state,
      // });
      const stateIdsRaw = officer.state
        ? officer.state.split(",").map(name => {
            const match = states.find(s => s.name.trim() === name.trim());
            return match ? match.id : officer.state;
          }).filter(Boolean)
        : [];
      // Deduplicate stateIds
      const stateIds = Array.from(new Set(stateIdsRaw));
      // Get unique state names for stateUt
      const uniqueStateNames = Array.from(new Set(stateIds.map(id => {
        const found = states.find(s => s.id === id);
        return found ? found.name : id;
      })));
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
                  .map((ai: any) => ai.indicator?.code || ai.indicatorId || ai)
                  .filter(Boolean) as string[];
              }
            } catch (e) {
              // Ignore
            }
          }
          return [];
        })(),
      });

      // Fetch assigned indicators from API for NODAL_OFFICER
      if (officer.role === "NODAL_OFFICER" && officer.id) {
        fetchAssignedIndicators(officer.id);
        // Check if nodal officer has submitted
        checkNodalOfficerSubmission(officer.id);
      } else {
        setNodalHasSubmission(false);
      }
    } else {
      // Reset form when no officer (new user)
      // Set default role based on current user's permissions - compute directly instead of calling getAvailableRoles
      let defaultRole = "NODAL_OFFICER";
      if (user?.role === "STATE_APPROVER") {
        defaultRole = "NODAL_OFFICER";
      } else if (user?.role === "MOSPI_APPROVER") {
        defaultRole = "MOSPI_REVIEWER";
      } else if (user?.role === "ADMIN") {
        defaultRole = "STATE_APPROVER";
      }

      setFormData({
        firstName: "",
        lastName: "",
        contactNumber: "",
        email: "",
        password: "",
        role: defaultRole,
        stateId: user?.role === "ADMIN" ? "" : user?.state || "", // ✅ Admin can select any state, others use current state
        assignedIndicators: [], 
        stateUt: "", 
      });
      // Reset nodal submission check for new user
      setNodalHasSubmission(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officer, user?.state, user?.role, states]);

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

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    } else if (!/^\d{10}$/.test(formData.contactNumber.replace(/\s/g, ""))) {
      newErrors.contactNumber = "Please enter a valid 10-digit phone number";
    } else {
      // Check for duplicate contact number
      const normalizedContactNumber = formData.contactNumber.replace(/\s/g, "");
      const duplicateContact = officers.find(
        (o) =>
          o.id !== officer?.id && // Exclude current officer if editing
          o.contactNumber &&
          o.contactNumber.replace(/\s/g, "") === normalizedContactNumber
      );
      if (duplicateContact) {
        newErrors.contactNumber =
          "This contact number is already assigned to another user";
      }
    }

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
    } else if (!officer && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
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
    } else if (formData.role !== "MOSPI_APPROVER" && formData.role !== "ADMIN") {
      // Validate single state for other roles (excluding MOSPI_APPROVER and ADMIN)
      if (!formData.stateId || (Array.isArray(formData.stateId) && formData.stateId.length === 0)) {
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
    stateUt: stateNames.join(", "),      // string for backend
     stateId: normalizedStateId,  // ✅ string for backend
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


  console.log("payload", formData);

  onSave(payload  as SubmitPayload); // Make sure onSave type includes stateUt

   
};

 const handleSubmit = () => {
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

  // Get unique state names only for stateUt
  const stateNames = Array.from(new Set(normalizedStateId.map(
    (id) => states.find((s) => s.id === id)?.name ?? id
  )));

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

  onSave(payload as SubmitPayload);

  // ✅ Reset values after submit
  setFormData(prev => ({
    ...prev,
    stateId: formData.role === "MOSPI_REVIEWER" ? [] : '',
    stateUt: '', // always clear after submit
  }));
};


  // Get selected state name for display
  const getSelectedStateName1 = () => {
    if (!formData.stateId) return "";
    const selectedState = states.find((state) => state.id === formData.stateId);
    return selectedState ? selectedState.name : formData.stateId; // Fallback to stateId if not found
  };
const getSelectedStateName = () => {
  if (!formData.stateId) return "";
  const id = Array.isArray(formData.stateId) ? formData.stateId[0] : formData.stateId;
  const state = states.find((s) => s.id === id);
  return state ? state.name : id; // fallback to ID if name not found
};

  

const handleStateChange = (values: string | string[]) => {
  // Always update stateId and stateUt to reflect the latest selection, not keeping previous state
  if (!values || (Array.isArray(values) && values.length === 0)) {
    setFormData(prev => ({
      ...prev,
      stateId: formData.role === "MOSPI_REVIEWER" ? [] : '',
      stateUt: ''
    }));
    return;
  }
  if (formData.role === "MOSPI_REVIEWER") {
    // Multiple selection
    const stateValues = Array.isArray(values) ? values.filter(Boolean) : [values].filter(Boolean);
    // Get unique state names only
    const uniqueNames = Array.from(new Set(stateValues.map(id => states.find(s => s.id === id)?.name ?? id)));
    setFormData(prev => ({
      ...prev,
      stateId: stateValues, // always array for reviewer
      stateUt: uniqueNames.join(", ")
    }));
  } else {
    // Single selection
    const singleValue = Array.isArray(values) ? values[0] : values;
    const name = singleValue ? states.find(s => s.id === singleValue)?.name ?? singleValue : '';
    setFormData(prev => ({
      ...prev,
      stateId: singleValue || '',
      stateUt: name
    }));
  }
};
 

  // Fetch assigned states by role to disable them in dropdown
  useEffect(() => {
    const fetchDisabledStates = async () => {
      try {
        // Use the selected role from formData, default to empty if no role selected
        if (!formData.role) {
          setDisabledStateNames([]);
          return;
        }
        
        // Only fetch for roles that can have state assignments checked
        // Skip NODAL_OFFICER as they don't need this check (they are assigned to states, not the other way around)
        if (formData.role === "NODAL_OFFICER") {
          setDisabledStateNames([]);
          return;
        }
        
        const response = await apiService.getAssignedStateOnly(formData.role);
        
        // Extract state names from the response
        if (response && Array.isArray(response)) {
          const stateNames = response.map((item: any) => item.stateName || item.name || item).filter(Boolean);
          setDisabledStateNames(stateNames);
        }
      } catch (error) {
        console.error("Error fetching assigned states:", error);
        setDisabledStateNames([]);
      }
    };

    fetchDisabledStates();
  }, [formData.role]); // Re-fetch when role changes

  // Real-time email availability check
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

      // Clear duplicate error if email is empty or invalid format
      if (!debouncedEmail || !/@(gov\.in|nic\.in)$/i.test(debouncedEmail)) {
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            // Only clear duplicate error, keep format errors
            if (newErrors.email === "This email is already registered to another user") {
              delete newErrors.email;
            }
            return newErrors;
          });
        }
        return; // Don't check if email format is invalid
      }

      if (!isCancelled) {
        setCheckingEmail(true);
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
              email: "This email is already registered to another user",
            }));
          } else {
            setErrors((prev) => {
              const newErrors = { ...prev };
              // Only clear email error if it's a duplicate error, keep format errors
              if (newErrors.email === "This email is already registered to another user") {
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
            if (newErrors.email === "This email is already registered to another user") {
              delete newErrors.email;
            }
            return newErrors;
          });
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

  // Real-time contact number availability check
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
      if (!normalizedContact || !/^\d{10}$/.test(normalizedContact)) {
        // Clear duplicate error if contact number is empty or invalid format
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            // Only clear duplicate error, keep format errors
            if (newErrors.contactNumber === "This contact number is already registered to another user") {
              delete newErrors.contactNumber;
            }
            return newErrors;
          });
        }
        return; // Don't check if format is invalid
      }

      if (!isCancelled) {
        setCheckingContact(true);
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
              contactNumber: "This contact number is already registered to another user",
            }));
          } else {
            setErrors((prev) => {
              const newErrors = { ...prev };
              // Only clear duplicate error, keep format errors
              if (newErrors.contactNumber === "This contact number is already registered to another user") {
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
            if (newErrors.contactNumber === "This contact number is already registered to another user") {
              delete newErrors.contactNumber;
            }
            return newErrors;
          });
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
              setFormData({ ...formData, firstName: e.target.value });
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
              setFormData({ ...formData, lastName: e.target.value });
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
              const inputValue = e.target.value.replace(/\D/g, '');
              
              // Limit to 10 digits
              const contactNumber = inputValue.slice(0, 10);
              
              setFormData({ ...formData, contactNumber });

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
                newErrors.contactNumber = "Please enter a valid 10-digit phone number";
              } else {
                // Valid format (10 digits) - check for local duplicates (quick check)
                const normalizedContactNumber = contactNumber.replace(/\s/g, "");
                const duplicateContact = officers.find(
                  (o) =>
                    o.id !== officer?.id && // Exclude current officer if editing
                    o.contactNumber &&
                    o.contactNumber.replace(/\s/g, "") === normalizedContactNumber
                );
                if (duplicateContact) {
                  newErrors.contactNumber = "This contact number is already assigned to another user";
                } else {
                  // Clear format errors, but preserve API duplicate error if it exists
                  // The checkContactAvailability function will handle API-level duplicate checking
                  if (newErrors.contactNumber === "Please enter a valid 10-digit phone number") {
                    delete newErrors.contactNumber;
                  }
                  // Note: We preserve "This contact number is already registered to another user" error
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
            <p className="text-sm text-muted-foreground">Checking availability...</p>
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
            placeholder="e.g. user@gujarat.gov.in or user@nic.in"
            value={formData.email}
            disabled={!!officer} // Disable email field when editing existing user
            onChange={(e) => {
              const email = e.target.value;
              setFormData({ ...formData, email });

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
                  newErrors.email = "Only @gov.in and @nic.in email addresses are allowed";
                } else {
                  // Valid email with correct domain - clear format/domain errors
                  // But preserve duplicate error if it exists (will be checked by checkEmailAvailability)
                  if (newErrors.email && 
                      (newErrors.email === "Please enter a valid email address" || 
                       newErrors.email === "Only @gov.in and @nic.in email addresses are allowed")) {
                    delete newErrors.email;
                  }
                  // Note: We preserve "This email is already registered to another user" error
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
            className={errors.email ? "border-destructive" : officer ? "bg-muted cursor-not-allowed" : ""}
          />
          {checkingEmail && !officer && (
            <p className="text-sm text-muted-foreground">Checking availability...</p>
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
                placeholder="Enter password (min 6 characters)"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
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
            
            return (
              <Select
                value={formData.role}
                disabled={user?.role === "STATE_APPROVER"}
                onValueChange={(value) => {
                  setFormData(prev => ({
                    ...prev,
                    role: value,
                    stateId: value === "MOSPI_REVIEWER" ? [] : '',
                    stateUt: ''
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
          {formData?.role !== "MOSPI_APPROVER" && formData?.role !== "ADMIN" && (<>
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
 

                setFormData({ ...formData, stateId: value });
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
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
   <MultiSelect
  options={states.map(state => {
    const isAssigned = (officers || []).some(o =>
      o.role === 'MOSPI_REVIEWER' &&
      o.id !== officer?.id &&
      (
        (Array.isArray(o.stateId) && o.stateId.includes(state.id)) ||
        (!Array.isArray(o.stateId) && o.stateId === state.id)
      )
    );

    const stateNameNorm = (state.name || '').trim().toLowerCase();
    const normalizedDisabledNames = disabledStateNames.map(n => n.toString().trim().toLowerCase());
    const isDisabledByName = normalizedDisabledNames.includes(stateNameNorm);

      return {
        value: state.id,
        label: state.name,
        disabled: !state.isActive || isAssigned || isDisabledByName
      };
  })}
  value={Array.isArray(formData.stateId) ? formData.stateId : [formData.stateId].filter(Boolean)}
  onChange={(selected) => {
    // Only keep the current selection, do not merge with previous state
    handleStateChange(selected);
  }}
  placeholder={loadingStates ? "Loading states..." : "Select multiple states"}
  searchPlaceholder="Search states..."
  showSearch
  className={errors.stateId ? "border-destructive" : ""}
  disabled={loadingStates}
  showSelectAll
/> 
      <Button type="button" variant="outline" size="sm" onClick={() => handleStateChange([])} disabled={loadingStates}>
        Clear
      </Button>
    </div>
  ) : formData.role !== "MOSPI_APPROVER" && formData.role !== "ADMIN" ? (
    <Select
      value={typeof formData.stateId === 'string' ? formData.stateId : Array.isArray(formData.stateId) ? formData.stateId[0] : ''}
      onValueChange={(value) => handleStateChange(value)}
      disabled={loadingStates}
    >
      <SelectTrigger className={errors.stateId ? "border-destructive" : ""}>
        <SelectValue placeholder="Please select a state/UT" >
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
              n => n.trim().toLowerCase() === state.name.trim().toLowerCase()
            );
            
            // Check if STATE_APPROVER already exists for this state
            // Each state can have only one active STATE_APPROVER
            const hasStateApprover = formData.role === "STATE_APPROVER" && (officers || []).some(o =>
              o.role === 'STATE_APPROVER' &&
              o.id !== officer?.id && // Exclude current officer if editing
              o.isActive !== false && // Only check active STATE_APPROVERs (exclude explicitly deactivated ones)
              (
                (typeof o.state === 'string' && o.state.trim().toLowerCase() === state.name.trim().toLowerCase()) ||
                (typeof o.stateId === 'string' && o.stateId === state.id) ||
                (Array.isArray(o.stateId) && o.stateId.includes(state.id))
              )
            );
            
            return (
              <SelectItem key={state.id} value={state.id} disabled={!state.isActive || isDisabledByName || hasStateApprover}>
                {state.name}
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  ):null
) : (
  <Input
    id="stateId"
    value={user?.state || "Loading..."}
    disabled={true}
    className="bg-muted"
    placeholder="Your current state"
  />
)}

          {formData?.role !== "ADMIN" && formData?.role !== "MOSPI_APPROVER" && (
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
                  <strong>Note:</strong> Indicator reassignment is disabled because you have already submitted your consolidated submission.
                </p>
              </div>
            )}

            {/* Warning if nodal officer has submitted */}
            {nodalHasSubmission && officer && !stateApproverHasSubmission && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> Indicator modification is disabled because this nodal officer has already submitted their submission. No indicator changes are allowed.
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
              const submittedInOptions = indicatorOptions.some(opt => 
                effectiveSubmittedIndicators.includes(opt.value) && opt.disabled
              );
              return submittedInOptions;
            })() && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Some indicators are disabled because they have already been submitted by the nodal officer in your state. These indicators cannot be reassigned to prevent duplicate submissions.
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
              disabled={loadingIndicators || (stateApproverHasSubmission && !!officer) || (nodalHasSubmission && !!officer)}
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
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save User</Button>
      </div>
    </div>
  );
}



// Helper function to get indicator display name
function getIndicatorDisplayName(indicatorCode: string): string {
  const indicatorNames: Record<string, string> = {
    "1.1": "Capex to GSDP Ratio",
    "1.2": "Capex Utilization",
    "1.3": "Credit Rated ULBs",
    "1.4": "ULBs Issuing Bonds",
    "1.5": "Functional Financial Intermediary",
    "2.1": "Infrastructure Act/Policy",
    "2.2": "Specialized Entity",
    "2.3": "Sector Infrastructure Plan",
    "2.4": "Investment Ready Pipeline",
    "2.5": "Asset Monetization Pipeline",
    "3.1": "PPP Act/Policy",
    "3.2": "PPP Cell",
    "3.3": "VGF/IIPDF Proposals",
    "3.4": "PPP Bankable Projects",
    "3.5": "PPP Project Monitoring",
    "4.1": "PMG Portal Eligible",
    "4.2": "State PMG Portal",
    "4.3": "PM Gati Shakti Adoption",
    "4.4": "ADR Adoption",
    "4.5": "Innovative Practices",
    "4.6": "Capacity Building - Officer Participation",
  };

  return indicatorNames[indicatorCode] || indicatorCode;
}