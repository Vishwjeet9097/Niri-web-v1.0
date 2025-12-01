import React, { useState, useEffect } from "react";
import { FileText, CheckCircle, Search, RotateCcw } from "lucide-react";
import { apiService } from "@/services/api.service";
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
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`${iconColor} p-3 rounded-lg flex-shrink-0`}>
          {icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
};

interface FilterBarProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ selectedFilter, onFilterChange }) => {
  const filters = ["All", "States/UTs", "Ministries"];

  return (
    <div className="bg-gray-800 rounded-lg p-1 flex gap-1">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedFilter === filter
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white hover:bg-gray-700"
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
};

interface MospiApproverOverviewCardsProps {
  onStatusFilterChange?: (status: string | null) => void;
}

export const MospiApproverOverviewCards = ({ onStatusFilterChange }: MospiApproverOverviewCardsProps = {}) => {
  const { user } = useAuth();
  const userRole = user?.role;
  const isMospiApprover = userRole === "MOSPI_APPROVER";
  const isMospiReviewer = userRole === "MOSPI_REVIEWER";
  
  const [loading, setLoading] = useState(true);
  const [fullSubmission, setFullSubmission] = useState({ count: 0, total: 36 });
  const [approved, setApproved] = useState({ count: 0, total: 36 });
  const [underReview, setUnderReview] = useState({ count: 0, total: 36 });
  const [returnedToState, setReturnedToState] = useState({ count: 0, total: 36 });
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        setLoading(true);
        
        // Fetch MOSPI metrics from the new API
        const metricsData = await apiService.getMospiMetrics();
        
        const { groupedByStatus, totalSubmissions, assignedStatesCount } = metricsData;
        
        // Total count logic:
        // - MOSPI_APPROVER: Always 36
        // - MOSPI_REVIEWER: assignedStatesCount (optional, with fallback to 36)
        const total = isMospiApprover 
          ? 36 
          : (assignedStatesCount || 36);

        // For MOSPI_REVIEWER: Calculate Full Submission (might need to fetch separately or use a different approach)
        // For now, we'll need to fetch submissions to calculate full submissions
        let fullSubmissionCount = 0;
        if (isMospiReviewer) {
          try {
            const submissionsData: any = await apiService.getSubmissions(1, 1000);
            let submissionsArray = [];
            if (Array.isArray(submissionsData)) {
              submissionsArray = submissionsData;
            } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
              submissionsArray = submissionsData.submissions;
            } else if (submissionsData?.data?.submissions && Array.isArray(submissionsData.data.submissions)) {
              submissionsArray = submissionsData.data.submissions;
            } else if (submissionsData?.data && Array.isArray(submissionsData.data)) {
              submissionsArray = submissionsData.data;
            }

            // Count unique entities with full submissions
            const entitiesWithFullSubmission = new Set<string>();
            submissionsArray.forEach((sub: any) => {
              if (sub.stateUt && sub.formData) {
                const hasInfraFinancing = !!sub.formData.infraFinancing;
                const hasInfraDevelopment = !!sub.formData.infraDevelopment;
                const hasPppDevelopment = !!sub.formData.pppDevelopment;
                const hasInfraEnablers = !!sub.formData.infraEnablers;
                if (hasInfraFinancing && hasInfraDevelopment && hasPppDevelopment && hasInfraEnablers) {
                  entitiesWithFullSubmission.add(sub.stateUt);
                }
              }
            });
            fullSubmissionCount = entitiesWithFullSubmission.size;
          } catch (error) {
            console.error("Failed to fetch full submission data:", error);
          }
        }

        // Map status counts from API response
        const approvedCount = groupedByStatus?.APPROVED || 0;
        
        // Under Review: Based on role
        let underReviewCount = 0;
        if (isMospiApprover) {
          underReviewCount = groupedByStatus?.SUBMITTED_TO_MOSPI_APPROVER || 0;
        } else if (isMospiReviewer) {
          underReviewCount = groupedByStatus?.SUBMITTED_TO_MOSPI_REVIEWER || 0;
        }

        // Returned to State Approver: For MOSPI_APPROVER, check for RETURNED_FROM_MOSPI or REJECTED_FINAL
        const returnedCount = groupedByStatus?.RETURNED_FROM_MOSPI || groupedByStatus?.REJECTED_FINAL || 0;

