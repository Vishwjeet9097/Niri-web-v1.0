/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import type { MultiSelectOption } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Search, Filter, Loader2 } from "lucide-react";
import { getRoleDisplayName } from "@/utils/roles";
import {
  userManagementService,
  NodalOfficer,
} from "./services/userManagement.service";
import { UserForm } from "./components/UserForm";
import { UserTable } from "./components/UserTable";
import { getMinistryFormIndicators, getRemainingMinistryIndicators, minstryRegistrationForm, reassignIndicatorsToNodal, removeAssignedIndicators } from "@/services/ministry.service";
import { EmptyState } from "./components/EmptyState";
import { CleanupButtons } from "./components/CleanupButtons";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api.service";
import { assignIndicatorsToNodal } from "@/services/ministry.service";
import { notificationService } from "@/services/notification.service";
import ConfirmationModal from "@/components/ConfirmationModal";
import { statesService } from "@/services/states.service";
import {
  useIndicatorAccess,
  ALL_INDICATOR_CODES,
} from "@/hooks/useIndicatorAccess";
import { useUserSubmissionStatus } from "@/hooks/useUserSubmissionStatus";
import { IndicatorSummary } from "./components/IndicatorSummary";

export function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [officers, setOfficers] = useState<NodalOfficer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<NodalOfficer | null>(
    null
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<NodalOfficer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [states, setStates] = useState<any[]>([]);
  const [allIndicators, setAllIndicators] = useState<any[]>([]);
  const [isIndicatorsLoading, setIsIndicatorsLoading] = useState(false);
  const [hasSubmissions, setHasSubmissions] = useState(false);
  const [checkingSubmissions, setCheckingSubmissions] = useState(false);
  const [submittedIndicatorsInState, setSubmittedIndicatorsInState] = useState<string[]>([]);

  // State for ministry assignable indicators (for Ministry Approver edit)
  const [ministryAssignableIndicators, setMinistryAssignableIndicators] = useState<MultiSelectOption[]>([]);

  const { refresh } = useIndicatorAccess();

   const [ministries, setMinistries] = useState<any[]>([]);
    useEffect(() => {
      apiService.get<any>("/ministries").then((result) => {
        if (Array.isArray(result)) {
          setMinistries(result);
        } else if (result && Array.isArray(result.data)) {
          setMinistries(result.data);
        } else {
          setMinistries([]);
        }
      });
    }, []);
  
    // Helper to get ministry name by id
    const getMinistryName = (id?: string) => {
      if (!id) return "";
      const ministry = ministries.find((m: any) => m.id === id);
      return ministry ? ministry.name : "";
    };
  
  // Check if state approver has submitted their form
  const { hasSubmission: stateApproverHasSubmission } =
    useUserSubmissionStatus();

  // Refs to prevent unnecessary API calls and track loading state
  const officersLoadedRef = useRef(false);
  const statesLoadedRef = useRef(false);
  const submittedIndicatorsLoadedRef = useRef<string>("");
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Minimum time between refreshes (2 seconds)
  const MIN_REFRESH_INTERVAL = 2000;

  const loadStates = useCallback(async () => {
    // Only load if not already loaded or if states array is empty
    if (statesLoadedRef.current && states.length > 0) {
      return;
    }

    try {
      const statesData = await statesService.getStates();
      setStates(statesData);
      statesLoadedRef.current = true;
    } catch (error) {
      console.error("❌ Error loading states:", error);
    }
  }, [states.length]);

  const loadOfficers = useCallback(
    async (forceRefresh = false) => {
      // Prevent rapid successive calls
      const now = Date.now();
      if (
        !forceRefresh &&
        officersLoadedRef.current &&
        now - lastRefreshTimeRef.current < MIN_REFRESH_INTERVAL
      ) {
        return;
      }

      try {
        setIsLoading(true);
        lastRefreshTimeRef.current = now;

      // Try to load from backend API first
      // ADMIN and MOSPI_APPROVER can see all users, STATE_APPROVER can only see their state users
      let backendUsers;
       
      if (user?.role === "ADMIN" || user?.role === "NODAL_OFFICER" || user?.role === "MOSPI_APPROVER" || user?.role === "MINISTRY_APPROVER") {
        backendUsers = await apiService.getAllUsers(); 
      } else { 
        backendUsers = await apiService.getUsersByState(user?.state || "");
      }
      // Debug logging removed for performance

        // Safety check: ensure backendUsers is an array
        if (!backendUsers || !Array.isArray(backendUsers)) {
          console.warn(
            "⚠️ Backend API returned invalid data, using local storage:",
            backendUsers
          );
          const data = userManagementService.getOfficers(user?.state || "");
          setOfficers(data);
          officersLoadedRef.current = true;
          return;
        }
 
        // Transform backend users to NodalOfficer format
        let transformedOfficers: NodalOfficer[] = await Promise.all(
          backendUsers.map(async (user: any) => {
            // Extract indicator codes from assignedIndicators array
            // Backend returns array of objects with {code, name} or array of strings
            let indicatorCodes: string[] = [];
            let indicatorStatuses: Record<string, string> = {};
            
            if (user.assignedIndicators && Array.isArray(user.assignedIndicators)) {
              console.log('[loadOfficers] User assignedIndicators raw data:', user.id, user.assignedIndicators);
              indicatorCodes = user.assignedIndicators.map((ind: any) => {
                // If it's an object, extract the code property
                if (typeof ind === 'object' && ind !== null) {
                  const code = ind.code || ind.id || ind.value || String(ind);
                  // Extract status if available
                  if (ind.status || ind.indicatorStatus) {
                    indicatorStatuses[code] = ind.status || ind.indicatorStatus;
                  }
                  console.log('[loadOfficers] Extracted code from object:', code, ind);
                  return code;
                }
                // If it's already a string, use it directly
                console.log('[loadOfficers] Using string directly:', ind);
                return String(ind);
              }).filter((code: string) => code && code.trim() !== '');
              console.log('[loadOfficers] Final indicator codes for user:', user.id, indicatorCodes);
            } else {
              console.log('[loadOfficers] No assignedIndicators or not an array for user:', user.id, user.assignedIndicators);
            }

            // For NODAL_OFFICER, fetch indicator statuses if not already available
            if (user.role === "NODAL_OFFICER" && indicatorCodes.length > 0 && Object.keys(indicatorStatuses).length === 0) {
              try {
                const nodalIndicatorsResponse = await getRemainingMinistryIndicators(user.id);
                let nodalIndicatorsData = nodalIndicatorsResponse;
                if (nodalIndicatorsResponse && typeof nodalIndicatorsResponse === 'object' && 'data' in nodalIndicatorsResponse) {
                  nodalIndicatorsData = nodalIndicatorsResponse.data;
                }

                // Flatten and extract statuses
                let indicatorsFlat: any[] = [];
                if (Array.isArray(nodalIndicatorsData)) {
                  indicatorsFlat = nodalIndicatorsData;
                } else if (nodalIndicatorsData && typeof nodalIndicatorsData === 'object') {
                  Object.entries(nodalIndicatorsData).forEach(([category, arr]) => {
                    if (Array.isArray(arr)) {
                      arr.forEach((item) => {
                        if (item && typeof item === 'object') {
                          indicatorsFlat.push(item);
                        }
                      });
                    }
                  });
                }

                // Create status map
                indicatorsFlat.forEach((item: any) => {
                  const code = item.code || item.id || item.value;
                  const status = item.indicatorStatus || item.status;
                  if (code && status) {
                    indicatorStatuses[String(code)] = String(status);
                  }
                });
              } catch (error) {
                console.error('[loadOfficers] Error fetching indicator statuses for user:', user.id, error);
              }
            }
            
            return {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              contactNumber: user.contactNumber || "",
              email: user.email,
              role: user.role as
                | "NODAL_OFFICER"
                | "STATE_APPROVER"
                | "MOSPI_REVIEWER"
                | "MOSPI_APPROVER"
              | "MINISTRY_APPROVER",
              state: user.stateUt || user.state || "",
              stateId: user.stateId || "",
              assignedIndicator: user.assignedIndicator,
              assignedIndicators: indicatorCodes,
              indicatorStatuses: Object.keys(indicatorStatuses).length > 0 ? indicatorStatuses : undefined,
              isActive: user.isActive,
              ministryId: user.ministryId,
              createdAt: new Date(user.createdAt).getTime(),
            };
          })
        );

        // For MINISTRY_APPROVER: Filter to show only NODAL_OFFICER users assigned to their ministry
        if (user?.role === "MINISTRY_APPROVER" && user?.ministryId) {
          transformedOfficers = transformedOfficers.filter((officer) => {
            // Only show NODAL_OFFICER users with the same ministryId
            return officer.role === "NODAL_OFFICER" && 
                   officer.ministryId && 
                   String(officer.ministryId) === String(user.ministryId);
          });
        }

        setOfficers(transformedOfficers);
        officersLoadedRef.current = true;
      } catch (error) {
        console.warn("⚠️ Backend API failed, using local storage:", error);
        // Fallback to local storage
        const data = userManagementService.getOfficers(user?.state || "");
        setOfficers(data);
        officersLoadedRef.current = true;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.role, user?.state, user?.ministryId]
  );

  // New function to load indicators - memoized to prevent unnecessary calls
  const loadIndicators = useCallback(async () => {
    // Only load if indicators array is empty
    if (allIndicators.length > 0) {
      return;
    }

    try {
      setIsIndicatorsLoading(true);
      const indicators = await apiService.getAllIndicators();
      // Filter to only include indicators with valid codes (exclude old/removed indicators like old 4.1 and 4.6)
      const validIndicators = (indicators || []).filter(
        (ind: any) => ind.code && ALL_INDICATOR_CODES.includes(ind.code)
      );
      setAllIndicators(validIndicators);
    } catch (err) {
      console.error("❌ Error loading indicators:", err);
      setAllIndicators([]);
    } finally {
      setIsIndicatorsLoading(false);
    }
  }, [allIndicators.length]);

  // Load indicators only once on mount
  useEffect(() => {
    loadIndicators();
  }, []); // Empty dependency array - only run once

  // Load officers and states on mount and when user role/state changes
  useEffect(() => {
    // Reset flags when user changes
    officersLoadedRef.current = false;
    statesLoadedRef.current = false;
    submittedIndicatorsLoadedRef.current = "";

    loadOfficers(true); // Force refresh on user change
    loadStates();
  }, [user?.role, user?.state]); // Only depend on user role/state, not loadOfficers

  // Fetch submitted indicators in state when component loads or state changes
  // NOTE: This is STATE-SCOPED, not global. Only finds submissions within the user's state.
  useEffect(() => {
    const fetchSubmittedIndicators = async () => {
      // Skip fetching for Ministry Approver
      if (user?.role === "MINISTRY_APPROVER") {
        setSubmittedIndicatorsInState([]);
        return;
      }
      if (user?.stateUt || user?.state) {
        try {
          const stateUt = user.stateUt || user.state;
          const submitted = await apiService.getSubmittedIndicatorsInState(stateUt);
          setSubmittedIndicatorsInState(submitted);
        } catch (error) {
          console.error("❌ [UserManagementPage] Error fetching submitted indicators:", error);
          setSubmittedIndicatorsInState([]);
        }
      } else {
        console.warn("⚠️ [UserManagementPage] No stateUt or state found for user:", user);
      }
    };

    fetchSubmittedIndicators();
  }, [user?.role, user?.stateUt, user?.state]);

  // Debounced refresh on window focus (handles multi-tab scenarios)
  useEffect(() => {
    const handleFocus = () => {
      // Clear any pending refresh
      if (refreshDebounceTimeoutRef.current) {
        clearTimeout(refreshDebounceTimeoutRef.current);
      }

      // Debounce the refresh to prevent rapid successive calls
      refreshDebounceTimeoutRef.current = setTimeout(() => {
        loadOfficers(true); // Force refresh on focus
      }, 500); // 500ms debounce
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      if (refreshDebounceTimeoutRef.current) {
        clearTimeout(refreshDebounceTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - setup once

  const computeAvailableIndicatorsForState = (
    stateName: string,
    editingOfficerId?: string
  ) => {
    // Build a set of codes that are already assigned in this state to all users (except editingOfficerId)
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
        if (o.id !== editingOfficerId) {
          assigned.forEach((code) => {
            if (code) assignedSet.add(code);
          });
        }
      }
    });

    // Return indicators whose code is NOT in assignedSet
    // Keep indicators that belong to other states out (we assumed codes globally unique and assignments by state)
    return allIndicators.filter((ind: any) => !assignedSet.has(ind.code));
  };
  const handleAddUser = () => {
    setEditingOfficer(null);
    setShowForm(true);
  };



  // Ministry Approver: Edit handler (fetch assignable indicators)
  const handleMinistryEditUser = async (officer: NodalOfficer) => {
    setEditingOfficer(officer);
    setShowForm(true);   

    if (officer?.id && user?.id) {
      try {
        // When editing a nodal officer, we need:
        // 1. All indicators from ministry approver (to show in dropdown)
        // 2. Indicators assigned to this nodal officer (to mark as selected)
        // 3. Indicators assigned to OTHER nodals (to exclude them)
        // 4. Submitted status for assigned indicators (to disable them)
        
        // Get all indicators for the ministry approver
        const ministryIndicatorsResponse = await getRemainingMinistryIndicators(user.id);
        
        // Get indicators for the nodal officer (to check assigned and submitted status)
        const nodalIndicatorsResponse = await getRemainingMinistryIndicators(officer.id);
        
        // Extract data from responses
        let ministryIndicatorsData = ministryIndicatorsResponse;
        if (ministryIndicatorsResponse && typeof ministryIndicatorsResponse === 'object' && 'data' in ministryIndicatorsResponse) {
          ministryIndicatorsData = ministryIndicatorsResponse.data;
        }
        
        let nodalIndicatorsData = nodalIndicatorsResponse;
        if (nodalIndicatorsResponse && typeof nodalIndicatorsResponse === 'object' && 'data' in nodalIndicatorsResponse) {
          nodalIndicatorsData = nodalIndicatorsResponse.data;
        }
        
        // Flatten ministry indicators (all available indicators)
        let allIndicatorsFlat: any[] = [];
        if (Array.isArray(ministryIndicatorsData)) {
          allIndicatorsFlat = ministryIndicatorsData;
        } else if (ministryIndicatorsData && typeof ministryIndicatorsData === 'object') {
          Object.entries(ministryIndicatorsData).forEach(([category, arr]) => {
            if (Array.isArray(arr)) {
              arr.forEach((item) => {
                if (item && typeof item === 'object') {
                  allIndicatorsFlat.push({ ...item, section: category, category });
                }
              });
            }
          });
        }
        
        // Flatten nodal indicators (assigned indicators with status)
        let assignedIndicatorsFlat: any[] = [];
        if (Array.isArray(nodalIndicatorsData)) {
          assignedIndicatorsFlat = nodalIndicatorsData;
        } else if (nodalIndicatorsData && typeof nodalIndicatorsData === 'object') {
          Object.entries(nodalIndicatorsData).forEach(([category, arr]) => {
            if (Array.isArray(arr)) {
              arr.forEach((item) => {
                if (item && typeof item === 'object') {
                  assignedIndicatorsFlat.push({ ...item, section: category, category });
                }
              });
            }
          });
        }
        
        console.log('[handleMinistryEditUser] assignedIndicatorsFlat from nodal API:', assignedIndicatorsFlat);
        console.log('[handleMinistryEditUser] allIndicatorsFlat from ministry API:', allIndicatorsFlat.length);
        
        const ministryUserIdStr = String(user.id).trim();
        const nodalOfficerIdStr = String(officer.id).trim();
        
        console.log('[handleMinistryEditUser] Filtering indicators - ministryUserId:', ministryUserIdStr, 'nodalOfficerId:', nodalOfficerIdStr);
        console.log('[handleMinistryEditUser] Sample of allIndicatorsFlat (first 5):', allIndicatorsFlat.slice(0, 5).map(item => ({
          id: item.id || item.code,
          assignedTo: item.assignedTo,
          status: item.indicatorStatus || item.status
        })));
        
        // Helper function to check if status indicates indicator has been submitted to ministry level or beyond
        // Only these statuses should prevent reassignment by ministry approver
        const isIndicatorSubmittedToMinistry = (status: string | null): boolean => {
          if (!status) return false;
          const upperStatus = String(status).trim().toUpperCase();
          
          // Statuses that indicate submission to ministry or beyond - these should be disabled
          const submittedStatuses = [
            'SUBMITTED_TO_MINISTRY',
            'ACCEPTED_BY_MINISTRY',
            'SUBMITTED_TO_MOSPI_REVIEWER',
            'SUBMITTED_TO_MOSPI_APPROVER',
            'ACCEPTED_BY_MOSPI',
            'APPROVED',
            'SUBMITTED_TO_MOSPI',
            'REVERTED', // Reverted indicators should not be reassignable
            'RESUBMITTED', // Resubmitted indicators should not be reassignable
          ];
          
          return submittedStatuses.includes(upperStatus);
        };
        
        // Create a map of indicators assigned to THIS nodal officer with their status
        // Check both the nodal indicators response AND the assignedTo field in ministry indicators
        const thisNodalAssignedMap = new Map<string, { isSelected: boolean; isSubmitted: boolean; status: string | null }>();
        
        // Helper function to add indicator to map with all possible keys
        const addToMap = (item: any, isSelected: boolean) => {
          const itemId = item.id || '';
          const itemCode = item.code || '';
          const itemValue = item.value || '';
          const status = item.indicatorStatus || item.status || null;
          const isSubmitted = isIndicatorSubmittedToMinistry(status);
          
          const assignedInfo = {
            isSelected: isSelected,
            isSubmitted: isSubmitted,
            status: status,
          };
          
          // Store with all possible identifier formats to ensure we can find it later
          if (itemId) {
            thisNodalAssignedMap.set(String(itemId).trim(), assignedInfo);
          }
          if (itemCode) {
            thisNodalAssignedMap.set(String(itemCode).trim(), assignedInfo);
          }
          if (itemValue) {
            thisNodalAssignedMap.set(String(itemValue).trim(), assignedInfo);
          }
          // Also store with the primary identifier (id > code > value)
          const primaryId = itemId || itemCode || itemValue || '';
          if (primaryId) {
            thisNodalAssignedMap.set(String(primaryId).trim(), assignedInfo);
          }
        };
        
        // First, check the nodal indicators response
        assignedIndicatorsFlat.forEach((item) => {
          addToMap(item, true);
        });
        
        // Also check the ministry indicators response for assignedTo field
        console.log('[handleMinistryEditUser] Checking assignedTo field in ministry indicators, officer.id:', officer.id);
        allIndicatorsFlat.forEach((item) => {
          const assignedTo = item.assignedTo || null;
          const assignedToStr = assignedTo ? String(assignedTo).trim() : '';
          
          // Debug logging
          if (assignedToStr) {
            const indicatorId = item.id || item.code || item.value || '';
            console.log(`[handleMinistryEditUser] Indicator ${indicatorId}: assignedTo=${assignedToStr}, officer.id=${nodalOfficerIdStr}, match=${assignedToStr === nodalOfficerIdStr}`);
          }
          
          // If assignedTo matches this nodal officer, mark as assigned
          if (assignedToStr && assignedToStr === nodalOfficerIdStr) {
            const indicatorId = item.id || item.code || item.value || '';
            console.log(`[handleMinistryEditUser] ✓ Marking indicator ${indicatorId} as assigned to this nodal`);
            addToMap(item, true);
          }
        });
        
        console.log('[handleMinistryEditUser] thisNodalAssignedMap:', Array.from(thisNodalAssignedMap.entries()));
        
        // Filter indicators to only show those assigned to ministry user (for reassignment)
        // Show indicators where:
        // 1. assignedTo === nodalOfficerId (assigned to this nodal officer - always show for preselection)
        // 2. assignedTo === ministryUserId (assigned to ministry user) AND status is null or "DRAFT"
        // 3. assignedTo is null/empty (unassigned indicators) AND indicatorStatus is null or "DRAFT"
        // Exclude indicators assigned to other nodal officers
        const ministryUserIndicators = allIndicatorsFlat.filter((item) => {
          const assignedTo = item.assignedTo || null;
          const assignedToStr = assignedTo ? String(assignedTo).trim() : '';
          // Get indicatorStatus first (submission status), fallback to status (indicator detail status)
          const indicatorStatus = item.indicatorStatus || null;
          const indicatorDetailStatus = item.status || null;
          const indicatorId = item.id || item.code || item.value || '';
          
          // Check if indicatorStatus is null or DRAFT
          // Note: indicatorDetailStatus (item.status) being true/false indicates if the indicator is active, not submission status
          // We only care about indicatorStatus (submission status) for filtering
          let statusStr = '';
          if (indicatorStatus !== null && indicatorStatus !== undefined) {
            statusStr = String(indicatorStatus).trim().toUpperCase();
          }
          
          // Valid statuses: null, undefined, empty string, or "DRAFT"
          // Boolean true for indicatorDetailStatus should not affect filtering (that's just if indicator is active)
          const isValidStatus = statusStr === '' || statusStr === 'DRAFT';
          
          // Always show indicators assigned to this nodal officer (for preselection)
          if (assignedToStr && assignedToStr === nodalOfficerIdStr) {
            console.log(`[handleMinistryEditUser] ✓ Including indicator ${indicatorId} - assigned to this nodal officer`);
            return true;
          }
          
          // Show indicators assigned to ministry user, but only if indicatorStatus is null or "DRAFT"
          if (assignedToStr && assignedToStr === ministryUserIdStr) {
            if (isValidStatus) {
              console.log(`[handleMinistryEditUser] ✓ Including indicator ${indicatorId} - assigned to ministry user (${assignedToStr}) with indicatorStatus: ${statusStr || 'null'}`);
              return true;
            } else {
              console.log(`[handleMinistryEditUser] ✗ Excluding indicator ${indicatorId} - assigned to ministry user (${assignedToStr}) but indicatorStatus is: ${statusStr}`);
              return false;
            }
          }
          
          // Show unassigned indicators (assignedTo is null/empty) - these are also ministry user's indicators
          // But only if indicatorStatus is null or "DRAFT"
          if (!assignedToStr || assignedToStr === '') {
            if (isValidStatus) {
              console.log(`[handleMinistryEditUser] ✓ Including indicator ${indicatorId} - unassigned with indicatorStatus: ${statusStr || 'null'}`);
              return true;
            } else {
              console.log(`[handleMinistryEditUser] ✗ Excluding indicator ${indicatorId} - unassigned but indicatorStatus is: ${statusStr}`);
              return false;
            }
          }
          
          // Exclude indicators assigned to other nodal officers (or anyone else)
          if (assignedToStr && assignedToStr !== '' && assignedToStr !== ministryUserIdStr && assignedToStr !== nodalOfficerIdStr) {
            console.log(`[handleMinistryEditUser] ✗ Excluding indicator ${indicatorId} - assigned to other user: ${assignedToStr} (not ministry: ${ministryUserIdStr}, not nodal: ${nodalOfficerIdStr})`);
            return false;
          }
          
          // Should not reach here, but exclude by default
          console.log(`[handleMinistryEditUser] ✗ Excluding indicator ${indicatorId} - no matching condition (assignedTo: ${assignedToStr}, indicatorStatus: ${statusStr})`);
          return false;
        });
        
        console.log('[handleMinistryEditUser] Filtered ministry user indicators:', ministryUserIndicators.length);
        console.log('[handleMinistryEditUser] Indicators assigned to this nodal:', thisNodalAssignedMap.size);
        
        // Format indicators for MultiSelect:
        // - Only show indicators assigned to ministry user or this nodal officer (for reassignment)
        // - Mark indicators assigned to this nodal officer as selected
        // - Mark submitted ones as disabled
        const formattedIndicators = ministryUserIndicators
          .filter((item) => {
            if (!item || typeof item !== 'object') return false;
            const value = item.id || item.code || item.value || '';
            if (!value) return false;
            
            // Include all ministry user indicators (already filtered above)
            return true;
          })
          .map((item) => {
            // Extract value - use consistent format (id, code, or value)
            const itemId = item.id || '';
            const itemCode = item.code || '';
            const itemValue = item.value || '';
            // Prioritize id, then code, then value
            const value = itemId || itemCode || itemValue || '';
            const valueStr = String(value).trim();
            
            const sNo = item.sNo || '';
            const name = item.name || item.label || item.code || '';
            const section = item.category || item.section || '';
            
            // Check if this indicator is assigned to the nodal officer
            // Try multiple key formats to ensure we find it
            let assignedInfo = thisNodalAssignedMap.get(valueStr);
            if (!assignedInfo && itemId) {
              assignedInfo = thisNodalAssignedMap.get(String(itemId).trim());
            }
            if (!assignedInfo && itemCode) {
              assignedInfo = thisNodalAssignedMap.get(String(itemCode).trim());
            }
            
            const isSelected = assignedInfo?.isSelected || false;
            const isSubmitted = assignedInfo?.isSubmitted || false;
            const isDisabled = isSubmitted; // Disable if submitted
            
            console.log(`[handleMinistryEditUser] Mapping indicator: value=${valueStr}, isSelected=${isSelected}, assignedInfo:`, assignedInfo);
            
            // Add "(Submitted)" to label if submitted
            const labelText = isSubmitted 
              ? `${sNo ? sNo + ' - ' : ''}${name} (Submitted)`
              : `${sNo ? sNo + ' - ' : ''}${name}`;
            
            return {
              value: valueStr,
              label: labelText,
              section,
              description: item.description || '',
              disabled: isDisabled,
              isSelected: isSelected, // Explicitly set isSelected flag
              isSubmitted: isSubmitted,
            };
          });
    
        console.log('[handleMinistryEditUser] Formatted indicators:', formattedIndicators.length, formattedIndicators);
        console.log('[handleMinistryEditUser] Indicators with isSelected=true:', formattedIndicators.filter(ind => ind.isSelected));
        
        // Fallback: If no indicators are marked as selected, check officer.assignedIndicators
        const selectedCount = formattedIndicators.filter(ind => ind.isSelected).length;
        if (selectedCount === 0 && Array.isArray(officer.assignedIndicators) && officer.assignedIndicators.length > 0) {
          console.log('[handleMinistryEditUser] No indicators marked as selected, using fallback from officer.assignedIndicators:', officer.assignedIndicators);
          
          // Create a set of assigned indicator IDs from officer.assignedIndicators
          const assignedIndicatorIds = new Set<string>();
          officer.assignedIndicators.forEach((ind: any) => {
            const value = typeof ind === 'string' ? ind : String(ind?.value || ind?.id || ind?.code || ind || '');
            if (value) {
              assignedIndicatorIds.add(value);
            }
          });
          
          // Update formatted indicators to mark assigned ones as selected
          const updatedFormattedIndicators = formattedIndicators.map((ind) => {
            const isAssigned = assignedIndicatorIds.has(ind.value);
            return {
              ...ind,
              isSelected: isAssigned || ind.isSelected, // Mark as selected if in assignedIndicatorIds
            };
          });
          
          console.log('[handleMinistryEditUser] Updated indicators with fallback:', updatedFormattedIndicators.filter(ind => ind.isSelected));
          setMinistryAssignableIndicators(updatedFormattedIndicators);
        } else {
          setMinistryAssignableIndicators(formattedIndicators);
        }
        
      } catch (err) {
        console.error('Error in handleMinistryEditUser:', err);
        setMinistryAssignableIndicators([]);
        if (toast) {
          toast({
            title: 'Unexpected Error',
            description: 'An unexpected error occurred while loading ministry indicators. Please try again or contact support.',
            variant: 'destructive',
          });
        }
      }
    } else {
      setMinistryAssignableIndicators([]);
    }
  };

  const handleEditUser = (officer: NodalOfficer) => {
    setEditingOfficer(officer);
    setShowForm(true);
  };

  // Ministry Approver: Assign indicator handler
  const handleMinisterAssignIndicator = async (id: string, indicator: string) => {
    console.log("mini---------");
    try {
      // Update user with assigned indicator via backend API
      await apiService.updateUser(id, {
        assignedIndicator: indicator,
      } as any);
      notificationService.success(
        "Indicator assigned successfully",
        "Assignment Successful"
      );
      await loadOfficers();
      try {
        console.log("🔁 Triggering indicator refresh after assign indicator");
        await refresh?.({ clearCache: true });
      } catch (err) {
        console.warn(
          "⚠️ Indicator refresh failed after assign indicator:",
          err
        );
      }
    } catch (error) {
      console.error("❌ Error assigning indicator:", error);
      notificationService.error(
        "Failed to assign indicator. Please try again.",
        "Assignment Failed"
      );
    }
  };

  // Helper function to check if nodal officer has any submission
  const checkNodalOfficerHasSubmission = async (
    userId: string
  ): Promise<boolean> => {
    try {
      const response = await apiService.get(`/submission/user/${userId}`);
      const submission = response?.data?.data || response?.data;

      // Check if submission exists and has meaningful data
      if (!submission?.id) {
        return false;
      }

      // Check if submission has formData with any submitted indicators
      if (submission?.formData) {
        const formData = submission.formData;
        // Check if any step has data
        const hasData = Object.keys(formData).some((stepKey) => {
          const stepData = formData[stepKey];
          if (typeof stepData === "object" && stepData !== null) {
            return Object.keys(stepData).length > 0;
          }
          return false;
        });
        return hasData;
      }

      return false;
    } catch (error: any) {
      // If 404 or no submissions, return false
      if (error?.response?.status === 404) {
        return false;
      }
      console.warn("⚠️ Error checking nodal officer submission:", error);
      // Return false on error to allow changes (fail open)
      return false;
    }
  };

  // Helper function to check if nodal officer has submitted for specific indicators
  const checkNodalOfficerHasSubmittedIndicators = async (
    userId: string,
    indicatorsToRemove: string[]
  ): Promise<{ hasSubmitted: boolean; submittedIndicators: string[] }> => {
    try {
      const response = await apiService.get(`/submission/user/${userId}`);
      const submission = response?.data?.data || response?.data;

      if (!submission?.id || !submission?.formData) {
        return { hasSubmitted: false, submittedIndicators: [] };
      }

      // Extract indicators from submission formData
      const submittedIndicators: string[] = [];
      const formData = submission.formData;

      // Map section keys to indicator codes
      const sectionToIndicatorMap: Record<string, string> = {
        // Infra Financing (Step 1)
        section1_1: "1.1",
        section1_2: "1.2",
        section1_3: "1.3",
        section1_4: "1.4",
        section1_5: "1.5",
        // Infra Development (Step 2)
        section2_1: "2.1",
        section2_2: "2.2",
        section2_3: "2.3",
        section2_4: "2.4",
        section2_5: "2.5",
        // PPP Development (Step 3)
        section3_1: "3.1",
        section3_2: "3.2",
        section3_3: "3.3",
        section3_4: "3.4",
        section3_5: "3.5",
        // Infra Enablers (Step 4)
        section4_1: "4.1",
        section4_2: "4.2",
        section4_3: "4.3",
        section4_4: "4.4",
        section4_5: "4.5",
        section4_6: "4.6",
      };

      // Check all form data sections
      Object.keys(formData).forEach((stepKey) => {
        const stepData = formData[stepKey];
        if (typeof stepData === "object" && stepData !== null) {
          Object.keys(stepData).forEach((sectionKey) => {
            const indicatorCode = sectionToIndicatorMap[sectionKey];
            if (indicatorCode) {
              const sectionData = stepData[sectionKey];
              // Check if section has data and status (submitted)
              if (
                sectionData &&
                typeof sectionData === "object" &&
                (sectionData.status === "SUBMITTED" ||
                  sectionData.status === "ACCEPTED" ||
                  sectionData.status === "REVERTED" ||
                  // If section has meaningful data, consider it submitted
                  Object.keys(sectionData).length > 0)
              ) {
                if (!submittedIndicators.includes(indicatorCode)) {
                  submittedIndicators.push(indicatorCode);
                }
              }
            }
          });
        }
      });

      // Check if any of the indicators being removed have been submitted
      const conflictingIndicators = indicatorsToRemove.filter((ind) =>
        submittedIndicators.includes(ind)
      );

      return {
        hasSubmitted: conflictingIndicators.length > 0,
        submittedIndicators: conflictingIndicators,
      };
    } catch (error: any) {
      // If 404 or no submissions, return false
      if (error?.response?.status === 404) {
        return { hasSubmitted: false, submittedIndicators: [] };
      }
      console.warn("⚠️ Error checking nodal officer submissions:", error);
      // Return false on error to allow reassignment (fail open)
      return { hasSubmitted: false, submittedIndicators: [] };
    }
  };
 

  const handleSaveUser = async (
    officerData: Omit<
      NodalOfficer,
      "id" | "state" | "createdAt" | "assignedIndicator"
    > & { password?: string; assignedIndicators?: string[]; }
  ) => {
    try {
      if (editingOfficer) {
        // ✅ VALIDATION: Check if this is indicator manipulation for NODAL_OFFICER
        if (
          editingOfficer.role === "NODAL_OFFICER" &&
          officerData.assignedIndicators !== undefined &&
          user?.role === "STATE_APPROVER"
        ) {
          // Get current and new indicator assignments
          const currentIndicators =
            editingOfficer.assignedIndicators ||
            (editingOfficer.assignedIndicator
              ? [editingOfficer.assignedIndicator]
              : []);
          const newIndicators = officerData.assignedIndicators || [];

          // Check if indicators are being changed (added or removed)
          const indicatorsChanged =
            currentIndicators.length !== newIndicators.length ||
            currentIndicators.some((ind) => !newIndicators.includes(ind)) ||
            newIndicators.some((ind) => !currentIndicators.includes(ind));

          if (indicatorsChanged) {
            // ✅ Check 1: State Approver has submitted their form
            if (stateApproverHasSubmission) {
              notificationService.error(
                "Cannot modify indicators. You have already submitted your consolidated submission. Please contact administrator.",
                "Modification Blocked"
              );
              return;
            }

            // ✅ Check 2: Nodal Officer has submitted their form (block ALL changes if they have submitted)
            const nodalHasSubmission = await checkNodalOfficerHasSubmission(
              editingOfficer.id
            );

            if (nodalHasSubmission) {
              notificationService.error(
                "Cannot modify indicators. This nodal officer has already submitted their submission. No indicator changes are allowed.",
                "Modification Blocked"
              );
              return;
            }

            // ✅ Check 3: If adding indicators, check if any being added conflict with existing submissions
            // (This is a safety check, but Check 2 should catch most cases)
            const indicatorsBeingRemoved = currentIndicators.filter(
              (ind) => !newIndicators.includes(ind)
            );

            if (indicatorsBeingRemoved.length > 0) {
              const submissionCheck =
                await checkNodalOfficerHasSubmittedIndicators(
                  editingOfficer.id,
                  indicatorsBeingRemoved
                );

              if (submissionCheck.hasSubmitted) {
                notificationService.error(
                  `Cannot remove indicators ${submissionCheck.submittedIndicators.join(
                    ", "
                  )}. This nodal officer has already submitted data for these indicators.`,
                  "Removal Blocked"
                );
                return;
              }
            }
          }
        }

        // Update existing user via backend API
        let selectedState = "";

        if (user?.role === "ADMIN") {
          // Admin can select any state - convert stateId to state name
          if (officerData.stateId) {
            // Temporarily disable validation to allow state selection
            // if (officerData.stateId.includes('q') || officerData.stateId.length < 3 || /\d.*[a-zA-Z]/.test(officerData.stateId)) {
            //   throw new Error(`Invalid state selected: "${officerData.stateId}". Please select a valid state.`);
            // }

            // Check if stateId is a number (like "9") and convert to state name
            if (!isNaN(Number(officerData.stateId))) {
              // This is a state ID, we need to get the state name from states array
              const state = states.find((s) => s.id === officerData.stateId);
              if (state) {
                selectedState = state.name;
                // Debug logging removed for performance
              } else {
                selectedState = officerData.stateId; // Fallback to ID if not found
                console.warn(
                  "⚠️ State not found in states array for update:",
                  officerData.stateId
                );
              }
            } else {
              // This is already a state name, find the ID
              const state = states.find((s) => s.name === officerData.stateId);
              if (state) {
                selectedState = state.name;
                // Debug logging removed for performance
              } else {
                selectedState = officerData.stateId; // Fallback
                console.warn(
                  "⚠️ State not found in states array for update:",
                  officerData.stateId
                );
              }
            }
            // Debug logging removed for performance
          } else {
            //throw new Error("State selection is required for Admin");
          }
        } else {
          // STATE_APPROVER and MOSPI_APPROVER use their own state
          // For these roles, both stateId and stateUt should be the same (state name)
          selectedState = user?.state || "";
          // Debug logging removed for performance
        }

        // ✅ Validate state
        if (!selectedState && officerData.role !== "STATE_APPROVER") {
          //throw new Error("State is required but not provided");
        }

        // Build the update payload conditionally
        const updatePayload: any = {
          firstName: officerData.firstName,
          lastName: officerData.lastName,
          contactNumber: officerData.contactNumber,
          role: officerData.role as
            | "NODAL_OFFICER"
            | "STATE_APPROVER"
            | "MOSPI_REVIEWER"
            | "MOSPI_APPROVER"
            | "MINISTRY_APPROVER",
          indicatorCodes: officerData.assignedIndicators || [],
          ministryId: officerData.ministryId ? String(officerData.ministryId) : "",
        };

        // Only include stateUt if the role requires it (set to empty string for MOSPI_APPROVER and ADMIN to clear state)
        if (
          officerData.role !== "MOSPI_APPROVER" &&
          officerData.role !== "ADMIN"
        ) {
          updatePayload.stateUt = officerData.stateUt || "";
        } else {
          // Explicitly set to empty string for MOSPI_APPROVER and ADMIN to clear state in backend
          // (Backend has NOT NULL constraint, so we use empty string instead of null)
          updatePayload.stateUt = "";
        }

        await apiService.updateUser(editingOfficer.id, updatePayload);

        // Call minstryRegistrationForm if ministry is assigned/changed for MINISTRY_APPROVER or MOSPI_REVIEWER
        const currentMinistryId = editingOfficer.ministryId || "";
        const newMinistryId = officerData.ministryId ? String(officerData.ministryId) : "";
        const ministryChanged = currentMinistryId !== newMinistryId;
        
        if ((officerData.role === "MINISTRY_APPROVER" || officerData.role === "MOSPI_REVIEWER") && newMinistryId) {
          // If ministry is assigned or changed, call minstryRegistrationForm
          // For MOSPI_REVIEWER, handle multiple ministries (comma-separated)
          if (ministryChanged || !currentMinistryId) {
            try {
              if (officerData.role === "MOSPI_REVIEWER" && newMinistryId.includes(",")) {
                // Multiple ministries for MOSPI_REVIEWER - call API for each
                const ministryIds = newMinistryId.split(",").map(m => m.trim()).filter(Boolean);
                for (const ministryId of ministryIds) {
                  try {
                    await minstryRegistrationForm(
                      editingOfficer.id,
                      officerData.role,
                      ministryId
                    );
                  } catch (err) {
                    console.error(`❌ Error calling minstryRegistrationForm for ministry ${ministryId}:`, err);
                    // Continue with other ministries even if one fails
                  }
                }
              } else {
                // Single ministry
                await minstryRegistrationForm(
                  editingOfficer.id,
                  officerData.role,
                  newMinistryId
                );
              }
            } catch (err) {
              console.error("❌ Error calling minstryRegistrationForm during update:", err);
              // Don't block the update if ministry form creation fails, but log the error
            }
          }
        }

        notificationService.success(
          "Officer updated successfully",
          "Update Successful"
        );

        // Dispatch custom event to notify DashboardLayout to refresh indicators immediately
        // Check if indicators were actually updated
        if (officerData.assignedIndicators !== undefined) {
          console.log(
            "📢 Dispatching indicatorsUpdated event after user update",
            {
              officerRole: editingOfficer.role,
              officerState: editingOfficer.state,
              officerStateUt: editingOfficer.stateUt,
              newIndicators: officerData.assignedIndicators,
            }
          );
          // For NODAL_OFFICER indicator changes, include role so STATE_APPROVERs refresh
          // The NODAL_OFFICER themselves will refresh via the userId check, but STATE_APPROVERs need to refresh too
          const eventDetail: any = { action: "update" };
          if (editingOfficer.role === "NODAL_OFFICER") {
            // Include stateUt and role so STATE_APPROVERs can refresh
            // STATE_APPROVERs will always refresh when any NODAL_OFFICER indicators change
            eventDetail.stateUt =
              editingOfficer.state || editingOfficer.stateUt;
            eventDetail.role = "NODAL_OFFICER";
            // Also include userId for the NODAL_OFFICER themselves to refresh
            eventDetail.userId = editingOfficer.id;
          } else {
            // For other roles, include userId for targeted refresh
            eventDetail.userId = editingOfficer.id;
          }
          console.log("📢 Event detail:", eventDetail);
          window.dispatchEvent(
            new CustomEvent("indicatorsUpdated", { detail: eventDetail })
          );
        }
      } else {
        // Create new user via backend API
        // Debug logging removed for performance

        let selectedStateId = "";
        let selectedStateName = "";

        if (user?.role === "ADMIN") {
          // Admin can select any state - convert stateId to state name
          if (officerData.stateId) {
            // Temporarily disable validation to allow state selection
            // if (officerData.stateId.includes('q') || officerData.stateId.length < 3 || /\d.*[a-zA-Z]/.test(officerData.stateId)) {
            //   throw new Error(`Invalid state selected: "${officerData.stateId}". Please select a valid state.`);
            // }

            // Check if stateId is a number (like "9") and convert to state name
            if (!isNaN(Number(officerData.stateId))) {
              // This is a state ID, we need to get the state name from states array
              const state = states.find((s) => s.id === officerData.stateId);
              if (state) {
                selectedStateId = state.id; // Keep original ID
                selectedStateName = state.name; // Get state name
                // Debug logging removed for performance
              } else {
                selectedStateId = officerData.stateId; // Fallback to ID if not found
                selectedStateName = officerData.stateId; // Fallback to ID if not found
                console.warn(
                  "⚠️ State not found in states array1:",
                  officerData.stateId
                );
              }
            } else {
              // This is already a state name, find the ID
              const state = states.find((s) => s.name === officerData.stateId);
              if (state) {
                selectedStateId = state.id; // Use state ID
                selectedStateName = state.name; // Use state name
                // Debug logging removed for performance
              } else {
                selectedStateId = officerData.stateId; // Fallback
                selectedStateName = officerData.stateId; // Fallback
                console.warn(
                  "⚠️ State not found in states array2:",
                  officerData.stateId
                );
              }
            }
 
          } else {
           // throw new Error("State selection is required for Admin");
          }
        } else {
          // STATE_APPROVER and MOSPI_APPROVER use their own state
          // For these roles, both stateId and stateUt should be the same (state name)
          selectedStateId = user?.state || "";
          selectedStateName = user?.state || "";
          // Debug logging removed for performance
        }

        // ✅ Validate state
        if (!selectedStateId || !selectedStateName) {
          // throw new Error("State is required but not provided");
        }

        // Before calling register, compute final values to send:
        const stateUtToSend = 
            selectedStateName || officerData.stateUt || selectedStateId || "";
 
 
         // Call register with the state NAME as `stateUt`, and selectedStateId as `stateId`
        const newUser = await apiService.register({
          email: officerData.email,
          password: officerData.password || "password123",
          firstName: officerData.firstName,
          lastName: officerData.lastName,
          contactNumber: officerData.contactNumber,
          role: officerData.role,
          stateUt: officerData.stateUt,
          stateId: selectedStateId,
          ministryId: officerData.ministryId ? String(officerData.ministryId) : "",
          indicatorCodes: officerData.assignedIndicators,
        });

        const createdUserId = newUser?.user?.id;
         if (createdUserId) {
          // Call minstryRegistrationForm for both MINISTRY_APPROVER and MOSPI_REVIEWER when ministryId is provided
          if ((officerData.role === "MINISTRY_APPROVER" || officerData.role === "MOSPI_REVIEWER") && officerData.ministryId) {
            try {
              const ministryIdStr = String(officerData.ministryId);
              if (officerData.role === "MOSPI_REVIEWER" && ministryIdStr.includes(",")) {
                // Multiple ministries for MOSPI_REVIEWER - call API for each
                const ministryIds = ministryIdStr.split(",").map(m => m.trim()).filter(Boolean);
                for (const ministryId of ministryIds) {
                  try {
                    await minstryRegistrationForm(
                      createdUserId,
                      officerData.role,
                      ministryId
                    );
                  } catch (err) {
                    console.error(`❌ Error calling minstryRegistrationForm for ministry ${ministryId}:`, err);
                    // Continue with other ministries even if one fails
                  }
                }
              } else {
                // Single ministry
                await minstryRegistrationForm(
                  createdUserId,
                  officerData.role,
                  ministryIdStr
                );
              }
            } catch (err) {
              console.error("❌ Error calling minstryRegistrationForm:", err);
            }
          }
        }

        // Debug logging removed for performance

        // Note: Indicators are now included in the register call, no separate API call needed
        if (
          officerData.role === "NODAL_OFFICER" &&
          officerData.assignedIndicators &&
          officerData.assignedIndicators.length > 0
        ) {
          // Debug logging removed for performance
        }

        notificationService.success(
          "Officer added successfully",
          "Registration Successful"
        );

        // Dispatch custom event to notify DashboardLayout to refresh indicators immediately
        // Check if indicators were assigned to the new user (or if assignment is empty, to notify STATE_APPROVERs)
        if (officerData.assignedIndicators !== undefined) {
          console.log(
            "📢 Dispatching indicatorsUpdated event after user creation"
          );
          // For NODAL_OFFICER indicator assignment, include stateUt so STATE_APPROVERs refresh
          const eventDetail: any = {
            action: "create",
            assignedIndicators: officerData.assignedIndicators,
          };
          if (officerData.role === "NODAL_OFFICER") {
            eventDetail.role = "NODAL_OFFICER";
            eventDetail.stateUt = selectedStateName || officerData.stateUt;
          }
          window.dispatchEvent(
            new CustomEvent("indicatorsUpdated", { detail: eventDetail })
          );
        }
      }

      // Hide form immediately and clear editing state BEFORE loading officers
      // This ensures user doesn't see form clearing - redirect happens simultaneously
      setShowForm(false);
      setEditingOfficer(null);

      // Clear sessionStorage immediately
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("userManagementFormDraft");
      }

      // Reset flags to force refresh
      officersLoadedRef.current = false;

      // Load officers and refresh indicators
      await loadOfficers(true); // Force refresh after save

      // Debounce indicator refresh to prevent rapid successive calls
      if (refreshDebounceTimeoutRef.current) {
        clearTimeout(refreshDebounceTimeoutRef.current);
      }

      refreshDebounceTimeoutRef.current = setTimeout(async () => {
        try {
          await refresh?.({ clearCache: true });
        } catch (err) {
          console.warn("⚠️ Indicator refresh failed after save user:", err);
        }
      }, 300); // 300ms debounce
    } catch (error: any) {
      console.error("❌ Error saving user:", error);

      // Extract error message from response
      let errorMessage = "Failed to save officer. Please try again.";
      let errorTitle = "Operation Failed";

      if (error?.response?.data) {
        const responseData = error.response.data;

        // Priority: message > error > default
        if (responseData.message) {
          errorMessage = responseData.message;
          errorTitle = responseData.error || "Error";
        } else if (responseData.error) {
          errorMessage = responseData.error;
        }

        // Handle specific error cases
        if (responseData.statusCode === 409) {
          errorTitle = "User Already Exists";
          errorMessage =
            "A user with this email address already exists. Please use a different email.";
        } else if (responseData.statusCode === 400) {
          errorTitle = "Invalid Data";
          errorMessage = "Please check your input data and try again.";
        } else if (responseData.statusCode === 403) {
          errorTitle = "Access Denied";
          errorMessage = "You don't have permission to perform this action.";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      notificationService.error(errorMessage, errorTitle);
    }
  };

  // Check if a user has submissions
  const checkUserHasSubmissions = async (userId: string): Promise<boolean> => {
    try {
      const response = await apiService.get(`/submission/user/${userId}`);
      const submission = response?.data?.data || response?.data || response;
      // Check if submission exists and has an id
      return !!(
        submission?.id ||
        (Array.isArray(submission) && submission.length > 0)
      );
    } catch (error: any) {
      // If 404 or no submissions, return false
      if (error?.response?.status === 404) {
        return false;
      }
      console.warn("⚠️ Error checking user submissions:", error);
      // Return false on error to allow deletion
      return false;
    }
  };

  const handleDeleteUser = async (id: string) => {
    const officer = officers.find((o) => o.id === id);
    if (officer) {
      // Check if this is a NODAL_OFFICER and has submissions
      if (officer.role === "NODAL_OFFICER") {
        setCheckingSubmissions(true);
        try {
          const hasSubs = await checkUserHasSubmissions(officer.id);
          setHasSubmissions(hasSubs);
        } catch (error) {
          console.warn("⚠️ Failed to check submissions:", error);
          setHasSubmissions(false);
        } finally {
          setCheckingSubmissions(false);
        }
      } else {
        setHasSubmissions(false);
      }

      setUserToDelete(officer);
      setDeleteModalOpen(true);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    // Prevent deletion if nodal officer has submissions - just close modal
    if (userToDelete.role === "NODAL_OFFICER" && hasSubmissions) {
      setDeleteModalOpen(false);
      setUserToDelete(null);
      setHasSubmissions(false);
      notificationService.error(
        "Cannot delete nodal officer with active submissions.",
        "Deletion Restricted"
      );
      return;
    }

    // Note: Frontend cannot check if STATE_APPROVER has NODAL_OFFICER users
    // because ADMIN/MOSPI_APPROVER don't have access to see NODAL_OFFICER users via API.
    // This validation should be handled on the backend in the deactivateUser endpoint.

    setIsDeleting(true);
    try {
      // Delete user via backend API
      // Note: Backend's deactivate method already handles:
      // 1. Checking for submissions (throws error if submissions exist)
      // 2. Soft deleting the user (sets isActive: false)
      // 3. Deleting all UserIndicatorScope records (unassigning indicators)
      await apiService.deactivateUser(userToDelete.id);
      notificationService.success(
        `${userToDelete.firstName} ${userToDelete.lastName} deleted successfully`,
        "Deletion Successful"
      );

      // Reset flag to force refresh
      officersLoadedRef.current = false;

      // Refresh data
      await loadOfficers(true); // Force refresh after delete

      // Debounce indicator refresh
      if (refreshDebounceTimeoutRef.current) {
        clearTimeout(refreshDebounceTimeoutRef.current);
      }

      refreshDebounceTimeoutRef.current = setTimeout(async () => {
        try {
          await refresh?.({ clearCache: true });
        } catch (err) {
          console.warn("⚠️ Indicator refresh failed after delete user:", err);
        }
      }, 300);
      // Close modal
      setDeleteModalOpen(false);
      setUserToDelete(null);
      setHasSubmissions(false);
    } catch (error: any) {
      console.error("❌ Error deleting user:", error);

      // Extract error message from response
      let errorMessage = "Failed to delete officer. Please try again.";
      let errorTitle = "Delete Failed";

      if (error?.response?.data) {
        const responseData = error.response.data;
        if (responseData.message) {
          errorMessage = responseData.message;
          errorTitle = responseData.error || "Deletion Restricted";
        } else if (responseData.error) {
          errorMessage = responseData.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      notificationService.error(errorMessage, errorTitle);
    } finally {
      setIsDeleting(false);
    }
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Sorting state
  const [sortField, setSortField] = useState<
    "firstName" | "role" | "state" | "email"
  >("firstName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // ✅ getStateNameById function removed - using stateId directly as state name

  
  // Filter and sort officers
  const isStateApprover = user?.role === "STATE_APPROVER";
  const filteredOfficers = officers
    .filter((officer) => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        officer.firstName.toLowerCase().includes(lowerSearch) ||
        officer.lastName.toLowerCase().includes(lowerSearch) ||
        officer.email.toLowerCase().includes(lowerSearch) ||
        getMinistryName(officer.ministryId).toLowerCase().includes(lowerSearch) ||
        (officer.state && officer.state.toLowerCase().includes(lowerSearch)) ||
        (officer.stateId && officer.stateId.toLowerCase().includes(lowerSearch));

      // Treat MINISTRY_APPROVER as a state approver for filtering purposes
      const isStateApprover = user?.role === "STATE_APPROVER" || user?.role === "MINISTRY_APPROVER";
      const effectiveRoleFilter =
        isStateApprover && roleFilter === "all" ? "NODAL_OFFICER" : roleFilter;
      const matchesRole =
        effectiveRoleFilter === "all" || officer.role === effectiveRoleFilter;

      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      let aValue = "";
      let bValue = "";

      switch (sortField) {
        case "firstName":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "role":
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
          break;
        case "state":
          aValue = (a.stateId || a.state).toLowerCase();
          bValue = (b.stateId || b.state).toLowerCase();
          break;
        case "email":
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        default:
          aValue = a.firstName.toLowerCase();
          bValue = b.firstName.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

     
  // Pagination calculations
  const totalPages = Math.ceil(filteredOfficers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOfficers = filteredOfficers.slice(startIndex, endIndex);
    


  // Handle sorting
  const handleSort = (field: "firstName" | "role" | "state" | "email") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleDeleteAll = async () => {
    // Only proceed if users are selected
    if (selectedIds.size === 0) {
      notificationService.warning(
        "Please select users to delete",
        "No Selection"
      );
      return;
    }

    // Delete selected users
    const selectedIdsArray = Array.from(selectedIds);
    setUserToDelete({
      id: "bulk",
      firstName: `${selectedIdsArray.length} Selected Users`,
      lastName: "",
      email: "",
      role: "",
      state: user?.state || "",
      contactNumber: "",
      isActive: true,
      createdAt: Date.now(),
    });
    setDeleteModalOpen(true);
  };
  const confirmDeleteAll = async () => {
    setIsDeleting(true);
    try {
      // Delete selected users
      const selectedIdsArray = Array.from(selectedIds);

      // Note: Backend's bulkDeactivate method already handles:
      // 1. Checking for submissions for each user (throws error if submissions exist)
      // 2. Soft deleting users (sets isActive: false)
      // 3. Deleting all UserIndicatorScope records (unassigning indicators)
      const result = await apiService.deactivateUsers(selectedIdsArray);

      notificationService.success(
        `${
          result.deactivatedCount || selectedIdsArray.length
        } users deleted successfully`,
        "Bulk Deleted Successful"
      );

      // Clear selection and refresh data
      setSelectedIds(new Set());

      // Reset flag to force refresh
      officersLoadedRef.current = false;

      await loadOfficers(true); // Force refresh after bulk delete

      // Debounce indicator refresh
      if (refreshDebounceTimeoutRef.current) {
        clearTimeout(refreshDebounceTimeoutRef.current);
      }

      refreshDebounceTimeoutRef.current = setTimeout(async () => {
        try {
          await refresh?.({ clearCache: true });
        } catch (err) {
          console.warn(
            "⚠️ Indicator refresh failed after bulk delete users:",
            err
          );
        }
      }, 300);

      // Close modal
      setDeleteModalOpen(false);
      setUserToDelete(null);
      setHasSubmissions(false);
    } catch (error) {
      console.error("❌ Error deleting users:", error);
      notificationService.error(
        "Failed to delete users. Please try again.",
        "Bulk Delete Failed"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignIndicator = async (id: string, indicator: string) => {
    try {
      // Update user with assigned indicator via backend API
      await apiService.updateUser(id, {
        assignedIndicator: indicator,
      } as any);
      notificationService.success(
        "Indicator assigned successfully",
        "Assignment Successful"
      );

      // Reset flag to force refresh
      officersLoadedRef.current = false;

      await loadOfficers(true); // Force refresh after assign

      // Debounce indicator refresh
      if (refreshDebounceTimeoutRef.current) {
        clearTimeout(refreshDebounceTimeoutRef.current);
      }

      refreshDebounceTimeoutRef.current = setTimeout(async () => {
        try {
          await refresh?.({ clearCache: true });
        } catch (err) {
          console.warn(
            "⚠️ Indicator refresh failed after assign indicator:",
            err
          );
        }
      }, 300);
    } catch (error) {
      console.error("❌ Error assigning indicator:", error);
      notificationService.error(
        "Failed to assign indicator. Please try again.",
        "Assignment Failed"
      );
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOfficer(null);
  };

  // Early returns for access control and loading - these are OK as they happen before any conditional logic
  if (officers.length === 0 && !showForm) {
    // Debug logging removed for performance

    return (
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              User Management
            </h1>
          </div>
        </div>
        <EmptyState onAddClick={handleAddUser} />
      </div>
    );
  }
  // Debug logging removed for performance

  // Access control - Only STATE_APPROVER, MOSPI_APPROVER, and ADMIN can access user management
  if (
    user?.role !== "STATE_APPROVER" &&
    user?.role !== "MOSPI_APPROVER" &&
    user?.role !== "MINISTRY_APPROVER" &&
    user?.role !== "ADMIN"
  ) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access User Management.
          </p>
          <p className="text-sm text-gray-500">
            Only State Approvers, MoSPI Approvers, and Admins can manage users.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading Users
          </h2>
          <p className="text-gray-600">
            Please wait while we fetch the user data...
          </p>
        </div>
      </div>
    );
  }


  // Ministry Approver: handle save with ministryAssignedIndicators
  // Ministry Approver: Only assign indicators to an existing Nodal Officer (no registration here)
  const handleMinistryIndicatorSaveUser = async (
      officerData: Omit<
        NodalOfficer,
        "id" | "state" | "createdAt" | "assignedIndicator"
      > & { nodalUserId: string; ministryAssignedIndicators?: string[] }
    ) => {
       if (editingOfficer) {
          // Update user basic info
          await apiService.updateUser(editingOfficer.id, {
            firstName: officerData.firstName,
            lastName: officerData.lastName,
            contactNumber: officerData.contactNumber,
            role: officerData.role as
              | "NODAL_OFFICER"
              | "STATE_APPROVER"
              | "MOSPI_REVIEWER"
              | "MOSPI_APPROVER"
              | "MINISTRY_APPROVER",
          } as any);

          // Get currently assigned indicators for this nodal officer
          // First try from ministryAssignableIndicators state (indicators with isSelected: true)
          let currentlyAssignedIndicators: string[] = [];
          
          // Extract from ministryAssignableIndicators that have isSelected: true
          if (Array.isArray(ministryAssignableIndicators) && ministryAssignableIndicators.length > 0) {
            currentlyAssignedIndicators = ministryAssignableIndicators
              .filter((ind: any) => ind && ind.isSelected === true)
              .map((ind: any) => String(ind.value || ind.id || ind.code || ''))
              .filter((val: string) => val !== '');
          }
          
          // Fallback: try from editingOfficer.assignedIndicators
          if (currentlyAssignedIndicators.length === 0 && editingOfficer.assignedIndicators && Array.isArray(editingOfficer.assignedIndicators)) {
            editingOfficer.assignedIndicators.forEach((ind: any) => {
              const value = typeof ind === 'string' ? ind : String(ind?.value || ind?.id || ind?.code || ind || '');
              if (value) {
                currentlyAssignedIndicators.push(value);
              }
            });
          }
          
          // If still empty, fetch from API to get the latest assigned indicators
          if (currentlyAssignedIndicators.length === 0 && editingOfficer.id && user?.id) {
            try {
              console.log('[handleMinistryIndicatorSaveUser] Fetching currently assigned indicators from API');
              const nodalIndicatorsResponse = await getRemainingMinistryIndicators(editingOfficer.id);
              let nodalIndicatorsData = nodalIndicatorsResponse;
              if (nodalIndicatorsResponse && typeof nodalIndicatorsResponse === 'object' && 'data' in nodalIndicatorsResponse) {
                nodalIndicatorsData = nodalIndicatorsResponse.data;
              }
              
              // Flatten the response
              let assignedIndicatorsFlat: any[] = [];
              if (Array.isArray(nodalIndicatorsData)) {
                assignedIndicatorsFlat = nodalIndicatorsData;
              } else if (nodalIndicatorsData && typeof nodalIndicatorsData === 'object') {
                Object.values(nodalIndicatorsData).forEach((categoryIndicators: any) => {
                  if (Array.isArray(categoryIndicators)) {
                    categoryIndicators.forEach((item: any) => {
                      if (item && typeof item === 'object') {
                        assignedIndicatorsFlat.push(item);
                      }
                    });
                  }
                });
              }
              
              // Extract indicator IDs
              assignedIndicatorsFlat.forEach((item: any) => {
                const value = item.id || item.code || item.value || '';
                if (value) {
                  currentlyAssignedIndicators.push(String(value));
                }
              });
              
              console.log('[handleMinistryIndicatorSaveUser] Fetched currently assigned indicators from API:', currentlyAssignedIndicators);
            } catch (error) {
              console.error('[handleMinistryIndicatorSaveUser] Error fetching assigned indicators:', error);
            }
          }

          console.log('[handleMinistryIndicatorSaveUser] Currently assigned indicators:', currentlyAssignedIndicators);
          
          const newIndicators = (officerData.ministryAssignedIndicators || []).map((ind: any) => String(ind).trim());
          console.log('[handleMinistryIndicatorSaveUser] New indicators:', newIndicators);
          
          // Normalize both arrays to strings for comparison
          const normalizedCurrent = currentlyAssignedIndicators.map((ind) => String(ind).trim());
          const normalizedNew = newIndicators.map((ind) => String(ind).trim());
          
          // Find indicators to remove (in current but not in new)
          const indicatorsToRemove = normalizedCurrent.filter(
            (ind) => ind && !normalizedNew.includes(ind)
          );
          
          console.log('[handleMinistryIndicatorSaveUser] Indicators to remove:', indicatorsToRemove);
          console.log('[handleMinistryIndicatorSaveUser] Comparison details:', {
            normalizedCurrent,
            normalizedNew,
            indicatorsToRemoveCount: indicatorsToRemove.length,
            userId: user?.id
          });

          // If indicators are provided, reassign them
          if (newIndicators.length > 0 && user?.id) {
            try {
              await reassignIndicatorsToNodal(
                editingOfficer.id, // nodalUserId
                user.id, // ministryUserId
                newIndicators // indicatorsId
              );

              notificationService.success(
                "Officer and indicators updated successfully",
                "Update Successful"
              );
            } catch (error: any) {
              console.error('Error reassigning indicators:', error);
              let errorMessage = "Failed to reassign indicators. Please try again.";
              if (error?.response?.data?.message) {
                errorMessage = error.response.data.message;
              }
              notificationService.error(
                errorMessage,
                "Reassignment Failed"
              );
            }
          }

          // If there are indicators to remove (including when all are removed)
          if (indicatorsToRemove.length > 0 && user?.id) {
            console.log('[handleMinistryIndicatorSaveUser] Calling removeAssignedIndicators API with:', {
              ministryUserId: user.id,
              indicatorsId: indicatorsToRemove,
              count: indicatorsToRemove.length
            });
            try {
              const removeResponse = await removeAssignedIndicators(
                user.id, // ministryUserId
                indicatorsToRemove // indicatorsId
              );
              
              console.log('[handleMinistryIndicatorSaveUser] removeAssignedIndicators API response:', removeResponse);

              if (newIndicators.length === 0) {
                notificationService.success(
                  "All indicators removed from nodal officer successfully",
                  "Update Successful"
                );
              } else {
                console.log(`[handleMinistryIndicatorSaveUser] Removed ${indicatorsToRemove.length} indicators from nodal officer`);
                // If we also reassigned indicators, don't show duplicate success message
                if (newIndicators.length === 0) {
                  notificationService.success(
                    `${indicatorsToRemove.length} indicator(s) removed from nodal officer successfully`,
                    "Update Successful"
                  );
                }
              }
            } catch (error: any) {
              console.error('[handleMinistryIndicatorSaveUser] Error removing indicators:', error);
              console.error('[handleMinistryIndicatorSaveUser] Error details:', {
                message: error?.message,
                response: error?.response,
                status: error?.response?.status,
                data: error?.response?.data,
              });
              let errorMessage = "Failed to remove indicators. Please try again.";
              if (error?.response?.data?.message) {
                errorMessage = error.response.data.message;
              }
              notificationService.error(
                errorMessage,
                "Removal Failed"
              );
            }
          } else if (newIndicators.length === 0 && currentlyAssignedIndicators.length === 0) {
            // No indicators to update
            console.log('[handleMinistryIndicatorSaveUser] No indicators to update');
            notificationService.success(
              "Officer updated successfully",
              "Update Successful"
            );
          } else {
            console.log('[handleMinistryIndicatorSaveUser] No indicators to remove:', {
              indicatorsToRemove: indicatorsToRemove.length,
              newIndicators: newIndicators.length,
              currentlyAssigned: currentlyAssignedIndicators.length,
              userId: user?.id
            });
          }

          // Refresh the user list after update
          await loadOfficers();
          setShowForm(false);
          setEditingOfficer(null);
       
       }else{
        try {
          let nodalUserId = officerData.nodalUserId;
          if (!nodalUserId && officerData.email && officerData.firstName && officerData.lastName) {
            // Register the user (minimal fields, expand as needed)
            const ministryIdToUse = String(officerData.ministryId || user?.ministryId || "");
            // Use ministryId from officerData, or fallback to ministryAssignedIndicators, or current user's ministryId
            const newUser = await apiService.register({
              email: officerData.email,
              password: officerData.password || "password123",
              firstName: officerData.firstName,
              lastName: officerData.lastName,
              contactNumber: officerData.contactNumber,
              role: "NODAL_OFFICER",
              stateUt: officerData.stateUt,
              stateId: officerData.stateId,
              ministryId: ministryIdToUse
            });
            nodalUserId = newUser?.user?.id;
          }
          if (
            nodalUserId &&
            officerData.ministryAssignedIndicators &&
            officerData.ministryAssignedIndicators.length > 0 &&
            user?.id
          ) {
            await assignIndicatorsToNodal(
              nodalUserId,
              user.id,
              officerData.ministryAssignedIndicators
            );

            notificationService.success(
              "Ministry indicators assigned successfully",
              "Assignment Successful"
            );
            await loadOfficers();
            setShowForm(false);
            setEditingOfficer(null);
            try {
              //await refresh?.({ clearCache: true });
            } catch (err) {
              // ignore
            }
          } else {
            notificationService.error(
              "Missing Nodal Officer or indicators.",
              "Assignment Failed"
            );
          }
        } catch (error: any) {
          let errorMessage = "Failed to assign indicators. Please try again.";
          let errorTitle = "Operation Failed";
          if (error?.response?.data) {
            const responseData = error.response.data;
            if (responseData.message) {
              errorMessage = responseData.message;
              errorTitle = responseData.error || "Error";
            } else if (responseData.error) {
              errorMessage = responseData.error;
            }
            if (responseData.statusCode === 409) {
              errorTitle = "Assignment Conflict";
              errorMessage = "Indicators already assigned or conflict exists.";
            } else if (responseData.statusCode === 400) {
              errorTitle = "Invalid Data";
              errorMessage = "Please check your input data and try again.";
            } else if (responseData.statusCode === 403) {
              errorTitle = "Access Denied";
              errorMessage = "You don't have permission to perform this action.";
            }
          } else if (error?.message) {
            errorMessage = error.message;
          }
          notificationService.error(errorMessage, errorTitle);
        }
      }
    };

  if (showForm) {
    // Conditionally use handleMinistryIndicatorSaveUser for Ministry Approver with ministryAssignedIndicators
    const isMinistryApprover = user?.role === "MINISTRY_APPROVER";
    return (
      <div className="p-6 space-y-6">
        <UserForm
          officer={editingOfficer}
          onSave={isMinistryApprover ? handleMinistryIndicatorSaveUser : handleSaveUser}
          onCancel={handleCancel}
          allIndicators={allIndicators}
          officers={officers}
          loadingIndicators={isIndicatorsLoading}
          stateApproverHasSubmission={stateApproverHasSubmission}
          submittedIndicatorsInState={submittedIndicatorsInState}
          ministryAssignableIndicators={isMinistryApprover ? ministryAssignableIndicators : undefined}
        />
      </div>
    );
  }
  

  return (
    <>
    <div className="bg-white rounded-lg border border-[#ddd] p-6 mb-6 space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              User Management
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Cleanup Buttons Component - Comment/Uncomment to enable/disable */}
          {/* <CleanupButtons
            userRole={user?.role}
            onRefresh={loadOfficers}
            isDeleting={isDeleting}
          /> */}
          {/* End Cleanup Buttons Component */}
          <Button
            variant="outline"
            onClick={handleDeleteAll}
            disabled={
              isDeleting || (selectedIds.size === 0 && officers.length === 0)
            }
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
          <Button onClick={handleAddUser} disabled={isDeleting}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, email or state name / Ministry name"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value);
              setCurrentPage(1); // Reset to first page when filtering
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Select Roles</SelectItem>

              {/* For MINISTRY_APPROVER and STATE_APPROVER: Only show NODAL_OFFICER */}
              {(user?.role === "MINISTRY_APPROVER" || user?.role === "STATE_APPROVER") && (
                <SelectItem value="NODAL_OFFICER">
                  {getRoleDisplayName("NODAL_OFFICER")}
                </SelectItem>
              )}

              {/* For MOSPI_APPROVER: Show STATE_APPROVER, MOSPI_REVIEWER, MINISTRY_APPROVER */}
              {user?.role === "MOSPI_APPROVER" && (
                <>
                  <SelectItem value="NODAL_OFFICER">
                    {getRoleDisplayName("NODAL_OFFICER")}
                  </SelectItem>
                  <SelectItem value="STATE_APPROVER">
                    {getRoleDisplayName("STATE_APPROVER")}
                  </SelectItem>
                  <SelectItem value="MOSPI_REVIEWER">
                    {getRoleDisplayName("MOSPI_REVIEWER")}
                  </SelectItem>
                  <SelectItem value="MINISTRY_APPROVER">
                    {getRoleDisplayName("MINISTRY_APPROVER")}
                  </SelectItem>
                </>
              )}

              {/* For ADMIN: Show all roles */}
              {user?.role === "ADMIN" && (
                <>
                  <SelectItem value="NODAL_OFFICER">
                    {getRoleDisplayName("NODAL_OFFICER")}
                  </SelectItem>
                  <SelectItem value="STATE_APPROVER">
                    {getRoleDisplayName("STATE_APPROVER")}
                  </SelectItem>
                  <SelectItem value="MOSPI_REVIEWER">
                    {getRoleDisplayName("MOSPI_REVIEWER")}
                  </SelectItem>
                  <SelectItem value="MOSPI_APPROVER">
                    {getRoleDisplayName("MOSPI_APPROVER")}
                  </SelectItem>
                  <SelectItem value="MINISTRY_APPROVER">
                    {getRoleDisplayName("MINISTRY_APPROVER")}
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    {getRoleDisplayName("ADMIN")}
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        {(searchTerm || roleFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setRoleFilter("all");
              setCurrentPage(1); // Reset to first page when clearing filters
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {startIndex + 1}-{Math.min(endIndex, filteredOfficers.length)}{" "}
        of {filteredOfficers.length} users
        {filteredOfficers.length !== officers.length && (
          <span className="ml-2 text-primary">
            (filtered from {officers.length} total)
          </span>
        )}
      </div>

      {/* Debug log moved outside JSX for reliability */}
      
        <UserTable
        officers={paginatedOfficers}
        onEdit={user?.role === "MINISTRY_APPROVER" ? handleMinistryEditUser : handleEditUser}
        onDelete={handleDeleteUser}
        onAssignIndicator={user?.role === "MINISTRY_APPROVER" ? handleMinisterAssignIndicator : handleAssignIndicator}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        userRole={user?.role}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {/* Page {currentPage} of {totalPages} */}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for User Deletion */}
      <ConfirmationModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
          setHasSubmissions(false);
        }}
        onConfirm={
          hasSubmissions && userToDelete?.role === "NODAL_OFFICER"
            ? () => {
                setDeleteModalOpen(false);
                setUserToDelete(null);
                setHasSubmissions(false);
              }
            : userToDelete?.id === "bulk"
            ? confirmDeleteAll
            : confirmDeleteUser
        }
        title={
          userToDelete?.id === "bulk"
            ? "Delete Selected Users"
            : hasSubmissions && userToDelete?.role === "NODAL_OFFICER"
            ? "Deletion Not Allowed"
            : "Delete Officer"
        }
        description={
          userToDelete?.id === "bulk"
            ? `Are you sure you want to delete ${userToDelete?.firstName}? This action cannot be undone.`
            : hasSubmissions && userToDelete?.role === "NODAL_OFFICER"
            ? `Cannot delete ${userToDelete?.firstName} ${userToDelete?.lastName} because they have active submissions.`
            : `Are you sure you want to delete ${userToDelete?.firstName} ${userToDelete?.lastName}? This action cannot be undone.`
        }
        confirmText={
          hasSubmissions && userToDelete?.role === "NODAL_OFFICER"
            ? "Close"
            : userToDelete?.id === "bulk"
            ? "Delete Selected"
            : "Delete Officer"
        }
        cancelText="Cancel"
        variant={
          hasSubmissions && userToDelete?.role === "NODAL_OFFICER"
            ? "warning"
            : "destructive"
        }
        isLoading={isDeleting || checkingSubmissions}
      >
        {checkingSubmissions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">Checking for submissions...</p>
          </div>
        )}
        {hasSubmissions &&
          !checkingSubmissions &&
          userToDelete?.role === "NODAL_OFFICER" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Deletion Restricted:</strong> This nodal officer has
                active submissions. Deletion is not allowed to preserve
                submission history.
              </p>
            </div>
          )}
        {userToDelete?.id === "bulk" && !hasSubmissions && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Warning:</strong> This will permanently delete the
              selected users. They will no longer be able to access the system.
            </p>
          </div>
        )}
      </ConfirmationModal>
    </div>

    {/* Indicator Summary Section - Outside User Management Component */}
    {user?.role === "MINISTRY_APPROVER" && user?.id && (
      <IndicatorSummary userId={user.id} />
    )}
    </>
  );
}
