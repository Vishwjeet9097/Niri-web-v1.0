import React, { useState, useEffect } from "react";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";

export default function ApproverSubmissionsTable() {
  const [selectedState, setSelectedState] = useState("All");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
  // TODO: Replace 'mospi_approver' with actual user role from auth context/store
  const userRole = "mospi_approver";
  const submissionsData = await apiService.getSubmissions(1, 100);
        
        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          submissionsArray = submissionsData.submissions;
        } else if (submissionsData?.data && Array.isArray(submissionsData.data)) {
          submissionsArray = submissionsData.data;
        }
        
        // Group submissions by state
        const stateGroups = submissionsArray.reduce((acc, submission) => {
          const state = submission.stateUt || "Unknown";
          if (!acc[state]) {
            acc[state] = {
              state: state,
              code: state.substring(0, 2).toUpperCase(),
              allotted: 0,
              submitted: 0,
              pending: 0,
              clarification: 0,
              responseRate: 0,
            };
          }
          
          acc[state].submitted++;
          if (submission.status === "DRAFT") {
            acc[state].pending++;
          } else if (submission.status === "REJECTED" || submission.status === "RETURNED_FROM_MOSPI") {
            acc[state].clarification++;
          }
          
          return acc;
        }, {});
        
        // Calculate response rates and totals
        const processedSubmissions = Object.values(stateGroups).map((stateData: any) => {
          const total = stateData.submitted + stateData.pending;
          stateData.allotted = total;
          stateData.responseRate = total > 0 ? Math.round((stateData.submitted / total) * 100) : 0;
          return stateData;
        });
        
        setSubmissions(processedSubmissions);
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

  const STATES = [
    "All",
    ...Array.from(new Set(submissions.map((s) => s.state))),
  ];

  const filteredSubmissions =
    selectedState === "All"
      ? submissions
      : submissions.filter((s) => s.state === selectedState);

  // Calculate totals for the footer row
  const totals = submissions.reduce(
    (acc, curr) => {
      acc.allotted += curr.allotted;
      acc.submitted += curr.submitted;
      acc.pending += curr.pending;
      acc.clarification += curr.clarification;
      return acc;
    },
    { allotted: 0, submitted: 0, pending: 0, clarification: 0 }
  );
  const avgResponseRate =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((acc, curr) => acc + curr.responseRate, 0) /
            submissions.length
        )
      : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Latest Submissions</h2>
        <div>
          <label htmlFor="state-filter" className="mr-2 text-sm text-gray-600">
            States
          </label>
          <select
            id="state-filter"
            className="border rounded px-2 py-1 text-sm"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        Submissions requiring your review
      </p>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading submissions...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No submissions found for the selected filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 border-b text-left">State Name</th>
                <th className="px-3 py-2 border-b text-right">Allotted</th>
                <th className="px-3 py-2 border-b text-right">Submitted</th>
                <th className="px-3 py-2 border-b text-right">Pending</th>
                <th className="px-3 py-2 border-b text-right">Clarification</th>
                <th className="px-3 py-2 border-b text-right">
                  Response Rate (%)
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((row, idx) => (
                <tr key={row.state + idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                      {row.code}
                    </span>
                    {row.state}
                  </td>
                  <td className="px-3 py-2 border-b text-right">
                    {row.allotted}
                  </td>
                  <td className="px-3 py-2 border-b text-right">
                    {row.submitted}
                  </td>
                  <td className="px-3 py-2 border-b text-right">
                    {row.pending}
                  </td>
                  <td className="px-3 py-2 border-b text-right">
                    {row.clarification}
                  </td>
                  <td className="px-3 py-2 border-b text-right">
                    {row.responseRate}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-3 py-2 border-t">All State</td>
                <td className="px-3 py-2 border-t text-right">{totals.allotted}</td>
                <td className="px-3 py-2 border-t text-right">{totals.submitted}</td>
                <td className="px-3 py-2 border-t text-right">{totals.pending}</td>
                <td className="px-3 py-2 border-t text-right">{totals.clarification}</td>
                <td className="px-3 py-2 border-t text-right">{avgResponseRate}</td>
              </tr>
            </tfoot>
          </table>
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
