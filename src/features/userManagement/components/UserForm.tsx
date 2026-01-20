/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
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
import { getAllAssignedMinistryIds, getAssignedMinistryIdsByRole, getMinistryFormIndicators, getRemainingMinistryIndicators } from "@/services/ministry.service";
import MinistryIndicatorsSection from "./MinistryIndicatorsSection";

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
      ministryId?: string;
      ministryAssignedIndicators?: string[];
    }
  ) => void;
  onCancel: () => void;
  // parent passes full indicator objects (or at least objects with `.code`)
  allIndicators?: { code?: string }[];
  officers?: NodalOfficer[];
  loadingIndicators?: boolean;
  stateApproverHasSubmission?: boolean;
  submittedIndicatorsInState?: string[];
  ministryAssignableIndicators?: MultiSelectOption[]; // Only for Ministry Approver edit
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
  ministryAssignableIndicators = [],
}: UserFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Ministry Approver indicators state
  const [allMinistryIndicators, setAllMinistryIndicators] = useState<any[]>([]);
  const [rawMinistryIndicators, setRawMinistryIndicators] = useState<any[]>([]);
  const [loadingMinistryIndicators, setLoadingMinistryIndicators] = useState(false);
  const [ministryIndicatorsError, setMinistryIndicatorsError] = useState<string | null>(null);
  
  // State for selected ministry indicators (for Ministry Approver)
  const [ministryAssignedIndicators, setMinistryAssignedIndicators] = useState<string[]>([]);
  
  // Extract selected indicators from API response when editing a ministry user
  // This is the main effect that extracts selected indicators from ministryAssignableIndicators
  useEffect(() => {
    if (officer && user?.role === "MINISTRY_APPROVER") {
      const selectedIndicators: string[] = [];
      
      console.log('[UserForm] Extracting selected indicators - officer:', officer.id);
      console.log('[UserForm] ministryAssignableIndicators:', ministryAssignableIndicators);
      console.log('[UserForm] ministryAssignableIndicators type:', Array.isArray(ministryAssignableIndicators) ? 'array' : typeof ministryAssignableIndicators);
      console.log('[UserForm] ministryAssignableIndicators length:', Array.isArray(ministryAssignableIndicators) ? ministryAssignableIndicators.length : 'N/A');
      
      // Handle array format (formatted indicators from handleMinistryEditUser)
      if (Array.isArray(ministryAssignableIndicators) && ministryAssignableIndicators.length > 0) {
        console.log('[UserForm] Processing array of indicators...');
        ministryAssignableIndicators.forEach((item: any, index: number) => {
          if (item && typeof item === 'object') {
            // Check if item has isSelected flag - this is set in handleMinistryEditUser
            const isSelected = item.isSelected === true || item.isSelected === 'true';
            // Extract value - prioritize 'value' field as that's what MultiSelect uses
            const value = item.value || item.id || item.code || '';
            
            console.log(`[UserForm] Indicator ${index}: value=${value}, isSelected=${isSelected}, full item:`, item);
            
            if (isSelected && value) {
              const valueStr = String(value).trim();
              if (valueStr) {
                selectedIndicators.push(valueStr);
                console.log('[UserForm] ✓ Added to selected:', valueStr);
              }
            }
          }
        });
        
        console.log('[UserForm] Selected indicators from array:', selectedIndicators);
      } 
      // Handle object format (grouped by category - raw API response)
      else if (ministryAssignableIndicators && typeof ministryAssignableIndicators === 'object' && !Array.isArray(ministryAssignableIndicators)) {
        console.log('[UserForm] Processing object format...');
        Object.values(ministryAssignableIndicators).forEach((categoryIndicators: any) => {
          if (Array.isArray(categoryIndicators)) {
            categoryIndicators.forEach((item: any) => {
              if (item && typeof item === 'object' && (item.isSelected === true || item.isSelected === 'true')) {
                const value = item.id || item.code || item.value || '';
                if (value) {
                  const valueStr = String(value).trim();
                  if (valueStr) {
                    selectedIndicators.push(valueStr);
                    console.log('[UserForm] Found selected indicator from category:', valueStr, item);
                  }
                }
              }
            });
          }
        });
      }
      
      // Fallback: check officer.assignedIndicators if no indicators found with isSelected flag
      if (selectedIndicators.length === 0 && Array.isArray(officer.assignedIndicators) && officer.assignedIndicators.length > 0) {
        console.log('[UserForm] Using fallback: officer.assignedIndicators', officer.assignedIndicators);
        officer.assignedIndicators.forEach((ind: any) => {
          const value = typeof ind === 'string' ? ind : String(ind?.value || ind?.id || ind?.code || ind || '');
          const valueStr = value.trim();
          if (valueStr) {
            selectedIndicators.push(valueStr);
          }
        });
        console.log('[UserForm] Selected indicators from fallback:', selectedIndicators);
      }
      
      console.log('[UserForm] Final selected indicators:', selectedIndicators);
      console.log('[UserForm] Setting ministryAssignedIndicators state with:', selectedIndicators);
      
      // Always update, even if empty (to clear previous selections)
      // Use a Set to ensure unique values
      const uniqueSelectedIndicators = Array.from(new Set(selectedIndicators));
      setMinistryAssignedIndicators(uniqueSelectedIndicators);
      setFormData(prev => ({
        ...prev,
        ministryAssignedIndicators: uniqueSelectedIndicators,
      }));
    } else if (!officer) {
      // Clear selections when not editing
      console.log('[UserForm] Clearing selections - no officer');
      setMinistryAssignedIndicators([]);
      setFormData(prev => ({
        ...prev,
        ministryAssignedIndicators: [],
      }));
    }
  }, [officer?.id, ministryAssignableIndicators, user?.role]);

  // Keep ministryAssignedIndicators in sync with formData
  const handleMinistryIndicatorsChange = (selected: string[]) => {
    setMinistryAssignedIndicators(selected);
    setFormData(prev => ({
      ...prev,
      ministryAssignedIndicators: selected,
    }));
  };

  // Fetch ministry indicators if user is MINISTRY_APPROVER
  useEffect(() => {
    if (!user) return;
    if (user.role === "MINISTRY_APPROVER" && !officer) {
      setLoadingMinistryIndicators(true);
      setMinistryIndicatorsError(null);
      const fetchIndicators = async () => {
        try {
          // When creating a new user, get indicators for the ministry approver
          // Call the indicators endpoint with ministry user id
          const ministryUserId = user.id;
          console.log('[UserForm] Fetching indicators for ministry user:', ministryUserId);
          
          let allData = await getRemainingMinistryIndicators(ministryUserId);
          console.log('[UserForm] Response from getRemainingMinistryIndicators:', allData);

          // Handle response structure - API returns { status, data, message }
          let indicatorsData = allData;
          if (allData && typeof allData === 'object' && 'data' in allData && allData.data !== undefined) {
            indicatorsData = allData.data;
            console.log('[UserForm] Extracted indicatorsData from response.data:', indicatorsData);
          } else if (allData && typeof allData === 'object' && 'status' in allData) {
            // If response has status but data is at root level
            indicatorsData = allData;
          }

          // Check if indicatorsData is blank
          const isBlank =
            indicatorsData == null ||
            (Array.isArray(indicatorsData) && indicatorsData.length === 0) ||
            (typeof indicatorsData === 'object' && !Array.isArray(indicatorsData) && Object.keys(indicatorsData).length === 0);

          if (isBlank) {
            console.log('[UserForm] Indicators data is blank, trying fallback without userId');
            // Fallback: try without userId to get all indicators
            allData = await getMinistryFormIndicators();
            console.log('[UserForm] Fallback response:', allData);
            
            // Handle fallback response structure
            if (allData && typeof allData === 'object' && 'data' in allData && allData.data !== undefined) {
              indicatorsData = allData.data;
            } else {
              indicatorsData = allData;
            }
          }

          let allFlat: any[] = [];
          if (Array.isArray(indicatorsData)) {
            allFlat = indicatorsData;
            console.log('[UserForm] IndicatorsData is array, length:', allFlat.length);
          } else if (indicatorsData && typeof indicatorsData === 'object' && !Array.isArray(indicatorsData)) {
            // Handle grouped by category structure
            Object.entries(indicatorsData).forEach(([section, arr]) => {
              if (Array.isArray(arr)) {
                arr.forEach((item) => {
                  if (item && typeof item === 'object') {
                    allFlat.push({ ...item, section });
                  }
                });
              }
            });
            console.log('[UserForm] Flattened indicators from grouped structure, total:', allFlat.length);
          }
          
          // For new user creation, show indicators where assignedTo matches ministry user ID
          // Filter logic:
          // 1. Show indicators where assignedTo is null/empty OR assignedTo === ministryUserId
          // 2. Exclude indicators where assignedTo is NOT the ministry user ID (assigned to nodal officers)
          // 3. Exclude indicators with submitted statuses
          const availableIndicators = allFlat.filter((item) => {
            // Check assignedTo field - convert to string for comparison
            const assignedTo = item.assignedTo || null;
            const assignedToStr = assignedTo ? String(assignedTo).trim() : '';
            const ministryUserIdStr = String(ministryUserId).trim();
            
            console.log('[UserForm] Checking indicator:', {
              indicatorId: item.id || item.code,
              assignedTo: assignedToStr,
              ministryUserId: ministryUserIdStr,
              assignedToMatches: assignedToStr === ministryUserIdStr || assignedToStr === '',
            });
            
            // Only show indicators where:
            // - assignedTo is null/empty (not assigned to anyone), OR
            // - assignedTo === ministryUserId (assigned to this ministry user)
            // Exclude if assignedTo exists and is NOT the ministry user ID
            if (assignedToStr && assignedToStr !== '' && assignedToStr !== ministryUserIdStr) {
              console.log('[UserForm] Excluding indicator - assigned to different user:', assignedToStr);
              return false;
            }
            
            const status = item.indicatorStatus || item.status || null;
            
            // If no status, include the indicator (available for assignment)
            if (!status || status === null) {
              return true;
            }
            
            // Convert status to string for comparison
            const statusStr = String(status).toUpperCase();
            
            // List of statuses that indicate the indicator is submitted and should be excluded
            // Only include DRAFT and null/empty statuses - exclude all others
            const submittedStatuses = [
              'SUBMITTED_TO_MINISTRY',
              'SUBMITTED_TO_MOSPI',
              'ACCEPTED',
              'ACCEPTED_BY_MINISTRY',
              'ACCEPTED_BY_MOSPI',
              'ACCEPTED_BY_MOSPI_APPROVER_DRAFT',
              'RESUBMITTED',
              'REVERTED',
              'RETURNED_FROM_MINISTRY',
              'RETURNED_FROM_MOSPI',
              'RETURNED_FROM_MOSPI_APPROVER',
              'RETURNED_FROM_MOSPI_APPROVER_DRAFT',
            ];
            
            // Check if status contains any submitted status (case-insensitive)
            const isSubmitted = submittedStatuses.some(submittedStatus => 
              statusStr === submittedStatus || statusStr.includes(submittedStatus)
            );
            
            // Only include if status is DRAFT or not in submitted statuses
            // Exclude all submitted indicators
            return !isSubmitted;
          });
          
          console.log('[UserForm] Available indicators after filtering:', availableIndicators.length);
          console.log('[UserForm] Sample indicators:', availableIndicators.slice(0, 3));
          
          setAllMinistryIndicators(availableIndicators);
          setRawMinistryIndicators(availableIndicators);
        } catch (err) {
          console.error('[UserForm] Error fetching ministry indicators:', err);
          setMinistryIndicatorsError("Failed to load ministry indicators. Please try again.");
          setAllMinistryIndicators([]);
          setRawMinistryIndicators([]);
        } finally {
          setLoadingMinistryIndicators(false);
        }
      };
      fetchIndicators();
    }
  }, [user, officer]);

  // Use ministryAssignableIndicators for edit, otherwise use allMinistryIndicators for add
  const ministryIndicators: MultiSelectOption[] = useMemo(() => {
    let source = [];
    if (user?.role === "MINISTRY_APPROVER" && officer && Array.isArray(ministryAssignableIndicators)) {
      source = ministryAssignableIndicators;
    } else {
      source = rawMinistryIndicators;
    }
    if (!source || source.length === 0) {
      return [];
    }
    const options = source.map((item: any) => {
      if (item && typeof item === 'object' && item.value && item.label) {
        // Already formatted option
        return {
          value: String(item.value || ''),
          label: item.label || '',
          section: item.section || '',
          description: item.description || '',
          disabled: item.isDisabled || item.disabled || item.isSubmitted || false,
        };
      }
      // Raw indicator object from API
      const value = item.id || item.code || item.value || '';
      const sNo = item.sNo || '';
      const name = item.name || item.label || item.code || '';
      const section = item.category || item.section || '';
      const description = item.description || '';
      
      // Check if disabled based on submitted status
      const isDisabled = item.isDisabled || item.isSubmitted || false;
      
      // Add "(Submitted)" to label if submitted
      const labelText = item.isSubmitted 
        ? `${sNo ? sNo + ' - ' : ''}${name} (Submitted)`
        : `${sNo ? sNo + ' - ' : ''}${name}`;
      
      return {
        value: String(value || ''),
        label: labelText,
        section,
        description,
        disabled: isDisabled,
      };
    }).filter((item) => item.value !== '');
    return options;
  }, [user?.role, officer, ministryAssignableIndicators, rawMinistryIndicators]);

  // Local state for submitted indicators (fallback if not provided)
  const [localSubmittedIndicators, setLocalSubmittedIndicators] = useState<string[]>(() => 
    Array.isArray(submittedIndicatorsInState) ? submittedIndicatorsInState : []
  );

  // Use provided submittedIndicatorsInState or fallback to local state
  const effectiveSubmittedIndicators = useMemo(() => {
    const submitted = Array.isArray(submittedIndicatorsInState) ? submittedIndicatorsInState : [];
    if (submitted.length > 0) {
      return submitted;
    }
    return Array.isArray(localSubmittedIndicators) ? localSubmittedIndicators : [];
  }, [submittedIndicatorsInState, localSubmittedIndicators]);

  // Fallback: Fetch submitted indicators if not provided
  useEffect(() => {
    const fetchIfNeeded = async () => { 
      if (submittedIndicatorsInState.length === 0 && localSubmittedIndicators.length === 0) {
        const stateUt = officer?.stateUt || officer?.state || user?.stateUt || user?.state;
        if (stateUt) {
          try {
            const submitted = await getRemainingMinistryIndicators(user.id);
            setLocalSubmittedIndicators(submitted);
          } catch (error) {
            // Error handling
          }
        }
      }
    };
    fetchIfNeeded();
  }, [submittedIndicatorsInState.length, localSubmittedIndicators.length, officer?.stateUt, officer?.state, user?.stateUt, user?.state, user?.id]);

  // Update local state when prop changes
  useEffect(() => {
    if (submittedIndicatorsInState.length > 0) {
      setLocalSubmittedIndicators(submittedIndicatorsInState);
    }
  }, [submittedIndicatorsInState]);

  // Initialize formData with saved draft data if creating a new user
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    contactNumber: string;
    email: string;
    password: string;
    role: string;
    stateId: string | string[];
    assignedIndicators: string[];
    stateUt: string | string[];
    ministryId: string | string[]; // Support array for MOSPI_REVIEWER
    ministryAssignedIndicators?: string[];
  }>(() => {
    // If logged in as Ministry Approver, default role is NODAL_OFFICER and ministry is selected
    if (user?.role === "MINISTRY_APPROVER") {
      return {
        firstName: "",
        lastName: "",
        contactNumber: "",
        email: "",
        password: "",
        role: "NODAL_OFFICER",
        stateId: "",
        assignedIndicators: [],
        stateUt: "",
        ministryId: user.ministryId || "",
      };
    }
    // If logged in as MOSPI_APPROVER, default role is MOSPI_REVIEWER
    if (user?.role === "MOSPI_APPROVER") {
      return {
        firstName: "",
        lastName: "",
        contactNumber: "",
        email: "",
        password: "",
        role: "MOSPI_REVIEWER",
        stateId: [],
        assignedIndicators: [],
        stateUt: "",
        ministryId: [], // Array for MOSPI_REVIEWER to support multiple ministries
      };
    }
    return {
      firstName: "",
      lastName: "",
      contactNumber: "",
      email: "",
      password: "",
      role: "NODAL_OFFICER",
      stateId: "",
      assignedIndicators: [],
      stateUt: "",
      ministryId: "",
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [states, setStates] = useState<State[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAllSelectedIndicators, setShowAllSelectedIndicators] = useState(false);
  const [disabledStateNames, setDisabledStateNames] = useState<string[]>([]);
  const [nodalHasSubmission, setNodalHasSubmission] = useState(false);
  const [checkingNodalSubmission, setCheckingNodalSubmission] = useState(false);

  const [ministries, setMinistries] = React.useState<{ id: string; name: string }[]>([]);
  const [loadingMinistries, setLoadingMinistries] = React.useState(false);
  const [ministryError, setMinistryError] = React.useState<string | null>(null);

  // State to hold assigned ministry IDs
  const [assignedMinistryIds, setAssignedMinistryIds] = useState<any[]>([]);

  useEffect(() => {
    // Fetch assigned ministry IDs if role is MINISTRY_APPROVER or MOSPI_REVIEWER
    // Filter by role: MINISTRY_APPROVER can only be assigned to a ministry if no other MINISTRY_APPROVER has it
    // MOSPI_REVIEWER can only be assigned to a ministry if no other MOSPI_REVIEWER has it (but can share with MINISTRY_APPROVER)
    if (formData.role === "MINISTRY_APPROVER" || formData.role === "MOSPI_REVIEWER") {
      (async () => {
        try {
          // Get assigned ministry IDs filtered by the same role (excluding current user if editing)
          const result = await getAssignedMinistryIdsByRole(formData.role, officer?.id);
          const filtered = Array.isArray(result) ? result.filter((id) => !!id && id !== "") : [];
          setAssignedMinistryIds(filtered);
        } catch (e) {
          if (typeof window !== 'undefined') {
            console.error('[AssignedMinistryIds API Error]', e);
          }
          setAssignedMinistryIds([]);
        }
      })();
    } else {
      setAssignedMinistryIds([]);
    }
  }, [formData.role, officer?.id]);

  // Auto-load ministries if initial role is MINISTRY_APPROVER or MOSPI_REVIEWER
  useEffect(() => {
    if (formData.role === "MINISTRY_APPROVER" || formData.role === "MOSPI_REVIEWER") {
      setLoadingMinistries(true);
      setMinistryError(null);
      apiService.get("/ministries")
        .then(res => {
          let data = res?.data?.data || res?.data || res;
          if (Array.isArray(data)) {
            setMinistries(data);
            // Auto-select ministry if MINISTRY_APPROVER is selected and logged in as Ministry Approver
            if (formData.role === "MINISTRY_APPROVER" && user?.role === "MINISTRY_APPROVER" && user?.ministryId && !formData.ministryId) {
              setFormData(prev => ({ ...prev, ministryId: user.ministryId || "" }));
            }
          } else {
            setMinistries([]);
          }
        })
        .catch(() => {
          setMinistryError("Failed to load ministries");
          setMinistries([]);
        })
        .finally(() => {
          setLoadingMinistries(false);
        });
    }
  }, [formData.role, user?.role, user?.ministryId]);

  // Load ministries when role changes
  React.useEffect(() => {
    if (
      formData.role === "MINISTRY_APPROVER" ||
      formData.role === "MOSPI_REVIEWER" ||
      user?.role === "MINISTRY_APPROVER"
    ) {
      setLoadingMinistries(true);
      setMinistryError(null);
      apiService
        .get("/ministries")
        .then((res: any) => {
          let data = res?.data?.data || res?.data || res;
          if (Array.isArray(data)) {
            setMinistries(data);
          } else {
            setMinistries([]);
          }
        })
        .catch((err: any) => {
          setMinistryError("Failed to load ministries");
          setMinistries([]);
        })
        .finally(() => setLoadingMinistries(false));
    } else {
      setMinistries([]);
      setMinistryError(null);
    }
  }, [formData.role, user?.role]);

  // State for API response
  const [availableIndicatorsForState, setAvailableIndicatorsForState] = useState<any[]>([]);

  // State for checking duplicates
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingContact, setCheckingContact] = useState(false);

  // Debounced values for real-time validation
  const debouncedEmail = useDebounce(formData.email, 500);
  const debouncedContactNumber = useDebounce(formData.contactNumber, 500);

  // Refs to track if we've already fetched data to prevent duplicate calls
  const fetchedIndicatorsRef = useRef<string>("");
  const fetchedDisabledStatesRef = useRef<string>("");
  const fetchedSubmittedIndicatorsRef = useRef<string>("");
  const formDataInitializedRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedRef = useRef<{
    stateName: string;
    officerId: string | undefined;
    role: string;
  } | null>(null);
  const isInitializingRef = useRef(false);
  const roleFixedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedEmailRef = useRef<string>("");
  const lastCheckedContactRef = useRef<string>("");

  // Stabilize user role and state to prevent unnecessary re-renders
  const userRole = user?.role;
  const userState = user?.state;

  // Compute available indicators for selected state (using backend API for real-time data)
  useEffect(() => {
    if (isInitializingRef.current) {
      return;
    }

    if (formData.role !== "NODAL_OFFICER") {
      if (lastFetchedRef.current?.role === "NODAL_OFFICER") {
        setAvailableIndicatorsForState([]);
        fetchedIndicatorsRef.current = "";
        lastFetchedRef.current = null;
      }
      return;
    }

    if (userRole === "ADMIN") {
      if (allIndicators.length > 0) {
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

    const stateName = userState || "";

    if (!stateName) {
      setAvailableIndicatorsForState([]);
      return;
    }

    const cacheKey = `${stateName}-${officer?.id || "new"}`;

    if (
      fetchedIndicatorsRef.current === cacheKey &&
      lastFetchedRef.current?.stateName === stateName &&
      lastFetchedRef.current?.officerId === (officer?.id || "new") &&
      lastFetchedRef.current?.role === formData.role
    ) {
      return;
    }

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    const THROTTLE_MS = 1000;

    if (
      timeSinceLastFetch < THROTTLE_MS &&
      fetchedIndicatorsRef.current === cacheKey
    ) {
      return;
    }

    lastFetchTimeRef.current = now;

    const computeAvailableIndicators = async () => {
      try {
        const availableIndicators: any =
          await apiService.getAvailableIndicatorsForApprover(stateName);

        let indicators: any = availableIndicators;
        if (
          availableIndicators &&
          typeof availableIndicators === "object" &&
          !Array.isArray(availableIndicators)
        ) {
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

        if (!Array.isArray(indicators)) {
          console.warn(
            "⚠️ API returned invalid indicators format:",
            indicators
          );
          indicators = [];
        }

        // Filter out submitted indicators
        try {
          const submissionsResp = await apiService.getSubmissions(1, 100);
          const submissionsArray = Array.isArray(submissionsResp)
            ? submissionsResp
            : (submissionsResp as any)?.submissions || [];

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
          }
        } catch (submissionErr) {
          console.warn(
            "[UserForm] Failed to filter submitted indicators, using all available indicators:",
            submissionErr
          );
        }

        setAvailableIndicatorsForState(indicators);
        fetchedIndicatorsRef.current = cacheKey;
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

        if (allIndicators.length === 0) {
          setAvailableIndicatorsForState([]);
          return;
        }

        const assignedSet = new Set<string>();

        officers.forEach((o) => {
          const officerState = o.state || o.stateId || "";
          if (!stateName || officerState === stateName) {
            const assigned =
              o.assignedIndicators ||
              (o.assignedIndicator ? [o.assignedIndicator] : []);
            if (o.id !== officer?.id) {
              assigned.forEach((code) => {
                if (code) assignedSet.add(code);
              });
            }
          }
        });

        const available = allIndicators.filter(
          (ind: any) =>
            !assignedSet.has(ind.code) &&
            ind.code &&
            ALL_INDICATOR_CODES.includes(ind.code)
        );

        const formattedAvailable = available.map((ind: any) => ({
          code: ind.code,
          name: ind.name || getIndicatorDisplayName(ind.code),
          category: ind.category || ind.section || "",
          id: ind.id,
        }));

        setAvailableIndicatorsForState(formattedAvailable);
        fetchedIndicatorsRef.current = cacheKey;
        lastFetchedRef.current = {
          stateName,
          officerId: officer?.id || "new",
          role: formData.role,
        };
      }
    };

    computeAvailableIndicators();
  }, [formData.role, userRole, userState, officer?.id, allIndicators, officers]);

  // Build the options list
  const indicatorOptions: MultiSelectOption[] = useMemo(() => {
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

    const assigned = formData.assignedIndicators || [];
    const submittedAssigned = effectiveSubmittedIndicators.filter((code) =>
      assigned.includes(code)
    );
    const originalAssigned = officer?.assignedIndicators
      ? Array.isArray(officer.assignedIndicators)
        ? officer.assignedIndicators
        : [officer.assignedIndicators]
      : [];

    let allCodes: string[] = [];

    if (user?.role === "ADMIN") {
      allCodes = [...ALL_INDICATOR_CODES];
    } else {
      if (apiCodes.length > 0) {
        allCodes = [...apiCodes];
      }

      assigned.forEach((code) => {
        if (!allCodes.includes(code) && ALL_INDICATOR_CODES.includes(code)) {
          allCodes.push(code);
        }
      });

      if (officer && originalAssigned.length > 0) {
        originalAssigned.forEach((code) => {
          if (!allCodes.includes(code) && ALL_INDICATOR_CODES.includes(code)) {
            allCodes.push(code);
          }
        });
      }

      if (allCodes.length === 0) {
        allCodes = [...ALL_INDICATOR_CODES];
      }
    }

    submittedAssigned.forEach((code) => {
      if (!allCodes.includes(code) && ALL_INDICATOR_CODES.includes(code)) {
        allCodes.unshift(code);
      }
    });

    allCodes = Array.from(new Set(allCodes));

    const indicatorNameMap: Record<string, string> = {};
    const indicatorCategoryMap: Record<string, string> = {};

    const infraEnablersCodes = ["4.1", "4.2", "4.3", "4.4", "4.5"];
    infraEnablersCodes.forEach((code) => {
      indicatorNameMap[code] = getIndicatorDisplayName(code);
    });

    if (
      availableIndicatorsForState &&
      availableIndicatorsForState.length > 0 &&
      typeof availableIndicatorsForState[0] === "object"
    ) {
      availableIndicatorsForState.forEach((item: any) => {
        if (item && item.code) {
          if (!infraEnablersCodes.includes(item.code) && item.name) {
            indicatorNameMap[item.code] = item.name;
          }
          if (item.category) indicatorCategoryMap[item.code] = item.category;
        }
      });
    }

    allIndicators.forEach((ind: any) => {
      const code = ind.code;
      if (code) {
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

    allCodes.forEach((code: string) => {
      if (!indicatorNameMap[code]) {
        indicatorNameMap[code] = getIndicatorDisplayName(code);
      }
    });

    const options = allCodes.map((code: string) => {
      let section = indicatorCategoryMap[code] || "";
      let description = indicatorNameMap[code];

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

    return options;
  }, [
    availableIndicatorsForState,
    formData.assignedIndicators,
    allIndicators,
    effectiveSubmittedIndicators,
    officer?.assignedIndicators,
    user?.role,
  ]);

  // Memoize the MultiSelect value
  const multiSelectValue = useMemo(() => {
    const currentAssigned = formData.assignedIndicators || [];
    const submittedAssigned = effectiveSubmittedIndicators.filter((code) =>
      currentAssigned.includes(code)
    );
    const finalValue = Array.from(
      new Set([...currentAssigned, ...submittedAssigned])
    );
    return finalValue;
  }, [formData.assignedIndicators, effectiveSubmittedIndicators]);

  // Handle indicator selection change
  const handleIndicatorChange = useCallback(
    (selectedIndicators: string[]) => {
      const currentlySelected = formData.assignedIndicators || [];
      const submittedAssigned = currentlySelected.filter((ind) =>
        effectiveSubmittedIndicators.includes(ind)
      );

      const beingRemoved = currentlySelected.filter(
        (ind) => !selectedIndicators.includes(ind)
      );
      const cannotRemove = beingRemoved.filter((ind) =>
        effectiveSubmittedIndicators.includes(ind)
      );

      if (cannotRemove.length > 0) {
        toast({
          title: "Cannot Remove Indicators",
          description: `The following indicators are already submitted and cannot be removed: ${cannotRemove.join(
            ", "
          )}`,
          variant: "destructive",
        });
        return;
      }

      const newSelectionWithoutSubmitted = selectedIndicators.filter(
        (ind) => !effectiveSubmittedIndicators.includes(ind)
      );
      const finalSelection = [
        ...submittedAssigned,
        ...newSelectionWithoutSubmitted,
      ];

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
      const indicators = await apiService.getUserAssignedIndicators(userId);
      if (Array.isArray(indicators) && indicators.length > 0) {
        setFormData((prev) => ({
          ...prev,
          assignedIndicators: indicators,
        }));
      }
    } catch (error) {
      console.error("❌ Failed to fetch assigned indicators:", error);
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
      if (error?.response?.status === 404) {
        setNodalHasSubmission(false);
      } else {
        setNodalHasSubmission(false);
      }
    } finally {
      setCheckingNodalSubmission(false);
    }
  };

  // Get available roles based on current user's role
  const getAvailableRoles = useCallback(() => {
    const currentUserRole = user?.role;

    switch (currentUserRole) {
      case "MINISTRY_APPROVER":
        return [
          {
            value: "NODAL_OFFICER",
            label: getRoleDisplayName("NODAL_OFFICER"),
          },
        ];
      case "STATE_APPROVER":
        return [
          {
            value: "NODAL_OFFICER",
            label: getRoleDisplayName("NODAL_OFFICER"),
          },
        ];
      case "MOSPI_APPROVER":
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
            value: "MINISTRY_APPROVER",
            label: getRoleDisplayName("MINISTRY_APPROVER"),
          }
        ];
      case "ADMIN":
        return [
          {
            value: "MINISTRY_APPROVER",
            label: getRoleDisplayName("MINISTRY_APPROVER"),
          },
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
          {
            value: "ADMIN",
            label: getRoleDisplayName("ADMIN")
          },
        ];
      default:
        return [];
    }
  }, [user?.role]);

  // Validate and fix role if it's not in available roles
  useEffect(() => {
    if (isInitializingRef.current || roleFixedRef.current) {
      return;
    }

    if (!officer && formData.role) {
      const availableRoles = getAvailableRoles();
      const availableRoleValues = availableRoles.map((r) => r.value);

      if (!availableRoleValues.includes(formData.role)) {
        const defaultRole =
          availableRoles.length > 0 ? availableRoles[0].value : "NODAL_OFFICER";
        roleFixedRef.current = true;
        setTimeout(() => {
          setFormData((prev) => ({ ...prev, role: defaultRole }));
        }, 0);
      } else {
        roleFixedRef.current = true;
      }
    }

    if (!officer && !formData.role) {
      roleFixedRef.current = false;
    }
  }, [formData.role, user?.role, officer, getAvailableRoles]);

  useEffect(() => {
    formDataInitializedRef.current = false;
    isInitializingRef.current = true;
    roleFixedRef.current = false;

    if (officer) {
      const stateIdsRaw = officer.state
        ? officer.state
            .split(",")
            .map((name) => {
              const match = states.find((s) => s.name.trim() === name.trim());
              return match ? match.id : officer.state;
            })
            .filter(Boolean)
        : [];
      const stateIds = Array.from(new Set(stateIdsRaw));
      const uniqueStateNames = Array.from(
        new Set(
          stateIds.map((id) => {
            const found = states.find((s) => s.id === id);
            return found ? found.name : id;
          })
        )
      );

      let stateIdValue: string | string[] = stateIds;
      if (officer.role === "MOSPI_REVIEWER") {
        stateIdValue = Array.isArray(stateIds) ? stateIds : stateIds ? [stateIds] : [];
      }

      if (!formDataInitializedRef.current) {
        setFormData({
          firstName: officer.firstName || "",
          lastName: officer.lastName || "",
          contactNumber: officer.contactNumber || "",
          email: officer.email || "",
          password: "",
          role: user?.role === "MINISTRY_APPROVER" ? "NODAL_OFFICER" : (officer.role || "NODAL_OFFICER"),
          stateId: stateIdValue,
          ministryId: officer.role === "MOSPI_REVIEWER" && officer.ministryId 
            ? (Array.isArray(officer.ministryId) ? officer.ministryId : officer.ministryId.split(",").map(m => m.trim()).filter(Boolean))
            : (officer.ministryId || ""),
          stateUt: uniqueStateNames.join(", "),
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

      const effectiveRole = user?.role === "MINISTRY_APPROVER" ? "NODAL_OFFICER" : officer.role;
      if (effectiveRole === "NODAL_OFFICER" && officer.id) {
        fetchAssignedIndicators(officer.id);
        checkNodalOfficerSubmission(officer.id);
      } else {
        setNodalHasSubmission(false);
      }
    } else {
      const savedFormData =
        typeof window !== "undefined"
          ? sessionStorage.getItem("userManagementFormDraft")
          : null;

      if (savedFormData) {
        try {
          const parsed = JSON.parse(savedFormData);
          if (
            parsed.timestamp &&
            Date.now() - parsed.timestamp < 3600000 &&
            parsed.data
          ) {
            const availableRoles = getAvailableRoles();
            const availableRoleValues = availableRoles.map((r) => r.value);
            const defaultRole =
              availableRoles.length > 0
                ? availableRoles[0].value
                : "NODAL_OFFICER";

            const restoredData = { ...parsed.data };
            if (
              !restoredData.role ||
              !availableRoleValues.includes(restoredData.role)
            ) {
              restoredData.role = defaultRole;
            }

            if (!formDataInitializedRef.current) {
              setFormData({
                ...restoredData,
                ministryId: restoredData.ministryId !== undefined && restoredData.ministryId !== "" ? restoredData.ministryId : (officer?.ministryId || "")
              });
              formDataInitializedRef.current = true;
              roleFixedRef.current = true;
              fetchedIndicatorsRef.current = "";
              fetchedDisabledStatesRef.current = "";
              fetchedSubmittedIndicatorsRef.current = "";
              lastCheckedEmailRef.current = "";
              lastCheckedContactRef.current = "";
              setErrors({});
              setNodalHasSubmission(false);

              setTimeout(() => {
                isInitializingRef.current = false;
              }, 100);

              return;
            }
          } else {
            sessionStorage.removeItem("userManagementFormDraft");
          }
        } catch (e) {
          console.warn("Failed to parse saved form data:", e);
          sessionStorage.removeItem("userManagementFormDraft");
        }
      }

      fetchedIndicatorsRef.current = "";
      fetchedDisabledStatesRef.current = "";
      fetchedSubmittedIndicatorsRef.current = "";
      lastCheckedEmailRef.current = "";
      lastCheckedContactRef.current = "";

      let defaultRole = "NODAL_OFFICER";
      if (user?.role === "STATE_APPROVER") {
        defaultRole = "NODAL_OFFICER";
      } else if (user?.role === "MOSPI_APPROVER") {
        defaultRole = "MOSPI_REVIEWER";
      } else if (user?.role === "ADMIN") {
        const availableRoles = getAvailableRoles();
        defaultRole = availableRoles.length > 0 ? availableRoles[0].value : "MINISTRY_APPROVER";
      }

      if (!formDataInitializedRef.current) {
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
          ministryId: user?.role === "MINISTRY_APPROVER" ? (user?.ministryId || "") : "",
        });
        formDataInitializedRef.current = true;
        roleFixedRef.current = false;

        setErrors({});
        setNodalHasSubmission(false);

        setTimeout(() => {
          isInitializingRef.current = false;
        }, 100);
      }
    }
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
    user?.ministryId,
    states,
    getAvailableRoles,
  ]);

  // Save form data to sessionStorage whenever it changes (only for new users) - debounced
  useEffect(() => {
    if (isInitializingRef.current || officer || typeof window === "undefined") {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
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
        sessionStorage.removeItem("userManagementFormDraft");
      }
    }, 1000);

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
        setStates(statesData);

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
            setFormData((prev) => ({
              ...prev,
              stateId: foundState.id,
            }));
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
      }
    }
  }, [officer, states, formData.stateId]);

  // Helper function to validate alphabets only
  const isAlphabetsOnly = (value: string): boolean => {
    if (!value || typeof value !== "string") return false;
    return /^[\p{L}\s'-]+$/u.test(value.trim());
  };

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

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    } else if (!/@(gov\.in|nic\.in)$/i.test(formData.email)) {
      newErrors.email = "Only @gov.in and @nic.in email addresses are allowed";
    }

    if (!officer && !formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (!officer && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    // Ministry validation for MINISTRY_APPROVER
    if (formData.role === "MINISTRY_APPROVER") {
      if (!formData.ministryId || formData.ministryId === "") {
        newErrors.ministryId = "Please select a ministry";
      }
    }

    // For MOSPI_REVIEWER: At least one of State/UT or Ministry must be selected
    if (formData.role === "MOSPI_REVIEWER") {
      const hasState = Array.isArray(formData.stateId) ? formData.stateId.length > 0 : !!formData.stateId;
      const hasMinistry = Array.isArray(formData.ministryId) 
        ? formData.ministryId.length > 0 
        : (!!formData.ministryId && formData.ministryId !== "");
      if (!hasState && !hasMinistry) {
        newErrors.stateId = "Please select at least one State/UT or a Ministry";
        newErrors.ministryId = "Please select at least one State/UT or a Ministry";
      }
    }

    // State validation - skip for MINISTRY_APPROVER
    if ((user?.role === "ADMIN" || user?.role === "MOSPI_APPROVER") && formData.role?.toUpperCase() !== "MINISTRY_APPROVER") {
      if (formData.role === "MOSPI_REVIEWER") {
        const hasMinistry = Array.isArray(formData.ministryId) 
          ? formData.ministryId.length > 0 
          : (!!formData.ministryId && formData.ministryId !== "");
        if (!hasMinistry && (!Array.isArray(formData.stateId) || formData.stateId.length === 0)) {
          newErrors.stateId = "Please select at least one state";
        }
      } else if (formData.role !== "MOSPI_APPROVER" && formData.role !== "ADMIN") {
        if (!formData.stateId || (Array.isArray(formData.stateId) && formData.stateId.length === 0)) {
          newErrors.stateId = "State is required";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('[UserForm] Save User button clicked');
    
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

    const stateNames = Array.from(new Set(normalizedStateId.map(
      (id) => states.find((s) => s.id === id)?.name ?? id
    )));

    const isValid = validate();
    if (!isValid) {
      console.log('[UserForm] Validation failed:', errors);
      return;
    }

    // Check contact number via API
    const normalizedContact = formData.contactNumber.replace(/\s/g, "");
    if (normalizedContact && /^\d{10}$/.test(normalizedContact)) {
      try {
        setCheckingContact(true);
        const isContactAvailable = await apiService.checkContactAvailability(
          normalizedContact,
          officer?.id
        );

        if (!isContactAvailable) {
          setErrors((prev) => ({
            ...prev,
            contactNumber: "This contact number is already registered to another user",
          }));
          setCheckingContact(false);
          toast({
            title: "Validation Error",
            description: "This contact number is already registered to another user",
            variant: "destructive",
          });
          return;
        }
        
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (newErrors.contactNumber === "This contact number is already registered to another user" ||
              newErrors.contactNumber === "This contact number is already assigned to another user") {
            delete newErrors.contactNumber;
          }
          return newErrors;
        });
      } catch (error: any) {
        console.error("❌ [handleSubmit] Error checking contact availability:", error);
        toast({
          title: "Warning",
          description: "Could not verify contact number availability. Please verify manually.",
          variant: "default",
        });
      } finally {
        setCheckingContact(false);
      }
    }

    // Build payload for submission
    // For MOSPI_REVIEWER, handle multiple ministries (send as comma-separated string for backend compatibility)
    const normalizedMinistryId = formData.role === "MOSPI_REVIEWER" && Array.isArray(formData.ministryId)
      ? formData.ministryId.join(",")
      : (formData.ministryId ? String(formData.ministryId) : "");
    
    const payload = {
      ...formData,
      stateUt: stateNames.join(", "),
      stateId: formData.role === "MOSPI_REVIEWER" ? normalizedStateId : normalizedStateId[0] || "",
      ministryId: normalizedMinistryId,
      // Always include the latest ministryAssignedIndicators from state
      ...((user?.role === "MINISTRY_APPROVER" || formData.role === "MINISTRY_APPROVER") ? { ministryAssignedIndicators } : {}),
    };

    type SubmitPayload = Omit<
      NodalOfficer,
      "id" | "state" | "createdAt" | "assignedIndicator"
    > & {
      password?: string;
      ministryId?: string;
      assignedIndicators?: string[];
      stateId?: string | string[];
      stateUt?: string;
      ministryAssignedIndicators?: string[];
    };

    try {
      await onSave(payload as SubmitPayload);
      setFormData(prev => ({
        ...prev,
        firstName: '',
        lastName: '',
        contactNumber: '',
        email: '',
        password: '',
        role: prev.role,
        stateId: prev.role === "MOSPI_REVIEWER" ? [] : '',
        stateUt: '',
        assignedIndicators: [],
        ministryId: prev.role === "MOSPI_REVIEWER" ? [] : '',
      }));
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('userManagementFormDraft');
      }
    } catch (error) {
      console.error('[UserForm] Error in onSave:', error);
      toast({
        title: "Save Failed",
        description: "Could not save user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getSelectedStateName = () => {
    if (!formData.stateId) return "";
    const id = Array.isArray(formData.stateId)
      ? formData.stateId[0]
      : formData.stateId;
    const state = states.find((s) => s.id === id);
    return state ? state.name : id;
  };

  const handleStateChange = useCallback(
    (values: string | string[]) => {
      // Clear state-related errors when state changes
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.stateId;
        return newErrors;
      });

      if (!values || (Array.isArray(values) && values.length === 0)) {
        setFormData((prev) => ({
          ...prev,
          stateId: formData.role === "MOSPI_REVIEWER" ? [] : "",
          stateUt: "",
        }));
        return;
      }
      if (formData.role === "MOSPI_REVIEWER") {
        const stateValues = Array.isArray(values)
          ? values.filter(Boolean)
          : [values].filter(Boolean);
        const uniqueNames = Array.from(
          new Set(
            stateValues.map((id) => states.find((s) => s.id === id)?.name ?? id)
          )
        );
        setFormData((prev) => ({
          ...prev,
          stateId: stateValues,
          stateUt: uniqueNames.join(", "),
        }));
      } else {
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
  // Skip for MOSPI_REVIEWER as we handle it differently (allow deselection of current user's states)
  useEffect(() => {
    const fetchDisabledStates = async () => {
      try {
        if (!formData.role) {
          setDisabledStateNames([]);
          fetchedDisabledStatesRef.current = "";
          return;
        }

        if (formData.role === "NODAL_OFFICER" || formData.role === "MOSPI_REVIEWER") {
          setDisabledStateNames([]);
          fetchedDisabledStatesRef.current = "";
          return;
        }

        if (fetchedDisabledStatesRef.current === formData.role) {
          return;
        }

        const response = await apiService.getAssignedStateOnly(formData.role);

        if (response && Array.isArray(response)) {
          const stateNames = response
            .map((item: any) => item.stateName || item.name || item)
            .filter(Boolean);
          setDisabledStateNames(stateNames);
          fetchedDisabledStatesRef.current = formData.role;
        }
      } catch (error) {
        console.error("Error fetching assigned states:", error);
        setDisabledStateNames([]);
        fetchedDisabledStatesRef.current = "";
      }
    };

    fetchDisabledStates();
  }, [formData.role]);

  // Real-time email availability check
  useEffect(() => {
    let isCancelled = false;

    const checkEmail = async () => {
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

      if (debouncedEmail && lastCheckedEmailRef.current === debouncedEmail) {
        return;
      }

      if (!debouncedEmail || !/@(gov\.in|nic\.in)$/i.test(debouncedEmail)) {
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            if (
              newErrors.email ===
              "This email is already registered to another user"
            ) {
              delete newErrors.email;
            }
            return newErrors;
          });
        }
        lastCheckedEmailRef.current = "";
        return;
      }

      if (!isCancelled) {
        setCheckingEmail(true);
        lastCheckedEmailRef.current = debouncedEmail;
      }

      try {
        const isAvailable = await apiService.checkEmailAvailability(
          debouncedEmail,
          officer?.id
        );

        if (!isCancelled) {
          if (!isAvailable) {
            setErrors((prev) => ({
              ...prev,
              email: "This email is already registered to another user",
            }));
          } else {
            setErrors((prev) => {
              const newErrors = { ...prev };
              if (
                newErrors.email ===
                "This email is already registered to another user"
              ) {
                delete newErrors.email;
              }
              return newErrors;
            });
          }
        }
      } catch (error) {
        console.error("Error checking email availability:", error);
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            if (
              newErrors.email ===
              "This email is already registered to another user"
            ) {
              delete newErrors.email;
            }
            return newErrors;
          });
          lastCheckedEmailRef.current = "";
        }
      } finally {
        if (!isCancelled) {
          setCheckingEmail(false);
        }
      }
    };

    checkEmail();

    return () => {
      isCancelled = true;
    };
  }, [debouncedEmail, officer?.id, officer?.email]);

  // Real-time contact number availability check
  useEffect(() => {
    let isCancelled = false;

    const checkContact = async () => {
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

      const normalizedContact = debouncedContactNumber.replace(/\s/g, "");

      if (
        normalizedContact &&
        lastCheckedContactRef.current === normalizedContact
      ) {
        return;
      }

      if (!normalizedContact || !/^\d{10}$/.test(normalizedContact)) {
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            if (
              newErrors.contactNumber ===
              "This contact number is already registered to another user"
            ) {
              delete newErrors.contactNumber;
            }
            return newErrors;
          });
        }
        lastCheckedContactRef.current = "";
        return;
      }

      if (!isCancelled) {
        setCheckingContact(true);
        lastCheckedContactRef.current = normalizedContact;
      }

      try {
        const isAvailable = await apiService.checkContactAvailability(
          normalizedContact,
          officer?.id
        );

        if (!isCancelled) {
          if (!isAvailable) {
            setErrors((prev) => ({
              ...prev,
              contactNumber:
                "This contact number is already registered to another user",
            }));
          } else {
            setErrors((prev) => {
              const newErrors = { ...prev };
              if (
                newErrors.contactNumber ===
                "This contact number is already registered to another user"
              ) {
                delete newErrors.contactNumber;
              }
              return newErrors;
            });
          }
        }
      } catch (error) {
        console.error("Error checking contact availability:", error);
        if (!isCancelled) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            if (
              newErrors.contactNumber ===
              "This contact number is already registered to another user"
            ) {
              delete newErrors.contactNumber;
            }
            return newErrors;
          });
          lastCheckedContactRef.current = "";
        }
      } finally {
        if (!isCancelled) {
          setCheckingContact(false);
        }
      }
    };

    checkContact();

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
          </Label>
          <Input
            id="firstName"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, firstName: e.target.value }));
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
          </Label>
          <Input
            id="lastName"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, lastName: e.target.value }));
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
          </Label>
          <Input
            id="contactNumber"
            placeholder="Enter your 10-digit phone number"
            type="tel"
            maxLength={10}
            value={formData.contactNumber}
            onChange={(e) => {
              const inputValue = e.target.value.replace(/\D/g, '');
              const contactNumber = inputValue.slice(0, 10);
              setFormData((prev) => ({ ...prev, contactNumber }));
              const newErrors: Record<string, string> = { ...errors };
              if (!contactNumber.trim()) {
                if (errors.contactNumber) {
                  newErrors.contactNumber = "Contact number is required";
                } else {
                  delete newErrors.contactNumber;
                }
              } else if (contactNumber.length !== 10) {
                newErrors.contactNumber = "Please enter a valid 10-digit phone number";
              } else {
                const normalizedContactNumber = contactNumber.replace(/\s/g, "");
                const duplicateContact = officers.find(
                  (o) =>
                    o.id !== officer?.id &&
                    o.contactNumber &&
                    o.contactNumber.replace(/\s/g, "") === normalizedContactNumber
                );
                if (duplicateContact) {
                  newErrors.contactNumber = "This contact number is already assigned to another user";
                } else {
                  if (newErrors.contactNumber === "Please enter a valid 10-digit phone number") {
                    delete newErrors.contactNumber;
                  }
                }
              }
              setErrors(newErrors);
            }}
            onBlur={() => {
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
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="e.g. user@gov.in or user@nic.in"
            value={formData.email}
            disabled={!!officer}
            onChange={(e) => {
              const email = e.target.value;
              setFormData((prev) => ({ ...prev, email }));
              const newErrors: Record<string, string> = { ...errors };
              if (!email.trim()) {
                if (errors.email && errors.email === "Email is required") {
                  newErrors.email = "Email is required";
                } else {
                  delete newErrors.email;
                }
              } else {
                const emailFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailFormatRegex.test(email)) {
                  newErrors.email = "Please enter a valid email address";
                } else if (!/@(gov\.in|nic\.in)$/i.test(email)) {
                  newErrors.email = "Only @gov.in and @nic.in email addresses are allowed";
                } else {
                  if (
                    newErrors.email &&
                    (newErrors.email === "Please enter a valid email address" ||
                      newErrors.email === "Only @gov.in and @nic.in email addresses are allowed")
                  ) {
                    delete newErrors.email;
                  }
                }
              }
              setErrors(newErrors);
            }}
            onBlur={() => {
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
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password (min 6 characters)"
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
          </Label>
          {(() => {
            const availableRoles = getAvailableRoles();
            return (
              <Select
                value={
                  user?.role === "MINISTRY_APPROVER"
                    ? "NODAL_OFFICER"
                    : availableRoles.some(r => r.value === formData.role)
                    ? formData.role
                    : (availableRoles.length > 0 ? availableRoles[0].value : "")
                }
                disabled={user?.role === "STATE_APPROVER" || user?.role === "MINISTRY_APPROVER"}
                onValueChange={async (value) => {
                  setFormData(prev => {
                    if (prev.role === value) return prev;
                    let newFormData = { ...prev, role: value };
                    if (value === "MOSPI_REVIEWER") {
                      newFormData.stateId = [];
                      newFormData.stateUt = '';
                    } else if (value === "STATE_APPROVER") {
                      newFormData.stateId = '';
                      newFormData.stateUt = '';
                    }
                    if (prev.role !== "MINISTRY_APPROVER" && value === "MINISTRY_APPROVER") {
                      newFormData.ministryId = user?.role === "MINISTRY_APPROVER" ? (user?.ministryId || '') : '';
                    } else if (value === "MOSPI_REVIEWER") {
                      // For MOSPI_REVIEWER, ministryId should be an array to support multiple ministries
                      newFormData.ministryId = [];
                    } else if (prev.role === "MINISTRY_APPROVER" && value !== "MINISTRY_APPROVER" && value !== "MOSPI_REVIEWER") {
                      newFormData.ministryId = '';
                    } else if (prev.role === "MOSPI_REVIEWER" && value !== "MOSPI_REVIEWER" && value !== "MINISTRY_APPROVER") {
                      newFormData.ministryId = '';
                    }
                    return newFormData;
                  });
                  if (formData.role !== value) {
                    if (value === "MINISTRY_APPROVER" || value === "MOSPI_REVIEWER") {
                      setLoadingMinistries(true);
                      setMinistryError(null);
                      try {
                        const res = await apiService.get("/ministries");
                        let data = res?.data?.data || res?.data || res;
                        if (Array.isArray(data)) {
                          setMinistries(data);
                          if (value === "MINISTRY_APPROVER" && user?.role === "MINISTRY_APPROVER" && user?.ministryId) {
                            setFormData(prev => ({ ...prev, ministryId: user.ministryId || "" }));
                          }
                        } else {
                          setMinistries([]);
                        }
                      } catch (err) {
                        setMinistryError("Failed to load ministries");
                        setMinistries([]);
                      } finally {
                        setLoadingMinistries(false);
                      }
                    } else {
                      setMinistries([]);
                      setMinistryError(null);
                    }
                    if (value !== "NODAL_OFFICER") {
                      setNodalHasSubmission(false);
                    } else if (officer?.id && value === "NODAL_OFFICER") {
                      checkNodalOfficerSubmission(officer.id);
                    }
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

        {/* State/UT and Assign Indicators are hidden by default, only show if a role is selected */}
        {formData.role && formData.role.trim() !== "" && (
          <>
            {/* State/UT Dropdown - show if MOSPI_REVIEWER or STATE_APPROVER is selected, but never for MINISTRY_APPROVER */}
            {((formData.role === "MOSPI_REVIEWER" || formData.role === "STATE_APPROVER") || user?.role === "STATE_APPROVER") && formData.role !== "MINISTRY_APPROVER" && (
              <div className="space-y-2">
                <Label htmlFor="stateId" className="flex items-center gap-2">
                  State/UT
                  <span className="text-destructive">*</span>
                </Label>
                {formData.role === "MOSPI_REVIEWER" ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <MultiSelect
                      options={states.map(state => {
                        // For MOSPI_REVIEWER, only check if state is assigned to OTHER reviewers (not current user)
                        // Don't use disabledStateNames for MOSPI_REVIEWER as it includes current user's states
                        const isAssigned = (officers || []).some(o =>
                          o.role === 'MOSPI_REVIEWER' &&
                          o.id !== officer?.id &&
                          (
                            (Array.isArray(o.stateId) && o.stateId.includes(state.id)) ||
                            (!Array.isArray(o.stateId) && o.stateId === state.id) ||
                            (o.state && typeof o.state === 'string' && o.state.split(',').map(s => s.trim()).includes(state.name))
                          )
                        );
                        // Only disable if state is inactive or assigned to another MOSPI_REVIEWER
                        // Don't use disabledStateNames for MOSPI_REVIEWER to allow deselection of current user's states
                        return {
                          value: state.id,
                          label: state.name,
                          disabled: !state.isActive || isAssigned
                        };
                      })}
                      value={Array.isArray(formData.stateId) ? formData.stateId : (formData.stateId ? [formData.stateId] : [])}
                      onChange={(selected) => {
                        // Ensure selected is always an array
                        const selectedArray = Array.isArray(selected) ? selected : (selected ? [selected] : []);
                        handleStateChange(selectedArray);
                      }}
                      placeholder={loadingStates ? "Loading states..." : "Select multiple states"}
                      searchPlaceholder="Search states..."
                      showSearch
                      className={errors.stateId ? "border-destructive" : ""}
                      disabled={loadingStates}
                      showSelectAll
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      // Clear state-related errors when clearing
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.stateId;
                        return newErrors;
                      });
                      handleStateChange([]);
                    }} disabled={loadingStates}>
                      Clear
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={typeof formData.stateId === 'string' ? formData.stateId : Array.isArray(formData.stateId) ? formData.stateId[0] : ''}
                    onValueChange={(value) => handleStateChange(value)}
                    disabled={loadingStates || user?.role === "STATE_APPROVER"}
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
                          const isDisabledByName = disabledStateNames.some(
                            n => n.trim().toLowerCase() === state.name.trim().toLowerCase()
                          );
                          const hasStateApprover = formData.role === "STATE_APPROVER" && (officers || []).some(o =>
                            o.role === 'STATE_APPROVER' &&
                            o.id !== officer?.id &&
                            o.isActive !== false &&
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
                )}
                {errors.stateId && (
                  <p className="text-sm text-destructive">{errors.stateId}</p>
                )}
              </div>
            )}

            {/* Ministry Dropdown - show if MINISTRY_APPROVER is selected or if MOSPI_REVIEWER is selected */}
            {(formData.role === "MINISTRY_APPROVER" || formData.role === "MOSPI_REVIEWER" || user?.role === "MINISTRY_APPROVER") && (
              <div className="space-y-2 flex flex-col justify-start" style={{ minHeight: 80 }}>
                <Label htmlFor="ministryId" className="flex items-center gap-2">
                  Ministry
                  <span className="text-destructive">*</span>
                </Label>
                {formData.role === "MOSPI_REVIEWER" ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <MultiSelect
                      options={ministries.map(ministry => {
                        const assignedIds = assignedMinistryIds || [];
                        const ministryIdStr = String(ministry.id).trim();
                        // Check if this ministry is already assigned to another MOSPI_REVIEWER
                        const isAssigned = assignedIds.some((id) => {
                          const assignedIdStr = String(id).trim();
                          // Compare as strings and numbers to handle different ID formats
                          return assignedIdStr === ministryIdStr || 
                                 assignedIdStr === String(ministry.id) ||
                                 (Number(assignedIdStr) && Number(ministryIdStr) && Number(assignedIdStr) === Number(ministryIdStr));
                        });
                        return {
                          value: ministry.id,
                          label: ministry.name,
                          disabled: isAssigned
                        };
                      })}
                      value={Array.isArray(formData.ministryId) ? formData.ministryId : (formData.ministryId ? [formData.ministryId] : [])}
                      onChange={(selected) => {
                        // Clear ministry-related errors when ministry changes
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.ministryId;
                          return newErrors;
                        });
                        // Ensure selected is always an array
                        const selectedArray = Array.isArray(selected) ? selected : (selected ? [selected] : []);
                        setFormData(prev => ({ ...prev, ministryId: selectedArray }));
                      }}
                      placeholder={loadingMinistries ? "Loading ministries..." : "Select multiple ministries"}
                      searchPlaceholder="Search ministries..."
                      showSearch
                      className={ministryError || errors.ministryId ? "border-destructive" : ""}
                      disabled={loadingMinistries}
                      showSelectAll
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      // Clear ministry-related errors when clearing
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.ministryId;
                        return newErrors;
                      });
                      setFormData(prev => ({ ...prev, ministryId: [] }));
                    }} disabled={loadingMinistries}>
                      Clear
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={formData.ministryId !== undefined ? String(formData.ministryId) : ""}
                    onValueChange={(value) => {
                      let ministryIdValue = Array.isArray(value) ? (value[0] || '') : value;
                      setFormData(prev => ({ ...prev, ministryId: ministryIdValue }));
                    }}
                    disabled={loadingMinistries || user?.role === "MINISTRY_APPROVER"}
                  >
                    <SelectTrigger className={ministryError || errors.ministryId ? "border-destructive" : ""}>
                      <SelectValue placeholder={
                        loadingMinistries
                          ? "Loading ministries..."
                          : ministryError
                            ? "Failed to load ministries"
                            : ministries.length === 0
                              ? "No ministries available"
                              : "Select Ministry"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingMinistries ? (
                        <div className="flex items-center justify-center p-2">
                          Loading ministries...
                        </div>
                      ) : ministryError ? (
                        <div className="p-2 text-destructive">{ministryError}</div>
                      ) : ministries.length > 0 ? (
                        ministries.map((ministry) => {
                          const assignedIds = assignedMinistryIds || [];
                          const ministryIdStr = String(ministry.id).trim();
                          // Check if this ministry is already assigned to another user of the same role
                          const isAssigned = assignedIds.some((id) => {
                            const assignedIdStr = String(id).trim();
                            // Compare as strings and numbers to handle different ID formats
                            return assignedIdStr === ministryIdStr || 
                                   assignedIdStr === String(ministry.id) ||
                                   (Number(assignedIdStr) && Number(ministryIdStr) && Number(assignedIdStr) === Number(ministryIdStr));
                          });
                          return (
                            <SelectItem key={ministry.id} value={ministry.id} disabled={isAssigned}>
                              {ministry.name}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <div className="p-2 text-muted-foreground">No ministries available</div>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {ministryError && (
                  <p className="text-sm text-destructive">{ministryError}</p>
                )}
                {errors.ministryId && (
                  <p className="text-sm text-destructive">{errors.ministryId}</p>
                )}
              </div>
            )}

            {/* Indicator Assignment Section - Only visible when logged in as STATE_APPROVER */}
            {user?.role === "STATE_APPROVER" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Assign Indicators
                </Label>
                {stateApproverHasSubmission && officer && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Indicator reassignment is disabled because you have already submitted your consolidated submission.
                    </p>
                  </div>
                )}
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
                {(() => {
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
          </>
        )}

        {/* Ministry Indicators - Always show for MINISTRY_APPROVER login */}
        {user?.role === "MINISTRY_APPROVER" && (
          <MinistryIndicatorsSection
            ministryIndicators={ministryIndicators
              .filter(option => typeof option.value === 'string' && option.value !== "")
              .map(option => {
                const labelValue = option.label;
                let finalLabel: string;
                if (labelValue == null || labelValue === null) {
                  finalLabel = String(option.value);
                } else if (typeof labelValue === 'object') {
                  finalLabel = (labelValue as any)?.name || (labelValue as any)?.code || String(option.value);
                } else {
                  finalLabel = String(labelValue || option.value);
                }
                return {
                  ...option,
                  label: finalLabel
                };
              })}
            effectiveSubmittedIndicators={effectiveSubmittedIndicators}
            loadingMinistryIndicators={loadingMinistryIndicators}
            ministryIndicatorsError={ministryIndicatorsError}
            stateApproverHasSubmission={stateApproverHasSubmission || false}
            officer={officer}
            role={formData.role}
            nodalHasSubmission={nodalHasSubmission}
            checkingNodalSubmission={checkingNodalSubmission}
            errors={errors}
            ministryAssignedIndicators={ministryAssignedIndicators}
            setFormData={setFormData}
            onMinistryIndicatorsChange={handleMinistryIndicatorsChange}
          />
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <Button
          variant="outline"
          onClick={() => {
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

// Memoize UserForm to prevent unnecessary re-renders
export const UserForm = memo(UserFormComponent);

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
    "4.1": "Availability & Use of State/UT PMG",
    "4.2": "Adoption of PM GatiShakti",
    "4.3": "Adoption of ADR",
    "4.4": "Innovative Practices",
    "4.5": "Capacity Building – Officer Participation",
  };

  return indicatorNames[indicatorCode] || indicatorCode;
}