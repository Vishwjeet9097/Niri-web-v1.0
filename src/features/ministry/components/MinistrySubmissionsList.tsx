import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMospiMinistrySubmissionDetails } from '@/services/ministry.service';
import { UnifiedSubmissionCard } from '@/components/ui/UnifiedSubmissionCard';
import { notificationService } from '@/services/notification.service';
import { Loader2, FileText, Search, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface MinistrySubmissionsListProps {
  userId: string;
}

export function MinistrySubmissionsList({ userId }: MinistrySubmissionsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (userId) {
      loadSubmissions();
    } else {
      setLoading(false);
      setError('User ID is required');
    }
  }, [userId]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading ministry submissions for MOSPI user:', userId);
      // Using userId as submissionId parameter for the API endpoint
      // The API endpoint: /ministry/dashboard/submission-details/{submissionId}
      const response = await getMospiMinistrySubmissionDetails(userId);
      
      if (response?.status && response?.data?.submissions) {
        console.log('✅ Loaded ministry submissions:', response.data.submissions.length);
        setSubmissions(response.data.submissions);
        setError(null);
      } else {
        setSubmissions([]);
        setError('No submissions found');
      }
    } catch (error: any) {
      console.error('❌ Error loading ministry submissions:', error);
      notificationService.error(
        error?.message || 'Failed to load ministry submissions',
        'Load Error'
      );
      setSubmissions([]);
      setError(error?.message || 'Failed to load ministry submissions');
    } finally {
      setLoading(false);
    }
  };

  // Filter submissions based on search query
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) {
      return submissions;
    }

    const query = searchQuery.toLowerCase().trim();
    return submissions.filter((submission) => {
      // Search by submission ID
      const submissionIdMatch = submission.submissionId?.toLowerCase().includes(query);
      
      // Search by ministry name
      const ministryNameMatch = submission.user?.ministryName?.toLowerCase().includes(query);
      
      // Search by submitter name
      const submitterNameMatch = submission.user 
        ? `${submission.user.firstName} ${submission.user.lastName}`.toLowerCase().includes(query)
        : false;

      // Search by status
      const statusMatch = submission.formStatus?.toLowerCase().includes(query) ||
                         submission.formStatusLabel?.toLowerCase().includes(query);

      return submissionIdMatch || ministryNameMatch || submitterNameMatch || statusMatch;
    });
  }, [submissions, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED_TO_MOSPI_APPROVER":
      case "SUBMITTED_TO_MOSPI_REVIEWER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "APPROVED":
      case "ACCEPTED_BY_MOSPI":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECTED":
      case "REJECTED_FINAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "DRAFT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "RETURNED_FROM_MOSPI":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string, formStatusLabel?: string) => {
    if (formStatusLabel) {
      return formStatusLabel;
    }
    switch (status) {
      case "SUBMITTED_TO_MOSPI_APPROVER":
        return "Waiting for Final Approval";
      case "SUBMITTED_TO_MOSPI_REVIEWER":
        return "Under MoSPI Review";
      case "APPROVED":
      case "ACCEPTED_BY_MOSPI":
        return "Approved";
      case "DRAFT":
        return "Draft";
      case "REJECTED":
      case "REJECTED_FINAL":
        return "Rejected";
      case "RETURNED_FROM_MOSPI":
        return "Returned from MoSPI";
      default:
        return status?.replace(/_/g, " ") || "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && submissions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No submissions found
          </h3>
          <p className="text-sm text-muted-foreground">
            {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search submission, ministry, or submitter"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No submissions found
            </h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search query
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => {
            // Determine next step based on formStatus
            let nextStep = "Complete submission";
            const formStatus = submission.formStatus || submission.status;
            
            if (formStatus === "DRAFT") {
              nextStep = "Complete all required sections";
            } else if (formStatus === "SUBMITTED_TO_MOSPI_APPROVER") {
              nextStep = "Waiting for final approval";
            } else if (formStatus === "SUBMITTED_TO_MOSPI_REVIEWER") {
              nextStep = "Under MoSPI review";
            } else if (formStatus === "APPROVED" || formStatus === "ACCEPTED_BY_MOSPI") {
              nextStep = "Submission approved";
            } else if (formStatus === "REJECTED" || formStatus === "REJECTED_FINAL") {
              nextStep = "Address reviewer feedback";
            } else if (formStatus === "RETURNED_FROM_MOSPI") {
              nextStep = "Returned from MoSPI - revision required";
            }

            const submittedByText = submission.user
              ? `${submission.user.firstName || ""} ${submission.user.lastName || ""}`.trim() || "Unknown"
              : "Unknown";

            return (
              <UnifiedSubmissionCard
                key={submission.id}
                id={submission.id}
                title={submission.submissionId || `Submission ${submission.id}`}
                status={formStatus}
                referenceId={submission.submissionId || submission.id}
                updatedDate={
                  submission.createdAt
                    ? new Date(submission.createdAt).toLocaleDateString()
                    : "N/A"
                }
                dueDate={
                  submission.updatedAt
                    ? new Date(submission.updatedAt).toLocaleDateString()
                    : "N/A"
                }
                progress={0} // Ministry submissions don't have progress calculation here
                nextStep={nextStep}
                submission={submission}
                currentUserRole={user?.role}
                submittedBy={submittedByText}
                stateUt={submission.user?.ministryName || "N/A"}
                onViewDetails={() =>
                  navigate(`/ministry/review-submissions/form-review/${submission.id}?isConsolidated=true`)
                }
                onReview={() =>
                  navigate(`/ministry/review-submissions/form-review/${submission.id}?isConsolidated=true`)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

