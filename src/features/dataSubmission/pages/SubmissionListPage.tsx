import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  LayoutGrid,
  List,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedSubmissionCard } from "@/components/ui/UnifiedSubmissionCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportTableToCSV } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { hasMospiApproverComment, getMospiApproverComment, canReviewSubmission } from "@/utils/auditUtils";
import { apiService, getCumulativePreview } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { calculateStateProgressFromApi, ProgressStats } from "@/utils/progressUtils";
import { authService } from "@/services/auth.service";
import { transformFormDataForSubmission } from "@/utils/formDataTransformer";
import { appendFilesRecursively } from "@/utils/appendFilesRecursively";
import { buildIndicatorMapping } from "@/utils/indicatorMappingUtils";
import axios from "axios";
import { config } from "@/config/environment";
import { getSubmissionStatus, getSubmissionDisplayStatus } from "@/utils/indicatorStatusUtils";
import { filterSubmissionsForStateApprover } from "@/utils/submissionGroupingUtils";
import { SubmissionStatusBadge } from "@/components/submission/SubmissionStatusBadge";

// Type definitions for aggregated indicators
type AggregatedIndicator = {
  id?: string;
  code: string;
  name: string;
  category?: string;
  maxScore?: number | string;
  status?: string;
  remarks?: string | null;
  score?: number | string | null;
  updatedAt?: string | null;
  year?: string | null;
  assignedTo?: string | null;
  sectionId?: string;
  data?: any;
  [key: string]: any;
};

/**
 * Transform aggregated indicators from API into formData structure expected by review components
 * This is the same robust transformation logic used in StateAggregateReviewPage
 */
