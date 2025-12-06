/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { getRoleDisplayName } from "@/utils/roles";
import ConfirmationModal from "@/components/ConfirmationModal";

interface CleanupButtonsProps {
  userRole?: string;
  onRefresh?: () => Promise<void>;
  isDeleting?: boolean;
}

export function CleanupButtons({
  userRole,
  onRefresh,
  isDeleting = false,
}: CleanupButtonsProps) {
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [deleteUsersModalOpen, setDeleteUsersModalOpen] = useState(false);
  const [selectedRoleToDelete, setSelectedRoleToDelete] = useState<string>("");
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);

  const handleCleanupTestData = async () => {
    setIsCleaningUp(true);
    try {
      const result = await apiService.cleanupTestData();
      
      console.log("🔍 Cleanup result:", result);

      // Safely access deleted property with fallback
      const deleted = result?.deleted || {};
      const submissions = deleted.submissions || 0;
      const finalScores = deleted.finalScores || 0;
      const userIndicatorScopes = deleted.userIndicatorScopes || 0;
      const auditLogs = deleted.auditLogs || 0;

      notificationService.success(
        `Test data cleanup completed successfully. Deleted: ${submissions} submissions, ${finalScores} final scores, ${userIndicatorScopes} indicator assignments, ${auditLogs} audit logs.`,
        "Cleanup Successful"
      );

      // Refresh the officers list to reflect any changes
      if (onRefresh) {
        await onRefresh();
      }

      // Close modal
      setCleanupModalOpen(false);
    } catch (error: any) {
      console.error("❌ Error cleaning up test data:", error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to cleanup test data. Please try again.";
      notificationService.error(errorMessage, "Cleanup Failed");
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleDeleteUsersByRole = async () => {
    if (!selectedRoleToDelete) {
      notificationService.warning(
        "Please select a role to delete",
        "No Role Selected"
      );
      return;
    }

    setIsDeletingUsers(true);
    try {
      const result = await apiService.deleteUsersByRole(selectedRoleToDelete);

      notificationService.success(
        `Successfully deleted ${
          result.deletedCount || 0
        } users with role ${getRoleDisplayName(selectedRoleToDelete)}.`,
        "Users Deleted Successfully"
      );

      // Refresh the officers list to reflect changes
      if (onRefresh) {
        await onRefresh();
      }

      // Reset and close modal
      setSelectedRoleToDelete("");
      setDeleteUsersModalOpen(false);
    } catch (error: any) {
      console.error("❌ Error deleting users by role:", error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to delete users. Please try again.";
      notificationService.error(errorMessage, "Delete Failed");
    } finally {
      setIsDeletingUsers(false);
    }
  };

  // Don't render anything if user doesn't have permission (ADMIN only)
  if (userRole !== "ADMIN") {
    return null;
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setDeleteUsersModalOpen(true)}
        disabled={isDeleting || isCleaningUp || isDeletingUsers}
        className="bg-red-600 hover:bg-red-700"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Users by Role
      </Button>
      <Button
        variant="destructive"
        onClick={() => setCleanupModalOpen(true)}
        disabled={isDeleting || isCleaningUp || isDeletingUsers}
        className="bg-red-600 hover:bg-red-700"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Cleanup Test Data
      </Button>

      {/* Confirmation Modal for Test Data Cleanup */}
      <ConfirmationModal
        open={cleanupModalOpen}
        onClose={() => setCleanupModalOpen(false)}
        onConfirm={handleCleanupTestData}
        title="Cleanup Test Data"
        description="This will permanently delete all test submissions and indicator assignments. This action cannot be undone."
        confirmText="Cleanup Test Data"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isCleaningUp}
      >
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 mb-3">
            <strong>WARNING:</strong> This is a destructive operation that will
            delete:
          </p>
          <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
            <li>
              All submissions made by NODAL_OFFICER, STATE_APPROVER, and
              MOSPI_REVIEWER users
            </li>
            <li>All FinalScore records related to those submissions</li>
            <li>All UserIndicatorScope records for NODAL_OFFICER users</li>
          </ul>
          <p className="text-sm text-red-800 mt-3">
            <strong>
              This action is for testing purposes only and cannot be undone!
            </strong>
          </p>
        </div>
      </ConfirmationModal>

      {/* Confirmation Modal for Delete Users by Role */}
      <ConfirmationModal
        open={deleteUsersModalOpen}
        onClose={() => {
          setDeleteUsersModalOpen(false);
          setSelectedRoleToDelete("");
        }}
        onConfirm={handleDeleteUsersByRole}
        title="Delete Users by Role"
        description="This will permanently delete all users with the selected role. This action cannot be undone."
        confirmText="Delete Users"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeletingUsers}
      >
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
          <p className="text-sm text-red-800">
            <strong>WARNING:</strong> This is a destructive operation that will
            permanently delete all users with the selected role.
          </p>
          <div>
            <label className="text-sm font-medium text-red-900 mb-2 block">
              Select Role to Delete:
            </label>
            <Select
              value={selectedRoleToDelete}
              onValueChange={setSelectedRoleToDelete}
              disabled={isDeletingUsers}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
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
              </SelectContent>
            </Select>
          </div>
          {selectedRoleToDelete && (
            <p className="text-sm text-red-800 mt-2">
              <strong>Selected:</strong>{" "}
              {getRoleDisplayName(selectedRoleToDelete)}
            </p>
          )}
          <p className="text-sm text-red-800 mt-3">
            <strong>
              This action is for testing purposes only and cannot be undone!
            </strong>
          </p>
        </div>
      </ConfirmationModal>
    </>
  );
}

