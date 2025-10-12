import React, { useState, useEffect } from "react";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
      <div
        className="h-2 rounded-full bg-blue-600 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function ReviewerKPICards() {
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadKPIs = async () => {
      try {
        setLoading(true);
        const kpiData = await apiService.getRoleKPIs("MOSPI_REVIEWER");
        
        // Transform API data to component format
        const transformedKPIs = [
          {
            id: "infrastructure_financing",
            title: "Infrastructure Financing",
            submitted: kpiData.totalSubmissions || 0,
            total: (kpiData.totalSubmissions || 0) + (kpiData.pendingSubmissions || 0),
            percent: kpiData.totalSubmissions ? Math.round((kpiData.totalSubmissions / ((kpiData.totalSubmissions || 0) + (kpiData.pendingSubmissions || 0))) * 100) : 0,
            pending: kpiData.pendingSubmissions || 0,
          },
          {
            id: "infrastructure_development",
            title: "Infrastructure Development",
            submitted: kpiData.approvedSubmissions || 0,
            total: (kpiData.approvedSubmissions || 0) + (kpiData.pendingSubmissions || 0),
            percent: kpiData.approvedSubmissions ? Math.round((kpiData.approvedSubmissions / ((kpiData.approvedSubmissions || 0) + (kpiData.pendingSubmissions || 0))) * 100) : 0,
            pending: kpiData.pendingSubmissions || 0,
          },
          {
            id: "ppp_development",
            title: "PPP Development",
            submitted: kpiData.underReview || 0,
            total: (kpiData.underReview || 0) + (kpiData.pendingSubmissions || 0),
            percent: kpiData.underReview ? Math.round((kpiData.underReview / ((kpiData.underReview || 0) + (kpiData.pendingSubmissions || 0))) * 100) : 0,
            pending: kpiData.pendingSubmissions || 0,
          },
          {
            id: "infrastructure_enablers",
            title: "Infrastructure Enablers",
            submitted: kpiData.returnedFromMospi || 0,
            total: (kpiData.returnedFromMospi || 0) + (kpiData.pendingSubmissions || 0),
            percent: kpiData.returnedFromMospi ? Math.round((kpiData.returnedFromMospi / ((kpiData.returnedFromMospi || 0) + (kpiData.pendingSubmissions || 0))) * 100) : 0,
            pending: kpiData.pendingSubmissions || 0,
          },
        ];
        
        setKpis(transformedKPIs);
      } catch (error) {
        console.error("❌ Failed to load KPIs:", error);
        notificationService.error(
          "Failed to load KPI data. Please try again.",
          "Load Error"
        );
        setKpis([]);
      } finally {
        setLoading(false);
      }
    };

    loadKPIs();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 flex flex-col border animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-2 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (kpis.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No KPI data available.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="bg-white rounded-lg shadow-sm p-4 flex flex-col border"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-gray-700">{kpi.title}</span>
            <span className="text-xs text-gray-500">{kpi.submitted}/{kpi.total} Submitted</span>
          </div>
          <ProgressBar percent={kpi.percent} />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{kpi.percent}% Submitted</span>
            <span className="text-xs text-yellow-600 font-semibold">
              {kpi.pending} Pending
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