const transformIndicatorsToFormData = (
  indicators: Record<string, AggregatedIndicator[]>,
  submissions?: any[]
): any => {
  console.log("[Transform] Raw indicators input:", indicators);
  console.log("[Transform] Indicator keys:", Object.keys(indicators));
  
  const formData: any = {
    infraFinancing: {},
    infraDevelopment: {},
    pppDevelopment: {},
    infraEnablers: {},
  };

  const categoryMap: Record<string, string> = {
    "Infrastructure Financing": "infraFinancing",
    "Infrastructure Development": "infraDevelopment",
    "PPP Development": "pppDevelopment",
    "Infrastructure Enablers": "infraEnablers",
    infra_financing: "infraFinancing",
    Infrastructure_Financing: "infraFinancing",
    infra_development: "infraDevelopment",
    Infrastructure_Development: "infraDevelopment",
    ppp_development: "pppDevelopment",
    PPP_Development: "pppDevelopment",
    infra_enablers: "infraEnablers",
    Infrastructure_Enablers: "infraEnablers",
  };

  Object.entries(indicators).forEach(([categoryKey, indicatorList]) => {
    console.log(`[Transform] Processing category: ${categoryKey} with ${indicatorList?.length || 0} indicators`);
    
    const formDataKey = categoryMap[categoryKey];
    if (!formDataKey || !formData[formDataKey]) {
      console.warn(`[Transform] Unknown category: ${categoryKey}, skipping`);
      return;
    }

    indicatorList.forEach((indicator) => {
      const code = indicator.code?.trim();
      if (!code) {
        console.warn(`[Transform] Indicator without code:`, indicator);
        return;
      }

      console.log(`[Transform] Processing indicator ${code} in category ${categoryKey}`);
      console.log(`[Transform] Indicator status:`, indicator?.status);
      const sectionKey = `section${code.replace(".", "_")}`;
      let indicatorData = indicator.data;

      // Check indicator status - if it's ACCEPTED or has a status, we should include it even if data is empty
      const indicatorStatus = indicator?.status;
      const isAccepted = indicatorStatus === 'ACCEPTED';
      const hasStatus = indicatorStatus && indicatorStatus !== 'NOT_STARTED' && indicatorStatus !== null && indicatorStatus !== undefined;
      
      // If no data, check if we should still include based on status or submissions
      if (!indicatorData) {
        // Check if this indicator exists in any submission (even if status is NOT_STARTED)
        const existsInSubmissions = submissions && Array.isArray(submissions) && submissions.some(submission => {
          const subFormData = submission.formData || submission.form_data || {};
          const categoryData = subFormData[formDataKey] || subFormData[categoryKey] || {};
          return sectionKey in categoryData;
        });
        
        // If indicator is ACCEPTED or has a meaningful status, create empty object to process
        if (isAccepted || hasStatus) {
          console.log(`[Transform] Indicator ${code} has status ${indicatorStatus} but no data - will process based on status`);
          indicatorData = {};
        } else if (existsInSubmissions) {
          // Even if status is NOT_STARTED, if it exists in submissions, we should include it
          console.log(`[Transform] Indicator ${code} has NOT_STARTED status but exists in submissions - will extract from submissions`);
          indicatorData = {};
        } else if (!submissions || submissions.length === 0) {
          console.log(`[Transform] Skipping indicator ${code} - no data, no status, and no submissions to extract from`);
          return;
        } else {
          indicatorData = {};
        }
      }

      // Handle array-based indicators
      if (Array.isArray(indicatorData)) {
        const hasValidData = indicatorData.length > 0 && indicatorData.some(item => {
          if (item === null || item === undefined) return false;
          if (typeof item === 'object' && Object.keys(item).length === 0) return false;
          return true;
        });
        
        // If array is empty but exists in submissions, extract from submissions
        if (!hasValidData && submissions && Array.isArray(submissions)) {
          for (const submission of submissions) {
            const subFormData = submission.formData || submission.form_data || {};
            const categoryData = subFormData[formDataKey] || subFormData[categoryKey] || {};
            const sectionData = categoryData[sectionKey];
            
            if (Array.isArray(sectionData) && sectionData.length > 0) {
              // Found array data in submission, use it
              indicatorData = [...sectionData];
              console.log(`[Transform] Extracted array data for ${sectionKey} from submission ${submission.submissionId || submission.id}`);
              break;
            } else if (sectionData && typeof sectionData === 'object') {
              // Check if sectionData has an array property (e.g., infraActArray, VGFArray, etc.)
              const arrayKeys = Object.keys(sectionData).filter(key => Array.isArray(sectionData[key]));
              if (arrayKeys.length > 0) {
                indicatorData = sectionData[arrayKeys[0]];
                console.log(`[Transform] Extracted array data for ${sectionKey} from submission property ${arrayKeys[0]}`);
                break;
              }
            }
          }
        }
        
        const hasValidDataAfterExtraction = indicatorData.length > 0 && indicatorData.some(item => {
          if (item === null || item === undefined) return false;
          if (typeof item === 'object' && Object.keys(item).length === 0) return false;
          return true;
        });
        
        if (!hasValidDataAfterExtraction) {
          console.log(`[Transform] Skipping array ${sectionKey} in ${formDataKey} - empty array or array with no valid data`);
          return;
        }
        
        switch (code) {
          case '2.1':
            formData[formDataKey][sectionKey] = { infraActArray: indicatorData };
            break;
          case '2.2':
            formData[formDataKey][sectionKey] = { specializedEntityArray: indicatorData };
            break;
          case '2.3':
            formData[formDataKey][sectionKey] = { infraDevelopmentArray: indicatorData };
            break;
          case '2.4':
            formData[formDataKey][sectionKey] = { investmentReadyArray: indicatorData };
            break;
          case '2.5':
            formData[formDataKey][sectionKey] = { assetMonetizationArray: indicatorData };
            break;
          default:
            formData[formDataKey][sectionKey] = indicatorData;
        }
        console.log(`[Transform] Stored array ${sectionKey} in ${formDataKey}:`, formData[formDataKey][sectionKey]);
        return;
      }

      // Handle object-based indicators
      if (typeof indicatorData === 'object') {
        // If indicatorData is empty but exists in submissions, extract from submissions
        if (Object.keys(indicatorData).length === 0 && submissions && Array.isArray(submissions)) {
          for (const submission of submissions) {
            const subFormData = submission.formData || submission.form_data || {};
            const categoryData = subFormData[formDataKey] || subFormData[categoryKey] || {};
            const sectionData = categoryData[sectionKey];
            
            if (sectionData && typeof sectionData === 'object') {
              // Found data in submission, use it
              indicatorData = { ...sectionData };
              console.log(`[Transform] Extracted data for ${sectionKey} from submission ${submission.submissionId || submission.id}`);
              break;
            }
          }
        }
        
        const formFields: any = { ...indicatorData };
        delete formFields.status;
        delete formFields.percentage;
        delete formFields.marksObtained;

        if (indicator.year) {
          formFields.year = indicator.year;
        } else if (indicatorData.year) {
          formFields.year = indicatorData.year;
        }

        // Handle status field - infer form fields from status for some indicators
        const currentStatus = indicatorStatus || indicatorData?.status || indicator?.status;
        if (currentStatus === 'ACCEPTED' || indicator.status === 'ACCEPTED') {
          switch (code) {
            case '3.1':
              if (!formFields.available) {
                formFields.available = 'yes';
              }
              break;
            case '3.3':
              if (!formFields.VGFArray) {
                formFields.VGFArray = [];
              }
              break;
            case '3.4':
              if (!formFields.projects) {
                formFields.projects = [];
              }
              break;
            case '4.1':
              if (!formFields.allEligible) {
                formFields.allEligible = 'yes';
              }
              break;
          }
        }

        // Special handling for section 1.1
        if (code === '1.1') {
          const possibleCapAllocKeys = ['capitalAllocation', 'capital_allocation', 'capitalAllocationFY', 'capital_allocation_fy', 'a1', 'A1'];
          const possibleGsdpKeys = ['gsdpForFY', 'gsdp_for_fy', 'gsdpForFYValue', 'gsdp_for_fy_value', 'a2', 'A2', 'gsdp'];
          
          if (!formFields.capitalAllocation) {
            for (const key of possibleCapAllocKeys) {
              if (indicatorData[key] !== undefined) {
                formFields.capitalAllocation = String(indicatorData[key]);
                break;
              }
            }
          }
          
          if (!formFields.gsdpForFY) {
            for (const key of possibleGsdpKeys) {
              if (indicatorData[key] !== undefined) {
                formFields.gsdpForFY = String(indicatorData[key]);
                break;
              }
            }
          }
          
          if (!formFields.capitalAllocation && indicatorData.user_fill_value_a1 !== undefined) {
            formFields.capitalAllocation = String(indicatorData.user_fill_value_a1);
          }
          
          if (!formFields.gsdpForFY && indicatorData.user_fill_value_a2 !== undefined) {
            formFields.gsdpForFY = String(indicatorData.user_fill_value_a2);
          }
          
          if ((!formFields.capitalAllocation || !formFields.gsdpForFY) && submissions && Array.isArray(submissions)) {
            for (const submission of submissions) {
              const subFormData = submission.formData || submission.form_data || {};
              const infraFinancing = subFormData.infraFinancing || subFormData.Infrastructure_Financing || {};
              const section1_1 = infraFinancing.section1_1 || {};
              
              if (section1_1.capitalAllocation && !formFields.capitalAllocation) {
                formFields.capitalAllocation = String(section1_1.capitalAllocation);
              }
              
              if (section1_1.gsdpForFY && !formFields.gsdpForFY) {
                formFields.gsdpForFY = String(section1_1.gsdpForFY);
              }
              
              if (formFields.capitalAllocation && formFields.gsdpForFY) {
                break;
              }
            }
          }
          
          if (!formFields.capitalAllocation) {
            formFields.capitalAllocation = '';
          }
          if (!formFields.gsdpForFY) {
            formFields.gsdpForFY = '';
          }
        }

        // Special handling for other indicators
        switch (code) {
          case '1.3':
            if (!formFields.ulbList) {
              formFields.ulbList = [];
            }
            break;
          case '1.4':
            if (!formFields.bondList) {
              formFields.bondList = [];
            }
            break;
          case '1.5':
            if (!formFields.ffiArray) {
              formFields.ffiArray = [];
            }
            break;
          case '3.3':
            if (!formFields.VGFArray) {
              formFields.VGFArray = [];
            }
            break;
          case '3.4':
            if (!formFields.projects) {
              formFields.projects = [];
            }
            break;
          case '4.6':
            if (!formFields.capacityArray) {
              formFields.capacityArray = [];
            }
            break;
        }

        const hasMeaningfulData = Object.keys(formFields).length > 0 && 
          Object.values(formFields).some(val => {
            if (val === null || val === undefined || val === '') return false;
            if (Array.isArray(val) && val.length === 0) return false;
            if (typeof val === 'object' && Object.keys(val).length === 0) return false;
            return true;
          });
        
        const finalIndicatorStatus = indicatorStatus || indicator?.status || indicatorData?.status || formFields.status;
        const finalIsNotStarted = finalIndicatorStatus === 'NOT_STARTED' || finalIndicatorStatus === null || finalIndicatorStatus === undefined;
        
        const existsInSubmissions = submissions && Array.isArray(submissions) && submissions.some(submission => {
          const subFormData = submission.formData || submission.form_data || {};
          const categoryData = subFormData[formDataKey] || subFormData[categoryKey] || {};
          return sectionKey in categoryData;
        });
        
        const shouldInclude = hasMeaningfulData || !finalIsNotStarted || existsInSubmissions;
        
        if (shouldInclude) {
          formData[formDataKey][sectionKey] = formFields;
          console.log(`[Transform] Stored ${sectionKey} in ${formDataKey}:`, formFields, `(hasData: ${hasMeaningfulData}, status: ${finalIndicatorStatus}, existsInSubmissions: ${existsInSubmissions})`);
        } else {
          console.log(`[Transform] Skipping ${sectionKey} in ${formDataKey} - no meaningful data, NOT_STARTED status, and not in submissions`);
        }
      }
    });
  });

  // Clean up empty categories
  Object.keys(formData).forEach((categoryKey) => {
    if (Object.keys(formData[categoryKey]).length === 0) {
      delete formData[categoryKey];
      console.log(`[Transform] Removed empty category: ${categoryKey}`);
    }
  });

  console.log("[Transform] Final formData structure:", formData);
  return formData;
};

export const SubmissionListPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  // const [stateFilter, setStateFilter] = useState("all");
  // const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedYear = undefined;

  const { stateUt: myState } = authService.getUser() ?? {};

  // const selectedYear = uiState.year; // Removed because uiState is undefined

 

  const [stateProgress, setStateProgress] = useState<ProgressStats | null>(null);
