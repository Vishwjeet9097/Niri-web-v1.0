import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { getMinistryProgressBarData } from '@/services/ministry.service';

interface ProgressStats {
  approved: number;
  total: number;
  percentage: number;
}

interface MinistryApprovedIndicatorsCardProps {
  submissions?: any[];
  loading?: boolean;
}

export function MinistryApprovedIndicatorsCard({
  submissions = [],
  loading = false,
}: MinistryApprovedIndicatorsCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ministryProgress, setMinistryProgress] = useState<ProgressStats | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const isFetchingProgress = useRef(false);

  useEffect(() => {
    if (!user?.id || loading) {
      return;
    }

    const loadProgress = async () => {
      // Avoid duplicate calls or running in background tab
      if (document?.hidden || isFetchingProgress.current) return;

      try {
        isFetchingProgress.current = true;
        setProgressLoading(true);
        console.log('📊 [MinistryProgress] Fetching progress data for user:', user.id);

        // Call the API endpoint: GET /ministry/dashboard/progress/:ministryUserId
        const response: any = await getMinistryProgressBarData(user.id);
        console.log('✅ [MinistryProgress] API response:', response);

        // Handle different response structures:
        // 1. Wrapped: { status, data: { accepted, total, formId }, message }
        // 2. Direct: { accepted, total, formId }
        let accepted = 0;
        let total = 0;

        if (response?.status && response?.data) {
          // Wrapped response structure
          accepted = response.data.accepted || 0;
          total = response.data.total || 0;
        } else if (response?.accepted !== undefined && response?.total !== undefined) {
          // Direct response structure (data object)
          accepted = response.accepted || 0;
          total = response.total || 0;
        } else {
          console.warn('⚠️ [MinistryProgress] Unexpected response structure:', response);
          // Try to extract from response.data if it exists
          if (response?.data) {
            accepted = response.data.accepted || 0;
            total = response.data.total || 0;
          }
        }

        // Calculate percentage
        const percentage = total > 0 ? Math.round((accepted / total) * 100) : 0;

        setMinistryProgress({
          approved: accepted,
          total: total,
          percentage,
        });

        console.log('✅ [MinistryProgress] Progress calculated:', {
          approved: accepted,
          total: total,
          percentage,
        });
      } catch (error: any) {
        console.error('❌ [MinistryProgress] Failed to load progress:', error);
        // Don't reset progress to null on error - keep existing progress
      } finally {
        setProgressLoading(false);
        isFetchingProgress.current = false;
      }
    };

    // Run immediately on mount
    loadProgress();

    // Refresh when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ [MinistryProgress] Page visible - refreshing progress');
        loadProgress();
      }
    };

    // Refresh when window gains focus (user navigates back)
    const handleFocus = () => {
      console.log('🎯 [MinistryProgress] Window focused - refreshing progress');
      loadProgress();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Auto-refresh every 60 seconds
    const intervalId = window.setInterval(loadProgress, 60_000);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, loading]);

  const handlePreviewClick = () => {
    // Navigate to preview page
    if (user?.id) {
      navigate(`/ministry/submission?userId=${user.id}`);
    }
  };

  if (progressLoading) {
    return (
      <div className="border rounded-lg p-4 border-amber-200 bg-amber-50/50">
        <div className="text-sm text-muted-foreground">Loading progress…</div>
      </div>
    );
  }

  if (!ministryProgress) {
    return null;
  }

  return (
    <div
      className={`border rounded-lg p-4 mb-6 ${
        ministryProgress.percentage === 100
          ? 'border-green-200 bg-green-50/50'
          : 'border-amber-200 bg-amber-50/50'
      }`}
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          Approved Indicator for FY 2025 - 2026
        </h2>
        <div className="flex items-center gap-2 text-sm mt-1">
          <span
            className={`font-medium ${
              ministryProgress.percentage === 100
                ? 'text-green-600'
                : 'text-amber-800'
            }`}
          >
            {ministryProgress.approved}/{ministryProgress.total}
          </span>
          <span
            className={
              ministryProgress.percentage === 100
                ? 'text-green-600'
                : 'text-amber-800'
            }
          >
            {Math.round(ministryProgress.percentage)}% Submitted
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Progress
            value={ministryProgress.percentage}
            className={`h-3 ${
              ministryProgress.percentage === 100
                ? '[&>div]:bg-green-600'
                : '[&>div]:bg-amber-700'
            }`}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="shrink-0 px-6 text-[#1e3a8a] hover:bg-gray-50 border-[#1e3a8a]"
            onClick={handlePreviewClick}
          >
            Preview
          </Button>
        </div>
      </div>
    </div>
  );
}