        setFullSubmission({
          count: fullSubmissionCount,
          total: total,
        });
        setApproved({
          count: approvedCount,
          total: total,
        });
        setUnderReview({
          count: underReviewCount,
          total: total,
        });
        setReturnedToState({
          count: returnedCount,
          total: total,
        });
      } catch (error) {
        console.error("❌ Failed to load overview data:", error);
        notificationService.error(
          "Failed to load overview data. Please try again.",
          "Load Error"
        );
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
  }, [isMospiApprover, isMospiReviewer]);

  if (loading) {
    const cardCount = isMospiApprover ? 3 : 3; // MOSPI_APPROVER: 3 cards (no Full Submission), MOSPI_REVIEWER: 3 cards
    return (
      <div className="space-y-6">
        {/* <FilterBar selectedFilter={selectedFilter} onFilterChange={setSelectedFilter} /> */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: cardCount }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border-l-4 border-gray-300 p-6 shadow-sm animate-pulse">
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
      {/* Filter Bar */}
      {/* <FilterBar selectedFilter={selectedFilter} onFilterChange={setSelectedFilter} /> */}

      {/* Overview Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Full Submission - Only for MOSPI_REVIEWER */}
          {isMospiReviewer && (
            <OverviewCard
              icon={<FileText className="w-6 h-6 text-blue-600" />}
              title="Full Submission"
              value={`${fullSubmission.count}/${fullSubmission.total}`}
              description="States/UTs/Ministries with full submissions"
              borderColor="border-blue-500"
              iconColor="bg-blue-50"
              onClick={() => {
                const newStatus = selectedStatus === "FULL_SUBMISSION" ? null : "FULL_SUBMISSION";
                setSelectedStatus(newStatus);
                onStatusFilterChange?.(newStatus);
              }}
              isSelected={selectedStatus === "FULL_SUBMISSION"}
            />
          )}
          
          {/* Approved - Show for both roles */}
          <OverviewCard
            icon={<CheckCircle className="w-6 h-6 text-green-600" />}
            title="Approved"
            value={`${approved.count}/${approved.total}`}
            description="No. of States/UTs/Ministries fully approved"
            borderColor="border-green-500"
            iconColor="bg-green-50"
            onClick={() => {
              const newStatus = selectedStatus === "APPROVED" ? null : "APPROVED";
              setSelectedStatus(newStatus);
              onStatusFilterChange?.(newStatus);
            }}
            isSelected={selectedStatus === "APPROVED"}
          />
          
          {/* Under Review - Show for both roles */}
          <OverviewCard
            icon={<Search className="w-6 h-6 text-orange-600" />}
            title="Under Review"
            value={`${underReview.count}/${underReview.total}`}
            description="Approval in progress"
            borderColor="border-orange-500"
            iconColor="bg-orange-50"
            onClick={() => {
              const status = isMospiApprover ? "SUBMITTED_TO_MOSPI_APPROVER" : "SUBMITTED_TO_MOSPI_REVIEWER";
              const newStatus = selectedStatus === status ? null : status;
              setSelectedStatus(newStatus);
              onStatusFilterChange?.(newStatus);
            }}
            isSelected={selectedStatus === (isMospiApprover ? "SUBMITTED_TO_MOSPI_APPROVER" : "SUBMITTED_TO_MOSPI_REVIEWER")}
          />
          
          {/* Returned to State Approver - Only for MOSPI_APPROVER */}
          {isMospiApprover && (
            <OverviewCard
              icon={<RotateCcw className="w-6 h-6 text-yellow-600" />}
              title="Returned to State Approver"
              value={`${returnedToState.count}/${returnedToState.total}`}
              description="Need Revision"
              borderColor="border-yellow-500"
              iconColor="bg-yellow-50"
              onClick={() => {
                const newStatus = selectedStatus === "RETURNED_FROM_MOSPI" ? null : "RETURNED_FROM_MOSPI";
                setSelectedStatus(newStatus);
                onStatusFilterChange?.(newStatus);
              }}
              isSelected={selectedStatus === "RETURNED_FROM_MOSPI"}
            />
          )}
        </div>
      </div>
    </div>
  );
};

