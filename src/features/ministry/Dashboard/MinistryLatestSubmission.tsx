import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { UnifiedSubmissionCard } from "@/components/ui/UnifiedSubmissionCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getNodalDashboardSubmissions } from "@/services/ministry.service";
import { calculateProgressByAcceptedStatus } from "@/features/submission/utils/progress";
import { notificationService } from "@/services/notification.service";

// Helper function to map backend status to frontend status
const mapBackendStatusToFrontend = (backendStatus: string): string => {
  const statusMap: Record<string, string> = {
    DRAFT: "DRAFT",
    SUBMITTED_TO_STATE: "SUBMITTED_TO_STATE",
    SUBMITTED_TO_MINISTRY: "SUBMITTED_TO_MINISTRY",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    SUBMITTED_TO_MOSPI: "SUBMITTED_TO_MOSPI",
    SUBMITTED_TO_MOSPI_REVIEWER: "SUBMITTED_TO_MOSPI_REVIEWER",
    SUBMITTED_TO_MOSPI_APPROVER: "SUBMITTED_TO_MOSPI_APPROVER",
    ACCEPTED_BY_MOSPI: "ACCEPTED_BY_MOSPI",
    MOSPI_APPROVED: "MOSPI_APPROVED",
    MOSPI_REJECTED: "MOSPI_REJECTED",
    RETURNED_FROM_MOSPI: "RETURNED_FROM_MOSPI",
    RETURNED_FROM_MOSPI_APPROVER_DRAFT: "RETURNED_FROM_MOSPI_APPROVER_DRAFT",
    // Legacy mappings
    draft: "DRAFT",
    under_review: "SUBMITTED_TO_STATE",
    approved: "APPROVED",
    need_revision: "REJECTED",
  };

  return statusMap[backendStatus] || backendStatus;
};

type SubmissionStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "need_revision"
  | "DRAFT"
  | "SUBMITTED_TO_STATE"
  | "SUBMITTED_TO_MINISTRY"
  | "APPROVED"
  | "REJECTED"
  | "SUBMITTED_TO_MOSPI"
  | "MOSPI_APPROVED"
  | "MOSPI_REJECTED"
  | "RETURNED_FROM_MOSPI"
  | "RETURNED_FROM_MOSPI_APPROVER"
  | "RETURNED_FROM_STATE"
  | "SUBMITTED_TO_MOSPI_REVIEWER"
  | "SUBMITTED_TO_MOSPI_APPROVER"
  | "ACCEPTED_BY_MOSPI"
  | "REJECTED_FINAL"
  | "RETURNED_FROM_MOSPI_APPROVER_DRAFT";

interface Submission {
  id: string;
  title: string;
  status: SubmissionStatus;
  submissionDate: string;
  deadline: string;
  progress: number;
  nextStep?: string;
  reviewerNote?: string;
  submittedBy?: string;
  stateUt?: string;
  submission?: Record<string, unknown>;
}

