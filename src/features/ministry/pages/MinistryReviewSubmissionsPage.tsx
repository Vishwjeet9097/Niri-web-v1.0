import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// import { getSubmissionsForCurrentUser } from '@/services/ministry.service'; // Commented out - using new API
import { getMospiMinistrySubmissionDetails } from '@/services/ministry.service'; // New API
import { MinistrySubmissionCard } from '../components/MinistrySubmissionCard';
import { MinistrySubmissionSearchBar } from '../components/MinistrySubmissionSearchBar';
import { MinistryApprovedIndicatorsCard } from '../components/MinistryApprovedIndicatorsCard';
import { notificationService } from '@/services/notification.service';
import { Loader2, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/AuthProvider';

/** When consolidated form has this status, individual forms show "Approved" and indicators are frozen. */
const FORM_STATUS_WITH_MOSPI = [
  'SUBMITTED_TO_MOSPI_REVIEWER',
  'SUBMITTED_TO_MOSPI_APPROVER',
  'ACCEPTED_BY_MOSPI',
];

export function MinistryReviewSubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      loadSubmissions();
    } else {
      setLoading(false);
      setError('User not authenticated. Please log in.');
    }
  }, [user?.id]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        setError('User ID is required');
        setLoading(false);
        return;
      }

      console.log('🔍 Loading ministry submissions using new API for user:', user?.id);
      
      // NEW API: Using getMospiMinistrySubmissionDetails with userId as submissionId parameter
      // The API endpoint: /ministry/dashboard/submission-details/{submissionId}
      // We're using userId as the submissionId parameter
      const response = await getMospiMinistrySubmissionDetails(user.id);
      
      console.log('📋 New API Response:', response);
      console.log('📋 Response status:', response.status);
      console.log('📋 Response data:', response.data);
      console.log('📋 Submissions array:', response.data?.submissions);
      
      // OLD API IMPLEMENTATION (COMMENTED OUT):
      // const response = await getSubmissionsForCurrentUser();
      // console.log('📋 API Response:', response);
      // console.log('📋 Response type:', typeof response);
      // console.log('📋 Response.data:', response.data);
      // console.log('📋 Response.data type:', typeof response.data);
      // console.log('📋 Is response.data an array?', Array.isArray(response.data));
      // console.log('📋 Response.status:', response.status);
      // console.log('📋 Response.message:', response.message);
      
      // Handle new API response structure: { status, data: { submissions: [...] }, message }
      if (response?.status && response?.data?.submissions && Array.isArray(response.data.submissions)) {
        const submissionsData = response.data.submissions;
        
        console.log('📋 Processed submissions data:', submissionsData);
        console.log('📋 Submissions count:', submissionsData.length);
        
        // Debug: Log first submission's user object to see ministryName
        if (submissionsData.length > 0) {
          console.log('📋 First submission:', submissionsData[0]);
          console.log('📋 First submission user:', submissionsData[0]?.user);
          console.log('📋 First submission ministryName:', submissionsData[0]?.user?.ministryName);
          console.log('📋 First submission ministryId:', submissionsData[0]?.user?.ministryId);
          console.log('📋 First submission user keys:', submissionsData[0]?.user ? Object.keys(submissionsData[0].user) : 'no user');
        }
        
        setSubmissions(submissionsData);
        setError(null);
        
        if (submissionsData.length === 0) {
          console.warn('⚠️ No submissions found for current user');
          setError('No submissions found. You have not submitted any indicators yet.');
        }
      } else {
        console.warn('⚠️ Unexpected response structure from new API:', response);
        setSubmissions([]);
        setError('Unexpected response format from server.');
      }
    } catch (error: any) {
      console.error('❌ Error loading submissions:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
      });
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load ministry submissions';
      notificationService.error(errorMessage);
      setSubmissions([]);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (submission: any) => {
    // Check if submission is consolidated
    const isConsolidated = submission.isConsolidated === true;
    
    console.log('🔍 [handleViewDetails] Submission details:', {
      id: submission.id,
      isConsolidated: submission.isConsolidated,
      willPassConsolidatedParam: isConsolidated
    });
    
    // Navigate to submission review page with isConsolidated query parameter
    if (isConsolidated) {
      navigate(`/ministry/review-submissions/form-review/${submission.id}?isConsolidated=true`);
    } else {
      navigate(`/ministry/review-submissions/form-review/${submission.id}`);
    }
  };

  const handleReview = (submission: any) => {
    // Navigate to review page with userId
    console.log('🔍 Navigating to ministry submission review:', {
      userId: submission.userId,
      submissionId: submission.submissionId,
      url: `/ministry/submission?userId=${submission.userId}`
    });
    navigate(`/ministry/submission?userId=${submission.userId}`, { replace: false });
  };

  const calculateProgress = (submission: any) => {
    // Use the totalIndicators and submittedIndicators from the API response
    const total = submission.totalIndicators || 0;
    const submitted = submission.submittedIndicators || 0;
    const progress = total > 0 ? Math.round((submitted / total) * 100) : 0;
    console.log('📊 Progress calculated:', { 
      submissionId: submission.submissionId,
      total, 
      submitted, 
      progress 
    });
    return progress;
  };

  // Check if consolidated form is with MOSPI - if so, individual forms should show "Approved" status
  const hasConsolidatedWithMospi = useMemo(() => {
    return submissions.some(
      (s) =>
        s.isConsolidated === true &&
        FORM_STATUS_WITH_MOSPI.includes((s.status || s.formStatus || '').toUpperCase())
    );
  }, [submissions]);

  // Get display status for individual submissions: show "APPROVED" when consolidated form is with MOSPI
  const getDisplayStatusForSubmission = (submission: any): string => {
    const isIndividual = submission.isConsolidated !== true;
    if (isIndividual && hasConsolidatedWithMospi) {
      return 'APPROVED';
    }
    return submission.status || submission.formStatus || '';
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

      return submissionIdMatch || ministryNameMatch || submitterNameMatch;
    });
  }, [submissions, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const submissionCount = filteredSubmissions.length;
  const submissionText = submissionCount === 1 ? 'Submission Found' : 'Submissions Found';

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-6 bg-white rounded-lg">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Latest Submission
          </h1>
          <p className="text-sm text-gray-600">
            {submissionCount} {submissionText}
          </p>
        </CardContent>
      </Card>

      {/* Approved Indicators Card */}
      <MinistryApprovedIndicatorsCard
        submissions={submissions}
        loading={loading}
        onSubmissionSuccess={loadSubmissions}
      />

      {/* Search Bar */}
      <MinistrySubmissionSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search submission, submitters, or categories"
      />

      {submissions.length === 0 && !loading ? (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No submissions found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error || 'No ministry submissions have been created yet. Once a ministry approver creates and submits indicators, they will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => {
            console.log('🎴 Rendering submission card:', {
              id: submission.id,
              submissionId: submission.submissionId,
              status: submission.status,
              hasUser: !!submission.user,
              hasIndicators: !!submission.indicators,
              indicatorsCount: Array.isArray(submission.indicators) ? submission.indicators.length : 'not array'
            });
            
            const progress = calculateProgress(submission);

            // Determine next step based on status
            const getNextStep = (status: string) => {
              switch (status) {
                case 'DRAFT':
                  return 'Complete all required sections';
                case 'SUBMITTED_TO_STATE':
                case 'SUBMITTED_TO_MOSPI_REVIEWER':
                  return 'Awaiting review';
                case 'APPROVED':
                  return 'Submission approved';
                case 'REJECTED':
                case 'REJECTED_FINAL':
                  return 'Submission rejected - revision required';
                default:
                  return 'Complete all required sections';
              }
            };

            // Debug: Log the submission data to see what we're receiving
            console.log('🔍 [MinistryReviewSubmissionsPage] Submission data:', {
              id: submission.id,
              submissionId: submission.submissionId,
              user: submission.user,
              ministryName: submission.user?.ministryName,
              ministryId: submission.user?.ministryId,
              hasUser: !!submission.user,
              userKeys: submission.user ? Object.keys(submission.user) : [],
            });

            return (
              <MinistrySubmissionCard
                key={submission.id}
                id={submission.id}
                submissionId={submission.submissionId}
                ministryName={submission.user?.ministryName || 'N/A'}
                userName={
                  submission.user
                    ? `${submission.user.firstName} ${submission.user.lastName}`
                    : undefined
                }
                userEmail={submission.user?.email}
                status={getDisplayStatusForSubmission(submission)}
                updatedDate={submission.updatedAt}
                progress={progress}
                totalIndicators={submission.totalIndicators || 0}
                submittedIndicators={submission.submittedIndicators || 0}
                nextStep={getNextStep(getDisplayStatusForSubmission(submission))}
                onViewDetails={() => handleViewDetails(submission)}
                onReview={() => handleReview(submission)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

