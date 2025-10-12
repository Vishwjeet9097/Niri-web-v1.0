import { useState, useEffect } from "react";
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
import { InfoIcon } from "lucide-react";
import { NodalOfficer } from "../services/userManagement.service";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/AuthProvider";

interface UserFormProps {
  officer: NodalOfficer | null;
  onSave: (data: Omit<NodalOfficer, "id" | "state" | "createdAt" | "assignedIndicator"> & { password?: string }) => void;
  onCancel: () => void;
}

export function UserForm({ officer, onSave, onCancel }: UserFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    password: "",
    role: "NODAL_OFFICER",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (officer) {
      setFormData({
        firstName: officer.firstName,
        lastName: officer.lastName,
        contactNumber: officer.contactNumber,
        email: officer.email,
        password: "", // Don't show password for existing users
        role: officer.role,
      });
    }
  }, [officer]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get available roles based on current user's role
  const getAvailableRoles = () => {
    const currentUserRole = user?.role;
    
    switch (currentUserRole) {
      case "STATE_APPROVER":
        return [
          { value: "NODAL_OFFICER", label: "Nodal Officer" },
          { value: "STATE_APPROVER", label: "State Approver" },
          { value: "MOSPI_REVIEWER", label: "MoSPI Reviewer" },
          { value: "MOSPI_APPROVER", label: "MoSPI Approver" },
        ];
      case "ADMIN":
        return [
          { value: "NODAL_OFFICER", label: "Nodal Officer" },
          { value: "STATE_APPROVER", label: "State Approver" },
          { value: "MOSPI_REVIEWER", label: "MoSPI Reviewer" },
          { value: "MOSPI_APPROVER", label: "MoSPI Approver" },
          { value: "ADMIN", label: "Admin" },
        ];
      case "MOSPI_REVIEWER":
        return [
          { value: "NODAL_OFFICER", label: "Nodal Officer" },
          { value: "STATE_APPROVER", label: "State Approver" },
          { value: "MOSPI_REVIEWER", label: "MoSPI Reviewer" },
          { value: "MOSPI_APPROVER", label: "MoSPI Approver" },
        ];
      case "MOSPI_APPROVER":
        return [
          { value: "NODAL_OFFICER", label: "Nodal Officer" },
          { value: "STATE_APPROVER", label: "State Approver" },
          { value: "MOSPI_REVIEWER", label: "MoSPI Reviewer" },
          { value: "MOSPI_APPROVER", label: "MoSPI Approver" },
        ];
      default:
        return [
          { value: "NODAL_OFFICER", label: "Nodal Officer" },
          { value: "STATE_APPROVER", label: "State Approver" },
          { value: "MOSPI_REVIEWER", label: "MoSPI Reviewer" },
          { value: "MOSPI_APPROVER", label: "MoSPI Approver" },
        ];
    }
  };

  const handleSubmit = () => {
    if (validate()) {
      console.log("🔍 Form data being submitted:", formData);
      onSave(formData);
    }
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
                  <p>Enter official email address</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="e.g. example@email.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
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

        <div className="space-y-2 col-span-2">
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
