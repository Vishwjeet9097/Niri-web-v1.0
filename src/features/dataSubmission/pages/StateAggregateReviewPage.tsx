import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/features/auth/AuthProvider";
import { getCumulativePreview, apiService } from "@/services/api.service";
import { statesService } from "@/services/states.service";
import { notificationService } from "@/services/notification.service";
import { OverviewTab } from "../components/tabs/OverviewTab";
import { DataReviewTab } from "../components/tabs/DataReviewTab";
import { DocumentsTab } from "../components/tabs/DocumentsTab";
import { AuditLog } from "@/components/AuditLog";
import { generateAuditEntries } from "@/utils/auditUtils";

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

type AggregatedPayload = {
  stateUt: string;
  users?: number;
  totalIndicators?: number;
  categories?: string[];
  summary?: {
    acceptedCount?: number;
    totalIndicators?: number;
    pendingCount?: number;
    rejectedCount?: number;
    inReviewCount?: number;
    percentage?: number;
    lastUpdatedAt?: string;
  };
  indicators?: Record<string, AggregatedIndicator[]>;
  submissions?: any[];
};

type StateOption = {
  id: string;
  name: string;
  code: string;
};

/**
 * Transform aggregated indicators from API into formData structure expected by review components
 */
const transformIndicatorsToFormData = (
  indicators: Record<string, AggregatedIndicator[]>
): any => {
  console.log("[Transform] Raw indicators input:", indicators);
  console.log("[Transform] Indicator keys:", Object.keys(indicators));
  
  const formData: any = {
    infraFinancing: {},
    infraDevelopment: {},
    pppDevelopment: {},
    infraEnablers: {},
  };

  // Map category names to formData keys (matching actual API response)
  const categoryMap: Record<string, string> = {
    "Infrastructure Financing": "infraFinancing",
    "Infrastructure Development": "infraDevelopment",
    "PPP Development": "pppDevelopment",
    "Infrastructure Enablers": "infraEnablers",
    // Fallback mappings
    infra_financing: "infraFinancing",
    Infrastructure_Financing: "infraFinancing",
    infra_development: "infraDevelopment",
    Infrastructure_Development: "infraDevelopment",
    ppp_development: "pppDevelopment",
    PPP_Development: "pppDevelopment",
    infra_enablers: "infraEnablers",
    Infrastructure_Enablers: "infraEnablers",
  };

  // Process each category
  Object.entries(indicators).forEach(([categoryKey, indicatorList]) => {
    console.log(`[Transform] Processing category: ${categoryKey} with ${indicatorList?.length || 0} indicators`);
    
    const formDataKey = categoryMap[categoryKey];
    if (!formDataKey || !formData[formDataKey]) {
      console.warn(`[Transform] Unknown category: ${categoryKey}, skipping`);
      return;
    }

    // Process each indicator in the category
    indicatorList.forEach((indicator) => {
      const code = indicator.code?.trim();
      if (!code) {
        console.warn(`[Transform] Indicator without code:`, indicator);
        return;
      }

      console.log(`[Transform] Processing indicator ${code} in category ${categoryKey}`);
      console.log(`[Transform] Indicator data:`, indicator.data);

      // Convert code to section key (e.g., "1.1" -> "section1_1")
      const sectionKey = `section${code.replace(".", "_")}`;

      // Extract data from indicator - data is directly in indicator.data, not nested
      let indicatorData = indicator.data;

      // Handle null/undefined data
      if (!indicatorData) {
        indicatorData = {};
      }

      // Handle array-based indicators (2.1, 2.2, 2.3, 2.4, 2.5)
      if (Array.isArray(indicatorData)) {
        // Map to appropriate array field based on indicator code
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
        // Filter out backend fields (status, percentage, marksObtained) and keep only form fields
        const formFields: any = {};
        
        Object.entries(indicatorData).forEach(([key, value]) => {
          // Skip backend/metadata fields, but keep meaningful data
          if (!['status', 'percentage', 'marksObtained'].includes(key)) {
            formFields[key] = value;
          }
        });

        // Add year if available (from indicator.year or data.year)
        if (indicator.year) {
          formFields.year = indicator.year;
        } else if (indicatorData.year) {
          formFields.year = indicatorData.year;
        }

        // Handle status field - infer form fields from status for some indicators
        if (indicatorData.status === 'ACCEPTED' || indicator.status === 'ACCEPTED') {
          switch (code) {
            case '3.1':
              // If status is ACCEPTED, it means PPP Act/Policy is available
              if (!formFields.available) {
                formFields.available = 'yes';
              }
              break;
            case '3.3':
              // VGF proposals accepted
              if (!formFields.VGFArray) {
                formFields.VGFArray = [];
              }
              break;
            case '3.4':
              // PPP projects accepted
              if (!formFields.projects) {
                formFields.projects = [];
              }
              break;
            case '4.1':
              // All eligible projects on NIP portal - status ACCEPTED means yes
              if (!formFields.allEligible) {
                formFields.allEligible = 'yes';
              }
              break;
          }
        }

        // Special handling for specific indicators
        switch (code) {
          case '1.3':
            // Ensure ulbList exists (might be empty)
            if (!formFields.ulbList) {
              formFields.ulbList = [];
            }
            // If totalULBs exists but ulbList is empty, still show the section
            break;
          case '1.4':
            // Ensure bondList exists (might be empty)
            if (!formFields.bondList) {
              formFields.bondList = [];
            }
            // If totalULBs exists but bondList is empty, still show the section
            break;
          case '1.5':
            // Ensure ffiArray exists (might be empty)
            if (!formFields.ffiArray) {
              formFields.ffiArray = [];
            }
            break;
          case '3.3':
            // Ensure VGFArray exists
            if (!formFields.VGFArray) {
              formFields.VGFArray = [];
            }
            break;
          case '3.4':
            // Ensure projects exists
            if (!formFields.projects) {
              formFields.projects = [];
            }
            break;
          case '4.6':
            // Ensure capacityArray exists
            if (!formFields.capacityArray) {
              formFields.capacityArray = [];
            }
            break;
        }

        // Always store sections for aggregate view - even if empty, so all indicators show
        // This ensures all indicators are visible in the aggregate review
        formData[formDataKey][sectionKey] = formFields;
        console.log(`[Transform] Stored ${sectionKey} in ${formDataKey}:`, formFields);
      }
    });
  });

  console.log("[Transform] Final formData structure:", formData);
  console.log("[Transform] infraFinancing sections:", Object.keys(formData.infraFinancing));
  console.log("[Transform] infraDevelopment sections:", Object.keys(formData.infraDevelopment));
  console.log("[Transform] pppDevelopment sections:", Object.keys(formData.pppDevelopment));
  console.log("[Transform] infraEnablers sections:", Object.keys(formData.infraEnablers));

  return formData;
};

