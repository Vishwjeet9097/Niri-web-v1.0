import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Building, MapPin, Calendar, FileText, MessageSquare } from "lucide-react";
import { MessageModal } from "../modals/MessageModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { getRoleDisplayName } from "@/utils/roles";

interface OverviewTabProps {
  submission: any;
}

export const OverviewTab = ({ submission }: OverviewTabProps) => {
  const { saveMessage, getMessage } = useSectionMessages(submission.id);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const handleSaveMessage = (message: string) => {
    saveMessage("overview", message);
  };

  // Count total documents from formData
  const countTotalDocuments = () => {
    let count = 0;
    
    if (!submission.formData) return count;

    // Helper function to count files
    const countFiles = (file: any) => {
      if (file && file.fileName) count++;
    };

    const countFileArray = (files: any[]) => {
      if (files && Array.isArray(files)) {
        files.forEach(file => countFiles(file));
      }
    };

    // Count from Infra Financing
    if (submission.formData.infraFinancing?.section1_2?.file) {
      countFiles(submission.formData.infraFinancing.section1_2.file);
    }

    // Count from Infra Development
    if (submission.formData.infraDevelopment) {
      // Section 2.1 files
      if (submission.formData.infraDevelopment.section2_1) {
        submission.formData.infraDevelopment.section2_1.forEach((item: any) => {
          if (item.files) countFileArray(item.files);
        });
      }
      // Section 2.2 files
      if (submission.formData.infraDevelopment.section2_2) {
        submission.formData.infraDevelopment.section2_2.forEach((item: any) => {
          if (item.files) countFileArray(item.files);
        });
      }
      // Section 2.3 files
      if (submission.formData.infraDevelopment.section2_3) {
        submission.formData.infraDevelopment.section2_3.forEach((item: any) => {
          if (item.files) countFileArray(item.files);
        });
      }
      // Section 2.4 files
      if (submission.formData.infraDevelopment.section2_4) {
        submission.formData.infraDevelopment.section2_4.forEach((item: any) => {
          if (item.dprFile) countFiles(item.dprFile);
        });
      }
    }

    // Count from PPP Development
    if (submission.formData.pppDevelopment) {
      if (submission.formData.pppDevelopment.section3_1?.file) {
        countFiles(submission.formData.pppDevelopment.section3_1.file);
      }
      if (submission.formData.pppDevelopment.section3_2?.file) {
        countFiles(submission.formData.pppDevelopment.section3_2.file);
      }
      if (submission.formData.pppDevelopment.section3_3) {
        submission.formData.pppDevelopment.section3_3.forEach((item: any) => {
          if (item.file) countFiles(item.file);
        });
      }
    }

    // Count from Infra Enablers
    if (submission.formData.infraEnablers) {
      if (submission.formData.infraEnablers.section4_2?.file) {
        countFiles(submission.formData.infraEnablers.section4_2.file);
      }
      if (submission.formData.infraEnablers.section4_4?.file) {
        countFiles(submission.formData.infraEnablers.section4_4.file);
      }
    }

    return count;
  };

  const totalDocuments = countTotalDocuments();

  // Count review comments
  const countReviewComments = () => {
    if (!submission.reviewComments || !Array.isArray(submission.reviewComments)) {
      return 0;
    }
    return submission.reviewComments.length;
  };

  const reviewCommentsCount = countReviewComments();

  return (
    <div className="space-y-6">
      {/* Three Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Nodal Officer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Nodal Officer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{submission.nodalOfficer?.name || submission.user?.firstName + " " + submission.user?.lastName || "Unknown User"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium">{getRoleDisplayName(submission.nodalOfficer?.role || submission.user?.role) || "Nodal Officer"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-sm">{submission.nodalOfficer?.email || submission.user?.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{submission.nodalOfficer?.phone || submission.user?.contactNumber || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submission Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Submission Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{submission.submissionInfo?.category || submission.category || "Infrastructure"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{submission.submissionInfo?.budgetAllocation || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{submission.submissionInfo?.location || submission.stateUt || "Unknown"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Submitted On</p>
                <p className="font-medium">{submission.submissionInfo?.submittedOn || new Date(submission.createdAt || submission.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Value</p>
              <p className="text-2xl font-bold text-foreground">
                {submission.performanceMetrics?.estimatedValue || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Impact Score</p>
              <p className="text-2xl font-bold text-foreground">
                {submission.performanceMetrics?.impactScore || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Compliance Score</p>
              <p className="text-2xl font-bold text-foreground">
                {submission.performanceMetrics?.complianceScore || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {submission.performanceMetrics?.completionRate || 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {totalDocuments}
            </div>
            <p className="text-sm text-muted-foreground">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {reviewCommentsCount}
            </div>
            <p className="text-sm text-muted-foreground">Reviewed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">
              {submission.summary?.daysPending || 0}
            </div>
            <p className="text-sm text-muted-foreground">Days Pending</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
