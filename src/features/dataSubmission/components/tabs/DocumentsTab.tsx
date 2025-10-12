import { Eye, Download, MoreVertical, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { MessageModal } from "../modals/MessageModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";

interface Document {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedBy: string;
  uploadedDate: string;
}

interface DocumentsTabProps {
  documents: Document[];
  submissionId: string;
}

const getFileIcon = (fileType: string) => {
  return <FileText className="w-10 h-10 text-red-500" />;
};

export const DocumentsTab = ({ documents, submissionId }: DocumentsTabProps) => {
  const { saveMessage, getMessage } = useSectionMessages(submissionId);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const handleSaveMessage = (message: string) => {
    saveMessage("documents", message);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document Review</CardTitle>
              <CardDescription>
                Data related to infrastructure financing and budget allocation
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
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              {getFileIcon(doc.fileType)}
              <div>
                <h4 className="font-semibold text-foreground">{doc.fileName}</h4>
                <p className="text-sm text-muted-foreground">
                  {doc.fileSize} | Uploaded by {doc.uploadedBy} on {doc.uploadedDate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="w-4 h-4" />
                View
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Delete</DropdownMenuItem>
                  <DropdownMenuItem>Share</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

      <MessageModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        onSave={handleSaveMessage}
        sectionTitle="Documents"
        existingMessage={getMessage("documents")}
      />
    </>
  );
};
