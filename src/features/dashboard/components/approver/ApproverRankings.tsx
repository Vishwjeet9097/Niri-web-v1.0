import React, { useState, useEffect } from "react";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";

export default function ApproverRankings() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRankings = async () => {
      try {
        setLoading(true);
        const rankingsData = await apiService.getRankings();
        
        // Handle different response structures
        let rankingsArray = [];
        if (Array.isArray(rankingsData)) {
          rankingsArray = rankingsData;
        } else if (rankingsData?.rankings && Array.isArray(rankingsData.rankings)) {
          rankingsArray = rankingsData.rankings;
        } else if (rankingsData?.data && Array.isArray(rankingsData.data)) {
          rankingsArray = rankingsData.data;
        }
        
        // Transform API data to component format
        const transformedRankings = rankingsArray.map((item: any) => ({
          state: item.state || item.stateUt || "Unknown",
          score: item.score || item.niriScore || 0,
          updated: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "N/A",
        }));
        
        setRankings(transformedRankings);
      } catch (error) {
        console.error("❌ Failed to load rankings:", error);
        notificationService.error(
          "Failed to load rankings data. Please try again.",
          "Load Error"
        );
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };

    loadRankings();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col min-h-[340px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">NIRI Rankings</h3>
        <button
          className="text-gray-400 hover:text-blue-600 transition"
          title="Filter"
        >
          <svg
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707l-6.414 6.414A1 1 0 0 0 14 14.414V19a1 1 0 0 1-1.447.894l-4-2A1 1 0 0 1 8 17v-2.586a1 1 0 0 0-.293-.707L1.293 6.707A1 1 0 0 1 1 6V4z" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        High-level view of current NIRI scores and impact of your approval decisions.
      </p>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading rankings...</p>
          </div>
        </div>
      ) : rankings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">No rankings data available.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-2">
          {rankings.map((item) => (
            <div
              key={item.state}
              className="flex items-center justify-between px-3 py-2 rounded hover:bg-blue-50 transition"
            >
              <div>
                <div className="font-medium text-sm">{item.state}</div>
                <div className="text-xs text-gray-400">
                  Last updated: {item.updated}
                </div>
              </div>
              <div className="text-xl font-bold text-blue-700">{item.score}</div>
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
