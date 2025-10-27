import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";

// Tabs for filtering submissions
const submissionTabs = [
  { label: "All", filter: () => true },
  { label: "Rejected", filter: (s: any) => s.status === "REJECTED" },
  { label: "Under Review", filter: (s: any) => s.status === "SUBMITTED_TO_STATE" },
  { label: "Approved", filter: (s: any) => s.status === "APPROVED" },
  { label: "Draft", filter: (s: any) => s.status === "DRAFT" },
];

export default function NodalSubmissionsList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
  // TODO: Replace 'nodal_officer' with actual user role from auth context/store
  const userRole = "nodal_officer";
  const submissionsData = await apiService.getSubmissions(1, 20);
        
        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          submissionsArray = submissionsData.submissions;
        } else if (submissionsData?.data && Array.isArray(submissionsData.data)) {
          submissionsArray = submissionsData.data;
        }
        
        setSubmissions(submissionsArray);
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

    loadSubmissions();
  }, []);

  const filtered = submissions.filter(
    submissionTabs.find((t) => t.label === activeTab)?.filter || (() => true)
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Latest Submissions</h2>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          onClick={() => navigate('/submissions')}
        >
          + New Submission
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        {submissionTabs.map((tab) => (
          <button
            key={tab.label}
            className={`px-3 py-1 rounded text-sm font-medium ${
              activeTab === tab.label
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setActiveTab(tab.label)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading submissions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No submissions found for the selected filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className={`rounded border p-4 ${
                sub.status === "REJECTED"
                  ? "border-red-400 bg-red-50"
                  : sub.status === "APPROVED"
                  ? "border-green-400 bg-green-50"
                  : sub.status === "SUBMITTED_TO_STATE"
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold">{sub.title || sub.submissionId || `Submission ${sub.id}`}</div>
                <div className="flex gap-2 items-center">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      sub.status === "DRAFT"
                        ? "bg-gray-200 text-gray-700"
                        : sub.status === "SUBMITTED_TO_STATE"
                        ? "bg-blue-200 text-blue-800"
                        : sub.status === "APPROVED"
                        ? "bg-green-200 text-green-800"
                        : sub.status === "REJECTED"
                        ? "bg-red-200 text-red-800"
                        : ""
                    }`}
                  >
                    {sub.status}
                  </span>
                  {sub.status === "REJECTED" ? (
                    <button className="text-blue-600 text-xs font-semibold">
                      Revise
                    </button>
                  ) : (
                    <button className="text-blue-600 text-xs font-semibold">
                      View Details
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 mb-1">
                ID: {sub.submissionId || sub.id} | Updated: {new Date(sub.updatedAt || sub.createdAt).toLocaleDateString()} | Due: {sub.dueDate || "N/A"}
              </div>
              <div className="w-full bg-gray-200 h-2 rounded mb-2">
                <div
                  className="h-2 rounded bg-blue-600"
                  style={{ width: `${sub.progress || 0}%` }}
                />
              </div>
              <div className="text-xs text-gray-700 mb-1">
                Next step: <span className="font-medium">{sub.nextStep || "N/A"}</span>
              </div>
              {sub.reviewerNote && (
                <div className="bg-red-100 border border-red-300 text-red-700 text-xs rounded p-2 mt-2">
                  <span className="font-semibold">Reviewer Note:</span>{" "}
                  {sub.reviewerNote}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
          View All
        </button>
      </div>
    </div>
  );
}