export function MinistryLatestSubmission() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Load submissions from API
  useEffect(() => {
    const loadSubmissions = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        console.log("🔍 Loading ministry submissions for MINISTRY_APPROVER, userId:", user.id);

        // Call the API endpoint: /ministry/dashboard/submission-details/{userId}
        const response = await getNodalDashboardSubmissions(user.id);

        console.log("📋 Ministry submissions response:", response);

        if (response?.status && response.data?.submissions) {
          // Process submissions to calculate progress based on ACCEPTED status
          const processedSubmissions = await Promise.all(
            response.data.submissions.map(async (sub: any) => {
              const fd = sub.form_data || sub.formData || {};
              // Add submittedBy (user ID) to formData for progress calculation
              const fdWithSubmittedBy = {
                ...fd,
                submittedBy: sub.user?.id || sub.submittedBy || sub.user,
              };

              const progressData = await calculateProgressByAcceptedStatus(fdWithSubmittedBy);
              const progress = progressData.progress;

              let nextStep = "Complete submission";
              if (sub.status === "DRAFT")
                nextStep = "Complete all required sections";
              else if (sub.status === "SUBMITTED_TO_MINISTRY") {
                if (progress === 100) {
                  nextStep = "Waiting for your approval";
                } else {
                  nextStep = "Waiting for ministry approval";
                }
              } else if (sub.status === "SUBMITTED_TO_MOSPI_REVIEWER" || sub.status === "SUBMITTED_TO_MOSPI_APPROVER") {
                nextStep = "Submitted to MoSPI";
              } else if (sub.status === "ACCEPTED_BY_MOSPI" || sub.status === "APPROVED")
                nextStep = "Submission approved";
              else if (sub.status === "REJECTED" || sub.status === "RETURNED_FROM_MOSPI")
                nextStep = "Address reviewer feedback";

              const reviewerNote =
                sub.review_comments && sub.review_comments.length > 0
                  ? sub.review_comments[sub.review_comments.length - 1]?.text
                  : sub.reviewComments && sub.reviewComments.length > 0
                  ? sub.reviewComments[sub.reviewComments.length - 1]?.text
                  : undefined;

              const mappedStatus = mapBackendStatusToFrontend(sub.status || sub.formStatus);
              // Map SUBMITTED_TO_MINISTRY to SUBMITTED_TO_STATE for UnifiedSubmissionCard compatibility
              const finalStatus = mappedStatus === "SUBMITTED_TO_MINISTRY" ? "SUBMITTED_TO_STATE" : mappedStatus;
              
              return {
                id: sub.id,
                title: sub.submission_id || sub.submissionId || `Submission ${sub.id}`,
                status: finalStatus as any, // Type assertion needed due to UnifiedSubmissionCard type constraints
                referenceId: sub.submission_id || sub.submissionId,
                updatedDate: sub.updatedAt
                  ? new Date(sub.updatedAt).toLocaleDateString()
                  : "",
                dueDate: sub.dueDate || "TBD",
                progress: Math.round(progress),
                nextStep,
                reviewerNote,
                submission: sub,
                submittedBy: sub.user
                  ? `${sub.user.firstName || ""} ${sub.user.lastName || ""}`.trim()
                  : "Unknown",
                stateUt: sub.stateUt || sub.state_ut,
                submissionDate: sub.updatedAt
                  ? new Date(sub.updatedAt).toLocaleDateString()
                  : "",
                deadline: sub.dueDate || "TBD",
              };
            })
          );

          console.log("✅ Processed ministry submissions:", processedSubmissions);
          setSubmissions(processedSubmissions);
        } else {
          console.warn("⚠️ Unexpected response structure:", response);
          setSubmissions([]);
        }
      } catch (error) {
        console.error("❌ Failed to load ministry submissions:", error);
        notificationService.error(
          "Failed to load ministry submissions. Please try again.",
          "Load Error"
        );
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [user?.id]);

  // Filter submissions based on search query
  const filteredSubmissions = submissions.filter((submission) => {
    const searchMatch =
      !searchQuery ||
      submission.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.submittedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.stateUt?.toLowerCase().includes(searchQuery.toLowerCase());

    return searchMatch;
  });

  return (
    <div className="grid gap-6 lg:grid-cols-1">
      {/* Left Column - Submissions (spans 2 columns) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-4 bg-[#fff] border border-[#0000001A] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg text-[#212121] font-semibold">
                Latest Submission
              </h2>
              <p className="text-sm text-[#727272]">
                Review submissions requiring your approval
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search submissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[250px]"
                />
              </div>
              {/* <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submissions</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem> */}
                  {/* <SelectItem value="overdue">Overdue</SelectItem> */}
                  {/* <SelectItem value="approved">Approved</SelectItem> */}
                  {/* <SelectItem value="rejected">Rejected</SelectItem> */}
                {/* </SelectContent>
              </Select> */}
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading submissions...
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No submissions found for the selected filter.
              </div>
            ) : (
              filteredSubmissions?.map((submission) => {
                // Map SUBMITTED_TO_MINISTRY to SUBMITTED_TO_STATE for UnifiedSubmissionCard
                const cardStatus = submission.status === "SUBMITTED_TO_MINISTRY" 
                  ? "SUBMITTED_TO_STATE" 
                  : submission.status;
                
                return (
                <UnifiedSubmissionCard
                  key={submission.id}
                  id={submission.id}
                  title={submission.title}
                  status={cardStatus as any}
                  referenceId={submission.title}
                  updatedDate={submission.submissionDate}
                  dueDate={submission.deadline}
                  progress={submission.progress}
                  nextStep={submission.nextStep || "Complete submission"}
                  reviewerNote={submission.reviewerNote}
                  submission={submission.submission || (submission as unknown as Record<string, unknown>)}
                  currentUserRole="MINISTRY_APPROVER"
                  submittedBy={submission.submittedBy}
                  stateUt={submission.stateUt}
                  onReview={() =>
                    navigate(`/ministry/review-submissions/form-review/${submission.id}`)
                  }
                  onViewDetails={() =>
                    navigate(`/ministry/review-submissions/form-review/${submission.id}`)
                  }
                />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Sidebar */}
      <div className="space-y-6" >
        {/* <RecentActionsCard
          actions={[
            {
              id: "1",
              status: "Approved",
              date: "14-01-2025",
              title: "Digital Infrastructure Survey",
              submittedBy: "Mumbai Nodal Officer",
            },
            {
              id: "2",
              status: "Returned",
              date: "13-01-2025",
              title: "PPP Project Assessment",
              submittedBy: "Pune Nodal Officer",
            },
          ]}
        /> */}

        {/* <QuickActionsCard
          reviewedThisMonth={6}
          totalThisMonth={8}
          averageReviewTime={2}
          targetReviewTime={3}
        /> */}
      </div>
    </div>
  );
}

