import { useState, useMemo, useEffect } from "react";
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
import { exportTableToCSV } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { hasMospiApproverComment, getMospiApproverComment, canReviewSubmission } from "@/utils/auditUtils";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/features/auth/AuthProvider";

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-lg shadow-sm border p-6">
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
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className={`bg-card border-l-4 ${
                    submission.status === "overdue"
                      ? "border-l-red-500"
                      : submission.status === "APPROVED"
                      ? "border-l-green-500"
                      : "border-l-orange-500"
                  } rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
                    submission.status !== "APPROVED" ? "cursor-pointer" : "cursor-default"
                  }`}
                  onClick={() => {
                    if (submission.status !== "APPROVED") {
                      navigate(`/data-submission/review/${submission.id}`);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {submission.submissionId || submission.title}
                        </h3>
                        {submission.status === "APPROVED" ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                        ) : submission.status === "REJECTED" || submission.status === "REJECTED_FINAL" ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </Badge>
                        ) : hasMospiApproverComment(submission) ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Action Required
                          </Badge>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Submitted by</p>
                          <p className="font-medium text-foreground">
                            {submission.user ? `${submission.user.firstName} ${submission.user.lastName}` : submission.submittedBy?.name || "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Submission Date
                          </p>
                          <p className="font-medium text-foreground">
                            {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : submission.submissionDate || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Deadline</p>
                          <p className="font-medium text-foreground">
                            {submission.deadline || (submission.createdAt ? new Date(new Date(submission.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "N/A")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Category</p>
                          <p className="font-medium text-foreground">
                            {submission.category || "Infrastructure"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {submission.status === "APPROVED" ? (
                      <Button
                        className="ml-4 gap-2 bg-green-600 hover:bg-green-700 cursor-default"
                        disabled
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approved
                      </Button>
                    ) : submission.status === "REJECTED" || submission.status === "REJECTED_FINAL" ? (
                      <Button
                        className="ml-4 gap-2 bg-red-600 hover:bg-red-700 cursor-default"
                        disabled
                      >
                        <AlertCircle className="w-4 h-4" />
                        Rejected
                      </Button>
                    ) : hasMospiApproverComment(submission) ? (
                      <Button
                        onClick={() =>
                          navigate(`/data-submission/review/${submission.id}`)
                        }
                        className="ml-4 gap-2 bg-red-600 hover:bg-red-700"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Action Required
                      </Button>
                    ) : canReviewSubmission(user?.role || "", submission.status) ? (
                      <Button
                        onClick={() =>
                          navigate(`/data-submission/review/${submission.id}`)
                        }
                        className="ml-4"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Review Now
                      </Button>
                    ) : null}
                  </div>

                  {/* Progress Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">
                        Progress
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {submission.progress || (submission.formData ? Math.min(100, Object.keys(submission.formData).length * 20) : 0)}%
                      </p>
                    </div>
                    <Progress
                      value={submission.progress || (submission.formData ? Math.min(100, Object.keys(submission.formData).length * 20) : 0)}
                      className="h-2 mb-3"
                    />
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{submission.attachedFiles?.length || submission.documentsCount || 0} documents</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Pending {submission.daysPending || (submission.createdAt ? Math.max(0, Math.floor((new Date().getTime() - new Date(submission.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 0)} days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{submission.progress || (submission.formData ? Math.min(100, Object.keys(submission.formData).length * 20) : 0)}% complete</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              filteredSubmissions.map((submission) => (
                <Card
                  key={submission.id}
                  className={`border-l-4 ${
                    submission.status === "overdue"
                      ? "border-l-red-500"
                      : submission.status === "APPROVED"
                      ? "border-l-green-500"
                      : "border-l-orange-500"
                  } hover:shadow-md transition-shadow ${
                    submission.status !== "APPROVED" ? "cursor-pointer" : "cursor-default"
                  }`}
                  onClick={() => {
                    if (submission.status !== "APPROVED") {
                      navigate(`/data-submission/review/${submission.id}`);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-foreground line-clamp-2">
                        {submission.submissionId || submission.title}
                      </CardTitle>
                      {submission.status === "APPROVED" ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      ) : submission.status === "REJECTED" || submission.status === "REJECTED_FINAL" ? (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Rejected
                        </Badge>
                      ) : hasMospiApproverComment(submission) ? (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Action Required
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Submitted by</p>
                          <p className="font-medium text-foreground truncate">
                            {submission.user ? `${submission.user.firstName} ${submission.user.lastName}` : submission.submittedBy?.name || "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Location</p>
                          <p className="font-medium text-foreground truncate">
                            {submission.stateUt || submission.submittedBy?.location || "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Deadline</p>
                          <p className="font-medium text-foreground">
                            {submission.deadline || (submission.createdAt ? new Date(new Date(submission.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "N/A")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Category</p>
                          <p className="font-medium text-foreground truncate">
                            {submission.category || "Infrastructure"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-foreground">
                            Progress
                          </p>
                          <p className="text-xs font-bold text-foreground">
                            {submission.progress || (submission.formData ? Math.min(100, Object.keys(submission.formData).length * 20) : 0)}%
                          </p>
                        </div>
                        <Progress
                          value={submission.progress || (submission.formData ? Math.min(100, Object.keys(submission.formData).length * 20) : 0)}
                          className="h-1.5"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{submission.attachedFiles?.length || submission.documentsCount || 0} docs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{submission.daysPending || (submission.createdAt ? Math.max(0, Math.floor((new Date().getTime() - new Date(submission.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 0)} days</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-3">
                        {submission.status === "APPROVED" ? (
                          <Button
                            className="w-full gap-2 bg-green-600 hover:bg-green-700 cursor-default"
                            disabled
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approved
                          </Button>
                        ) : submission.status === "REJECTED" || submission.status === "REJECTED_FINAL" ? (
                          <Button
                            className="w-full gap-2 bg-red-600 hover:bg-red-700 cursor-default"
                            disabled
                          >
                            <AlertCircle className="w-4 h-4" />
                            Rejected
                          </Button>
                        ) : hasMospiApproverComment(submission) ? (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/data-submission/review/${submission.id}`);
                            }}
                            className="w-full gap-2 bg-red-600 hover:bg-red-700"
                          >
                            <AlertCircle className="w-4 h-4" />
                            Action Required
                          </Button>
                        ) : canReviewSubmission(user?.role || "", submission.status) ? (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/data-submission/review/${submission.id}`);
                            }}
                            className="w-full gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            Review
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
