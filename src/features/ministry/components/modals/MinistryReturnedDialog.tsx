import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface MinistryReturnedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string;
}

export const MinistryReturnedDialog = ({
  isOpen,
  onClose,
  sectionTitle,
}: MinistryReturnedDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Indicator Returned</DialogTitle>
          <DialogDescription>
            This indicator has been returned from MOSPI Approver for corrections.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
            <p className="text-sm text-orange-800">
              <strong>Section:</strong> {sectionTitle}
            </p>
            <p className="text-sm text-orange-700 mt-2">
              Please review the feedback and make necessary corrections before resubmitting.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
          <Button
            variant="outline"
            disabled
            className="w-full bg-orange-100 text-orange-800 border-orange-200 cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Returned Back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

