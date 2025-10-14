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
  formData?: any;
}

const getFileIcon = (fileType: string) => {
  return <FileText className="w-10 h-10 text-red-500" />;
};

export const DocumentsTab = ({ documents, submissionId, formData }: DocumentsTabProps) => {
  const { saveMessage, getMessage } = useSectionMessages(submissionId);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const handleSaveMessage = (message: string) => {
    saveMessage("documents", message);
  };

  // Extract all documents from formData
  const extractAllDocuments = () => {
    const allDocuments: Document[] = [];
    
    if (!formData) return allDocuments;

    // Helper function to add file to documents list
    const addFile = (file: any, section: string, subsection: string) => {
      if (file && file.fileName) {
        allDocuments.push({
          id: file.id || `${section}-${subsection}-${Date.now()}`,
          fileName: file.fileName,
          fileSize: file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Unknown size',
          fileType: file.fileName.split('.').pop()?.toUpperCase() || 'Unknown',
          uploadedBy: 'User',
          uploadedDate: file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Unknown date',
        });
      }
    };

    // Extract from Infra Financing
    if (formData.infraFinancing) {
      // Section 1.2 files
      if (formData.infraFinancing.section1_2?.file) {
        addFile(formData.infraFinancing.section1_2.file, 'Infra Financing', '1.2');
      }
    }

    // Extract from Infra Development
    if (formData.infraDevelopment) {
      // Section 2.1 files
      if (formData.infraDevelopment.section2_1) {
        formData.infraDevelopment.section2_1.forEach((item: any, index: number) => {
          if (item.files) {
            item.files.forEach((file: any) => addFile(file, 'Infra Development', `2.1-${index}`));
          }
        });
      }
      // Section 2.2 files
      if (formData.infraDevelopment.section2_2) {
        formData.infraDevelopment.section2_2.forEach((item: any, index: number) => {
          if (item.files) {
            item.files.forEach((file: any) => addFile(file, 'Infra Development', `2.2-${index}`));
          }
        });
      }
      // Section 2.3 files
      if (formData.infraDevelopment.section2_3) {
        formData.infraDevelopment.section2_3.forEach((item: any, index: number) => {
          if (item.files) {
            item.files.forEach((file: any) => addFile(file, 'Infra Development', `2.3-${index}`));
          }
        });
      }
      // Section 2.4 files
      if (formData.infraDevelopment.section2_4) {
        formData.infraDevelopment.section2_4.forEach((item: any, index: number) => {
          if (item.dprFile) {
            addFile(item.dprFile, 'Infra Development', `2.4-${index}`);
          }
        });
      }
    }

    // Extract from PPP Development
    if (formData.pppDevelopment) {
      // Section 3.1 files
      if (formData.pppDevelopment.section3_1?.file) {
        addFile(formData.pppDevelopment.section3_1.file, 'PPP Development', '3.1');
      }
      // Section 3.2 files
      if (formData.pppDevelopment.section3_2?.file) {
        addFile(formData.pppDevelopment.section3_2.file, 'PPP Development', '3.2');
      }
      // Section 3.3 files
      if (formData.pppDevelopment.section3_3) {
        formData.pppDevelopment.section3_3.forEach((item: any, index: number) => {
          if (item.file) {
            addFile(item.file, 'PPP Development', `3.3-${index}`);
          }
        });
      }
    }

    // Extract from Infra Enablers
    if (formData.infraEnablers) {
      // Section 4.2 files
      if (formData.infraEnablers.section4_2?.file) {
        addFile(formData.infraEnablers.section4_2.file, 'Infra Enablers', '4.2');
      }
      // Section 4.4 files
      if (formData.infraEnablers.section4_4?.file) {
        addFile(formData.infraEnablers.section4_4.file, 'Infra Enablers', '4.4');
      }
    }

    return allDocuments;
  };

  const allDocuments = extractAllDocuments();

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
        {allDocuments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No documents found in this submission</p>
          </div>
        ) : (
          allDocuments.map((doc) => (
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
          ))
        )}
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
