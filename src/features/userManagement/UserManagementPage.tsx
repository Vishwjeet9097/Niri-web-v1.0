/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Search, Filter, Loader2 } from "lucide-react";
import { getRoleDisplayName } from "@/utils/roles";
import { userManagementService, NodalOfficer } from "./services/userManagement.service";
import { UserForm } from "./components/UserForm";
import { UserTable } from "./components/UserTable";
import { EmptyState } from "./components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import ConfirmationModal from "@/components/ConfirmationModal";
import { statesService } from "@/services/states.service";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess"; 
import { useMemo } from "react";

export function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [officers, setOfficers] = useState<NodalOfficer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<NodalOfficer | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<NodalOfficer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [states, setStates] = useState<any[]>([]);
  const [allIndicators, setAllIndicators] = useState<any[]>([]);
const [isIndicatorsLoading, setIsIndicatorsLoading] = useState(false);

 const { refresh } = useIndicatorAccess(); 
  const loadStates = async () => {
    try {
      const statesData = await statesService.getStates();
      setStates(statesData);
    } catch (error) {
      console.error("❌ Error loading states:", error);
    }
  };

  const loadOfficers = useCallback(async () => {
    try {
      setIsLoading(true);
      // Debug logging removed for performance
      
      // Try to load from backend API first
      // ADMIN and MOSPI_APPROVER can see all users, STATE_APPROVER can only see their state users
      let backendUsers;
      if (user?.role === "ADMIN" || user?.role === "MOSPI_APPROVER") {
        // Admin and MOSPI Approver can see all users across all states
    // Debug logging removed for performance

        backendUsers = await apiService.getAllUsers();
      } else {
        // State Approver can only see users from their state
    // Debug logging removed for performance

        backendUsers = await apiService.getUsersByState(user?.state || "");
      }
    // Debug logging removed for performance

      // Transform backend users to NodalOfficer format
      const transformedOfficers: NodalOfficer[] = backendUsers.map((user: any) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        contactNumber: user.contactNumber || "",
        email: user.email,
        role: user.role as "NODAL_OFFICER" | "STATE_APPROVER" | "MOSPI_REVIEWER" | "MOSPI_APPROVER",
        state: user.stateUt || user.state || "",
        stateId: user.stateId || "", // Will be set later when states are loaded
        assignedIndicator: user.assignedIndicator,
        assignedIndicators: user.assignedIndicators || [],
        isActive: user.isActive,
        createdAt: new Date(user.createdAt).getTime(),
      }));
      
      setOfficers(transformedOfficers);
    } catch (error) {
      console.warn("⚠️ Backend API failed, using local storage:", error);
      // Fallback to local storage
      const data = userManagementService.getOfficers(user?.state || "");
      setOfficers(data);
    } finally {
      setIsLoading(false);
    }
  }, [user?.role, user?.state]); // Add dependencies

  // New function to load indicators
const loadIndicators = async () => {
  try {
    setIsIndicatorsLoading(true);
    const indicators = await apiService.getAllIndicators();
    // Expect each indicator object to have a unique `code` (or `id`) and `name`
    setAllIndicators(indicators || []);
  } catch (err) {
    console.error("❌ Error loading indicators:", err);
    setAllIndicators([]);
  } finally {
    setIsIndicatorsLoading(false);
  }
};

