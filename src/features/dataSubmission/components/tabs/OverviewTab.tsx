/* eslint-disable @typescript-eslint/no-explicit-any */
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
      // Section 2.1 files (infraActArray)
      if (submission.formData.infraDevelopment.section2_1?.infraActArray) {
        submission.formData.infraDevelopment.section2_1.infraActArray.forEach((item: any) => {
          if (item.files) countFileArray(item.files);
        });
      }
      // Section 2.2 files (specializedEntityArray)
      if (submission.formData.infraDevelopment.section2_2?.specializedEntityArray) {
        submission.formData.infraDevelopment.section2_2.specializedEntityArray.forEach((item: any) => {
          if (item.files) countFileArray(item.files);
        });
      }
      // Section 2.3 files (infraDevelopmentArray)
      if (submission.formData.infraDevelopment.section2_3?.infraDevelopmentArray) {
        submission.formData.infraDevelopment.section2_3.infraDevelopmentArray.forEach((item: any) => {
          if (item.files) countFileArray(item.files);
        });
      }
      // Section 2.4 files (investmentReadyArray)
      if (submission.formData.infraDevelopment.section2_4?.investmentReadyArray) {
        submission.formData.infraDevelopment.section2_4.investmentReadyArray.forEach((item: any) => {
          if (item.dprFile) countFiles(item.dprFile);
        });
      }
    }

    // Count from PPP Development
    if (submission.formData.pppDevelopment) {
      if (submission.formData.pppDevelopment.section3_1?.files) {
        countFileArray(submission.formData.pppDevelopment.section3_1.files);
      }
      if (submission.formData.pppDevelopment.section3_2?.file) {
        countFiles(submission.formData.pppDevelopment.section3_2.file);
      }
      if (submission.formData.pppDevelopment.section3_3?.VGFArray) {
        submission.formData.pppDevelopment.section3_3.VGFArray.forEach((item: any) => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nodal Officer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="tracking-tight text-base font-semibold bg-[#E9EDFB] px-6 py-2">Nodal Officer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-[#212121]">Name</p>
                <p className="text-[#727272] text-sm">{submission.nodalOfficer?.name || submission.user?.firstName + " " + submission.user?.lastName || "Unknown User"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-[#212121]">Role</p>
                <p className="text-[#727272] text-sm">{getRoleDisplayName(submission.nodalOfficer?.role || submission.user?.role) || "Nodal Officer"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-[#212121]">Email</p>
                <p className="font-medium text-sm">{submission.nodalOfficer?.email || submission.user?.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-[#212121]">Phone</p>
                <p className="text-[#727272] text-sm">{submission.nodalOfficer?.phone || submission.user?.contactNumber || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submission Information */}
        <Card>
          <CardHeader>
            <CardTitle className="tracking-tight text-base font-semibold bg-[#E9EDFB] px-6 py-2">Submission Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-[#212121]">Category</p>
                <p className="text-[#727272] text-sm">{submission.submissionInfo?.category || submission.category || "Infrastructure"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-[#212121]">Type</p>
                <p className="text-[#727272] text-sm">{submission.submissionInfo?.budgetAllocation || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-[#212121]">Location</p>
                <p className="text-[#727272] text-sm">{submission.submissionInfo?.location || submission.stateUt || "Unknown"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-[#212121]">Submitted On</p>
                <p className="text-[#727272] text-sm">{submission.submissionInfo?.submittedOn || new Date(submission.createdAt || submission.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="tracking-tight text-base font-semibold bg-[#E9EDFB] px-6 py-2">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-[#212121]">Estimated Value</p>
              <p className="text-[#727272] text-sm">
                {submission.performanceMetrics?.estimatedValue || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#212121]">Impact Score</p>
              <p className="text-[#727272] text-sm">
                {submission.performanceMetrics?.impactScore || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#212121]">Compliance Score</p>
              <p className="text-[#727272] text-sm">
                {submission.performanceMetrics?.complianceScore || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#212121]">Completion Rate</p>
              <p className="text-[#727272] text-sm">
                {submission.performanceMetrics?.completionRate || 0}%
              </p>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Summary Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {totalDocuments}
            </div>
            <p className="text-sm font-semibold text-[#212121]">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {reviewCommentsCount}
            </div>
            <p className="text-sm font-semibold text-[#212121]">Reviewed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">
              {submission.summary?.daysPending || 0}
            </div>
            <p className="text-sm font-semibold text-[#212121]">Days Pending</p>
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
};
