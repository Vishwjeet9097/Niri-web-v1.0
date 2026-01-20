// niri-web/src/features/dashboard/components/reviewer/ReviewerSubmissionsTable.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, XCircle, Search } from "lucide-react";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/features/auth/AuthProvider";

interface ReviewerSubmissionsTableProps {
  submissions?: any[];
  loading?: boolean;
  activeTab?: "state" | "ministry";
}

export default function ReviewerSubmissionsTable({
  submissions: propSubmissions,
  loading: propLoading,
  activeTab = "state",
}: ReviewerSubmissionsTableProps = {}) {
  const { user } = useAuth();
  const [selectedState, setSelectedState] = useState("All");
  const [selectedMinistry, setSelectedMinistry] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Use props if provided, otherwise load data
  const displaySubmissions =
    propSubmissions !== undefined ? propSubmissions : submissions;
  const displayLoading = propLoading !== undefined ? propLoading : loading;

  // Reset filters when tab changes
  useEffect(() => {
    setSelectedState("All");
    setSelectedMinistry("All");
  }, [activeTab]);

  useEffect(() => {
    // Only load if props are not provided
    if (propSubmissions !== undefined) {
      return;
    }

    const loadSubmissions = async () => {
      try {
        setLoading(true);
        const userRole = user?.role || "MOSPI_REVIEWER";
        const submissionsData = await apiService.getSubmissions(1, 20);
        // Debug logging removed for performance

        // Extract submissions array from response
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
  }, [propSubmissions]);

  const filteredSubmissions = displaySubmissions.filter((submission) => {
    // For MoSPI Reviewer: Show all submissions for all statuses
    // This includes submissions at all stages (reviewer, approver, approved, rejected, etc.)
    const statusMatch = submission.status; // Show all statuses

    // For ministry tab, filter by ministry
    if (activeTab === "ministry") {
      const ministryMatch =
        selectedMinistry === "All" ||
        submission.user?.ministryName === selectedMinistry ||
        submission.ministryName === selectedMinistry;

      // Search filter
      const searchMatch =
        !searchQuery ||
        submission.submissionId
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        submission.user?.ministryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.user?.ministry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.user?.firstName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        submission.user?.lastName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        submission.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.formStatus?.toLowerCase().includes(searchQuery.toLowerCase());

      return statusMatch && ministryMatch && searchMatch;
    }

    // For state tab, filter by state
    const stateMatch =
      selectedState === "All" || submission.stateUt === selectedState;

    // Search filter
    const searchMatch =
      !searchQuery ||
      submission.submissionId
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      submission.stateUt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.user?.firstName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      submission.user?.lastName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      submission.status?.toLowerCase().includes(searchQuery.toLowerCase());

    return statusMatch && stateMatch && searchMatch;
  });

  // Get unique states for filter (only for state tab)
  const states = activeTab === "ministry" 
    ? ["All"]
    : [
        "All",
        ...Array.from(new Set(displaySubmissions.map((s) => s.stateUt).filter(Boolean))),
      ];

  // Get unique ministries for filter (only for ministry tab)
  const ministries = activeTab === "state"
    ? ["All"]
    : [
        "All",
        ...Array.from(new Set(
          displaySubmissions
            .map((s) => s.user?.ministryName || s.ministryName)
            .filter(Boolean)
        )),
      ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED_TO_MOSPI_REVIEWER":
      case "SUBMITTED_TO_MOSPI":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECTED":
      case "REJECTED_FINAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "DRAFT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "RETURNED_FROM_MOSPI":
      case "RETURNED_FROM_MOSPI":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const handleReview = (submissionId: string, submission?: any) => {
    // For ministry tab, navigate to ministry review page (same as MOSPI_APPROVER)
    if (activeTab === "ministry") {
      // Use submission.id for the route, and pass isConsolidated=true for consolidated API
      const userId = submission?.userId || submission?.user?.id;
      const url = userId 
        ? `/ministry/review-submissions/form-review/${submissionId}?userId=${userId}&isConsolidated=true`
        : `/ministry/review-submissions/form-review/${submissionId}?isConsolidated=true`;
      navigate(url);
    } else {
      // For state tab, use existing navigation
      navigate(`/data-submission/review/${submissionId}`);
    }
  };

  if (displayLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading submissions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Latest Submissions</h2>
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
            <div>
              <label
                htmlFor="state-filter"
                className="mr-2 text-sm text-gray-600"
              >
                States
              </label>
              <select
                id="state-filter"
                className="border rounded px-2 py-1 text-sm"
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
          {activeTab === "ministry" && (
            <div>
              <label
                htmlFor="ministry-filter"
                className="mr-2 text-sm text-gray-600"
              >
                Ministry
              </label>
              <select
                id="ministry-filter"
                className="border rounded px-2 py-1 text-sm min-w-[150px]"
                value={selectedMinistry}
                onChange={(e) => setSelectedMinistry(e.target.value)}
              >
                {ministries.map((ministry) => (
                  <option key={ministry} value={ministry}>
                    {ministry}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        Review submissions requiring your approval
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 border-b text-left">Submission ID</th>
              <th className="px-3 py-2 border-b text-left">State/UT</th>
              <th className="px-3 py-2 border-b text-left">Status</th>
              <th className="px-3 py-2 border-b text-left">Submitted By</th>
              <th className="px-3 py-2 border-b text-left">Submitted Date</th>
              <th className="px-3 py-2 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No submissions found
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b font-medium">
                    {submission.submissionId || submission.id}
                  </td>
                  <td className="px-3 py-2 border-b">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                        {submission.stateUt?.charAt(0) || "N"}
                      </span>
                      {submission.stateUt || "N/A"}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                        submission.status
                      )}`}
                    >
                      {submission.status?.replace(/_/g, " ") || "Unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b">
                    {submission.user?.firstName} {submission.user?.lastName}
                  </td>
                  <td className="px-3 py-2 border-b">
                    {submission.createdAt
                      ? new Date(submission.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-3 py-2 border-b text-center">
                    <Button
                      onClick={() => handleReview(submission.id, submission)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {user?.role === "MOSPI_REVIEWER" &&
                      submission.status === "RETURNED_FROM_MOSPI"
                        ? "View"
                        : "Review"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <hr />
      <div className="flex justify-center mt-8">
        <Button
          onClick={() => navigate("/data-submission/review")}
          className="gap-2"
        >
          View All
        </Button>
      </div>
    </div>
  );
}
