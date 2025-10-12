import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { MessageModal } from "../modals/MessageModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";

interface HistoryEntry {
  id: string;
  userName: string;
  userRole: string;
  location: string;
  action: string;
  timestamp: string;
}

interface HistoryTabProps {
  history: HistoryEntry[];
  submissionId: string;
}

export const HistoryTab = ({ history, submissionId }: HistoryTabProps) => {
  const { saveMessage, getMessage } = useSectionMessages(submissionId);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const handleSaveMessage = (message: string) => {
    saveMessage("history", message);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submission History</CardTitle>
              <CardDescription>Complete audit trail of all activities</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setMessageModalOpen(true)}
            >
              <MessageSquare className="w-4 h-4" />
              Add Comment
            </Button>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        {history.map((entry) => (
          <div key={entry.id} className="flex gap-4 p-4 border rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-foreground">{entry.userName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {entry.userRole} • {entry.location}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(entry.timestamp), "dd-MM-yyyy | hh:mm a")}
                </p>
              </div>
              <p className="text-sm text-foreground">{entry.action}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

      <MessageModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        onSave={handleSaveMessage}
        sectionTitle="History"
        existingMessage={getMessage("history")}
      />
    </>
  );
};
