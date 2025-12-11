// niri - web / src / features / dashboard / ReviewerDashboardPage.tsx;
import React from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Navigate } from "react-router-dom";
import ReviewerKPICards from "./components/reviewer/ReviewerKPICards";
import ReviewerSubmissionsTable from "./components/reviewer/ReviewerSubmissionsTable";
import ReviewerRecentActions from "./components/reviewer/ReviewerRecentActions";
import ReviewerQuickActions from "./components/reviewer/ReviewerQuickActions";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { computeAllStepsSummary } from "@/features/submission/utils/progress";

const ReviewerDashboardPage: React.FC = () => {
  const { hasRole } = useAuth();

  // Only allow MosPI reviewer role
  if (!hasRole("MOSPI_REVIEWER")) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Initial load - no status filter (keep existing behavior)
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
        } else if ((submissionsData as any)?.data?.submissions && Array.isArray((submissionsData as any).data.submissions)) {
          submissionsArray = (submissionsData as any).data.submissions;
        } else if ((submissionsData as any)?.data && Array.isArray((submissionsData as any).data)) {
          submissionsArray = (submissionsData as any).data;
        }
        
        // Calculate progress for each submission (same rules as approver views)
        const submissionsWithProgress = submissionsArray.map((sub: any) => {
          const fd = sub.formData || sub.form_data || {};

          const summary = computeAllStepsSummary(fd, {});

          const totalCompleted =
            summary.infraFinancing.completed +
            summary.infraDevelopment.completed +
            summary.pppDevelopment.completed +
            summary.infraEnablers.completed;

          const totalSections =
            summary.infraFinancing.total +
            summary.infraDevelopment.total +
            summary.pppDevelopment.total +
            summary.infraEnablers.total;

          const progress =
            totalSections > 0
              ? Math.round((totalCompleted / totalSections) * 100)
              : 0;

          return {
            ...sub,
            progress,
          };
        });

        setSubmissions(submissionsWithProgress);
        setIsFilteredByCard(false);
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

    // Only load on initial mount
    loadSubmissions();
  }, []);

  // Load submissions with status filter when card is clicked
  useEffect(() => {
    const loadSubmissionsByStatus = async () => {
      if (!selectedStatus) {
        // If status is cleared, reload all submissions (reset to initial state)
        const loadAllSubmissions = async () => {
          try {
            setLoading(true);
            setIsFilteredByCard(false);
            const submissionsData = await apiService.getSubmissions(1, 100);
            
            let submissionsArray = [];
            if (Array.isArray(submissionsData)) {
              submissionsArray = submissionsData;
            } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
              submissionsArray = submissionsData.submissions;
            } else if ((submissionsData as any)?.data?.submissions && Array.isArray((submissionsData as any).data.submissions)) {
              submissionsArray = (submissionsData as any).data.submissions;
            } else if ((submissionsData as any)?.data && Array.isArray((submissionsData as any).data)) {
              submissionsArray = (submissionsData as any).data;
            }
            
            const submissionsWithProgress = submissionsArray.map((sub: any) => {
              const fd = sub.formData || sub.form_data || {};

              const summary = computeAllStepsSummary(fd, {});

              const totalCompleted =
                summary.infraFinancing.completed +
                summary.infraDevelopment.completed +
                summary.pppDevelopment.completed +
                summary.infraEnablers.completed;

              const totalSections =
                summary.infraFinancing.total +
                summary.infraDevelopment.total +
                summary.pppDevelopment.total +
                summary.infraEnablers.total;

              const progress =
                totalSections > 0
                  ? Math.round((totalCompleted / totalSections) * 100)
                  : 0;

              return {
                ...sub,
                progress,
              };
            });

            setSubmissions(submissionsWithProgress);
          } catch (error) {
            console.error("❌ Failed to reload all submissions:", error);
            notificationService.error(
              "Failed to reload submissions. Please try again.",
              "Load Error"
            );
          } finally {
            setLoading(false);
          }
        };
        
        // Only reload if we were previously filtered
        if (isFilteredByCard) {
          loadAllSubmissions();
        }
        return;
      }

      try {
        setLoading(true);
        setIsFilteredByCard(true);
        
        // Call API with status query parameter
        const submissionsData = await apiService.getSubmissions(1, 100, undefined, selectedStatus);
        
        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          submissionsArray = submissionsData.submissions;
        } else if ((submissionsData as any)?.data?.submissions && Array.isArray((submissionsData as any).data.submissions)) {
          submissionsArray = (submissionsData as any).data.submissions;
        } else if ((submissionsData as any)?.data && Array.isArray((submissionsData as any).data)) {
          submissionsArray = (submissionsData as any).data;
        }
        
        const submissionsWithProgress = submissionsArray.map((sub: any) => {
          const fd = sub.formData || sub.form_data || {};

          const summary = computeAllStepsSummary(fd, {});

          const totalCompleted =
            summary.infraFinancing.completed +
            summary.infraDevelopment.completed +
            summary.pppDevelopment.completed +
            summary.infraEnablers.completed;

          const totalSections =
            summary.infraFinancing.total +
            summary.infraDevelopment.total +
            summary.pppDevelopment.total +
            summary.infraEnablers.total;

          const progress =
            totalSections > 0
              ? Math.round((totalCompleted / totalSections) * 100)
              : 0;

          return {
            ...sub,
            progress,
          };
        });

        setSubmissions(submissionsWithProgress);
        
        // Smooth scroll to table after loading filtered submissions
        setTimeout(() => {
          tableRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 100);
      } catch (error) {
        console.error("❌ Failed to load filtered submissions:", error);
        notificationService.error(
          "Failed to load filtered submissions. Please try again.",
          "Load Error"
        );
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    // Only call when status changes (card clicked or cleared)
    loadSubmissionsByStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  const handleStatusFilterChange = (status: string | null) => {
    setSelectedStatus(status);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8">
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-3xl font-bold mb-1 text-foreground">
            Welcome back
          </h1>
          <p className="text-muted-foreground">
            Review and provide feedback on NIRI submissions
          </p>
        </div>

        {/* KPI Cards */}
        <div className="mb-8">
          <ReviewerKPICards />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latest Submissions Table */}
          <div className="lg:col-span-2">
            <ReviewerSubmissionsTable />
          </div>
          {/* Recent Actions & Quick Actions */}
          <div className="flex flex-col gap-6">
            <ReviewerRecentActions />
            <ReviewerQuickActions />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReviewerDashboardPage;
