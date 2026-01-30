import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { getMinistryDashboardIndicators } from "@/services/ministry.service";

interface IndicatorSummaryProps {
  userId: string;
}

export function IndicatorSummary({ userId }: IndicatorSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Array<{ code: string; name: string; status: string }>>([]);
  const [underReview, setUnderReview] = useState<Array<{ code: string; name: string; status: string }>>([]);
  const [pending, setPending] = useState<Array<{ code: string; name: string; status: string | null }>>([]);

  useEffect(() => {
    const fetchIndicatorData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getMinistryDashboardIndicators(userId);
        
        if (response.status && response.data) {
          setAccepted(response.data.accepted || []);
          setUnderReview(response.data.underReview || []);
          setPending(response.data.pending || []);
        } else {
          setError("Failed to load indicator data");
        }
      } catch (err: any) {
        console.error("[IndicatorSummary] Error fetching data:", err);
        setError(err?.message || "Failed to load indicator data");
        // Set empty arrays on error
        setAccepted([]);
        setUnderReview([]);
        setPending([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIndicatorData();
  }, [userId]);

  if (loading) {
    return (
      <div className="mt-6">
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 rounded-t-lg">
          <h2 className="text-lg font-semibold text-blue-900">
            Indicator Summary - Status overview of all indicators
          </h2>
        </div>
        <div className="flex items-center justify-center p-12 bg-white rounded-b-lg border border-t-0 border-gray-200">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading indicator data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6">
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 rounded-t-lg">
          <h2 className="text-lg font-semibold text-blue-900">
            Indicator Summary - Status overview of all indicators
          </h2>
        </div>
        <div className="p-6 bg-white rounded-b-lg border border-t-0 border-gray-200">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  const acceptedCount = accepted.length;
  const underReviewCount = underReview.length;
  const pendingCount = pending.length;
  const pendingIndicators = pending.map((ind) => ind.code);

  return (
    <div className="mt-6">
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 rounded-t-lg">
        <h2 className="text-lg font-semibold text-blue-900">
          Indicator Summary - Status overview of all indicators
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white rounded-b-lg border border-t-0 border-gray-200">
        {/* Under Review Card */}
        <Card className="bg-yellow-50 border-yellow-300">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-200 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Under Review
                </h3>
                <p className="text-2xl font-bold text-yellow-900 mb-2">
                  {underReviewCount} indicators
                </p>
                {underReviewCount > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {underReview.map((indicator, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs px-2 py-1"
                      >
                        {indicator.code}
                      </Badge>
                    ))}
                  </div>
                )}
                {underReviewCount === 0 && (
                  <p className="text-sm text-gray-600">
                    No indicators under review
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Card */}
        <Card className="bg-white border-gray-300">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-gray-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Pending
                </h3>
                <p className="text-2xl font-bold text-gray-900 mb-3">
                  {pendingCount} indicators
                </p>
                {pendingIndicators.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingIndicators.map((indicator, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-gray-100 text-gray-700 border-gray-300 text-xs px-2 py-1"
                      >
                        {indicator}
                      </Badge>
                    ))}
                  </div>
                )}
                {pendingCount === 0 && (
                  <p className="text-sm text-gray-600">
                    No pending indicators
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accepted Card */}
        <Card className="bg-green-50 border-green-300">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Accepted
                </h3>
                <p className="text-2xl font-bold text-green-900 mb-2">
                  {acceptedCount} indicators
                </p>
                {acceptedCount > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {accepted.map((indicator, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-green-100 text-green-700 border-green-300 text-xs px-2 py-1"
                      >
                        {indicator.code}
                      </Badge>
                    ))}
                  </div>
                )}
                {acceptedCount === 0 && (
                  <p className="text-sm text-gray-600">
                    No accepted indicators
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

