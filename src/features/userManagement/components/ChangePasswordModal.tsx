import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NodalOfficer } from "../services/userManagement.service";
import { getRoleDisplayName } from "@/utils/roles";
import { KeyRound, Eye, EyeOff } from "lucide-react";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  officer: NodalOfficer | null;
  onSubmit: (userId: string, newPassword: string) => Promise<void>;
}

export function ChangePasswordModal({
  open,
  onClose,
  officer,
  onSubmit,
}: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setNewPassword("");
    setShowPassword(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officer?.id) return;

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(officer.id, newPassword);
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!officer) return null;

  const officerName = `${officer.firstName || ""} ${officer.lastName || ""}`.trim();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Reset the password for this user. They will need to use the new password to sign in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Officer Name</span>
              <p className="text-sm font-medium">{officerName || "-"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Role</span>
              <p className="text-sm font-medium">{getRoleDisplayName(officer.role)}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <p className="text-sm font-medium">{officer.email || "-"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                disabled={isSubmitting}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none disabled:opacity-50"
                disabled={isSubmitting}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Updating...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
