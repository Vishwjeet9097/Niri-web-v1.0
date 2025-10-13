import { useState, useEffect, useCallback } from "react";
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
import { InfoIcon, Loader2 } from "lucide-react";
import { NodalOfficer } from "../services/userManagement.service";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/AuthProvider";
import { statesService, State } from "@/services/states.service";

interface UserFormProps {
  officer: NodalOfficer | null;
  onSave: (data: Omit<NodalOfficer, "id" | "state" | "createdAt" | "assignedIndicator"> & { password?: string }) => void;
  onCancel: () => void;
}

export function UserForm({ officer, onSave, onCancel }: UserFormProps) {
  const { user } = useAuth();
  
  // Debug user info (temporarily enabled)
  console.log("🔍 UserForm - User info:", {
    userRole: user?.role,
    userState: user?.state,
    userEmail: user?.email,
    isAdmin: user?.role === "ADMIN"
  });
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    password: "",
    role: "NODAL_OFFICER",
    stateId: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [states, setStates] = useState<State[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);

  // Get available roles based on current user's role
  const getAvailableRoles = useCallback(() => {
    const currentUserRole = user?.role;
    
    console.log("🔍 getAvailableRoles - Current user role:", currentUserRole);
    
    switch (currentUserRole) {
      case "STATE_APPROVER":
        // State Approver can only create Nodal Officers
        return [
          { value: "NODAL_OFFICER", label: getRoleDisplayName("NODAL_OFFICER") },
        ];
      case "MOSPI_APPROVER":
        // MoSPI Approver can create MoSPI Reviewers and State Approvers
        return [
          { value: "MOSPI_REVIEWER", label: getRoleDisplayName("MOSPI_REVIEWER") },
          { value: "STATE_APPROVER", label: getRoleDisplayName("STATE_APPROVER") },
        ];
      case "ADMIN":
        // Admin can create all roles (for system administration)
        return [
          { value: "NODAL_OFFICER", label: getRoleDisplayName("NODAL_OFFICER") },
          { value: "STATE_APPROVER", label: getRoleDisplayName("STATE_APPROVER") },
          { value: "MOSPI_REVIEWER", label: getRoleDisplayName("MOSPI_REVIEWER") },
          { value: "MOSPI_APPROVER", label: getRoleDisplayName("MOSPI_APPROVER") },
          { value: "ADMIN", label: getRoleDisplayName("ADMIN") },
        ];
      default:
        // Default fallback - no roles available
        return [];
    }
  }, [user?.role]);

  useEffect(() => {
    if (officer) {
      console.log("🔍 Setting form data for officer:", {
        officer,
        stateId: officer.stateId,
        state: officer.state
      });
      setFormData({
        firstName: officer.firstName,
        lastName: officer.lastName,
        contactNumber: officer.contactNumber,
        email: officer.email,
        password: "", // Don't show password for existing users
        role: officer.role,
        stateId: "", // Will be set after states are loaded
      });
    } else {
      // Reset form when no officer (new user)
      // Set default role based on current user's permissions
      const availableRoles = getAvailableRoles();
      const defaultRole = availableRoles.length > 0 ? availableRoles[0].value : "NODAL_OFFICER";
      
      setFormData({
        firstName: "",
        lastName: "",
        contactNumber: "",
        email: "",
        password: "",
        role: defaultRole,
        stateId: user?.role === "ADMIN" ? "" : (user?.state || ""), // ✅ Admin can select any state, others use current state
      });
    }
  }, [officer, user?.state, user?.role, getAvailableRoles]);

  // Load states on component mount
  useEffect(() => {
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const statesData = await statesService.getStates();
        console.log("🔍 States loaded in UserForm:", {
          statesCount: statesData.length,
          firstState: statesData[0],
          userRole: user?.role
        });
        setStates(statesData);
        
        // If we have an officer but no stateId, try to find it by stateUt/state name
        if (officer && (!officer.stateId || officer.stateId === "") && officer.state) {
          console.log("🔍 Looking for state match:", {
            officerState: officer.state,
            statesData: statesData.length
          });
          
          const foundState = statesData.find(state => 
            state.name.toLowerCase() === officer.state.toLowerCase() ||
            state.code.toLowerCase() === officer.state.toLowerCase()
          );
          
          if (foundState) {
            console.log("🔍 Found matching state:", foundState);
            setFormData(prev => ({
              ...prev,
              stateId: foundState.id
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
  }, [officer]);

  // Set stateId after states are loaded and officer is available
  useEffect(() => {
    if (officer && states.length > 0 && !formData.stateId) {
      console.log("🔍 Setting stateId after states loaded:", {
        officerState: officer.state,
        statesCount: states.length
      });
      
      const foundState = states.find(state => 
        state.name.toLowerCase() === officer.state.toLowerCase() ||
        state.code.toLowerCase() === officer.state.toLowerCase()
      );
      
      if (foundState) {
        console.log("🔍 Found matching state for form:", foundState);
        setFormData(prev => ({
          ...prev,
          stateId: foundState.id
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
    } else if (!/\.(gov\.in|nic\.in)$/i.test(formData.email)) {
      newErrors.email = "Only .gov.in and .nic.in email addresses are allowed";
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
    if (user?.role === "ADMIN" && !formData.stateId) {
      newErrors.stateId = "State is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      console.log("🔍 Form data being submitted:", formData);
      onSave(formData);
    }
  };

  // Get selected state name for display
  const getSelectedStateName = () => {
    if (!formData.stateId) return "";
    const selectedState = states.find(state => state.id === formData.stateId);
    return selectedState ? selectedState.name : formData.stateId; // Fallback to stateId if not found
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Enter officer details</h2>
        <p className="text-muted-foreground">
          Add Nodal Officers for your State/UT and assign them specific indicators for data submission.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="flex items-center gap-2">
            First Name
            <span className="text-destructive">*</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter the officer's first name</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter the officer's last name</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter 10-digit mobile number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Only .gov.in and .nic.in email addresses are allowed</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.email;
                  return newErrors;
                });
              } else if (!/\.(gov\.in|nic\.in)$/i.test(email)) {
                // Show error if domain is not .gov.in or .nic.in
                setErrors(prev => ({
                  ...prev,
                  email: "Only .gov.in and .nic.in email addresses are allowed"
                }));
              } else {
                // Clear error if domain is correct
                setErrors(prev => {
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter password for the new user</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password (min 6 characters)"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className={errors.password ? "border-destructive" : ""}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="role" className="flex items-center gap-2">
            Role
            <span className="text-destructive">*</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select the officer's role</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select
            value={formData.role}
            onValueChange={(value) =>
              setFormData({ ...formData, role: value })
            }
          >
            <SelectTrigger className={errors.role ? "border-destructive" : ""}>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableRoles().map((role) => (
                <SelectItem 
                  key={role.value} 
                  value={role.value}
                >
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
          <Label htmlFor="stateId" className="flex items-center gap-2">
            State/UT
            <span className="text-destructive">*</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {user?.role === "ADMIN" 
                      ? "Select the state/union territory for the user" 
                      : "State will be automatically set to your current state"
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          
          {user?.role === "ADMIN" ? (
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
                  matchingState: states.find(s => s.id === value)
                });
                
                // Temporarily disable validation to allow state selection
                // if (value && (value.includes('q') || value.length < 3 || /\d.*[a-zA-Z]/.test(value))) {
                //   console.error("❌ Invalid state selected:", value);
                //   return;
                // }
                
                setFormData({ ...formData, stateId: value });
              }}
              disabled={loadingStates}
            >
              <SelectTrigger className={errors.stateId ? "border-destructive" : ""}>
                <SelectValue 
                  placeholder={loadingStates ? "Loading states..." : "Select state/UT"}
                >
                  {formData.stateId ? getSelectedStateName() : (loadingStates ? "Loading states..." : "Select state/UT")}
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
          )}
          
          {user?.role === "ADMIN" ? (
            <p className="text-sm text-muted-foreground">
              Select the state where you want to create the user
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Users will be created in your current state: <strong>{user?.state}</strong>
            </p>
          )}
          
          {errors.stateId && (
            <p className="text-sm text-destructive">{errors.stateId}</p>
          )}
        </div>
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