/**
 * Create a mock submission object from aggregated data for use with existing components
 */
const createMockSubmission = (
  payload: AggregatedPayload,
  formData: any
): any => {
  const latestSubmission = payload.submissions?.[0] || {};
  
  return {
    id: `aggregate-${payload.stateUt}`,
    submissionId: `AGG-${payload.stateUt}`,
    stateUt: payload.stateUt,
    status: payload.summary?.percentage === 100 ? "APPROVED" : "SUBMITTED_TO_STATE",
    formData: formData,
    attachedFiles: [], // Can be populated from submissions if needed
    reviewComments: [],
    currentOwnerRole: "STATE_APPROVER",
    createdAt: payload.summary?.lastUpdatedAt || new Date().toISOString(),
    updatedAt: payload.summary?.lastUpdatedAt || new Date().toISOString(),
    user: latestSubmission.user || {
      email: "aggregate@state.gov",
      firstName: "State",
      lastName: "Aggregate",
    },
    finalScore: null,
    sections: Object.entries(payload.indicators || {}).map(([category, indicators]) => ({
      id: category,
      name: category.replace(/_/g, " "),
      indicators: indicators.map((ind) => ({
        id: ind.id || ind.code,
        code: ind.code,
        name: ind.name,
        status: ind.status,
        score: ind.score,
        maxScore: ind.maxScore,
        updatedAt: ind.updatedAt,
        data: ind.data,
        category: ind.category,
        year: ind.year,
      })),
    })),
  };
};