const [progressLoading, setProgressLoading] = useState(false);
const [submittingFinal, setSubmittingFinal] = useState(false);
const [showConfirmModal, setShowConfirmModal] = useState(false);


 const isFetchingProgress = useRef(false);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
        console.log("📦 [loadSubmissions] Fetching submissions...");
        const submissionsData = await apiService.getSubmissions(1, 100);
        console.log("✅ [loadSubmissions] Response:", submissionsData);

        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          submissionsArray = submissionsData.submissions;
        } else if ((submissionsData as any)?.data && Array.isArray((submissionsData as any).data)) {
          submissionsArray = (submissionsData as any).data;
        }
        
         console.log("📄 [loadSubmissions] Final list length:", submissionsArray.length);
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

//   useEffect(() => {
//   if (user?.role !== "STATE_APPROVER") return;

//   (async () => {
//     try {
//       setProgressLoading(true);
//       const resp = await apiService.getStateIndicatorStatuses();
//       const stats = calculateStateProgressFromApi(resp);
//       setStateProgress(stats);
//     } catch (e) {
//       console.error("Failed to load state indicator statuses", e);
//       setStateProgress(null);
//     } finally {
//       setProgressLoading(false);
//     }
//   })();
// }, [user?.role]);

useEffect(() => {
  if (user?.role !== "STATE_APPROVER") return;

  let intervalId: number | undefined;

  const loadProgressOnce = async () => {
    // avoid duplicate calls or running in background tab
    if (document?.hidden || isFetchingProgress.current) return;

    try {
      isFetchingProgress.current = true;
      setProgressLoading(true);
      console.log("📊 [Progress] Fetching /indicators/state-statuses...");

      const resp = await apiService.getStateIndicatorStatuses();
      // const payload = (resp && resp.data !== undefined) ? resp.data : resp;
      console.log("✅ [Progress] Raw API response:", resp);
      //  console.log("📦 [Progress] normalized payload:", payload);
      // console.log("🧾 [Progress] payload.summary:", payload?.summary);
      // console.log("🧾 [Progress] payload.submissions.length:", Array.isArray(payload?.submissions) ? payload.submissions.length : payload?.submissions);


      // console.log("🔍 [Progress] resp.data:", resp?.data);
      //   console.log("🔍 [Progress] resp?.data?.summary:", resp?.data?.summary);

      // const stats = calculateStateProgressFromApi(payload);
      //   console.log("🧮 [Progress] calculateStateProgressFromApi ->", stats);

          // Normalize so utils can read resp.data.summary even if backend returns summary at root
        const normalized = resp?.data ? resp : { data: resp };
        console.log("🧩 normalized payload shape:", {
          hasData: !!normalized?.data,
          hasSummary: !!normalized?.data?.summary,
          keys: normalized?.data ? Object.keys(normalized.data) : []
        });
        console.log("📦 normalized.data.summary:", normalized?.data?.summary);

        const stats = calculateStateProgressFromApi(normalized);
        console.log("✅ calculateStateProgressFromApi(stats):", stats);


      setStateProgress(stats);
    } catch (e) {
      console.error("Failed to load state indicator statuses", e);
      setStateProgress(null);
    } finally {
      setProgressLoading(false);
      isFetchingProgress.current = false;
    }
  };

  // run immediately on mount
  loadProgressOnce();

  // auto-refresh every 60 seconds
  intervalId = window.setInterval(loadProgressOnce, 60_000);

  // clean up on unmount
  return () => {
    if (intervalId) clearInterval(intervalId);
  };
}, [user?.role]);