useEffect(() => {
  loadIndicators();
}, []);

  useEffect(() => {
    loadOfficers();
    // Load states to ensure cache is available
    loadStates();
  }, [loadOfficers]); // Add loadOfficers dependency back

  const computeAvailableIndicatorsForState = (stateName: string, editingOfficerId?: string) => {
  // Build a set of codes that are already assigned in this state to all users (except editingOfficerId)
  const assignedSet = new Set<string>();

  // Officers array already contains users for the current scope (for Admin it may contain all states)
  officers.forEach((o) => {
    // Only consider assigned indicators of users in the same state
    const officerState = o.state || o.stateId || "";
    if (!stateName || officerState === stateName) {
      // assignedIndicators may be an array of codes
      const assigned = o.assignedIndicators || (o.assignedIndicator ? [o.assignedIndicator] : []);
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

  const handleEditUser = (officer: NodalOfficer) => {
    setEditingOfficer(officer);
    setShowForm(true);
  };

  const handleSaveUser = async (officerData: Omit<NodalOfficer, "id" | "state" | "createdAt" | "assignedIndicator"> & { password?: string; assignedIndicators?: string[] }) => {
   
    
    try {
      if (editingOfficer) {
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
              const state = states.find(s => s.id === officerData.stateId);
              if (state) {
                selectedState = state.name;
    // Debug logging removed for performance

              } else {
                selectedState = officerData.stateId; // Fallback to ID if not found
                console.warn("⚠️ State not found in states array for update:", officerData.stateId);
              }
            } else {
              // This is already a state name, find the ID
              const state = states.find(s => s.name === officerData.stateId);
              if (state) {
                selectedState = state.name;
    // Debug logging removed for performance

              } else {
                selectedState = officerData.stateId; // Fallback
                console.warn("⚠️ State not found in states array for update:", officerData.stateId);
              }
            }
    // Debug logging removed for performance

          } else {
            throw new Error("State selection is required for Admin");
          }
        } else {
          // STATE_APPROVER and MOSPI_APPROVER use their own state
          // For these roles, both stateId and stateUt should be the same (state name)
          selectedState = user?.state || "";
    // Debug logging removed for performance

        }
        
        // ✅ Validate state
        if (!selectedState && officerData.role !== "STATE_APPROVER") {
          throw new Error("State is required but not provided");
        }
 
        
        await apiService.updateUser(editingOfficer.id, {
          firstName: officerData.firstName,
          lastName: officerData.lastName,
          contactNumber: officerData.contactNumber,
          role: officerData.role as "NODAL_OFFICER" | "STATE_APPROVER" | "MOSPI_REVIEWER" | "MOSPI_APPROVER",
          indicatorCodes: officerData.assignedIndicators || [], 
          stateUt: officerData.stateUt
          // Include assigned indicators in update payload with correct key
          // Note: email and stateUt are not included in update payload as they should not be changed
        } as any);
        
        notificationService.success(
          "Officer updated successfully",
          "Update Successful"
        );
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
              const state = states.find(s => s.id === officerData.stateId);
              if (state) {
                selectedStateId = state.id; // Keep original ID
                selectedStateName = state.name; // Get state name
    // Debug logging removed for performance

              } else {
                selectedStateId = officerData.stateId; // Fallback to ID if not found
                selectedStateName = officerData.stateId; // Fallback to ID if not found
                console.warn("⚠️ State not found in states array:", officerData.stateId);
              }
            } else {
              // This is already a state name, find the ID
              const state = states.find(s => s.name === officerData.stateId);
              if (state) {
                selectedStateId = state.id; // Use state ID
                selectedStateName = state.name; // Use state name
    // Debug logging removed for performance

              } else {
                selectedStateId = officerData.stateId; // Fallback
                selectedStateName = officerData.stateId; // Fallback
                console.warn("⚠️ State not found in states array:", officerData.stateId);
              }
            }
            
            console.log("🔍 ADMIN - Using selected state for creation:", {
              originalStateId: officerData.stateId,
              selectedStateId: selectedStateId,
              selectedStateName: selectedStateName,
              stateIdType: typeof officerData.stateId,
              stateIdLength: officerData.stateId.length,
              isNumber: !isNaN(Number(officerData.stateId))
            });
          } else {
            throw new Error("State selection is required for Admin");
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
          throw new Error("State is required but not provided");
        }
    // Debug logging removed for performance

        // ✅ Final validation before API call
        if (!selectedStateId || !selectedStateName) {
          throw new Error("State is required but not provided");
        }
        
        const newUser = await apiService.register(
          officerData.email,
          officerData.password || "password123",
          officerData.firstName,
          officerData.lastName,
          officerData.contactNumber,
          officerData.role,
          officerData.stateUt,
         // selectedStateName, // State NAME (e.g., "Bihar", "Delhi") - only stateUt needed
          selectedStateId, // State ID for reference
          officerData.assignedIndicators // Pass indicators directly in register call
        );
    // Debug logging removed for performance

        // Note: Indicators are now included in the register call, no separate API call needed
        if (officerData.role === "NODAL_OFFICER" && officerData.assignedIndicators && officerData.assignedIndicators.length > 0) {
    // Debug logging removed for performance

        }
        
        notificationService.success(
          "Officer added successfully",
          "Registration Successful"
        );
      }
      await loadOfficers();
      setShowForm(false);
      setEditingOfficer(null);

       // >>> REFRESH: force indicator hook to re-fetch so approver UI sees updated availableIndicators
      try {
        console.log("🔁 Triggering indicator refresh after save user");
        await refresh?.({ clearCache: true });
      } catch (err) {
        console.warn("⚠️ Indicator refresh failed after save user:", err);
      }
      // <<< REFRESH
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
          errorMessage = "A user with this email address already exists. Please use a different email.";
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

  const handleDeleteUser = async (id: string) => {
    const officer = officers.find(o => o.id === id);
    if (officer) {
      setUserToDelete(officer);
      setDeleteModalOpen(true);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete user via backend API
      await apiService.deactivateUser(userToDelete.id);
      notificationService.success(
        `${userToDelete.firstName} ${userToDelete.lastName} deactivated successfully`,
        "Deactivation Successful"
      );
      
      // Refresh data
      await loadOfficers();
       // >>> REFRESH: refresh available indicators for approver
      try {
        console.log("🔁 Triggering indicator refresh after delete user");
        await refresh?.({ clearCache: true });
      } catch (err) {
        console.warn("⚠️ Indicator refresh failed after delete user:", err);
      }
      // <<< REFRESH
      // Close modal
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      notificationService.error(
        "Failed to delete officer. Please try again.",
        "Delete Failed"
      );
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
  const [sortField, setSortField] = useState<"firstName" | "role" | "state" | "email">("firstName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // ✅ getStateNameById function removed - using stateId directly as state name

  // Filter and sort officers
  const filteredOfficers = officers
    .filter(officer => {
      const matchesSearch = searchTerm === "" || 
        officer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      // If current user is STATE_APPROVER, "All" should behave as NODAL_OFFICER only
      const isStateApprover = user?.role === "STATE_APPROVER";
      const effectiveRoleFilter = isStateApprover && roleFilter === "all" ? "NODAL_OFFICER" : roleFilter;
      const matchesRole = effectiveRoleFilter === "all" || officer.role === effectiveRoleFilter;
      
      
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
      createdAt: Date.now()
    });
    setDeleteModalOpen(true);
  };
  const confirmDeleteAll = async () => {
    setIsDeleting(true);
    try {
      // Delete selected users
      const selectedIdsArray = Array.from(selectedIds);
      const result = await apiService.deactivateUsers(selectedIdsArray);
      
      notificationService.success(
        `${result.deactivatedCount || selectedIdsArray.length} users deactivated successfully`,
        "Bulk Deactivation Successful"
      );
      
      // Clear selection and refresh data
      setSelectedIds(new Set());
      await loadOfficers();
      
      // Close modal
      setDeleteModalOpen(false);
      setUserToDelete(null);
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
      await loadOfficers();
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
 if (showForm) {
  // Debug logging removed for performance

  // Determine stateName to pass if needed (UserForm computes availability itself)
  return (
    <div className="p-6 space-y-6">
      <UserForm
        officer={editingOfficer}
        onSave={handleSaveUser}
        onCancel={handleCancel}
        allIndicators={allIndicators}
        officers={officers}
        loadingIndicators={isIndicatorsLoading}
      />
    </div>
  );
}


  if (officers.length === 0) {
    // Debug logging removed for performance

    return (
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">
              Add or remove Nodal Officers for your State/UT and assign them specific indicators for data submission
            </p>
          </div>
        </div>
        <EmptyState onAddClick={handleAddUser} />
      </div>
    );
  }
    // Debug logging removed for performance

  // Access control - Only STATE_APPROVER, MOSPI_APPROVER, and ADMIN can access user management
  if (user?.role !== "STATE_APPROVER" && user?.role !== "MOSPI_APPROVER" && user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Users</h2>
          <p className="text-gray-600">
            Please wait while we fetch the user data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#ddd] p-6 mb-6 space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Enter officer details</h1>
            <p className="text-[#000]">
              Add or remove Nodal Officers for your State/UT and assign them specific indicators for data submission.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleDeleteAll}
            disabled={isDeleting || (selectedIds.size === 0 && officers.length === 0)}
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
            placeholder="Search by name or email..."
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
          <Select value={roleFilter}           onValueChange={(value) => {
            setRoleFilter(value);
            setCurrentPage(1); // Reset to first page when filtering
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="NODAL_OFFICER">{getRoleDisplayName("NODAL_OFFICER")}</SelectItem>
              {user?.role !== "STATE_APPROVER" && (
                <>
                  <SelectItem value="STATE_APPROVER">{getRoleDisplayName("STATE_APPROVER")}</SelectItem>
                  <SelectItem value="MOSPI_REVIEWER">{getRoleDisplayName("MOSPI_REVIEWER")}</SelectItem>
                  <SelectItem value="MOSPI_APPROVER">{getRoleDisplayName("MOSPI_APPROVER")}</SelectItem>
                  <SelectItem value="ADMIN">{getRoleDisplayName("ADMIN")}</SelectItem>
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
        Showing {startIndex + 1}-{Math.min(endIndex, filteredOfficers.length)} of {filteredOfficers.length} users
        {filteredOfficers.length !== officers.length && (
          <span className="ml-2 text-primary">
            (filtered from {officers.length} total)
          </span>
        )}
      </div>

      <UserTable
        officers={paginatedOfficers}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onAssignIndicator={handleAssignIndicator}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
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
        }}
        onConfirm={userToDelete?.id === "bulk" ? confirmDeleteAll : confirmDeleteUser}
        title={userToDelete?.id === "bulk" ? "Delete Selected Users" : "Delete Officer"}
        description={
          userToDelete?.id === "bulk"
            ? `Are you sure you want to delete ${userToDelete?.firstName}? This action cannot be undone.`
            : `Are you sure you want to delete ${userToDelete?.firstName} ${userToDelete?.lastName}? This action cannot be undone.`
        }
        confirmText={userToDelete?.id === "bulk" ? "Delete Selected" : "Delete Officer"}
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeleting}
      >
        {userToDelete?.id === "bulk" && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Warning:</strong> This will permanently delete the selected users. 
              They will no longer be able to access the system.
            </p>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}
