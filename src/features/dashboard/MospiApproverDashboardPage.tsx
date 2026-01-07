import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UnifiedSubmissionCard } from "@/components/ui/UnifiedSubmissionCard";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Search,
} from "lucide-react";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { isWaitingForCurrentUser, getWaitingMessage } from "@/utils/auditUtils";
import { useAuth } from "@/features/auth/AuthProvider";
import { MospiApproverOverviewCards } from "./components/approver/MospiApproverOverviewCards";
import { MospiApproverMinistryOverviewCards } from "./components/approver/MospiApproverMinistryOverviewCards";
import { computeAllStepsSummary, calculateProgressByAcceptedStatus } from "@/features/submission/utils/progress";

export const MospiApproverDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isFilteredByCard, setIsFilteredByCard] = useState(false);
  const [selectedCardTitle, setSelectedCardTitle] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"state" | "ministry">("state");
  const tableRef = useRef<HTMLDivElement>(null);

  // Initial load - no status filter (keep existing behavior)
  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
        // TODO: Replace 'mospi_approver' with actual user role from auth context/store
        const userRole = "mospi_approver";
        const submissionsData = await apiService.getSubmissions(1, 100);

        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (
          submissionsData?.submissions &&
          Array.isArray(submissionsData.submissions)
        ) {
          submissionsArray = submissionsData.submissions;
        } else if (
          (submissionsData as any)?.data?.submissions &&
          Array.isArray((submissionsData as any).data.submissions)
        ) {
          submissionsArray = (submissionsData as any).data.submissions;
        } else if (
          (submissionsData as any)?.data &&
          Array.isArray((submissionsData as any).data)
        ) {
          submissionsArray = (submissionsData as any).data;
        }

        // Process submissions to calculate progress based on ACCEPTED status
        const processedSubmissions = await Promise.all(
          submissionsArray.map(async (sub: any) => {
            const fd = sub.formData || {};
            // Add submittedBy (user ID) to formData for progress calculation
            const fdWithSubmittedBy = {
              ...fd,
              submittedBy: sub.user?.id || sub.submittedBy || sub.user,
            };
            const progressData = await calculateProgressByAcceptedStatus(fdWithSubmittedBy);
            return {
              ...sub,
              progress: progressData.progress,
            };
          })
        );

        setSubmissions(processedSubmissions);
        setIsFilteredByCard(false);
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

    // Only load on initial mount
    loadSubmissions();
  }, []);

  // Load submissions with status filter when card is clicked
  useEffect(() => {
    const loadSubmissionsByStatus = async () => {
      if (!selectedStatus) {
        // If status is cleared, reload all submissions (reset to initial state)
        const loadAllSubmissions = async () => {
          try {
            setLoading(true);
            setIsFilteredByCard(false);
            const submissionsData = await apiService.getSubmissions(1, 100);

            let submissionsArray = [];
            if (Array.isArray(submissionsData)) {
              submissionsArray = submissionsData;
            } else if (
              submissionsData?.submissions &&
              Array.isArray(submissionsData.submissions)
            ) {
              submissionsArray = submissionsData.submissions;
            } else if (
              (submissionsData as any)?.data?.submissions &&
              Array.isArray((submissionsData as any).data.submissions)
            ) {
              submissionsArray = (submissionsData as any).data.submissions;
            } else if (
              (submissionsData as any)?.data &&
              Array.isArray((submissionsData as any).data)
            ) {
              submissionsArray = (submissionsData as any).data;
            }

            // Process submissions to calculate progress based on ACCEPTED status
            const processedSubmissions = await Promise.all(
              submissionsArray.map(async (sub: any) => {
                const fd = sub.formData || {};
                // Add submittedBy (user ID) to formData for progress calculation
                const fdWithSubmittedBy = {
                  ...fd,
                  submittedBy: sub.user?.id || sub.submittedBy || sub.user,
                };
                const progressData = await calculateProgressByAcceptedStatus(fdWithSubmittedBy);
                return {
                  ...sub,
                  progress: progressData.progress,
                };
              })
            );

            setSubmissions(processedSubmissions);
          } catch (error) {
            console.error("❌ Failed to reload all submissions:", error);
            notificationService.error(
              "Failed to reload submissions. Please try again.",
              "Load Error"
            );
          } finally {
            setLoading(false);
          }
        };

        // Only reload if we were previously filtered
        if (isFilteredByCard) {
          loadAllSubmissions();
        }
        return;
      }

      try {
        setLoading(true);
        setIsFilteredByCard(true);

        // Call API with status query parameter
        const submissionsData = await apiService.getSubmissions(
          1,
          100,
          undefined,
          selectedStatus
        );

        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (
          submissionsData?.submissions &&
          Array.isArray(submissionsData.submissions)
        ) {
          submissionsArray = submissionsData.submissions;
        } else if (
          (submissionsData as any)?.data?.submissions &&
          Array.isArray((submissionsData as any).data.submissions)
        ) {
          submissionsArray = (submissionsData as any).data.submissions;
        } else if (
          (submissionsData as any)?.data &&
          Array.isArray((submissionsData as any).data)
        ) {
          submissionsArray = (submissionsData as any).data;
        }

        // Process submissions to calculate progress based on ACCEPTED status
        const processedSubmissions = await Promise.all(
          submissionsArray.map(async (sub: any) => {
            const fd = sub.formData || {};
            // Add submittedBy (user ID) to formData for progress calculation
            const fdWithSubmittedBy = {
              ...fd,
              submittedBy: sub.user?.id || sub.submittedBy || sub.user,
            };
            const progressData = await calculateProgressByAcceptedStatus(fdWithSubmittedBy);
            return {
              ...sub,
              progress: progressData.progress,
            };
          })
        );

        setSubmissions(processedSubmissions);

        // Smooth scroll to table after loading filtered submissions
        setTimeout(() => {
          tableRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      } catch (error) {
        console.error("❌ Failed to load filtered submissions:", error);
        notificationService.error(
          "Failed to load filtered submissions. Please try again.",
          "Load Error"
        );
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    // Only call when status changes (card clicked or cleared)
    loadSubmissionsByStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  // Filter submissions for the "Recent Submissions" card - show only SUBMITTED_TO_MOSPI_APPROVER
  // Note: The latest submissions table should show all statuses (handled separately)
  const filteredSubmissions = useMemo(() => {
    if (user?.role !== "MOSPI_APPROVER") {
      return submissions;
    }

    // For the "Recent Submissions for Final Approval" card, show only pending approvals
    return submissions.filter((submission) => {
      const allowedStatuses = ["SUBMITTED_TO_MOSPI_APPROVER"];
      return submission.status && allowedStatuses.includes(submission.status);
    });
  }, [submissions, user?.role]);

  // All submissions for the latest submissions table
  // When filtered by card, submissions are already filtered by API, so just apply local filters
  const allSubmissionsForTable = useMemo(() => {
    return submissions.filter((submission) => {
      // Filter by tab (State vs Ministry)
      const isMinistrySubmission = 
        submission.user?.ministryId || 
        submission.ministryId || 
        (submission.user?.ministry && submission.user.ministry !== null);
      const isStateSubmission = submission.stateUt && !isMinistrySubmission;
      
      const tabMatch = activeTab === "ministry" 
        ? isMinistrySubmission 
        : isStateSubmission;

      // State filter (only for state tab)
      const stateMatch =
        activeTab === "ministry" ||
        selectedState === "All" ||
        submission.stateUt === selectedState;

      // Search filter
      const searchMatch =
        !searchQuery ||
        submission.submissionId
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        submission.stateUt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.user?.ministryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.user?.ministry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.user?.firstName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        submission.user?.lastName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        submission.status?.toLowerCase().includes(searchQuery.toLowerCase());

      return tabMatch && stateMatch && searchMatch;
    });
  }, [submissions, selectedState, searchQuery, activeTab]);

  // Get unique states for filter (only for state tab)
  const states = useMemo(() => {
    if (activeTab === "ministry") {
      return ["All"];
    }
    return [
      "All",
      ...Array.from(new Set(submissions.map((s) => s.stateUt).filter(Boolean))),
    ];
  }, [submissions, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
      case "SUBMITTED_TO_MOSPI_APPROVER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue":
      case "REJECTED_FINAL":
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      case "approved":
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "SUBMITTED_TO_MOSPI_REVIEWER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DRAFT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "SUBMITTED_TO_STATE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "RETURNED_FROM_MOSPI":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    // Special handling for MOSPI_APPROVER when status is RETURNED_FROM_MOSPI
    if (user?.role === "MOSPI_APPROVER" && status === "RETURNED_FROM_MOSPI") {
      return "RETURNED TO STATE";
    }

    switch (status) {
      case "SUBMITTED_TO_MOSPI_APPROVER":
        return "Waiting for Final Approval";
      case "SUBMITTED_TO_MOSPI_REVIEWER":
        return "Under MoSPI Review";
      case "APPROVED":
        return "Approved";
      case "DRAFT":
        return "Draft";
      case "SUBMITTED_TO_STATE":
        return "Under State Review";
      case "REJECTED_FINAL":
        return "Rejected";
      default:
        return status;
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case "SUBMITTED_TO_MOSPI_APPROVER":
        return "border-l-orange-500";
      case "SUBMITTED_TO_MOSPI_REVIEWER":
        return "border-l-purple-500";
      case "APPROVED":
        return "border-l-green-500";
      case "DRAFT":
        return "border-l-gray-500";
      case "SUBMITTED_TO_STATE":
        return "border-l-blue-500";
      case "REJECTED_FINAL":
        return "border-l-red-500";
      default:
        return "border-l-orange-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow-md relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome!
              </h1>
              <p className="text-gray-600 text-base">
                Review and provide feedback on NIRI submissions
              </p>
            </div>
            {/* Laptop illustration */}
            <div className="absolute right-6 top-0 hidden md:block">
              <img
                src="/images/dashboard.png"
                alt="Dashboard"
                className="h-32 w-auto"
              />
            </div>
          </div>
        </div>

        {/* Tabs for State and Ministry */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "state" | "ministry")} className="w-full">
          <TabsList className="inline-flex h-9 items-center justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger 
              value="state" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-none hover:border-gray-300 hover:text-gray-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              State/UT
            </TabsTrigger>
            <TabsTrigger 
              value="ministry"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-none hover:border-gray-300 hover:text-gray-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              Ministry
            </TabsTrigger>
          </TabsList>

          {/* State Tab */}
          <TabsContent value="state" className="mt-0">
            <MospiApproverOverviewCards
              onStatusFilterChange={setSelectedStatus}
              onCardTitleChange={setSelectedCardTitle}
            />
          </TabsContent>

          {/* Ministry Tab */}
          <TabsContent value="ministry" className="mt-0">
            <MospiApproverMinistryOverviewCards
              onStatusFilterChange={setSelectedStatus}
              onCardTitleChange={setSelectedCardTitle}
            />
          </TabsContent>
        </Tabs>

        {/* Recent Submissions */}

        {/* <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="p-6">Recent Submissions for Final Approval</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/data-submission/review")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No submissions available for review.
                </div>
              ) : (
                filteredSubmissions.slice(0, 5).map((submission) => {
                  // For submissions forwarded to MoSPI Approver, find who forwarded it
                  let submittedByText = submission.user ? `${submission.user.firstName || ''} ${submission.user.lastName || ''}`.trim() || "Unknown" : "Unknown";
                  
                  if (submission.status === "SUBMITTED_TO_MOSPI_APPROVER") {
                    // Look for the most recent comment from MOSPI_REVIEWER who forwarded it
                    if (submission.reviewComments && Array.isArray(submission.reviewComments)) {
                      const reviewerComments = submission.reviewComments
                        .filter((comment: any) => 
                          comment.role === "MOSPI_REVIEWER"
                        )
                        .sort((a: any, b: any) => {
                          const timeA = new Date(a.timestamp || 0).getTime();
                          const timeB = new Date(b.timestamp || 0).getTime();
                          return timeB - timeA; // Most recent first
                        });
                      
                      if (reviewerComments.length > 0) {
                        const lastReviewer = reviewerComments[0];
                        submittedByText = lastReviewer.userName || "MoSPI Reviewer";
                      } else {
                        submittedByText = "MoSPI Reviewer";
                      }
                    } else {
                      submittedByText = "MoSPI Reviewer";
                    }
                  }
                  
                  return (
                    <UnifiedSubmissionCard
                      key={submission.id}
                      id={submission.id}
                      title={submission.title || submission.submissionId || `Submission ${submission.id}`}
                      status={submission.status}
                      referenceId={submission.submissionId || submission.id}
                      updatedDate={new Date(submission.updatedAt || submission.createdAt).toLocaleDateString()}
                      dueDate={submission.deadline || "TBD"}
                      progress={submission.progress ?? 0}
                      // Note: Progress is now calculated based on ACCEPTED status sections
                      nextStep={submission.status === "APPROVED" ? "Submission approved" : submission.status === "REJECTED" ? "Address reviewer feedback" : "Waiting for final approval"}
                      reviewerNote={submission.reviewerNote}
                      submission={submission}
                      currentUserRole="MOSPI_APPROVER"
                      submittedBy={submittedByText}
                      stateUt={submission.stateUt || submission.state_ut}
                      onReview={() => navigate(`/data-submission/review/${submission.id}`)}
                      onViewDetails={() => navigate(`/data-submission/review/${submission.id}`)}
                    />
                  );
                })
              )}
            </div>
          </CardContent>
        </Card> */}

        {/* Latest Submissions Table */}
        <div ref={tableRef}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="p-6">
                  {selectedCardTitle
                    ? `${selectedCardTitle} Submissions`
                    : "Latest Submissions"}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search submissions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {activeTab === "state" && (
                    <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                      <label
                        htmlFor="state-filter"
                        className="text-sm text-gray-600 whitespace-nowrap"
                      >
                        State
                      </label>
                      <select
                        id="state-filter"
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white min-w-[120px]"
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                      >
                        {states.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                All submissions across all statuses
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 border-b text-left">
                        Submission ID
                      </th>
                      <th className="px-3 py-2 border-b text-left">
                        {activeTab === "ministry" ? "Ministry" : "State/UT"}
                      </th>
                      <th className="px-3 py-2 border-b text-left">Status</th>
                      <th className="px-3 py-2 border-b text-left">
                        Submitted By
                      </th>
                      <th className="px-3 py-2 border-b text-left">
                        Submitted Date
                      </th>
                      <th className="px-3 py-2 border-b text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSubmissionsForTable.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          No submissions found
                        </td>
                      </tr>
                    ) : (
                      allSubmissionsForTable.map((submission) => {
                        // For submissions forwarded to MoSPI Approver, find who forwarded it
                        let submittedByText = submission.user
                          ? `${submission.user.firstName || ""} ${
                              submission.user.lastName || ""
                            }`.trim() || "Unknown"
                          : "Unknown";

                        if (
                          submission.status === "SUBMITTED_TO_MOSPI_APPROVER"
                        ) {
                          // Look for the most recent comment from MOSPI_REVIEWER who forwarded it
                          if (
                            submission.reviewComments &&
                            Array.isArray(submission.reviewComments)
                          ) {
                            const reviewerComments = submission.reviewComments
                              .filter(
                                (comment: any) =>
                                  comment.role === "MOSPI_REVIEWER"
                              )
                              .sort((a: any, b: any) => {
                                const timeA = new Date(
                                  a.timestamp || 0
                                ).getTime();
                                const timeB = new Date(
                                  b.timestamp || 0
                                ).getTime();
                                return timeB - timeA; // Most recent first
                              });

                            if (reviewerComments.length > 0) {
                              const lastReviewer = reviewerComments[0];
                              submittedByText =
                                lastReviewer.userName || "MoSPI Reviewer";
                            } else {
                              submittedByText = "MoSPI Reviewer";
                            }
                          } else {
                            submittedByText = "MoSPI Reviewer";
                          }
                        }

                        return (
                          <tr key={submission.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border-b font-medium">
                              {submission.submissionId || submission.id}
                            </td>
                            <td className="px-3 py-2 border-b">
                              {activeTab === "ministry" ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
                                    {submission.user?.ministryName?.charAt(0) || submission.user?.ministry?.charAt(0) || "M"}
                                  </span>
                                  {submission.user?.ministryName || submission.user?.ministry || "N/A"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                                    {submission.stateUt?.charAt(0) || "N"}
                                  </span>
                                  {submission.stateUt || "N/A"}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 border-b">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                                  submission.status
                                )}`}
                              >
                                {getStatusText(submission.status) ||
                                  submission.status?.replace(/_/g, " ") ||
                                  "Unknown"}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-b">
                              {submittedByText}
                            </td>
                            <td className="px-3 py-2 border-b">
                              {submission.createdAt
                                ? new Date(
                                    submission.createdAt
                                  ).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td className="px-3 py-2 border-b text-center">
                              <Button
                                onClick={() =>
                                  navigate(
                                    `/data-submission/review/${submission.id}`
                                  )
                                }
                                size="sm"
                                variant="outline"
                                className="gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                {user?.role === "MOSPI_APPROVER" &&
                                submission.status === "RETURNED_FROM_MOSPI"
                                  ? "View"
                                  : "Review"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => navigate("/data-submission/review")}
                  variant="outline"
                  className="gap-2"
                >
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="p-6">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/data-submission/review")}
              >
                <FileText className="w-6 h-6" />
                <span>Review Submissions</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/ranking")}
              >
                <CheckCircle className="w-6 h-6" />
                <span>View Rankings</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/support")}
              >
                <AlertCircle className="w-6 h-6" />
                <span>Support & Help</span>
              </Button>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
};
