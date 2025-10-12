import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (message: string) => void;
  sectionTitle: string;
  existingMessage?: string;
}

export const MessageModal = ({
  isOpen,
  onClose,
  onSave,
  sectionTitle,
  existingMessage = "",
}: MessageModalProps) => {
  const [message, setMessage] = useState(existingMessage);

  useEffect(() => {
    setMessage(existingMessage);
  }, [existingMessage, isOpen]);

  const handleSave = () => {
    onSave(message);
    onClose();
  };

  const handleCancel = () => {
    setMessage(existingMessage);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Comment</DialogTitle>
          <DialogDescription>
            Add or edit your comment for: {sectionTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Comment</Label>
            <Textarea
              id="message"
              placeholder="Enter your comment here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Comment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