const handleFinalSubmit = async () => {
  console.group("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 [FinalSubmit] FUNCTION CALLED - STARTING CONSOLIDATED SUBMISSION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    // Gate: must have progress and must be 100% approved
    if (!stateProgress || stateProgress.percentage !== 100 || stateProgress.approved !== stateProgress.total) {
      console.warn("⚠️ [Submit] Submission blocked - Not all indicators approved");
      notificationService.warning("All indicators must be approved before final submission.");
      return;
    }

    setSubmittingFinal(true);

    // Get effective state - use same logic as StateAggregateReviewPage
    let effectiveState = "";
    if (user?.stateUt) {
      effectiveState = user.stateUt.toUpperCase();
    } else if (user?.stateName) {
      effectiveState = user.stateName.toUpperCase();
    } else if (user?.state) {
      effectiveState = user.state.toUpperCase();
    }
    
    if (!effectiveState) {
      console.error("❌ [FinalSubmit] No state found for user");
      console.error("❌ [FinalSubmit] User object:", user);
      notificationService.error("Unable to determine state. Please contact support.");
      setSubmittingFinal(false);
      return;
    }

    // Step 1: Get cumulative preview data (aggregated indicators)
    // Always create a NEW consolidated submission from aggregated data
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📦 STEP 1: Fetching cumulative preview data");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 State/UT:", effectiveState);
    console.log("📍 User stateUt from JWT:", user?.stateUt);
    console.log("📍 User stateName:", user?.stateName);
    console.log("📍 User state:", user?.state);
    
    try {
      // First, get submissions from state indicator statuses API (this has the actual approved data)
      console.log("📦 [FinalSubmit] Fetching state indicator statuses to get approved submissions...");
      const statusResp = await apiService.getStateIndicatorStatuses();
      const normalizedStatus = statusResp?.data ? statusResp : { data: statusResp };
      const statusData = normalizedStatus.data || {};
      const approvedSubmissions = statusData.submissions || [];
      
      console.log("📦 [FinalSubmit] Approved submissions count:", approvedSubmissions.length);
      console.log("📦 [FinalSubmit] Status summary:", statusData.summary);
      
      // Now get cumulative preview for indicator structure
      const payload = await getCumulativePreview(effectiveState, {});
      console.log("📦 [FinalSubmit] Raw payload from getCumulativePreview:", payload);
    
      const data = (payload as any)?.data || payload;
      const indicators = data?.indicators || {};
      // Use submissions from status API instead of cumulative preview (which may not have them)
      const apiSubmissions = approvedSubmissions.length > 0 ? approvedSubmissions : (data?.submissions || (payload as any)?.submissions || []);
      
      console.log("📦 [FinalSubmit] Extracted data:", { 
        hasData: !!data, 
        hasIndicators: !!indicators, 
        indicatorKeys: Object.keys(indicators),
        submissionsCount: apiSubmissions.length,
        payloadKeys: payload ? Object.keys(payload) : []
      });
      
      if (!data || !indicators || Object.keys(indicators).length === 0) {
        console.error("❌ [FinalSubmit] No aggregated data available");
        notificationService.error("No aggregated data available to submit. Please ensure all indicators are approved.");
        setSubmittingFinal(false);
        return;
      }
      
      // If we have approved submissions but cumulative preview shows NOT_STARTED, 
      // we need to merge the data from submissions into indicators
      if (apiSubmissions.length > 0) {
        console.log("📦 [FinalSubmit] Merging data from approved submissions into indicators...");
        // The transformIndicatorsToFormData function will extract data from submissions
        // if indicators don't have data, so we just need to pass the submissions
      }

      // Step 2: Transform indicators to formData
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔄 STEP 2: Transforming indicators to formData");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📊 Raw indicators:", indicators);
      console.log("📊 Indicator categories:", Object.keys(indicators));
      console.log("📊 Submissions count:", apiSubmissions.length);
      
      const formData = transformIndicatorsToFormData(indicators, apiSubmissions);
    
      console.log("✅ [FinalSubmit] Transformed formData:", formData);
      console.log("✅ [FinalSubmit] FormData categories:", Object.keys(formData));
      console.log("✅ [FinalSubmit] FormData structure:", JSON.stringify(formData, null, 2));

      // Check if formData is empty
      const hasData = Object.keys(formData).length > 0 && 
        Object.values(formData).some(category => Object.keys(category).length > 0);
      
      if (!hasData) {
        console.error("❌ [FinalSubmit] FormData is empty after transformation!");
        console.error("❌ [FinalSubmit] Indicators received:", indicators);
        console.error("❌ [FinalSubmit] Submissions received:", apiSubmissions);
        console.error("❌ [FinalSubmit] FormData after transformation:", formData);
        notificationService.error("No form data available to submit. Please ensure indicators are approved and have data.");
        setSubmittingFinal(false);
        return;
      }
      
      console.log("✅ [FinalSubmit] FormData validation passed - has data:", hasData);

      // Step 2.5: Get source submission IDs from approved submissions
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📋 STEP 2.5: Extracting source submission IDs");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // Extract source submission IDs from approved submissions
      let sourceSubmissionIds: string[] = [];
      if (apiSubmissions && Array.isArray(apiSubmissions)) {
        sourceSubmissionIds = apiSubmissions
          .map((sub: any) => sub.submissionId || sub.id)
          .filter((id: string) => id && !id.startsWith('CONS-')); // Exclude already consolidated submissions
        
        console.log("📋 Source submission IDs:", sourceSubmissionIds);
        console.log("📋 Source submissions count:", sourceSubmissionIds.length);
      }

      // Step 2.6: Build indicator-level mapping for traceability
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🗺️ STEP 2.6: Building indicator-level mapping");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // Filter out consolidated submissions and get full submission objects for mapping
      const sourceSubmissionsForMapping = apiSubmissions && Array.isArray(apiSubmissions)
        ? apiSubmissions.filter((sub: any) => {
            // Exclude consolidated submissions by checking metadata
            const formData = sub.formData || sub.form_data || {};
            const metadata = formData._metadata;
            return !metadata?.isConsolidated;
          })
        : [];
      
      console.log("🗺️ Source submissions for mapping:", sourceSubmissionsForMapping.length);
      
      // Build indicator mapping
      const indicatorMapping = buildIndicatorMapping(sourceSubmissionsForMapping, formData);
      
      console.log("✅ [FinalSubmit] Indicator mapping built:", {
        totalMapped: Object.keys(indicatorMapping).length,
        mappedIndicators: Object.keys(indicatorMapping),
      });

      // Step 2.7: Check if there's an existing consolidated submission for this state/year
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔍 STEP 2.7: Checking for existing consolidated submission");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      let existingConsolidatedSubmission: any = null;
      const currentYear = new Date().getFullYear();
      
      // Find existing consolidated submission for this state and year
      if (submissions && Array.isArray(submissions)) {
        existingConsolidatedSubmission = submissions.find((sub: any) => {
          // Check if consolidated by metadata
          const formData = sub.formData || sub.form_data || {};
          const metadata = formData._metadata;
          const isConsolidated = metadata?.isConsolidated === true;
          
          const isForCurrentState = sub.stateUt?.toUpperCase() === effectiveState.toUpperCase();
          const isOwnSubmission = sub.user?.id === user?.id || sub.submittedBy === user?.id;
          // Check year from submissionId (format: SUB-YYYY-XXXXXX)
          const submissionId = sub.submissionId || '';
          const isForCurrentYear = submissionId.includes(`-${currentYear}-`);
          
          return isConsolidated && isForCurrentState && isOwnSubmission && isForCurrentYear;
        });
      }
      
      if (existingConsolidatedSubmission) {
        console.log("✅ [FinalSubmit] Found existing consolidated submission:", existingConsolidatedSubmission.submissionId);
        console.log("✅ [FinalSubmit] Existing submission ID:", existingConsolidatedSubmission.id);
        console.log("✅ [FinalSubmit] Existing submission status:", existingConsolidatedSubmission.status);
      } else {
        console.log("ℹ️ [FinalSubmit] No existing consolidated submission found - will create a new one");
      }

      // Step 3: Transform formData for submission
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔄 STEP 3: Transforming formData for submission");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // Determine submission status - if updating existing, keep its status, otherwise create new with SUBMITTED_TO_MOSPI_REVIEWER
      const submissionStatus = existingConsolidatedSubmission?.status || "SUBMITTED_TO_MOSPI_REVIEWER";
      
      // If updating existing submission, use its submissionId, otherwise generate new one
      const submissionIdToUse = existingConsolidatedSubmission 
        ? existingConsolidatedSubmission.submissionId 
        : undefined;
      
      const transformedData = transformFormDataForSubmission(
        formData, 
        submissionStatus,
        {
          isConsolidated: true,
          sourceSubmissionIds: sourceSubmissionIds,
          consolidatedBy: user?.id || '',
          stateUt: effectiveState,
          existingSubmissionId: submissionIdToUse, // Pass existing ID if updating
          indicatorMapping: indicatorMapping, // Pass indicator-level mapping for traceability
        }
      );

      // Step 4: Create multipart FormData with file attachments
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📎 STEP 4: Preparing multipart FormData with file attachments");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      const multipartData = new FormData();
      multipartData.append("submission", JSON.stringify(transformedData));
      appendFilesRecursively(multipartData, formData);

      // Step 5: Get authentication token and submit/update
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(existingConsolidatedSubmission ? "🔄 STEP 5: Updating existing consolidated submission" : "📤 STEP 5: Creating new consolidated submission");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      const tokenDataRaw = localStorage.getItem("niri_app:auth_tokens");
      const tokenData = tokenDataRaw ? JSON.parse(tokenDataRaw) : null;
      const tokenFromNewKey = tokenData?.value?.accessToken;
      const tokenFromLegacyKey = localStorage.getItem("access_token") || undefined;
      const token = tokenFromNewKey || tokenFromLegacyKey || "";

      if (!token) {
        console.error("❌ [FinalSubmit] No authentication token found");
        notificationService.error("Authentication error. Please log in again.");
        setSubmittingFinal(false);
        return;
      }

      let response: any;
      let consolidatedSubmissionId: string;
      let returnedStatus: string;

      if (existingConsolidatedSubmission) {
        // Update existing consolidated submission
        console.log("🔄 [FinalSubmit] Updating existing consolidated submission:", existingConsolidatedSubmission.id);
        
        // For update, we only need to send formData (not the full submission object)
        const updatePayload = {
          formData: transformedData.formData,
          status: transformedData.status, // Ensure status is also updated
        };
        
        response = await axios.put(
          `${config.apiBaseUrl}/submission/${existingConsolidatedSubmission.id}`,
          updatePayload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        console.log("✅ Update successful!");
        console.log("📦 Response:", response.data);
        
        // Extract submission from response
        const updatedSubmission = response.data?.data || response.data;
        consolidatedSubmissionId = existingConsolidatedSubmission.submissionId;
        returnedStatus = updatedSubmission?.status || existingConsolidatedSubmission.status;
      } else {
        // Create new consolidated submission
        console.log("📤 [FinalSubmit] Creating new consolidated submission");
        
        response = await axios.post(
          `${config.apiBaseUrl}/submission`,
          multipartData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "multipart/form-data",
            },
          }
        );

        console.log("✅ Create successful!");
        console.log("📦 Response:", response.data);
        
        // Extract submission from response
        const createdSubmission = response.data?.data || response.data;
        consolidatedSubmissionId = transformedData.submissionId;
        returnedStatus = createdSubmission?.status || transformedData.status;
      }
      
      console.log("📝 [FinalSubmit] Consolidated submission ID:", consolidatedSubmissionId);
      console.log("📊 [FinalSubmit] Returned status from API:", returnedStatus);
      console.log("✅ [FinalSubmit] " + (existingConsolidatedSubmission ? "Update" : "Create") + " completed");
      
      // Update source submissions with consolidation metadata (for both create and update)
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔗 [FinalSubmit] STEP 6: Updating source submissions with consolidation metadata");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📝 Consolidated Submission ID:", consolidatedSubmissionId);
      console.log("📝 Is Update:", !!existingConsolidatedSubmission);
      console.log("📋 Source Submission IDs to update:", sourceSubmissionIds);
      
      if (sourceSubmissionIds.length > 0 && consolidatedSubmissionId) {
        try {
          // Get all submissions to find the actual submission IDs (not just submissionId field)
          const allSubmissions = await apiService.getSubmissions(1, 100);
          let submissionsArray: any[] = [];
          if (Array.isArray(allSubmissions)) {
            submissionsArray = allSubmissions;
          } else if (allSubmissions?.submissions && Array.isArray(allSubmissions.submissions)) {
            submissionsArray = allSubmissions.submissions;
          } else if ((allSubmissions as any)?.data && Array.isArray((allSubmissions as any).data)) {
            submissionsArray = (allSubmissions as any).data;
          }
          
          // Update each source submission
          const updatePromises = sourceSubmissionIds.map(async (sourceSubmissionId) => {
            // Find the submission by submissionId or id
            const sourceSubmission = submissionsArray.find(
              (sub: any) => sub.submissionId === sourceSubmissionId || sub.id === sourceSubmissionId
            );
            
            if (sourceSubmission) {
              const actualSubmissionId = sourceSubmission.id; // Use the database ID
              try {
                // Get current formData
                const currentSubmission = await apiService.getSubmission(actualSubmissionId);
                const currentFormData = currentSubmission?.formData || {};
                
                // Add consolidation metadata to formData
                const updatedFormData = {
                  ...currentFormData,
                  _consolidation: {
                    consolidatedInto: consolidatedSubmissionId,
                    consolidatedAt: new Date().toISOString(),
                    consolidatedBy: user?.id || '',
                  },
                };
                
                // Update the submission with consolidation metadata
                await apiService.updateSubmission(actualSubmissionId, updatedFormData);
                console.log(`✅ [FinalSubmit] Updated source submission ${sourceSubmissionId} (ID: ${actualSubmissionId})`);
              } catch (updateError: any) {
                console.warn(`⚠️ [FinalSubmit] Failed to update source submission ${sourceSubmissionId}:`, updateError?.message);
                // Don't fail the whole process if one update fails
              }
            } else {
              console.warn(`⚠️ [FinalSubmit] Source submission ${sourceSubmissionId} not found in submissions list`);
            }
          });
          
          await Promise.allSettled(updatePromises);
          console.log("✅ [FinalSubmit] Finished updating source submissions");
        } catch (updateError: any) {
          console.warn("⚠️ [FinalSubmit] Error updating source submissions:", updateError?.message);
          // Don't fail the consolidation if metadata update fails
        }
      } else {
        console.log("ℹ️ [FinalSubmit] No source submissions to update or missing consolidated submission ID");
      }
      
      notificationService.success(
        existingConsolidatedSubmission 
          ? "Consolidated submission updated and sent to MoSPI Reviewer successfully."
          : "Consolidated submission created and sent to MoSPI Reviewer successfully."
      );

      // Refresh progress and submissions list
      try {
        const resp = await apiService.getStateIndicatorStatuses();
        const normalized = resp?.data ? resp : { data: resp };
        const stats = calculateStateProgressFromApi(normalized);
        setStateProgress(stats);

        const updated = await apiService.getSubmissions(1, 100);
        let submissionsArray: any[] = [];
        if (Array.isArray(updated)) submissionsArray = updated;
        else if (updated?.submissions) submissionsArray = updated.submissions;
        else if ((updated as any)?.data && Array.isArray((updated as any).data)) {
          submissionsArray = (updated as any).data;
        }
        setSubmissions(submissionsArray);
        // The hasSubmittedToMospiReviewer will be recalculated automatically via useMemo when submissions change
      } catch (e) {
        console.error("⚠️ Failed to refresh data", e);
      }
    } catch (previewError: any) {
      console.error("❌ [FinalSubmit] Error fetching cumulative preview:", previewError);
      console.error("❌ [FinalSubmit] Error details:", {
        message: previewError?.message,
        response: previewError?.response?.data,
        status: previewError?.response?.status,
        stateUsed: effectiveState,
        userStateUt: user?.stateUt,
      });
      
      // Provide more specific error messages
      if (previewError?.response?.status === 403) {
        notificationService.error(
          `Access denied. The state "${effectiveState}" does not match your account state. Please contact support.`
        );
      } else if (previewError?.response?.status === 404) {
        notificationService.error(
          `No data found for state "${effectiveState}". Please ensure all indicators are approved.`
        );
      } else {
        notificationService.error(
          previewError?.response?.data?.message || 
          previewError?.message || 
          "Failed to fetch cumulative preview data. Please try again."
        );
      }
      setSubmittingFinal(false);
      return;
    }

  } catch (e: any) {
    console.error("❌ Error in consolidated submission:", e);
    notificationService.error(e?.message || "Error creating consolidated submission.");
  } finally {
    setSubmittingFinal(false);
    console.groupEnd();
  }
};