export const StateAggregateReviewPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [aggregateData, setAggregateData] = useState<AggregatedPayload | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [mockSubmission, setMockSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState(true);

  // Get state and year from URL params
  useEffect(() => {
    const stateParam = searchParams.get("state");
    const yearParam = searchParams.get("year");

    if (stateParam) {
      setSelectedState(stateParam);
    } else if (user?.stateUt || user?.stateName || user?.state) {
      const userState = (user.stateUt || user.stateName || user.state || "").trim().toUpperCase();
      setSelectedState(userState);
    }

    if (yearParam) {
      setSelectedYear(yearParam);
    }
  }, [searchParams, user]);

  // Load states
  useEffect(() => {
    const loadStates = async () => {
      try {
        setLoadingStates(true);
        const states = await statesService.getStates();
        // Filter out invalid states (empty codes, metadata entries, etc.)
        const validStates = states.filter((state) => {
          // Must have a valid code that's not empty and not a metadata field
          const hasValidCode = state.code && 
                               state.code.trim() !== "" && 
                               state.code.toLowerCase() !== "status" &&
                               state.code.toLowerCase() !== "id";
          // Must have a name
          const hasValidName = state.name && state.name.trim() !== "";
          return hasValidCode && hasValidName;
        });
        console.log(`[StateAggregate] Filtered ${validStates.length} valid states from ${states.length} total`);
        setStateOptions(validStates);
      } catch (err: any) {
        console.error("❌ Error fetching states:", err);
        notificationService.error(err.message || "Failed to load states");
      } finally {
        setLoadingStates(false);
      }
    };

    loadStates();
  }, []);

  // Determine effective state for API calls
  const effectiveState = useMemo(() => {
    if (selectedState) return selectedState;
    if (user?.stateUt) return user.stateUt.toUpperCase();
    if (user?.stateName) return user.stateName.toUpperCase();
    if (user?.state) return user.state.toUpperCase();
    return "";
  }, [selectedState, user]);

  // Load aggregate preview data
  useEffect(() => {
    const loadAggregatePreview = async () => {
      if (!effectiveState) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`[StateAggregate] Loading preview for state: ${effectiveState}, year: ${selectedYear || "current"}`);

        const payload = await getCumulativePreview(effectiveState, {
          year: selectedYear || undefined,
        });

        console.log("[StateAggregate] Cumulative preview payload:", payload);

        // The API returns the data directly or wrapped in a data property
        const data = (payload as any).data || payload;
        
        if (!data || !data.indicators) {
          console.warn("[StateAggregate] Empty payload received");
          setAggregateData(null);
          setFormData(null);
          setMockSubmission(null);
          return;
        }

        setAggregateData(data);

        // Log raw indicators structure
        console.log("[StateAggregate] Raw indicators from API:", data.indicators);
        console.log("[StateAggregate] Indicator categories:", Object.keys(data.indicators || {}));
        Object.entries(data.indicators || {}).forEach(([category, indicators]) => {
          console.log(`[StateAggregate] Category ${category}:`, indicators);
          if (Array.isArray(indicators) && indicators.length > 0) {
            console.log(`[StateAggregate] Sample indicator from ${category}:`, indicators[0]);
            console.log(`[StateAggregate] Sample indicator data structure:`, indicators[0]?.data);
          }
        });

        // Transform indicators to formData structure
        const transformedFormData = transformIndicatorsToFormData(data.indicators || {});
        console.log("[StateAggregate] Transformed formData:", transformedFormData);
        console.log("[StateAggregate] FormData keys:", Object.keys(transformedFormData));
        setFormData(transformedFormData);

        // Create mock submission for existing components
        const submission = createMockSubmission(data, transformedFormData);
        setMockSubmission(submission);

      } catch (err: any) {
        console.error("❌ Failed to load aggregate preview:", err);
        setError(err.message || "Failed to load aggregate preview");
        notificationService.error(err.message || "Failed to load aggregate preview");
      } finally {
        setLoading(false);
      }
    };

    loadAggregatePreview();
  }, [effectiveState, selectedYear]);

  // Restrict state selection for STATE_APPROVER
  const isStateApprover = user?.role === "STATE_APPROVER";
  const canSelectState = !isStateApprover;

  if (loadingStates) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error && !aggregateData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Data</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/data-submission")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#212121]">State Aggregate Review</h1>
            <p className="text-sm text-[#727272] mt-1">
              View aggregated data for all submissions from a state
            </p>
          </div>
        </div>
      </div>

      {/* State and Year Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-[#212121] mb-2 block">
                State/UT
              </label>
              <Select
                value={selectedState}
                onValueChange={setSelectedState}
                disabled={!canSelectState}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select State/UT" />
                </SelectTrigger>
                <SelectContent>
                  {stateOptions
                    .filter((option) => option.code && option.code.trim() !== "")
                    .map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!canSelectState && (
                <p className="text-xs text-[#727272] mt-1">
                  You can only view data for your assigned state
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-[#212121] mb-2 block">
                Financial Year
              </label>
              <Select value={selectedYear || "current"} onValueChange={(value) => setSelectedYear(value === "current" ? "" : value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Year</SelectItem>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2023-24">2023-24</SelectItem>
                  <SelectItem value="2022-23">2022-23</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : !mockSubmission ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-[#727272]">No data available for the selected state and year.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* State Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-[#212121]">
                    {effectiveState}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {aggregateData?.summary && (
                      <>
                        {aggregateData.summary.acceptedCount || 0} of {aggregateData.summary.totalIndicators || 0} indicators completed
                        {aggregateData.summary.percentage !== undefined && (
                          <span className="ml-2">
                            ({aggregateData.summary.percentage.toFixed(1)}%)
                          </span>
                        )}
                      </>
                    )}
                  </CardDescription>
                </div>
                {aggregateData?.summary?.percentage !== undefined && (
                  <Badge variant="outline" className="text-sm">
                    {aggregateData.summary.percentage.toFixed(1)}% Complete
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="data-review">Data Review</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab submission={mockSubmission} />
            </TabsContent>

            <TabsContent value="data-review" className="mt-6">
              <DataReviewTab
                submissionId={mockSubmission.id}
                formData={formData}
                submission={mockSubmission}
                isPreview={true}
              />
            </TabsContent>

            <TabsContent value="submissions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Submissions</CardTitle>
                  <CardDescription>
                    List of all submissions from this state
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {aggregateData?.submissions && aggregateData.submissions.length > 0 ? (
                    <div className="space-y-4">
                      {aggregateData.submissions.map((submission: any) => (
                        <Card key={submission.id || submission.submissionId}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">
                                  {submission.submissionId || submission.id}
                                </h3>
                                <p className="text-sm text-[#727272]">
                                  Submitted by {submission.user?.firstName} {submission.user?.lastName} on{" "}
                                  {submission.createdAt
                                    ? new Date(submission.createdAt).toLocaleDateString()
                                    : "—"}
                                </p>
                              </div>
                              <Badge variant="outline">{submission.status}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#727272] text-center py-8">No submissions found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <DocumentsTab
                documents={mockSubmission.attachedFiles || []}
                submissionId={mockSubmission.id}
                formData={formData}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <AuditLog entries={generateAuditEntries(mockSubmission)} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};
