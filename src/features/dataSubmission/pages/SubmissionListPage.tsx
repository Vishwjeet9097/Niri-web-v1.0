import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  LayoutGrid,
  List,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedSubmissionCard } from "@/components/ui/UnifiedSubmissionCard";
import { exportTableToCSV } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { hasMospiApproverComment, getMospiApproverComment, canReviewSubmission } from "@/utils/auditUtils";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { calculateStateProgressFromApi, ProgressStats } from "@/utils/progressUtils";

export const SubmissionListPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  // const [stateFilter, setStateFilter] = useState("all");
  // const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

 

  const [stateProgress, setStateProgress] = useState<ProgressStats | null>(null);
const [progressLoading, setProgressLoading] = useState(false);
const [submittingFinal, setSubmittingFinal] = useState(false);


 const isFetchingProgress = useRef(false);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
        const submissionsData = await apiService.getSubmissions(1, 100);
        
        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          submissionsArray = submissionsData.submissions;
        } else if ((submissionsData as any)?.data && Array.isArray((submissionsData as any).data)) {
          submissionsArray = (submissionsData as any).data;
        }
        
        setSubmissions(submissionsArray);
      } catch (error) {
        console.error("❌ Failed to load submissions:", error);
        notificationService.error(
          "Failed to load submissions. Please try again.",
          "Load Error"
        );
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, []);

//   useEffect(() => {
//   if (user?.role !== "STATE_APPROVER") return;

//   (async () => {
//     try {
//       setProgressLoading(true);
//       const resp = await apiService.getStateIndicatorStatuses();
//       const stats = calculateStateProgressFromApi(resp);
//       setStateProgress(stats);
//     } catch (e) {
//       console.error("Failed to load state indicator statuses", e);
//       setStateProgress(null);
//     } finally {
//       setProgressLoading(false);
//     }
//   })();
// }, [user?.role]);

useEffect(() => {
  if (user?.role !== "STATE_APPROVER") return;

  let intervalId: number | undefined;

  const loadProgressOnce = async () => {
    // avoid duplicate calls or running in background tab
    if (document?.hidden || isFetchingProgress.current) return;

    try {
      isFetchingProgress.current = true;
      setProgressLoading(true);

      const resp = await apiService.getStateIndicatorStatuses();
      const stats = calculateStateProgressFromApi(resp);
      setStateProgress(stats);
    } catch (e) {
      console.error("Failed to load state indicator statuses", e);
      setStateProgress(null);
    } finally {
      setProgressLoading(false);
      isFetchingProgress.current = false;
    }
  };

  // run immediately on mount
  loadProgressOnce();

  // auto-refresh every 60 seconds
  intervalId = window.setInterval(loadProgressOnce, 60_000);

  // clean up on unmount
  return () => {
    if (intervalId) clearInterval(intervalId);
  };
}, [user?.role]);

