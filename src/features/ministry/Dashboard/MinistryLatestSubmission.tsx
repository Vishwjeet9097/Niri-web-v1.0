import { useNavigate } from "react-router-dom";
import { UnifiedSubmissionCard } from "@/components/ui/UnifiedSubmissionCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type SubmissionStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "need_revision"
  | "DRAFT"
  | "SUBMITTED_TO_STATE"
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
  | "REJECTED_FINAL";

interface Submission {
  id: string;
  title: string;
  status: SubmissionStatus;
  submissionDate: string;
  deadline: string;
  progress: number;
  reviewerNote?: string;
  submittedBy?: string;
  stateUt?: string;
  submission?: Record<string, unknown>;
}

interface MinistryLatestSubmissionProps {
  filteredSubmissions: Submission[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function MinistryLatestSubmission({
  filteredSubmissions,
  searchQuery,
  setSearchQuery,
}: MinistryLatestSubmissionProps) {
  const navigate = useNavigate();

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
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No submissions found for the selected filter.
              </div>
            ) : (
              filteredSubmissions?.map((submission) => (
                <UnifiedSubmissionCard
                  key={submission.id}
                  id={submission.id}
                  title={submission.title}
                  status={submission.status}
                  referenceId={submission.title}
                  updatedDate={submission.submissionDate}
                  dueDate={submission.deadline}
                  progress={submission.progress}
                  nextStep={
                    submission.status === "APPROVED"
                      ? "Submission approved"
                      : submission.status === "REJECTED"
                      ? "Address reviewer feedback"
                      : submission.status === "SUBMITTED_TO_MOSPI_REVIEWER" || 
                        submission.status === "SUBMITTED_TO_MOSPI_APPROVER" ||
                        submission.status === "RETURNED_FROM_MOSPI"
                      ? "Waiting for MoSPI approval"
                      : "Waiting for state approval"
                  }
                  reviewerNote={submission.reviewerNote}
                  submission={submission.submission || (submission as unknown as Record<string, unknown>)}
                  currentUserRole="STATE_APPROVER"
                  submittedBy={submission.submittedBy}
                  stateUt={submission.stateUt}
                  onReview={() =>
                    navigate(`/data-submission/review/${submission.id}`)
                  }
                  onViewDetails={() =>
                    navigate(`/data-submission/review/${submission.id}`)
                  }
                />
              ))
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

