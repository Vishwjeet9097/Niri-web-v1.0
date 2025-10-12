import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Send, CheckCircle, XCircle } from "lucide-react";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning" | "success";
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
  children,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          icon: <Trash2 className="h-6 w-6 text-red-600" />,
          buttonClass: "bg-red-600 hover:bg-red-700 text-white",
          alertClass: "bg-red-50 border-red-200",
          alertTextClass: "text-red-900",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
          buttonClass: "bg-orange-600 hover:bg-orange-700 text-white",
          alertClass: "bg-orange-50 border-orange-200",
          alertTextClass: "text-orange-900",
        };
      case "success":
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          buttonClass: "bg-green-600 hover:bg-green-700 text-white",
          alertClass: "bg-green-50 border-green-200",
          alertTextClass: "text-green-900",
        };
      default:
        return {
          icon: <Send className="h-6 w-6 text-blue-600" />,
          buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
          alertClass: "bg-blue-50 border-blue-200",
          alertTextClass: "text-blue-900",
        };
    }
  };

  const styles = getVariantStyles();

  const getAlertMessage = () => {
    switch (variant) {
      case "destructive":
        return "This action cannot be undone. This will permanently delete the item and remove it from our servers.";
      case "warning":
        return "Please review your action carefully. This may have significant consequences.";
      case "success":
        return "This action will complete the process successfully.";
      default:
        return "Please confirm that you want to proceed with this action.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {styles.icon}
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>

        <Alert className={styles.alertClass}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className={styles.alertTextClass}>
            <strong>Warning:</strong> {getAlertMessage()}
          </AlertDescription>
        </Alert>

        {children && (
          <div className="py-4">
            {children}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto ${styles.buttonClass}`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