const handleFinalSubmit = async () => {
  try {
    // Gate: must have progress and must be 100% approved
    if (!stateProgress || stateProgress.approved !== stateProgress.total) {
      notificationService.warning("All indicators must be approved before final submission.");
      return;
    }

    // Find the submission the state approver is forwarding
    // Prefer a submission that’s currently with the state
    const candidate =
      filteredSubmissions.find(
        (s) => s.status === "SUBMITTED_TO_STATE" || s.status === "RETURNED_FROM_MOSPI"
      ) || filteredSubmissions[0];

    if (!candidate) {
      notificationService.error("No eligible submission found to forward.");
      return;
    }

    setSubmittingFinal(true);

    // Optional note to MoSPI + pass current status for backend logic
    const comment = "All indicators approved. Submitting to MoSPI for review.";
    await apiService.forwardToMospi(candidate.id, comment, candidate.status);

    notificationService.success("Submission sent to MoSPI reviewer.");

    // Refresh list + progress so UI reflects the new state
    const updated = await apiService.getSubmissions(1, 100);
    let submissionsArray: any[] = [];
    if (Array.isArray(updated)) submissionsArray = updated;
    else if (updated?.submissions) submissionsArray = updated.submissions;
    else if ((updated as any)?.data && Array.isArray((updated as any).data)) {
      submissionsArray = (updated as any).data;
    }
    setSubmissions(submissionsArray);

    // Refresh state progress
    if (user?.role === "STATE_APPROVER") {
      const resp = await apiService.getStateIndicatorStatuses();
      const stats = calculateStateProgressFromApi(resp);
      setStateProgress(stats);
    }
  } catch (e: any) {
    notificationService.error(e?.message || "Error forwarding submission.");
  } finally {
    setSubmittingFinal(false);
  }
};




  // Filter submissions based on search and filters
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        (submission.title || submission.submissionId || `Submission ${submission.id}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (submission.submittedBy?.name || submission.user?.firstName + " " + submission.user?.lastName || "Unknown").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (submission.category || "Infrastructure").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (submission.id || submission.submissionId).toLowerCase().includes(searchQuery.toLowerCase());

      // State filter - COMMENTED OUT
      // const matchesState =
      //   stateFilter === "all" ||
      //   (submission.stateUt || submission.submittedBy?.location || "Unknown")
      //     .toLowerCase()
      //     .includes(stateFilter.toLowerCase());

      // Status filter - COMMENTED OUT
      // const matchesStatus =
      //   statusFilter === "all" || (submission.status || "Unknown") === statusFilter;

      return matchesSearch; // && matchesState && matchesStatus;
    });
  }, [searchQuery, submissions]); // stateFilter, statusFilter removed from dependencies

  // Handle export
  const handleExport = () => {
    const columns = [
      { label: "Submission ID", key: "id" },
      { label: "Title", key: "title" },
      { label: "Status", key: "status" },
      { label: "Submitted By", key: "submittedByName" },
      { label: "Location", key: "location" },
      { label: "Submission Date", key: "submissionDate" },
      { label: "Deadline", key: "deadline" },
      { label: "Category", key: "category" },
      { label: "Progress", key: "progress" },
      { label: "Documents Count", key: "documentsCount" },
      { label: "Days Pending", key: "daysPending" },
    ];

    const exportData = filteredSubmissions.map((submission) => ({
      id: submission.id || submission.submissionId,
      title: submission.title || submission.submissionId || `Submission ${submission.id}`,
      status: submission.status || "Unknown",
      submittedByName: submission.submittedBy?.name || submission.user?.firstName + " " + submission.user?.lastName || "Unknown",
      location: submission.submittedBy?.location || submission.stateUt || "Unknown",
      submissionDate: submission.submissionDate || submission.createdAt,
      deadline: submission.deadline || "N/A",
      category: submission.category || "Infrastructure",
      progress: `${submission.progress || 0}%`,
      documentsCount: submission.documentsCount || 0,
      daysPending: submission.daysPending || (submission.createdAt ? Math.max(0, Math.floor((new Date().getTime() - new Date(submission.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 0),
    }));

    exportTableToCSV(
      exportData,
      columns,
      `submissions_${new Date().toISOString().split("T")[0]}.csv`,
    );

    toast({
      title: "Export Successful",
      description: `${filteredSubmissions.length} submissions exported to CSV`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "overdue":
        return "bg-red-100 text-red-700 border-red-300";
      case "approved":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Latest Submission */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Latest Submission
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredSubmissions.length} Submission
                {filteredSubmissions.length !== 1 ? "s" : ""} Found
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Progress Overview Section - Only for STATE_APPROVER */}
        {/* {user?.role === "STATE_APPROVER" && filteredSubmissions.length > 0 && (() => {
          const latestSubmission = filteredSubmissions.find(s => s.status === "SUBMITTED_TO_STATE");
          if (latestSubmission && latestSubmission.formData) {
            const progress = calculateIndicatorProgress(latestSubmission.formData);
            return (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-foreground mb-1">Progress Overview</h2>
                  <p className="text-sm text-muted-foreground">
                    Track the approval status of indicators for {latestSubmission.stateUt || "your state"}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-semibold text-[#212121]">Indicators Progress</p>
                      <p className="text-sm text-[#727272]">
                        {progress.approved} of {progress.total} Approved ({progress.percentage}%)
                      </p>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-primary">{progress.total}</p>
                      <p className="text-sm text-muted-foreground">Total Indicators</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-green-600">{progress.approved}</p>
                      <p className="text-sm text-muted-foreground">Approved</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-orange-600">{progress.total - progress.approved}</p>
                      <p className="text-sm text-muted-foreground">Pending Review</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()} */}

        {user?.role === "STATE_APPROVER" && (
  <div className="max-w-7xl mx-auto mb-6">
    <div className="mb-4 flex items-start justify-between gap-4">
      {/* <div>
      <h2 className="text-xl font-semibold text-foreground mb-1">Progress Overview</h2>
      <p className="text-sm text-muted-foreground">
        Track the approval status of indicators for your state
      </p>
      </div> */}
    </div>

    {progressLoading ? (
      <div className="text-sm text-muted-foreground">Loading progress…</div>
    ) : stateProgress ? (
      <div className="space-y-6">
        <div className={`border rounded-lg p-4 ${
            stateProgress.percentage === 100 
            ? "border-green-200 bg-green-50/50" 
            : "border-amber-200 bg-amber-50/50"
          }`}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Approved Indicator for FY 2025 - 2026</h2>
            <div className="flex items-center gap-2 text-sm mt-1">
              <span className={`font-medium ${stateProgress.percentage === 100 ? "text-green-600" : "text-amber-800"}`}>
                {stateProgress.approved}/{stateProgress.total}
              </span>
              <span className={stateProgress.percentage === 100 ? "text-green-600" : "text-amber-800"}>
                {Math.round(stateProgress.percentage)}% Submitted
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress 
                value={stateProgress.percentage} 
                className={`h-3 ${
                  stateProgress.percentage === 100 
                  ? "[&>div]:bg-green-600" 
                  : "[&>div]:bg-amber-700"
                }`}
              />
            </div>
            <Button
              className="shrink-0 text-white px-6 bg-[#7888E3] hover:bg-[#6574CC]"
              onClick={handleFinalSubmit}
              disabled={
                submittingFinal ||
                progressLoading ||
                !stateProgress ||
                stateProgress.approved !== stateProgress.total
              }
            >
              {submittingFinal ? "Submitting…" : "Submit Now"}
            </Button>
          </div>
        </div>
        {/* <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-primary">{stateProgress.total}</p>
            <p className="text-sm text-muted-foreground">Total Indicators</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-600">{stateProgress.approved}</p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-orange-600">
              {stateProgress.total - stateProgress.approved}
            </p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </div>
        </div> */}
      </div>
    ) : (
      <div className="text-sm text-muted-foreground">
        No indicator statuses found yet.
      </div>
    )}
  </div>
)}

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white rounded-lg shadow-sm border p-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search submission, submitters, or categories"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Location Filter - COMMENTED OUT */}
          {/* <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="mumbai">Mumbai</SelectItem>
              <SelectItem value="pune">Pune</SelectItem>
              <SelectItem value="nagpur">Nagpur</SelectItem>
              <SelectItem value="nashik">Nashik</SelectItem>
              <SelectItem value="thane">Thane</SelectItem>
              <SelectItem value="aurangabad">Aurangabad</SelectItem>
            </SelectContent>
          </Select> */}
          
          {/* Status Filter - COMMENTED OUT */}
          {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select> */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Submissions List/Grid */}
        {viewMode === "list" ? (
          <div className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No submissions found
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters or search query
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredSubmissions.map((submission) => {
                // Calculate progress
                const progress = submission.progress || (submission.formData ? Math.min(100, Object.keys(submission.formData).length * 20) : 0);
                
                // Determine next step
                let nextStep = "Complete submission";
                if (submission.status === "DRAFT") {
                  nextStep = "Complete all required sections";
                } else if (submission.status === "SUBMITTED_TO_STATE") {
                  nextStep = "Waiting for state approval";
                } else if (submission.status === "APPROVED") {
                  nextStep = "Submission approved";
                } else if (submission.status === "REJECTED" || submission.status === "REJECTED_FINAL") {
                  nextStep = "Address reviewer feedback";
                }

                // Get reviewer note
                const reviewerNote = submission.reviewComments && submission.reviewComments.length > 0 
                  ? submission.reviewComments[submission.reviewComments.length - 1]?.text 
                  : undefined;

                return (
                  <UnifiedSubmissionCard
                    key={submission.id}
                    id={submission.id}
                    title={submission.submissionId || submission.title || `Submission ${submission.id}`}
                    status={submission.status}
                    referenceId={submission.submissionId || submission.id}
                    updatedDate={submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : submission.submissionDate || "N/A"}
                    dueDate={submission.deadline || (submission.createdAt ? new Date(new Date(submission.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "N/A")}
                    progress={Math.round(progress)}
                    nextStep={nextStep}
                    reviewerNote={reviewerNote}
                    submission={submission}
                    currentUserRole={user?.role}
                    submittedBy={submission.user ? `${submission.user.firstName || ''} ${submission.user.lastName || ''}`.trim() || "Unknown" : "Unknown"}
                    onViewDetails={() => navigate(`/data-submission/review/${submission.id}`)}
                    onReview={() => navigate(`/data-submission/review/${submission.id}`)}
                  />
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No submissions found
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters or search query
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredSubmissions.map((submission) => {
                // Calculate progress
                const progress = submission.progress || (submission.formData ? Math.min(100, Object.keys(submission.formData).length * 20) : 0);
                
                // Determine next step
                let nextStep = "Complete submission";
                if (submission.status === "DRAFT") {
                  nextStep = "Complete all required sections";
                } else if (submission.status === "SUBMITTED_TO_STATE") {
                  nextStep = "Waiting for state approval";
                } else if (submission.status === "APPROVED") {
                  nextStep = "Submission approved";
                } else if (submission.status === "REJECTED" || submission.status === "REJECTED_FINAL") {
                  nextStep = "Address reviewer feedback";
                }

                // Get reviewer note
                const reviewerNote = submission.reviewComments && submission.reviewComments.length > 0 
                  ? submission.reviewComments[submission.reviewComments.length - 1]?.text 
                  : undefined;

                return (
                  <UnifiedSubmissionCard
                    key={submission.id}
                    id={submission.id}
                    title={submission.submissionId || submission.title || `Submission ${submission.id}`}
                    status={submission.status}
                    referenceId={submission.submissionId || submission.id}
                    updatedDate={submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : submission.submissionDate || "N/A"}
                    dueDate={submission.deadline || (submission.createdAt ? new Date(new Date(submission.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "N/A")}
                    progress={Math.round(progress)}
                    nextStep={nextStep}
                    reviewerNote={reviewerNote}
                    submission={submission}
                    currentUserRole={user?.role}
                    submittedBy={submission.user ? `${submission.user.firstName || ''} ${submission.user.lastName || ''}`.trim() || "Unknown" : "Unknown"}
                    onViewDetails={() => navigate(`/data-submission/review/${submission.id}`)}
                    onReview={() => navigate(`/data-submission/review/${submission.id}`)}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
