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
}


export function UserForm({
  officer,
  onSave,
  onCancel,
  allIndicators = [],
  officers = [],
  loadingIndicators = false,
}: UserFormProps) {
  const { user } = useAuth();

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


  // State for API response
  const [availableIndicatorsForState, setAvailableIndicatorsForState] = useState<any[]>([]);

  // Fetch available indicators for selected state
  useEffect(() => {
    const fetchAvailableIndicators = async () => {
      let stateName = "";
      if (user?.role === "ADMIN") {
        if (!formData.stateId) return setAvailableIndicatorsForState([]);
        let stateIdStr = Array.isArray(formData.stateId) ? formData.stateId[0] : formData.stateId;
        const found = states.find((s) => s.id === stateIdStr);
        stateName = found ? found.name : stateIdStr;
      } else {
        stateName = user?.state || "";
      }
      if (!stateName) return setAvailableIndicatorsForState([]);
      try {
        const indicators = await apiService.getAvailableIndicatorsForApprover(stateName);
        setAvailableIndicatorsForState(Array.isArray(indicators) ? indicators : []);
      } catch (error) {
        setAvailableIndicatorsForState([]);
      }
    };
    fetchAvailableIndicators();
  }, [formData.stateId, user?.role, states]);

  // Build the options list from INDICATOR_SECTIONS but only include:
  //  - indicators present in availableIndicatorCodes OR
  //  - indicators already selected for this form (so editing doesn't drop them)
  const indicatorOptions: MultiSelectOption[] = useMemo(() => {
    // Collect all codes from API response
    let apiCodes: string[] = [];
    if (!availableIndicatorsForState || availableIndicatorsForState.length === 0) {
      apiCodes = [];
    } else if (typeof availableIndicatorsForState[0] === 'object') {
      apiCodes = availableIndicatorsForState.map((item: any) => item.code);
    } else {
      apiCodes = availableIndicatorsForState;
    }

    // Sort: assigned indicators first (in their order), then API indicators (in their order, excluding duplicates)
    const assigned = formData.assignedIndicators || [];
    const apiUnique = apiCodes.filter(code => !assigned.includes(code));
    const allCodes = [...assigned, ...apiUnique];

    // Build name map from API response (object) or fallback
    const indicatorNameMap: Record<string, string> = {};
    if (typeof availableIndicatorsForState[0] === 'object') {
      availableIndicatorsForState.forEach((item: any) => {
        if (item && item.code && item.name) {
          indicatorNameMap[item.code] = item.name;
        }
      });
    }
    // Fallback for codes not in API response
    allCodes.forEach((code: string) => {
      if (!indicatorNameMap[code]) {
        indicatorNameMap[code] = getIndicatorDisplayName(code);
      }
    });

    // Build options array
    return allCodes.map((code: string) => {
      // If API response is object, try to get section/category
      let section = '';
      let description = indicatorNameMap[code];
      if (typeof availableIndicatorsForState[0] === 'object') {
        const found = availableIndicatorsForState.find((item: any) => item.code === code);
        if (found) {
          section = found.category || '';
          description = found.name || indicatorNameMap[code];
        }
      }
      return {
        value: code,
        label: `${code} - ${indicatorNameMap[code]}`,
        section,
        description,
      };
    });
  }, [availableIndicatorsForState]);

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
    setFormData((prev) => ({
      ...prev,
      assignedIndicators: selectedIndicators,
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
      }
    } else {
      // Reset form when no officer (new user)
      // Set default role based on current user's permissions
      const availableRoles = getAvailableRoles();
      const defaultRole =
        availableRoles.length > 0 ? availableRoles[0].value : "NODAL_OFFICER";

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
    }
  }, [officer, user?.state, user?.role, getAvailableRoles, states]);

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

    // ✅ State validation for ADMIN only
   

    if (formData.role !== "MOSPI_APPROVER") {
      if (user?.role === "ADMIN" && !formData.stateId) {
        newErrors.stateId = "State is required";
      } 
   }


    // ✅ Indicator validation for NODAL_OFFICER
    if (
      formData.role === "NODAL_OFFICER" &&
      formData.assignedIndicators.length === 0
    ) {
      newErrors.assignedIndicators =
        "At least one indicator must be assigned to Nodal Officer";
    }

    // ✅ State validation for MOSPI_APPROVER and ADMIN
   if (user?.role === "ADMIN" || user?.role === "MOSPI_APPROVER") {
    if (formData.role === "MOSPI_REVIEWER") {
      // Validate multiple states for MOSPI_REVIEWER
      if (!Array.isArray(formData.stateId) || formData.stateId.length === 0) {
        newErrors.stateId = "Please select at least one state";
      }
    } else {

      if (formData.role !== "MOSPI_APPROVER") {
      // Validate single state for other roles
      if (!formData.stateId || (Array.isArray(formData.stateId) && formData.stateId.length === 0)) {
        newErrors.stateId = "State is required";
      }
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
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
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
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
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
            placeholder="Enter you 10-digit phone number"
            value={formData.contactNumber}
            onChange={(e) =>
              setFormData({ ...formData, contactNumber: e.target.value })
            }
            className={errors.contactNumber ? "border-destructive" : ""}
          />
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
            onChange={(e) => {
              const email = e.target.value;
              setFormData({ ...formData, email });

              // Real-time validation for email domain
              if (email.trim() === "") {
                // Clear error if field is empty
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.email;
                  return newErrors;
                });
              } else if (!/@(gov\.in|nic\.in)$/i.test(email)) {
                // Show error if domain is not @gov.in or @nic.in
                setErrors((prev) => ({
                  ...prev,
                  email: "Only @gov.in and @nic.in email addresses are allowed",
                }));
              } else {
                // Clear error if domain is correct
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.email;
                  return newErrors;
                });
              }
            }}
            className={errors.email ? "border-destructive" : ""}
          />
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
          <Select
            value={formData.role}
            onValueChange={(value) => {
              setFormData(prev => ({
                ...prev,
                role: value,
                stateId: value === "MOSPI_REVIEWER" ? [] : '',
                stateUt: ''
              }));
            }}
          >
            <SelectTrigger className={errors.role ? "border-destructive" : ""}>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableRoles().map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role}</p>
          )}
        </div>

        <div className="space-y-2">
          {formData?.role !== "MOSPI_APPROVER" && (<>
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
  ) : formData.role !== "MOSPI_APPROVER" ? (
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
            return (
              <SelectItem key={state.id} value={state.id} disabled={!state.isActive || isDisabledByName}>
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

          {formData?.role === "ADMIN" ? (
            <p className="text-sm text-muted-foreground">
              Select the state where you want to create the user
            </p>
          ) : (
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
              <span className="text-destructive">*</span>
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

            <MultiSelect
              options={indicatorOptions}
              value={formData.assignedIndicators}
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
              disabled={loadingIndicators}
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
