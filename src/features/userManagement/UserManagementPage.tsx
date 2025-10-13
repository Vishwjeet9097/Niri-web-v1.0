import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Search, Filter } from "lucide-react";
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

export function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [officers, setOfficers] = useState<NodalOfficer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<NodalOfficer | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<NodalOfficer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadStates = async () => {
    try {
      console.log("🔍 Loading states for state resolution...");
      await statesService.getStates();
      console.log("🔍 States loaded successfully");
    } catch (error) {
      console.error("❌ Error loading states:", error);
    }
  };

  const loadOfficers = useCallback(async () => {
    try {
      console.log("🔍 Loading officers for user:", { role: user?.role, state: user?.state });
      
      // Try to load from backend API first
      // ADMIN and MOSPI_APPROVER can see all users, STATE_APPROVER can only see their state users
      let backendUsers;
      if (user?.role === "ADMIN" || user?.role === "MOSPI_APPROVER") {
        // Admin and MOSPI Approver can see all users across all states
        console.log(`🔍 ${user?.role} - Loading all users`);
        backendUsers = await apiService.getAllUsers();
      } else {
        // State Approver can only see users from their state
        console.log("🔍 STATE_APPROVER - Loading users for state:", user?.state);
        backendUsers = await apiService.getUsersByState(user?.state || "");
      }
      console.log("🔍 Backend Users:", backendUsers);
      
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
        isActive: user.isActive,
        createdAt: new Date(user.createdAt).getTime(),
      }));
      
      setOfficers(transformedOfficers);
    } catch (error) {
      console.warn("⚠️ Backend API failed, using local storage:", error);
      // Fallback to local storage
      const data = userManagementService.getOfficers(user?.state || "");
      setOfficers(data);
    }
  }, [user?.role, user?.state]); // Add dependencies

  useEffect(() => {
    loadOfficers();
    // Load states to ensure cache is available
    loadStates();
  }, [loadOfficers]); // Add loadOfficers dependency back

  const handleAddUser = () => {
    setEditingOfficer(null);
    setShowForm(true);
  };

  const handleEditUser = (officer: NodalOfficer) => {
    setEditingOfficer(officer);
    setShowForm(true);
  };

  const handleSaveUser = async (officerData: Omit<NodalOfficer, "id" | "state" | "createdAt" | "assignedIndicator"> & { password?: string }) => {
    try {
      if (editingOfficer) {
        // Update existing user via backend API
        let selectedState = "";
        
        if (user?.role === "ADMIN") {
          // Admin can select any state - use stateId directly as it's the state name
          if (officerData.stateId) {
            selectedState = officerData.stateId; // stateId is already the state name
            console.log("🔍 ADMIN - Using selected state for update:", {
              stateId: officerData.stateId,
              stateName: selectedState
            });
          } else {
            throw new Error("State selection is required for Admin");
          }
        } else {
          // STATE_APPROVER and MOSPI_APPROVER use their own state
          selectedState = user?.state || "";
          console.log("🔍 Using current user state for update:", {
            userRole: user?.role,
            userState: user?.state,
            selectedState: selectedState
          });
        }
        
        // ✅ Validate state
        if (!selectedState) {
          throw new Error("State is required but not provided");
        }
        
        await apiService.updateUser(editingOfficer.id, {
          firstName: officerData.firstName,
          lastName: officerData.lastName,
          email: officerData.email,
          contactNumber: officerData.contactNumber,
          role: officerData.role as "NODAL_OFFICER" | "STATE_APPROVER" | "MOSPI_REVIEWER" | "MOSPI_APPROVER",
          stateUt: selectedState, // State NAME (e.g., "Bihar", "Delhi")
          stateId: selectedState  // State NAME (e.g., "Bihar", "Delhi") - same as stateUt
        } as any);
        
        notificationService.success(
          "Officer updated successfully",
          "Update Successful"
        );
      } else {
        // Create new user via backend API
        console.log("🔍 Debug State Selection:", {
          currentUserRole: user?.role,
          currentUserState: user?.state,
          selectedStateId: officerData.stateId,
          stateIdType: typeof officerData.stateId,
          officerData: officerData
        });
        
        let selectedState = "";
        
        if (user?.role === "ADMIN") {
          // Admin can select any state - use stateId directly as it's the state name
          if (officerData.stateId) {
            selectedState = officerData.stateId; // stateId is already the state name
            console.log("🔍 ADMIN - Using selected state for creation:", {
              stateId: officerData.stateId,
              stateName: selectedState
            });
          } else {
            throw new Error("State selection is required for Admin");
          }
        } else {
          // STATE_APPROVER and MOSPI_APPROVER use their own state
          selectedState = user?.state || "";
          console.log("🔍 Using current user state for both roles:", {
            userRole: user?.role,
            userState: user?.state,
            selectedState: selectedState
          });
        }
        
        // ✅ Validate state
        if (!selectedState) {
          throw new Error("State is required but not provided");
        }
          
        console.log("🔍 State Resolution Result:", {
          selectedState,
          stateId: officerData.stateId
        });
          
        // ✅ Final validation before API call
        if (!selectedState || selectedState.trim() === "") {
          throw new Error("State name is required but not provided");
        }
        
        console.log("🔍 Creating user with data:", {
          email: officerData.email,
          password: officerData.password,
          firstName: officerData.firstName,
          lastName: officerData.lastName,
          contactNumber: officerData.contactNumber,
          role: officerData.role,
          stateUt: selectedState, // State NAME (e.g., "Bihar", "Delhi")
          stateId: selectedState, // State NAME (e.g., "Bihar", "Delhi") - same as stateUt
          currentUserRole: user?.role,
          selectedState: selectedState
        });
        
        const newUser = await apiService.register(
          officerData.email,
          officerData.password || "password123",
          officerData.firstName,
          officerData.lastName,
          officerData.contactNumber,
          officerData.role,
          selectedState, // State NAME (e.g., "Bihar", "Delhi")
          selectedState  // State NAME (e.g., "Bihar", "Delhi") - same as stateUt
        );
        console.log("🔍 New User Created:", newUser);
        
        notificationService.success(
          "Officer added successfully",
          "Registration Successful"
        );
      }
      await loadOfficers();
      setShowForm(false);
      setEditingOfficer(null);
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
      
      const matchesRole = roleFilter === "all" || officer.role === roleFilter;
      
      
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

  console.log("🔍 UserManagementPage Render State:", {
    showForm,
    officersCount: officers.length,
    userRole: user?.role,
    editingOfficer: editingOfficer?.id
  });

  if (showForm) {
    console.log("🔍 Rendering UserForm");
    return (
      <div className="p-6 space-y-6">
        <UserForm
          officer={editingOfficer}
          onSave={handleSaveUser}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  if (officers.length === 0) {
    console.log("🔍 Rendering EmptyState - No officers found");
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

  console.log("🔍 Rendering UserTable with officers:", officers.length);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Enter officer details</h1>
            <p className="text-muted-foreground">
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
              <SelectItem value="STATE_APPROVER">{getRoleDisplayName("STATE_APPROVER")}</SelectItem>
              <SelectItem value="MOSPI_REVIEWER">{getRoleDisplayName("MOSPI_REVIEWER")}</SelectItem>
              <SelectItem value="MOSPI_APPROVER">{getRoleDisplayName("MOSPI_APPROVER")}</SelectItem>
              <SelectItem value="ADMIN">{getRoleDisplayName("ADMIN")}</SelectItem>
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
