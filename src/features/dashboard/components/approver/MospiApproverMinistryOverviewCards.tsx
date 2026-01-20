import React, { useState, useEffect } from "react";
import { CheckCircle, Search, RotateCcw, FileText } from "lucide-react";
import { mospiMinisteryTab } from "@/services/ministry.service";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/features/auth/AuthProvider";

interface OverviewCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  borderColor: string;
  iconColor: string;
  onClick?: () => void;
  isSelected?: boolean;
}

const OverviewCard: React.FC<OverviewCardProps> = ({
  icon,
  title,
  value,
  description,
  borderColor,
  iconColor,
  onClick,
  isSelected,
}) => {
  return (
    <div
      className={`bg-white rounded-lg border-l-4 ${borderColor} p-6 shadow-sm ${
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      } ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={`${iconColor} p-3 rounded-lg flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
};

interface MospiApproverMinistryOverviewCardsProps {
  onStatusFilterChange?: (status: string | null) => void;
  onCardTitleChange?: (title: string | null) => void;
}

export const MospiApproverMinistryOverviewCards = ({
  onStatusFilterChange,
  onCardTitleChange,
}: MospiApproverMinistryOverviewCardsProps = {}) => {
  const { user } = useAuth();
  const isMospiApprover = user?.role === "MOSPI_APPROVER";
  const isMospiReviewer = user?.role === "MOSPI_REVIEWER";

 
  const [loading, setLoading] = useState(true);
  const [fullSubmission, setFullSubmission] = useState({ count: 0, total: 0 });
  const [approved, setApproved] = useState({ count: 0, total: 0 });
  const [underReview, setUnderReview] = useState({ count: 0, total: 0 });
  const [returnedToMinistry, setReturnedToMinistry] = useState({
    count: 0,
    total: 0,
  });
  const [selectedCardTitle, setSelectedCardTitle] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const metricsData = await mospiMinisteryTab(user.id);

        if (isMospiApprover) {
          // For MOSPI_APPROVER: response has accepted, underReview, returnedToMinistry, total
          const approvedCount = metricsData.accepted || 0;
          const underReviewCount = metricsData.underReview || 0;
          const returnedCount = metricsData.returnedToMinistry || 0;
          const total = metricsData.total || 0;

          setApproved({ count: approvedCount, total });
          setUnderReview({ count: underReviewCount, total });
          setReturnedToMinistry({ count: returnedCount, total });
        } else if (isMospiReviewer) {
          // For MOSPI_REVIEWER: response has fullSubmission, accepted, underReview, total
          const fullSubmissionCount = metricsData.fullSubmission || 0;
          const approvedCount = metricsData.accepted || 0;
          const underReviewCount = metricsData.underReview || 0;
          const total = metricsData.total || 0;

          setFullSubmission({ count: fullSubmissionCount, total });
          setApproved({ count: approvedCount, total });
          setUnderReview({ count: underReviewCount, total });
        }
      } catch (error) {
        console.error("Failed to load ministry overview data:", error);
        notificationService.error(
          "Failed to load ministry overview data. Please try again.",
          "Load Error"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, isMospiApprover, isMospiReviewer]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg border-l-4 border-gray-300 p-6 shadow-sm animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                <div className="h-8 bg-gray-200 rounded mb-2 w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
        <div className="grid gap-6 md:grid-cols-3">
        {isMospiReviewer && (
            <OverviewCard
              icon={<FileText className="w-6 h-6 text-blue-600" />}
              title="Full Submission"
              value={`${fullSubmission.count}/${fullSubmission.total}`}
              description="Ministries with full submissions"
              borderColor="border-blue-500"
              iconColor="bg-blue-50"
              onClick={() => {
                const newTitle = selectedCardTitle === "Full Submission" ? null : "Full Submission";
                setSelectedCardTitle(newTitle);
                onCardTitleChange?.(newTitle);
                onStatusFilterChange?.(newTitle ? "FULL_SUBMISSION" : null);
              }}
              isSelected={selectedCardTitle === "Full Submission"}
            />
          )}
            
          <OverviewCard
            icon={<CheckCircle className="w-6 h-6 text-green-600" />}
            title="Approved"
            value={`${approved.count}/${approved.total}`}
            description="No. of Ministries fully approved"
            borderColor="border-green-500"
            iconColor="bg-green-50"
            onClick={() => {
              const newTitle = selectedCardTitle === "Approved" ? null : "Approved";
              setSelectedCardTitle(newTitle);
              onCardTitleChange?.(newTitle);
              onStatusFilterChange?.(newTitle ? "APPROVED" : null);
            }}
            isSelected={selectedCardTitle === "Approved"}
          />

          <OverviewCard
            icon={<Search className="w-6 h-6 text-orange-600" />}
            title="Under Review"
            value={`${underReview.count}/${underReview.total}`}
            description="Approval in progress"
            borderColor="border-orange-500"
            iconColor="bg-orange-50"
            onClick={() => {
              const newTitle = selectedCardTitle === "Under Review" ? null : "Under Review";
              setSelectedCardTitle(newTitle);
              onCardTitleChange?.(newTitle);
              // For ministry submissions, use card title for client-side filtering
              // Status value is not used for API calls in ministry tab
              onStatusFilterChange?.(newTitle ? "Under Review" : null);
            }}
            isSelected={selectedCardTitle === "Under Review"}
          />

          {isMospiApprover && (
            <OverviewCard
              icon={<RotateCcw className="w-6 h-6 text-yellow-600" />}
              title="Returned to Ministry Approver"
              value={`${returnedToMinistry.count}/${returnedToMinistry.total}`}
              description="Need Revision"
              borderColor="border-yellow-500"
              iconColor="bg-yellow-50"
              onClick={() => {
                const newTitle = selectedCardTitle === "Returned to Ministry Approver" ? null : "Returned to Ministry Approver";
                setSelectedCardTitle(newTitle);
                onCardTitleChange?.(newTitle);
                onStatusFilterChange?.(newTitle ? "RETURNED_TO_MINISTRY" : null);
              }}
              isSelected={selectedCardTitle === "Returned to Ministry Approver"}
            />
          )}

       
        </div>
      </div>
    </div>
  );
};
