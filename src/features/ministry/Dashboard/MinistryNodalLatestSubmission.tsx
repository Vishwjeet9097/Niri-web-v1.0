/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate } from "react-router-dom";
import { UnifiedSubmissionCard } from "@/components/ui/UnifiedSubmissionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { notificationService } from "@/services/notification.service";
import { apiService } from "@/services/api.service";

// Helper function to handle edit submission
const handleEditSubmission = async (submissionId: string, navigate: any) => {
  try {
    // Load submission data from backend
    const submissionData = await apiService.getSubmission(submissionId);

    // Store submission data in localStorage for form prefill
    localStorage.setItem("editing_submission", JSON.stringify(submissionData));

    // Navigate to edit page (same as handleEditSubmissionForEdit)
    navigate(`/data-submission/edit/${submissionId}`);

    notificationService.success("Submission loaded for editing", "Edit Mode", {
      details: {
        submissionId,
        status: submissionData.status,
      },
    });
  } catch (error: any) {
    console.error("❌ Failed to load submission for edit:", error);
    notificationService.error(
      error.message || "Failed to load submission for editing",
      "Load Error",
      {
        details: {
          submissionId,
          error: error.message,
        },
      }
    );
  }
};

// Helper function to handle edit submission for edit page
const handleEditSubmissionForEdit = async (
  submissionId: string,
  navigate: any
) => {
  try {
    // Navigate to edit page
    navigate(`/data-submission/edit/${submissionId}`);

    notificationService.success("Opening edit page", "Edit Mode", {
      details: {
        submissionId,
      },
    });
  } catch (error: any) {
    console.error("❌ Failed to open edit page:", error);
    notificationService.error(
      error.message || "Failed to open edit page",
      "Error"
    );
  }
};

interface Submission {
  id: string;
  title: string;
  status: string;
  referenceId: string;
  updatedDate: string;
  dueDate: string;
  progress: number;
  nextStep: string;
  reviewerNote?: string;
  submission: any;
  submittedBy: string;
  stateUt?: string;
}

interface MinistryNodalLatestSubmissionProps {
  filteredSubmissions: Submission[];
  activeTab: string;
  setActiveTab: (value: string) => void;
}

export function MinistryNodalLatestSubmission({
  filteredSubmissions,
  activeTab,
  setActiveTab,
}: MinistryNodalLatestSubmissionProps) {
  const navigate = useNavigate();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-4">
          <div className="bg-white shadow-xl rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Latest Submissions</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Your latest NIRI data submissions and their status
                </p>
              </div>
              {/* <Button onClick={() => navigate('/submissions')}>+ New Submission</Button> */}
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* <TabsList className="flex justify-start items-center gap-6 px-1">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
                <TabsTrigger value="SUBMITTED_TO_STATE">
                  Under Review
                </TabsTrigger>
                <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                <TabsTrigger value="DRAFT">Draft</TabsTrigger>
              </TabsList> */}
              <TabsContent value={activeTab} className="mt-4">
                <div className="space-y-6">
                  {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No submissions found for this status.
                    </div>
                  ) : (
                    filteredSubmissions.map((submission) => (
                      <UnifiedSubmissionCard
                        key={submission.id}
                        id={submission.id}
                        title={submission.title}
                        status={submission.status as any}
                        referenceId={submission.referenceId}
                        updatedDate={submission.updatedDate}
                        dueDate={submission.dueDate}
                        progress={submission.progress}
                        nextStep={submission.nextStep}
                        reviewerNote={submission.reviewerNote}
                        submission={submission.submission}
                        currentUserRole="NODAL_OFFICER"
                        submittedBy={submission.submittedBy}
                        stateUt={submission.stateUt}
                        onEdit={() =>
                          handleEditSubmissionForEdit(submission.id, navigate)
                        }
                        onViewDetails={() => {
                          // Navigate to ministry form-review page
                          // For nodal, use submission-with-data endpoint (not consolidated API)
                          // This will call: /ministry/form/retrieve/submission-with-data/{submissionId}?forReview=true
                          //const userId = submission.submission?.user?.id || submission.submission?.userId;
                          // Don't use isConsolidated=true for nodal - this ensures it uses submission-with-data endpoint
                          const url = `/ministry/review-submissions/form-review/${submission.id}`;
                          navigate(url);
                        }}
                        onRevise={() =>
                          handleEditSubmission(submission.id, navigate)
                        }
                      />
                    ))
                  )}
                </div>
                <div className="mt-4 text-center">
                  <Button variant="outline">View All</Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

