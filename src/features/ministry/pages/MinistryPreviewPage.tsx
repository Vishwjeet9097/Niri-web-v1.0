import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { MinistrySubmissionReviewWrapper } from './MinistrySubmissionReviewWrapper';

export function MinistryPreviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Get userId from query params or use current user's ID
  const userId = searchParams.get('userId') || user?.id;

  useEffect(() => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'User ID is required to preview submission.',
        variant: 'destructive',
      });
      navigate('/ministry/review-submissions');
      return;
    }
    setLoading(false);
  }, [userId, navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/ministry/review-submissions')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Submissions
        </Button>
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Ministry Preview Page
            </h1>
            <p className="text-sm text-gray-600">
              Review all indicators for your ministry submission
            </p>
          </CardContent>
        </Card>
      </div>

      <MinistrySubmissionReviewWrapper
        submission={null}
        userId={userId}
        useConsolidatedApi={false}
      />
    </div>
  );
}

