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

// Helper function to calculate section completion percentage
const getSectionCompletion = (submission: any, sectionKey: string): number => {
  if (!submission || !submission.formData) return 0;
  
  // Try camelCase format first (infraFinancing, infraDevelopment, etc.)
  let sectionData = submission.formData[sectionKey];
  
  // If not found, try converting kebab-case to camelCase
  if (!sectionData) {
    const camelKey = sectionKey.split('-').map((word, index) => {
      if (index === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join('');
    sectionData = submission.formData[camelKey];
  }
  
  if (!sectionData || typeof sectionData !== 'object') return 0;
  
  // Count how many fields have values
  const fields = Object.entries(sectionData);
  if (fields.length === 0) return 0;
  
  const filledFields = fields.filter(([_, value]) => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && !Array.isArray(value)) {
      // For nested objects, check if they have any data
      return Object.values(value).some(v => v !== null && v !== undefined && v !== '');
    }
    return true;
  });
  
  // Return percentage of filled fields
  return Math.round((filledFields.length / fields.length) * 100);
};

export default function ReviewerKPICards() {
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadKPIs = async () => {
      try {
        setLoading(true);
        
        // Get submissions instead of KPI data
        const submissionsData: any = await apiService.getSubmissions(1, 100);
        
        // Extract submissions array from response
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
        
        console.log("📊 Total submissions received:", submissionsArray.length);
        
        // Calculate KPIs based on section completion percentage (80%+ = submitted)
        const COMPLETION_THRESHOLD = 80;
        
        const infrastructureFinancingCount = submissionsArray.filter((s: any) => {
          const completion = getSectionCompletion(s, 'infraFinancing');
          return completion >= COMPLETION_THRESHOLD;
        }).length;
        
        const infrastructureDevelopmentCount = submissionsArray.filter((s: any) => {
          const completion = getSectionCompletion(s, 'infraDevelopment');
          return completion >= COMPLETION_THRESHOLD;
        }).length;
        
        const pppDevelopmentCount = submissionsArray.filter((s: any) => {
          const completion = getSectionCompletion(s, 'pppDevelopment');
          return completion >= COMPLETION_THRESHOLD;
        }).length;
        
        const infrastructureEnablersCount = submissionsArray.filter((s: any) => {
          const completion = getSectionCompletion(s, 'infraEnablers');
          return completion >= COMPLETION_THRESHOLD;
        }).length;
        
        // Calculate average completion percentage for each section
        const getAverageCompletion = (sectionKey: string): number => {
          const completions = submissionsArray
            .map((s: any) => getSectionCompletion(s, sectionKey))
            .filter((c: number) => c > 0); // Only count sections that have started
          
          if (completions.length === 0) return 0;
          
          const sum = completions.reduce((acc: number, val: number) => acc + val, 0);
          return Math.round(sum / completions.length);
        };
        
        const avgInfraFinancing = getAverageCompletion('infraFinancing');
        const avgInfraDevelopment = getAverageCompletion('infraDevelopment');
        const avgPppDevelopment = getAverageCompletion('pppDevelopment');
        const avgInfraEnablers = getAverageCompletion('infraEnablers');
        
        // Calculate total submissions and pending submissions
        const totalSubmissions = submissionsArray.length;
        const pendingSubmissions = submissionsArray.filter((s: any) => 
          s.status === 'SUBMITTED_TO_MOSPI_REVIEWER' || s.status === 'SUBMITTED_TO_MOSPI_APPROVER'
        ).length;
        
        // Transform to component format
        const transformedKPIs = [
          {
            id: "infrastructure_financing",
            title: "Infrastructure Financing",
            submitted: infrastructureFinancingCount,
            total: totalSubmissions,
            percent: avgInfraFinancing,
            pending: pendingSubmissions,
          },
          {
            id: "infrastructure_development",
            title: "Infrastructure Development",
            submitted: infrastructureDevelopmentCount,
            total: totalSubmissions,
            percent: avgInfraDevelopment,
            pending: pendingSubmissions,
          },
          {
            id: "ppp_development",
            title: "PPP Development",
            submitted: pppDevelopmentCount,
            total: totalSubmissions,
            percent: avgPppDevelopment,
            pending: pendingSubmissions,
          },
          {
            id: "infrastructure_enablers",
            title: "Infrastructure Enablers",
            submitted: infrastructureEnablersCount,
            total: totalSubmissions,
            percent: avgInfraEnablers,
            pending: pendingSubmissions,
          },
        ];
        
        console.log("📊 Calculated KPIs:", transformedKPIs);
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
