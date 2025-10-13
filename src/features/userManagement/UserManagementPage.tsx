import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Search, Filter } from "lucide-react";
import { userManagementService, NodalOfficer } from "./services/userManagement.service";
import { UserForm } from "./components/UserForm";
import { UserTable } from "./components/UserTable";
import { EmptyState } from "./components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import ConfirmationModal from "@/components/ConfirmationModal";

export function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [officers, setOfficers] = useState<NodalOfficer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<NodalOfficer | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<NodalOfficer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadOfficers();
  }, []);

  const loadOfficers = async () => {
    try {
      // Try to load from backend API first
      const backendUsers = await apiService.getUsersByState(user?.state || "");
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
  };

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
        await apiService.updateUser(editingOfficer.id, {
          firstName: officerData.firstName,
          lastName: officerData.lastName,
          email: officerData.email,
          contactNumber: officerData.contactNumber,
          role: officerData.role as "NODAL_OFFICER" | "STATE_APPROVER" | "MOSPI_REVIEWER" | "MOSPI_APPROVER",
        } as any);
        
        notificationService.success(
          "Officer updated successfully",
          "Update Successful"
        );
      } else {
        // Create new user via backend API
        console.log("🔍 Creating user with data:", {
          email: officerData.email,
          password: officerData.password,
          firstName: officerData.firstName,
          lastName: officerData.lastName,
          contactNumber: officerData.contactNumber,
          role: officerData.role,
          stateUt: user?.state || "",
          stateId: officerData.stateId
        });
        
        const newUser = await apiService.register(
          officerData.email,
          officerData.password || "password123",
          officerData.firstName,
          officerData.lastName,
          officerData.contactNumber,
          officerData.role,
          user?.state || "",
          officerData.stateId
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

  // Filter officers based on search term and role
  const filteredOfficers = officers.filter(officer => {
    const matchesSearch = searchTerm === "" || 
      officer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || officer.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="NODAL_OFFICER">Nodal Officer</SelectItem>
              <SelectItem value="STATE_APPROVER">State Approver</SelectItem>
              <SelectItem value="MOSPI_REVIEWER">MoSPI Reviewer</SelectItem>
              <SelectItem value="MOSPI_APPROVER">MoSPI Approver</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
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
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredOfficers.length} of {officers.length} users
        {(searchTerm || roleFilter !== "all") && (
          <span className="ml-2 text-primary">
            (filtered)
          </span>
        )}
      </div>

      <UserTable
        officers={filteredOfficers}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onAssignIndicator={handleAssignIndicator}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

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
