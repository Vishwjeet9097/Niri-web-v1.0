import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Building, FileText, MapPin, Calendar } from "lucide-react";

interface MospiOverviewTabProps {
  submission: any;
}

export const MospiOverviewTab = ({ submission }: MospiOverviewTabProps) => {
  // Helper functions to safely access nested properties
  const getNodalOfficer = () => submission?.nodalOfficer || submission?.submittedBy || {};
  const getMospiReviewer = () => submission?.mospiReviewer || {};
  const getMospiApprover = () => submission?.mospiApprover || {};
  const getNationalPriority = () => submission?.nationalPriority || {};
  const getFinancialImpact = () => submission?.financialImpact || {};
  const getSummary = () => submission?.summary || {};

  // Count review comments
  const countReviewComments = () => {
    if (!submission?.reviewComments || !Array.isArray(submission.reviewComments)) {
      return 0;
    }
    return submission.reviewComments.length;
  };

  const reviewCommentsCount = countReviewComments();

  return (
    <div className="space-y-6">
      {/* Three Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Submission Journey */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Submission Journey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Nodal Officer</p>
                <p className="text-sm text-muted-foreground">{getNodalOfficer().name || "Naresh Sen"}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-foreground">MoSPI Reviewer</p>
                <p className="text-sm text-muted-foreground">{getMospiReviewer().name || "Vinayak Patil"}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-foreground">MoSPI Approver</p>
                <p className="text-sm text-orange-600">{getMospiApprover().name || "Shri Arjun Patil"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* National Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">National Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">{getNationalPriority().category || submission?.category || "Infrastructure Financing"}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Type: {getNationalPriority().type || "Budget Allocation"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{submission?.state || "Maharashtra"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Submitted On: {getNationalPriority().submittedOn || submission?.submittedOn || "15-01-2025"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Financial Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Value</span>
              <span className="text-sm font-semibold text-foreground">{getFinancialImpact().totalValue || "₹XXXCr"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Economic Multiplier</span>
              <span className="text-sm font-semibold text-foreground">{getFinancialImpact().economicMultiplier || "2.8x"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">ROI</span>
              <span className="text-sm font-semibold text-foreground">{getFinancialImpact().roi || "12.5%"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-foreground mb-2">
              {getSummary().totalDocuments || submission?.documentsCount || 12}
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
              {getSummary().daysPending || submission?.daysPending || 3}
            </div>
            <p className="text-sm text-muted-foreground">Days Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-red-600 mb-2">
              {getSummary().checklistCompleted || 0}
            </div>
            <p className="text-sm text-muted-foreground">Checklist Completed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
