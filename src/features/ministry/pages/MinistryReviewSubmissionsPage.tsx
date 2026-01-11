import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubmissionsForCurrentUser } from '@/services/ministry.service';
import { MinistrySubmissionCard } from '../components/MinistrySubmissionCard';
import { MinistrySubmissionSearchBar } from '../components/MinistrySubmissionSearchBar';
import { notificationService } from '@/services/notification.service';
import { Loader2, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/AuthProvider';

export function MinistryReviewSubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
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
      console.log('🔍 Loading ministry submissions for current user:', user?.id);
      const response = await getSubmissionsForCurrentUser();
      console.log('📋 API Response:', response);
      console.log('📋 Response type:', typeof response);
      console.log('📋 Response.data:', response.data);
      console.log('📋 Response.data type:', typeof response.data);
      console.log('📋 Is response.data an array?', Array.isArray(response.data));
      console.log('📋 Response.status:', response.status);
      console.log('📋 Response.message:', response.message);
      
      // The API returns {status: true, data: Array(1), message: '...'}
      // Check if response is directly an array first (arrays are objects in JS)
      if (Array.isArray(response)) {
        console.log('📋 Response is directly an array, using it');
        setSubmissions(response);
        setError(null);
        setDebugInfo({
          rawResponse: response,
          processedData: response,
          count: response.length,
        });
        
        if (response.length === 0) {
          console.warn('⚠️ No submissions found for current user');
          setError('No submissions found. You have not submitted any indicators yet.');
        }
      }
          // Check if response has the expected structure {status, data, message}
          else if (response && typeof response === 'object' && response.data && Array.isArray(response.data)) {
            const submissionsData = response.data;
            
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
        setDebugInfo({
          rawResponse: response,
          processedData: submissionsData,
          count: submissionsData.length,
        });
        
        if (submissionsData.length === 0) {
          console.warn('⚠️ No submissions found for current user');
          setError('No submissions found. You have not submitted any indicators yet.');
        }
      }
      // If response.data exists but is not an array
      else if (response && typeof response === 'object' && response.data && !Array.isArray(response.data)) {
        console.warn('⚠️ Response.data exists but is not an array:', {
          response,
          dataType: typeof response.data,
          dataValue: response.data
        });
        setSubmissions([]);
        setError('Unexpected response format: data is not an array.');
        setDebugInfo({
          rawResponse: response,
          error: 'Response.data is not an array',
          dataType: typeof response.data,
          dataValue: response.data
        });
      }
      // If response is an object but doesn't have data property
      else if (response && typeof response === 'object' && !response.data) {
        console.warn('⚠️ Response is an object but missing data property:', {
          response,
          responseKeys: Object.keys(response)
        });
        setSubmissions([]);
        setError('Unexpected response format: missing data property.');
        setDebugInfo({
          rawResponse: response,
          error: 'Response missing data property',
          responseKeys: Object.keys(response)
        });
      }
      else {
        console.warn('⚠️ Unexpected response structure:', response);
        setSubmissions([]);
        setError('Unexpected response format from server.');
        setDebugInfo({
          rawResponse: response,
          error: 'Unexpected response structure',
        });
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
      setDebugInfo({
        error: errorMessage,
        status: error.response?.status,
        data: error.response?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (submission: any) => {
    // Navigate to submission review page
    navigate(`/ministry/review-submissions/form-review/${submission.id}`);
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
            {debugInfo && (
              <details className="mt-4 text-left max-w-2xl w-full">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Debug Information
                </summary>
                <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}
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
                status={submission.status}
                updatedDate={submission.updatedAt}
                progress={progress}
                totalIndicators={submission.totalIndicators || 0}
                submittedIndicators={submission.submittedIndicators || 0}
                nextStep={getNextStep(submission.status)}
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

