import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, Minus, MessageSquare } from "lucide-react";
import { useState } from "react";
import { MessageModal } from "../modals/MessageModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";

interface ChecklistItem {
  id: string;
  title: string;
  category: string;
  status: "pending" | "compliant" | "non-compliant" | "na";
}

interface ChecklistTabProps {
  checklist: ChecklistItem[];
  submissionId: string;
}

const defaultChecklist: ChecklistItem[] = [
  { id: "CHK001", title: "All required documents submitted", category: "Documentation", status: "pending" },
  { id: "CHK002", title: "Data meets ministry guidelines", category: "Compliance", status: "pending" },
  { id: "CHK003", title: "Financial figures verified", category: "Accuracy", status: "pending" },
  { id: "CHK004", title: "All form sections completed", category: "Completeness", status: "pending" },
];

export const ChecklistTab = ({ checklist, submissionId }: ChecklistTabProps) => {
  const items = checklist.length > 0 ? checklist : defaultChecklist;
  const { saveMessage, getMessage } = useSectionMessages(submissionId);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const handleSaveMessage = (message: string) => {
    saveMessage("checklist", message);
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Review Checklist</CardTitle>
              <CardDescription>
                Complete all mandatory checks before final approval
              </CardDescription>
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
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.category}</p>
              </div>
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                Pending
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Check className="w-4 h-4" />
                Compliant
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <AlertCircle className="w-4 h-4" />
                Non-Compliant
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Minus className="w-4 h-4" />
                N/A
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

      <MessageModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        onSave={handleSaveMessage}
        sectionTitle="Checklist"
        existingMessage={getMessage("checklist")}
      />
    </>
  );
};