const handlePreviewClick = (rowStateUt?: string, year?: string) => {
  // Use same logic as StateAggregateReviewPage for consistency
  let resolvedState = rowStateUt || "";
  if (!resolvedState) {
    if (user?.stateUt) {
      resolvedState = user.stateUt.toUpperCase();
    } else if (user?.stateName) {
      resolvedState = user.stateName.toUpperCase();
    } else if (user?.state) {
      resolvedState = user.state.toUpperCase();
    }
  }

  const params = new URLSearchParams();
  if (resolvedState) params.set("state", resolvedState);
  if (year) params.set("year", year);

  const qs = params.toString();
  navigate(`/data-submission/state-aggregate${qs ? `?${qs}` : ""}`);
};



  // Filter submissions based on search and filters
  // const filteredSubmissions = useMemo(() => {
  //   return submissions.filter((submission) => {
  //     // Search filter
  //     const matchesSearch =
  //       searchQuery === "" ||
  //       (submission.title || submission.submissionId || `Submission ${submission.id}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
  //       (submission.submittedBy?.name || submission.user?.firstName + " " + submission.user?.lastName || "Unknown").toLowerCase().includes(searchQuery.toLowerCase()) ||
  //       (submission.category || "Infrastructure").toLowerCase().includes(searchQuery.toLowerCase()) ||
  //       (submission.id || submission.submissionId).toLowerCase().includes(searchQuery.toLowerCase());

  //     // State filter - COMMENTED OUT
  //     // const matchesState =
  //     //   stateFilter === "all" ||
  //     //   (submission.stateUt || submission.submittedBy?.location || "Unknown")
  //     //     .toLowerCase()
  //     //     .includes(stateFilter.toLowerCase());

  //     // Status filter - COMMENTED OUT
  //     // const matchesStatus =
  //     //   statusFilter === "all" || (submission.status || "Unknown") === statusFilter;

  //     return matchesSearch; // && matchesState && matchesStatus;
  //   });
  // }, [searchQuery, submissions]); // stateFilter, statusFilter removed from dependencies


  // Group submissions for state approver
  const groupedSubmissions = useMemo(() => {
    if (user?.role === "STATE_APPROVER" && user?.id) {
      const currentState = user?.stateUt || user?.stateName || user?.state;
      return filterSubmissionsForStateApprover(submissions, user.id, currentState);
    }
    return null;
  }, [submissions, user?.role, user?.id, user?.stateUt, user?.stateName, user?.state]);

  const filteredSubmissions = useMemo(() => {
    // First, deduplicate submissions by ID to ensure each submission appears only once
    // If duplicates exist, keep the one with the most recent updatedAt timestamp
    const submissionMap = new Map<string, any>();
    submissions.forEach((submission) => {
      const existing = submissionMap.get(submission.id);
      if (!existing) {
        submissionMap.set(submission.id, submission);
      } else {
        // If duplicate exists, keep the one with more recent updatedAt
        const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);
        const currentDate = new Date(submission.updatedAt || submission.createdAt || 0);
        if (currentDate > existingDate) {
          submissionMap.set(submission.id, submission);
        }
      }
    });
    const deduplicatedSubmissions = Array.from(submissionMap.values());
    
    // Sort by updatedAt (most recent first) to ensure latest status is shown
    deduplicatedSubmissions.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    return deduplicatedSubmissions.filter((submission) => {
      // Role-based status filter
      let statusMatch = true; // Default: show all for roles without specific filtering
      
      if (user?.role === "MOSPI_REVIEWER") {
        // MoSPI Reviewer should see:
        // 1. Submissions submitted to them (SUBMITTED_TO_MOSPI_REVIEWER, SUBMITTED_TO_MOSPI, RETURNED_FROM_MOSPI)
        // 2. Submissions they've forwarded to MoSPI Approver (SUBMITTED_TO_MOSPI_APPROVER)
        // 3. Approved submissions (APPROVED)
        const allowedStatuses = [
          "SUBMITTED_TO_MOSPI_REVIEWER",
          "SUBMITTED_TO_MOSPI",
          "RETURNED_FROM_MOSPI", // Include returned submissions that can be resubmitted
          "SUBMITTED_TO_MOSPI_APPROVER", // Show submissions forwarded to approver
          "APPROVED", // Show approved submissions
        ];
        statusMatch = submission.status && allowedStatuses.includes(submission.status);
      } else if (user?.role === "MOSPI_APPROVER") {
        // MoSPI Approver should see:
        // 1. Submissions submitted to them (SUBMITTED_TO_MOSPI_APPROVER)
        // 2. Approved submissions (APPROVED)
        const allowedStatuses = [
          "SUBMITTED_TO_MOSPI_APPROVER",
          "APPROVED", // Show approved submissions
        ];
        statusMatch = submission.status && allowedStatuses.includes(submission.status);
      } else if (user?.role === "STATE_APPROVER") {
        // State Approver should see:
        // 1. Submissions submitted to them (SUBMITTED_TO_STATE, RETURNED_FROM_STATE, RETURNED_FROM_MOSPI)
        // 2. Their own consolidated submissions submitted to MoSPI Reviewer (SUBMITTED_TO_MOSPI_REVIEWER)
        // 3. Their own submissions forwarded to MoSPI Approver (SUBMITTED_TO_MOSPI_APPROVER)
        // 4. Their own approved submissions (APPROVED)
        const allowedStatuses = [
          "SUBMITTED_TO_STATE",
          "RETURNED_FROM_STATE", // Include returned submissions
          "RETURNED_FROM_MOSPI", // Include resubmissions from MoSPI
          "SUBMITTED_TO_MOSPI_APPROVER", // Show submissions forwarded to approver
          "APPROVED", // Show approved submissions
        ];
        const isOwnSubmission = submission.user?.id === user?.id || 
          submission.submittedBy?.id === user?.id ||
          (submission.user?.email && submission.user.email === user?.email);
        const isConsolidatedSubmission = 
          (submission.status === "SUBMITTED_TO_MOSPI_REVIEWER" && isOwnSubmission) ||
          (submission.status === "SUBMITTED_TO_MOSPI_APPROVER" && isOwnSubmission) ||
          (submission.status === "APPROVED" && isOwnSubmission);
        statusMatch = (submission.status && allowedStatuses.includes(submission.status)) || isConsolidatedSubmission;
      } else if (user?.role === "NODAL_OFFICER") {
        // Nodal Officer should see their own submissions
        // No status filter needed - they see all their submissions
        statusMatch = true;
      }
      
      // Search filter
      const title = (submission.title || submission.submissionId || `Submission ${submission.id}` || "").toLowerCase();
      const submitter =
        (submission.submittedBy?.name ||
          (submission.user ? `${submission.user.firstName || ""} ${submission.user.lastName || ""}`.trim() : "") ||
          "Unknown").toLowerCase();
      const category = (submission.category || "Infrastructure").toLowerCase();
      const idStr = (submission.id || submission.submissionId || "").toLowerCase();

      const q = searchQuery.toLowerCase();
      const searchMatch = (
        searchQuery === "" ||
        title.includes(q) ||
        submitter.includes(q) ||
        category.includes(q) ||
        idStr.includes(q)
      );
      
      return statusMatch && searchMatch;
    });
  }, [searchQuery, submissions, user?.role]);

  // Check if there's already a consolidated submission with status SUBMITTED_TO_MOSPI_REVIEWER, SUBMITTED_TO_MOSPI_APPROVER, or APPROVED
  const hasSubmittedToMospiReviewer = useMemo(() => {
    if (user?.role !== "STATE_APPROVER") return false;
    
    // Get the current state (for multi-state scenarios)
    const currentState = user?.stateUt || user?.stateName || user?.state;
    
    return submissions.some((submission) => {
      const isOwnSubmission = submission.user?.id === user?.id || 
        submission.submittedBy?.id === user?.id ||
        (submission.user?.email && submission.user.email === user?.email);
      // Check if submission is for the current state and has been submitted to MOSPI reviewer, approver, or approved
      const isForCurrentState = !currentState || 
        submission.stateUt === currentState || 
        (submission.user?.stateUt === currentState);
      // Disable submit button if submission is with MOSPI reviewer, approver, or has been approved
      return (submission.status === "SUBMITTED_TO_MOSPI_REVIEWER" || 
              submission.status === "SUBMITTED_TO_MOSPI_APPROVER" ||
              submission.status === "APPROVED") 
        && isOwnSubmission && isForCurrentState;
    });
  }, [submissions, user?.role, user?.id, user?.email, user?.stateUt, user?.stateName, user?.state]);


  // Handle export
  const handleExport = () => {
    const columns = [
      { label: "Submission ID", key: "id" },
      { label: "Title", key: "title" },
      { label: "Status", key: "status" },
      { label: "Submitted By", key: "submittedByName" },
      { label: "Location", key: "location" },
      { label: "Submission Date", key: "submissionDate" },
      { label: "Deadline", key: "deadline" },
      { label: "Category", key: "category" },
      { label: "Progress", key: "progress" },
      { label: "Documents Count", key: "documentsCount" },
      { label: "Days Pending", key: "daysPending" },
    ];

    const exportData = filteredSubmissions.map((submission) => ({
      id: submission.id || submission.submissionId,
      title: submission.title || submission.submissionId || `Submission ${submission.id}`,
      status: submission.status || "Unknown",
      submittedByName: submission.submittedBy?.name || submission.user?.firstName + " " + submission.user?.lastName || "Unknown",
      location: submission.submittedBy?.location || submission.stateUt || "Unknown",
      submissionDate: submission.submissionDate || submission.createdAt,
      deadline: submission.deadline || "N/A",
      category: submission.category || "Infrastructure",
      progress: `${submission.progress || 0}%`,
      documentsCount: submission.documentsCount || 0,
      daysPending: submission.daysPending || (submission.createdAt ? Math.max(0, Math.floor((new Date().getTime() - new Date(submission.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 0),
    }));

    exportTableToCSV(
      exportData,
      columns,
      `submissions_${new Date().toISOString().split("T")[0]}.csv`,
    );

    toast({
      title: "Export Successful",
      description: `${filteredSubmissions.length} submissions exported to CSV`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "overdue":
        return "bg-red-100 text-red-700 border-red-300";
      case "approved":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Latest Submission */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Latest Submission
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredSubmissions.length} Submission
                {filteredSubmissions.length !== 1 ? "s" : ""} Found
              </p>
            </div>
            {/* <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Export
            </Button> */}
          </div>
        </div>

        {/* Progress Overview Section - Only for STATE_APPROVER */}
   

        {user?.role === "STATE_APPROVER" && (
  <div className="max-w-7xl mx-auto mb-6">
    <div className="mb-4 flex items-start justify-between gap-4">
    </div>

    {progressLoading ? (
      <div className="text-sm text-muted-foreground">Loading progress…</div>
    ) : stateProgress ? (
      <div className="space-y-6">
        <div className={`border rounded-lg p-4 ${
            stateProgress.percentage === 100 
            ? "border-green-200 bg-green-50/50" 
            : "border-amber-200 bg-amber-50/50"
          }`}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Approved Indicator for FY 2025 - 2026</h2>
            <div className="flex items-center gap-2 text-sm mt-1">
              <span className={`font-medium ${stateProgress.percentage === 100 ? "text-green-600" : "text-amber-800"}`}>
                {stateProgress.approved}/{stateProgress.total}
              </span>
              <span className={stateProgress.percentage === 100 ? "text-green-600" : "text-amber-800"}>
                {Math.round(stateProgress.percentage)}% Submitted
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress 
                value={stateProgress.percentage} 
                className={`h-3 ${
                  stateProgress.percentage === 100 
                  ? "[&>div]:bg-green-600" 
                  : "[&>div]:bg-amber-700"
                }`}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="shrink-0 px-6 text-[#1e3a8a] hover:bg-gray-50 border-[#1e3a8a]"
                onClick={() => handlePreviewClick(undefined, selectedYear)}
                //   {
                //   // Get all indicators with status matching what we want
                //   const stateIndicators = filteredSubmissions.filter(s => 
                //     (s.status === "SUBMITTED_TO_STATE" || s.status === "RETURNED_FROM_MOSPI") &&
                //     s.stateUt === user?.state
                //   );

                //   // If we have at least one submission, navigate to it
                //   if (stateIndicators.length > 0) {
                //     // Take the first submission and show in preview mode
                //     const previewSubmission = stateIndicators[0];
                //     navigate(`/data-submission/review/${previewSubmission.id}?preview=true`);
                //   } else {
                //     notificationService.warning("No indicators available for preview");
                //   }
                // }
              // }
              >
                Preview
              </Button>
              <Button
                className={`shrink-0 text-white px-6 ${
                  stateProgress.percentage === 100 && !submittingFinal && !progressLoading && stateProgress.approved === stateProgress.total && !hasSubmittedToMospiReviewer
                  ? "bg-[#1e3a8a] hover:bg-[#1e3299]" // Darker blue when enabled at 100%
                  : "bg-[#7888E3] hover:bg-[#6574CC]"  // Default lighter blue
                }`}
                onClick={() => setShowConfirmModal(true)}
                disabled={
                  submittingFinal ||
                  progressLoading ||
                  !stateProgress ||
                  stateProgress.approved !== stateProgress.total ||
                  hasSubmittedToMospiReviewer
                }
              >
                {submittingFinal ? "Submitting…" : "Submit Now"}
              </Button>
            </div>
          </div>
        </div>
        {/* <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-primary">{stateProgress.total}</p>
            <p className="text-sm text-muted-foreground">Total Indicators</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-600">{stateProgress.approved}</p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-orange-600">
              {stateProgress.total - stateProgress.approved}
            </p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </div>
        </div> */}
      </div>
    ) : (
      <div className="text-sm text-muted-foreground">
        No indicator statuses found yet.
      </div>
    )}
  </div>
)}

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white rounded-lg shadow-sm border p-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search submission, submitters, or categories"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Location Filter - COMMENTED OUT */}
          {/* <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="mumbai">Mumbai</SelectItem>
              <SelectItem value="pune">Pune</SelectItem>
              <SelectItem value="nagpur">Nagpur</SelectItem>
              <SelectItem value="nashik">Nashik</SelectItem>
              <SelectItem value="thane">Thane</SelectItem>
              <SelectItem value="aurangabad">Aurangabad</SelectItem>
            </SelectContent>
          </Select> */}
          
          {/* Status Filter - COMMENTED OUT */}
          {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select> */}
          <div className="flex gap-2">
            {/* <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button> */}
          </div>
        </div>

        {/* Submissions List/Grid */}
        {viewMode === "list" ? (
          <div className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No submissions found
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters or search query
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredSubmissions.map((submission) => {
                // Calculate progress
                const progress = submission.progress || (submission.formData ? Math.min(100, Object.keys(submission.formData).length * 20) : 0);
                
                // Determine next step with role-specific messaging
                let nextStep = "Complete submission";
                if (submission.status === "DRAFT") {
                  nextStep = "Complete all required sections";
                } else if (submission.status === "SUBMITTED_TO_STATE") {
                  nextStep = "Waiting for state approval";
                } else if (submission.status === "SUBMITTED_TO_MOSPI_REVIEWER") {
                  if (user?.role === "STATE_APPROVER") {
                    nextStep = "With MOSPI Reviewer for review";
                  } else {
                    nextStep = "Submitted to MoSPI Reviewer";
                  }
                } else if (submission.status === "SUBMITTED_TO_MOSPI_APPROVER") {
                  if (user?.role === "STATE_APPROVER") {
                    nextStep = "Forwarded to MOSPI Approver by MOSPI Reviewer";
                  } else if (user?.role === "MOSPI_REVIEWER") {
                    nextStep = "Forwarded to MOSPI Approver for final approval";
                  } else {
                    nextStep = "Submitted to MoSPI Approver";
                  }
                } else if (submission.status === "APPROVED") {
                  if (user?.role === "STATE_APPROVER") {
                    nextStep = "Approved by MOSPI Approver";
                  } else {
                    nextStep = "Submission approved";
                  }
                } else if (submission.status === "REJECTED" || submission.status === "REJECTED_FINAL") {
                  nextStep = "Address reviewer feedback";
                }

                // Get reviewer note
                const reviewerNote = submission.reviewComments && submission.reviewComments.length > 0 
                  ? submission.reviewComments[submission.reviewComments.length - 1]?.text 
                  : undefined;

                // For submissions forwarded to MoSPI Approver or approved, find who forwarded it
                let submittedByText = submission.user ? `${submission.user.firstName || ''} ${submission.user.lastName || ''}`.trim() || "Unknown" : "Unknown";
                
                // For SUBMITTED_TO_MOSPI_APPROVER or APPROVED status, show MOSPI Reviewer as submitted by
                // (since MOSPI Reviewer forwarded it to MOSPI Approver)
                if (submission.status === "SUBMITTED_TO_MOSPI_APPROVER" || submission.status === "APPROVED") {
                  // Look for the most recent comment from MOSPI_REVIEWER who forwarded it
                  if (submission.reviewComments && Array.isArray(submission.reviewComments)) {
                    const reviewerComments = submission.reviewComments
                      .filter((comment: any) => 
                        comment.role === "MOSPI_REVIEWER"
                      )
                      .sort((a: any, b: any) => {
                        const timeA = new Date(a.timestamp || 0).getTime();
                        const timeB = new Date(b.timestamp || 0).getTime();
                        return timeB - timeA; // Most recent first
                      });
                    
                    if (reviewerComments.length > 0) {
                      const lastReviewer = reviewerComments[0];
                      submittedByText = lastReviewer.userName || "MoSPI Reviewer";
                    } else {
                      submittedByText = "MoSPI Reviewer";
                    }
                  } else {
                    submittedByText = "MoSPI Reviewer";
                  }
                }

                return (
                  <UnifiedSubmissionCard
                    key={submission.id}
                    id={submission.id}
                    title={submission.submissionId || submission.title || `Submission ${submission.id}`}
                    status={submission.status}
                    referenceId={submission.submissionId || submission.id}
                    updatedDate={submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : submission.submissionDate || "N/A"}
                    dueDate={submission.deadline || (submission.createdAt ? new Date(new Date(submission.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "N/A")}
                    progress={Math.round(progress)}
                    nextStep={nextStep}
                    reviewerNote={reviewerNote}
                    submission={submission}
                    currentUserRole={user?.role}
                    submittedBy={submittedByText}
                    onViewDetails={() => navigate(`/data-submission/review/${submission.id}`)}
                    onReview={() => navigate(`/data-submission/review/${submission.id}`)}
                  />
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No submissions found
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters or search query
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredSubmissions.map((submission) => {
                // Calculate progress
                const progress = submission.progress || (submission.formData ? Math.min(100, Object.keys(submission.formData).length * 20) : 0);
                
                // Determine next step with role-specific messaging
                let nextStep = "Complete submission";
                if (submission.status === "DRAFT") {
                  nextStep = "Complete all required sections";
                } else if (submission.status === "SUBMITTED_TO_STATE") {
                  nextStep = "Waiting for state approval";
                } else if (submission.status === "SUBMITTED_TO_MOSPI_REVIEWER") {
                  if (user?.role === "STATE_APPROVER") {
                    nextStep = "With MOSPI Reviewer for review";
                  } else {
                    nextStep = "Submitted to MoSPI Reviewer";
                  }
                } else if (submission.status === "SUBMITTED_TO_MOSPI_APPROVER") {
                  if (user?.role === "STATE_APPROVER") {
                    nextStep = "Forwarded to MOSPI Approver by MOSPI Reviewer";
                  } else if (user?.role === "MOSPI_REVIEWER") {
                    nextStep = "Forwarded to MOSPI Approver for final approval";
                  } else {
                    nextStep = "Submitted to MoSPI Approver";
                  }
                } else if (submission.status === "APPROVED") {
                  if (user?.role === "STATE_APPROVER") {
                    nextStep = "Approved by MOSPI Approver";
                  } else {
                    nextStep = "Submission approved";
                  }
                } else if (submission.status === "REJECTED" || submission.status === "REJECTED_FINAL") {
                  nextStep = "Address reviewer feedback";
                }

                // Get reviewer note
                const reviewerNote = submission.reviewComments && submission.reviewComments.length > 0 
                  ? submission.reviewComments[submission.reviewComments.length - 1]?.text 
                  : undefined;

                // For submissions forwarded to MoSPI Approver or approved, find who forwarded it
                let submittedByText = submission.user ? `${submission.user.firstName || ''} ${submission.user.lastName || ''}`.trim() || "Unknown" : "Unknown";
                
                // For SUBMITTED_TO_MOSPI_APPROVER or APPROVED status, show MOSPI Reviewer as submitted by
                // (since MOSPI Reviewer forwarded it to MOSPI Approver)
                if (submission.status === "SUBMITTED_TO_MOSPI_APPROVER" || submission.status === "APPROVED") {
                  // Look for the most recent comment from MOSPI_REVIEWER who forwarded it
                  if (submission.reviewComments && Array.isArray(submission.reviewComments)) {
                    const reviewerComments = submission.reviewComments
                      .filter((comment: any) => 
                        comment.role === "MOSPI_REVIEWER"
                      )
                      .sort((a: any, b: any) => {
                        const timeA = new Date(a.timestamp || 0).getTime();
                        const timeB = new Date(b.timestamp || 0).getTime();
                        return timeB - timeA; // Most recent first
                      });
                    
                    if (reviewerComments.length > 0) {
                      const lastReviewer = reviewerComments[0];
                      submittedByText = lastReviewer.userName || "MoSPI Reviewer";
                    } else {
                      submittedByText = "MoSPI Reviewer";
                    }
                  } else {
                    submittedByText = "MoSPI Reviewer";
                  }
                }

                return (
                  <UnifiedSubmissionCard
                    key={submission.id}
                    id={submission.id}
                    title={submission.submissionId || submission.title || `Submission ${submission.id}`}
                    status={submission.status}
                    referenceId={submission.submissionId || submission.id}
                    updatedDate={submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : submission.submissionDate || "N/A"}
                    dueDate={submission.deadline || (submission.createdAt ? new Date(new Date(submission.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "N/A")}
                    progress={Math.round(progress)}
                    nextStep={nextStep}
                    reviewerNote={reviewerNote}
                    submission={submission}
                    currentUserRole={user?.role}
                    submittedBy={submittedByText}
                    onViewDetails={() => navigate(`/data-submission/review/${submission.id}`)}
                    onReview={() => navigate(`/data-submission/review/${submission.id}`)}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Final Submit */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Now?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this submission to MoSPI Reviewer?
              <br />
              Once submitted, you cannot make changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingFinal}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmModal(false);
                handleFinalSubmit();
              }}
              disabled={submittingFinal}
              className="bg-[#1e3a8a] hover:bg-[#1e3299]"
            >
              {submittingFinal ? "Submitting…" : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
