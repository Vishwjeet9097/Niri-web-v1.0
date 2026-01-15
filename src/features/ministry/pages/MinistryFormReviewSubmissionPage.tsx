import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { getSubmissionsForCurrentUser, getMospiMinistrySubmissionDetails } from '@/services/ministry.service';
import { useAuth } from '@/features/auth/AuthProvider';
import { MinistrySubmissionDetailsCard } from '../components/MinistrySubmissionDetailsCard';
import { MinistryOverviewTab } from '../components/tabs/MinistryOverviewTab';
import { MinistryDataReviewTab } from '../components/tabs/MinistryDataReviewTab';
import { MinistryDocumentsTab } from '../components/tabs/MinistryDocumentsTab';
import { MinistryHistoryTab } from '../components/tabs/MinistryHistoryTab';

export function MinistryFormReviewSubmissionPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  
  // Check if isConsolidated query parameter is true
  // If true, use consolidated API, otherwise use regular API
  const isConsolidated = searchParams.get('isConsolidated') === 'true';
  
  console.log("🔍 Ministry Review Page - API Selection:", {
    isConsolidated,
    submissionId: id,
    willUseConsolidatedApi: isConsolidated
  });
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadSubmission();
    } else {
      setLoading(false);
      setError('Submission ID not found');
    }
  }, [id, isConsolidated]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      
      // For consolidated submissions, first call current user API to get submission details
      // This provides the submission metadata (user info, status, etc.)
      if (isConsolidated) {
        console.log("📋 Loading consolidated submission - Step 1: Getting submission from current user API, submissionId:", id);
        
        // First, get submission from current user API
        const response = await getSubmissionsForCurrentUser();
        
        let submissionsData: any[] = [];
        if (Array.isArray(response)) {
          submissionsData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          submissionsData = response.data;
        }

        // Find the submission by ID
        const foundSubmission = submissionsData.find((sub) => sub.id === id);
        
        if (foundSubmission) {
          console.log("✅ Found consolidated submission from current user API:", foundSubmission);
          setSubmission(foundSubmission);
        } else {
          // Fallback: Try MOSPI dashboard API if not found in current user API
          console.log("⚠️ Submission not found in current user API, trying MOSPI dashboard API...");
          
          if (!user?.id) {
            setError('User ID is required for consolidated API');
            setLoading(false);
            return;
          }
          
          const mospiResponse = await getMospiMinistrySubmissionDetails(user.id);
          
          if (mospiResponse?.status && mospiResponse?.data?.submissions) {
            const foundInMospi = mospiResponse.data.submissions.find((sub: any) => sub.id === id);
            
            if (foundInMospi) {
              console.log("✅ Found submission from MOSPI dashboard API:", foundInMospi);
              setSubmission(foundInMospi);
            } else {
              setError('Submission not found in consolidated data');
            }
          } else {
            setError('Failed to load submissions from consolidated API');
          }
        }
      } else {
        // Use regular API - get submission from current user's submissions
        console.log("📋 Loading submission using regular API, submissionId:", id);
        const response = await getSubmissionsForCurrentUser();
        
        let submissionsData: any[] = [];
        if (Array.isArray(response)) {
          submissionsData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          submissionsData = response.data;
        }

        // Find the submission by ID
        const foundSubmission = submissionsData.find((sub) => sub.id === id);
        
        if (foundSubmission) {
          console.log("✅ Found submission from regular API:", foundSubmission);
          setSubmission(foundSubmission);
        } else {
          setError('Submission not found');
        }
      }
    } catch (error: any) {
      console.error('Error loading submission:', error);
      setError(error.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/ministry/review-submissions');
  };

  const statusConfig: Record<string, { label: string; badgeClass: string }> = {
    DRAFT: {
      label: 'Draft',
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    },
    SUBMITTED_TO_STATE: {
      label: 'Submitted',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    SUBMITTED_TO_MOSPI_REVIEWER: {
      label: 'Under Review',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    APPROVED: {
      label: 'Approved',
      badgeClass: 'bg-green-100 text-green-800 border-green-200',
    },
    REJECTED: {
      label: 'Rejected',
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
    },
    REJECTED_FINAL: {
      label: 'Rejected',
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-white rounded-lg">
          <CardContent className="p-6">
            <p className="text-red-600">{error || 'Submission not found'}</p>
            <Button onClick={handleBack} variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = submission.status || 'DRAFT';
  const config = statusConfig[status] || {
    label: status,
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const ministryName = submission.user?.ministryName || 'N/A';
  const submissionId = submission.submissionId || 'N/A';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Card */}
      <Card className="mb-6 bg-white rounded-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Back Button */}
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-primary hover:text-primary/90 hover:bg-primary/10 p-0 h-auto mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Review Submission
              </h1>

              {/* Submission ID and Ministry */}
              <p className="text-sm text-gray-600">
                {submissionId} • {ministryName}
              </p>
            </div>

            {/* Status Badge */}
            <Badge variant="outline" className={`${config.badgeClass} text-xs font-medium px-3 py-1`}>
              {config.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Submission Details Card */}
      <MinistrySubmissionDetailsCard
        submittedByName={submission.user ? `${submission.user.firstName} ${submission.user.lastName}` : undefined}
        submittedByEmail={submission.user?.email}
        submissionDate={submission.createdAt}
        currentOwner={submission.user?.role}
        currentUserRole={user?.role}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data-review">Data Review</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <MinistryOverviewTab 
            submission={submission} 
            currentUserRole={user?.role}
            currentUserPhone={user?.contactNumber}
          />
        </TabsContent>

        <TabsContent value="data-review">
          <MinistryDataReviewTab 
            submission={submission}
            useConsolidatedApi={isConsolidated}
            submissionId={id}
          />
        </TabsContent>

        <TabsContent value="documents">
          <MinistryDocumentsTab 
            submission={submission}
            documents={submission?.attachedFiles || []}
            formData={submission?.formData}
            submissionId={submission?.id}
          />
        </TabsContent>

        <TabsContent value="history">
          <MinistryHistoryTab submission={submission} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

