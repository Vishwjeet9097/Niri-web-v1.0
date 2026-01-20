// niri - web / src / features / dashboard / ReviewerDashboardPage.tsx;
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Navigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MospiApproverOverviewCards } from "./components/approver/MospiApproverOverviewCards";
import { MospiApproverMinistryOverviewCards } from "./components/approver/MospiApproverMinistryOverviewCards";
import ReviewerSubmissionsTable from "./components/reviewer/ReviewerSubmissionsTable";
import ReviewerRecentActions from "./components/reviewer/ReviewerRecentActions";
import ReviewerQuickActions from "./components/reviewer/ReviewerQuickActions";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { getMospiMinistrySubmissionDetails } from "@/services/ministry.service";

const ReviewerDashboardPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [ministrySubmissions, setMinistrySubmissions] = useState<any[]>([]);
  const [allMinistrySubmissions, setAllMinistrySubmissions] = useState<any[]>([]); // Store all ministry submissions for filtering
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedCardTitle, setSelectedCardTitle] = useState<string | null>(null);
  const [isFilteredByCard, setIsFilteredByCard] = useState(false);
  const [activeTab, setActiveTab] = useState<"state" | "ministry">("state");
  const tableRef = useRef<HTMLDivElement>(null);

  // Only allow MosPI reviewer role
  if (!hasRole("MOSPI_REVIEWER")) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Load ministry submissions when ministry tab is active
  useEffect(() => {
    const loadMinistrySubmissions = async () => {
      if (activeTab !== "ministry" || !user?.id) {
        return;
      }

      try {
        setLoading(true);
        const response = await getMospiMinistrySubmissionDetails(user.id);
        
        if (response.status && response.data?.submissions) {
          // Map the ministry submission data to match the expected structure
          const mappedSubmissions = response.data.submissions.map((sub: any) => ({
            ...sub,
            // Use formStatus for status filtering
            status: sub.formStatus || sub.status,
            // Map user data
            user: sub.user || {},
            stateUt: null, // Ministry submissions don't have stateUt
            ministryId: sub.user?.ministryId,
            ministryName: sub.user?.ministryName,
          }));
          
          // Store all submissions for filtering
          setAllMinistrySubmissions(mappedSubmissions);
          setMinistrySubmissions(mappedSubmissions);
        } else {
          setAllMinistrySubmissions([]);
          setMinistrySubmissions([]);
        }
      } catch (error) {
        console.error("❌ Failed to load ministry submissions:", error);
        notificationService.error(
          "Failed to load ministry submissions. Please try again.",
          "Load Error"
        );
        setAllMinistrySubmissions([]);
        setMinistrySubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadMinistrySubmissions();
  }, [activeTab, user?.id]);

  // Initial load - no status filter (keep existing behavior)
  useEffect(() => {
    // Skip if ministry tab is active (ministry submissions loaded separately)
    if (activeTab === "ministry") {
      return;
    }
    const loadSubmissions = async () => {
      try {
        setLoading(true);
        const submissionsData = await apiService.getSubmissions(1, 100);

        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (
          submissionsData?.submissions &&
          Array.isArray(submissionsData.submissions)
        ) {
          submissionsArray = submissionsData.submissions;
        } else if (
          (submissionsData as any)?.data?.submissions &&
          Array.isArray((submissionsData as any).data.submissions)
        ) {
          submissionsArray = (submissionsData as any).data.submissions;
        } else if (
          (submissionsData as any)?.data &&
          Array.isArray((submissionsData as any).data)
        ) {
          submissionsArray = (submissionsData as any).data;
        }

        setSubmissions(submissionsArray);
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
      // Handle ministry tab filtering (client-side)
      if (activeTab === "ministry") {
        if (!selectedCardTitle) {
          // If card is cleared, show all ministry submissions
          if (isFilteredByCard) {
            setMinistrySubmissions(allMinistrySubmissions);
            setIsFilteredByCard(false);
          }
          return;
        }

        // Filter ministry submissions client-side based on card title
        let filteredSubmissions = [...allMinistrySubmissions];

        if (selectedCardTitle === "Approved") {
          filteredSubmissions = allMinistrySubmissions.filter((sub: any) => {
            const formStatus = sub.formStatus || sub.status;
            return formStatus === "ACCEPTED_BY_MOSPI" || formStatus === "APPROVED";
          });
        } else if (selectedCardTitle === "Under Review") {
          filteredSubmissions = allMinistrySubmissions.filter((sub: any) => {
            const formStatus = sub.formStatus || sub.status;
            return formStatus === "SUBMITTED_TO_MOSPI_REVIEWER";
          });
        } else if (selectedCardTitle === "Full Submission") {
          // For Full Submission, show all submissions (no filter)
          filteredSubmissions = allMinistrySubmissions;
        }

        setMinistrySubmissions(filteredSubmissions);
        setIsFilteredByCard(true);

        // Smooth scroll to table after filtering
        setTimeout(() => {
          tableRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
        return;
      }

      // Handle state/UT tab filtering (API-based)
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
            } else if (
              submissionsData?.submissions &&
              Array.isArray(submissionsData.submissions)
            ) {
              submissionsArray = submissionsData.submissions;
            } else if (
              (submissionsData as any)?.data?.submissions &&
              Array.isArray((submissionsData as any).data.submissions)
            ) {
              submissionsArray = (submissionsData as any).data.submissions;
            } else if (
              (submissionsData as any)?.data &&
              Array.isArray((submissionsData as any).data)
            ) {
              submissionsArray = (submissionsData as any).data;
            }

            setSubmissions(submissionsArray);
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
        const submissionsData = await apiService.getSubmissions(
          1,
          100,
          undefined,
          selectedStatus
        );

        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (
          submissionsData?.submissions &&
          Array.isArray(submissionsData.submissions)
        ) {
          submissionsArray = submissionsData.submissions;
        } else if (
          (submissionsData as any)?.data?.submissions &&
          Array.isArray((submissionsData as any).data.submissions)
        ) {
          submissionsArray = (submissionsData as any).data.submissions;
        } else if (
          (submissionsData as any)?.data &&
          Array.isArray((submissionsData as any).data)
        ) {
          submissionsArray = (submissionsData as any).data;
        }

        setSubmissions(submissionsArray);

        // Smooth scroll to table after loading filtered submissions
        setTimeout(() => {
          tableRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
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

    // Only call when status or card title changes (card clicked or cleared)
    loadSubmissionsByStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, selectedCardTitle, activeTab, allMinistrySubmissions]);

  const handleStatusFilterChange = (status: string | null) => {
    // For ministry tab, status is actually the card title
    if (activeTab === "ministry") {
      setSelectedCardTitle(status);
    } else {
      setSelectedStatus(status);
    }
  };

  const handleCardTitleChange = (title: string | null) => {
    setSelectedCardTitle(title);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8">
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-6 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-900">Welcome</h1>
              <p className="text-gray-600 text-base">
                Review and provide feedback on NIE-I submissions
              </p>
            </div>
            {/* Laptop illustration */}
            <div className="absolute right-6 top-0 hidden md:block">
              <img
                src="/images/dashboard.png"
                alt="Dashboard"
                className="h-32 w-auto"
              />
            </div>
          </div>
        </div>

        {/* Tabs for State and Ministry */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "state" | "ministry")} className="w-full mb-6">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-gray-100 p-1 gap-1">
            <TabsTrigger 
              value="state" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              State/UT
            </TabsTrigger>
            <TabsTrigger 
              value="ministry"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Ministry
            </TabsTrigger>
          </TabsList>

          {/* State Tab */}
          <TabsContent value="state" className="mt-6">
            <MospiApproverOverviewCards
              onStatusFilterChange={handleStatusFilterChange}
            />
          </TabsContent>

          {/* Ministry Tab */}
          <TabsContent value="ministry" className="mt-6">
            <MospiApproverMinistryOverviewCards
              onStatusFilterChange={handleStatusFilterChange}
              onCardTitleChange={handleCardTitleChange}
            />
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Latest Submissions Table */}
          <div ref={tableRef} className="lg:col-span-2">
            <ReviewerSubmissionsTable
              submissions={activeTab === "ministry" ? ministrySubmissions : submissions}
              loading={loading}
              activeTab={activeTab}
            />
          </div>
          {/* Recent Actions & Quick Actions */}
          <div className="flex flex-col gap-6">
            {/* <ReviewerRecentActions /> */}
            {/* <ReviewerQuickActions /> */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReviewerDashboardPage;
