import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { storageService } from "@/services/storage.service";
import { apiV2 } from "@/services/ApiService";
import { config } from "@/config/environment";
import { notificationService } from "@/services/NotificationBus";
import { apiService,getCumulativePreview, type CumulativePreviewResponse } from "@/services/api.service";
import { SectionCard } from "../components/SectionCard";
import { transformFormDataForSubmission, getFormDataSummary } from "@/utils/formDataTransformer";
import { Label } from "@/components/ui/label";
import { UnifiedReviewPage } from "../../dataSubmission/components/UnifiedReviewPage";
import { useAuth } from "@/features/auth/AuthProvider";
import { appendFilesRecursively } from "@/utils/appendFilesRecursively";
const PREVIEW_FLAG_KEY = "submission_has_previewed";

interface UrlParams {
  stateId: string | null;
  viewAll: boolean;
  includeNodalOfficers: boolean;
}

interface StateFormData {
  stateUt: string;
  indicators: any[];
  metadata: {
    state: string;
    totalIndicators: number;
    approvedIndicators: number;
    pendingIndicators: number;
  };
}

type IndicatorRow = CumulativePreviewResponse["data"]["indicators"][string][number];

const statusIsAccepted = (s?: string) => (s || "").toUpperCase().includes("ACCEPT");

type UnifiedSubmission = {
  id: string;
  submissionId: string;
  stateUt: string;
  submittedBy: string;
  rejectionCount: number;
  formData: any;              // unified structure that DataReviewTab can read
  reviewComments: any[];
  attachedFiles: any[];
  status: string;
  currentOwnerRole: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    contactNumber: string | null;
    role: string;
    stateUt: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  finalScore: number | null;
  sections?: any[];
};




export const PreviewPage = () => {
  const navigate = useNavigate();
  const { formData, updateFormData, clearFormData, isResubmit } = useFormPersistence();
  const { user } = useAuth();
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
   // Check if we're in edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const location = useLocation();
  // const navigate = useNavigate();
  const qs = new URLSearchParams(location.search);
  const paramState = (qs.get("state") || "").toUpperCase();
  const stateUt = paramState || (user?.stateUt || "").toUpperCase();
  const year = qs.get("year") || undefined;

  // const [loadingR, setLoadingR] = useState(false);
  const [data, setData] = useState<CumulativePreviewResponse["data"] | null>(null);
  // const [error, setError] = useState<string | null>(null);

 const [loadingSubmit, setLoadingSubmit] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  // const [showConfirmModal, setShowConfirmModal] = useState(false);
  // const [showSuccessModal, setShowSuccessModal] = useState(false);
  // const [submissionMessage, setSubmissionMessage] = useState("");

  const [previewData, setPreviewData] = useState<CumulativePreviewResponse["data"] | null>(null);
  const [submission, setSubmission] = useState<UnifiedSubmission | null>(null);



  const urlParams = useMemo<UrlParams>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      stateId: params.get('stateId'),
      viewAll: params.get('viewAll') === 'true',
      includeNodalOfficers: params.get('includeNodalOfficers') === 'true'
    };
  }, []);

   // Fetch once on mount or when params change
  useEffect(() => {
    if (!stateUt) {
      setError("Missing state parameter.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getCumulativePreview(stateUt, { year})
      .then((res) => {
        if (res.status && res.data) setPreviewData(res.data);
        else setError(res.message || "Failed to load preview.");
      })
      .catch((e) => setError(e?.message || "Failed to load preview."))
      .finally(() => setLoading(false));
  }, [stateUt, year]);


  // Check for edit mode on mount
  useEffect(() => {
    const editingSubmissionId = localStorage.getItem('editing_submission_id');
    const isEditModeFlag = localStorage.getItem('is_edit_mode') === 'true';

    if (editingSubmissionId && isEditModeFlag) {
      setIsEditMode(true);
      setEditingSubmissionId(editingSubmissionId);
    }

    storageService.set(PREVIEW_FLAG_KEY, true);
    setHasPreviewed(true);
  }, []); // Empty dependency array to run only once

   useEffect(() => {
    if (!previewData) return;

    // flatten & compute summary
    const categories = previewData.categories || [];
    const flat: IndicatorRow[] = categories.flatMap((c) => previewData.indicators[c] || []);

    const totals = flat.reduce(
      (acc, r) => {
        const st = (r?.status || "").toUpperCase();
        if (st.includes("ACCEPT")) acc.accepted += 1;
        else if (st.includes("SUBMIT")) acc.submitted += 1;
        else if (st.includes("NOT_STARTED")) acc.notStarted += 1;

        if (typeof r.score === "number") acc.totalScore += r.score;
        else if (typeof r.data?.marksObtained === "number") acc.totalScore += r.data.marksObtained;

        return acc;
      },
      { accepted: 0, submitted: 0, notStarted: 0, totalScore: 0 }
    );

    // build sections for tabs
    const sections = categories.map((cat) => {
      const list = (previewData.indicators[cat] || []) as IndicatorRow[];
      const acceptedInCat = list.filter((r) => statusIsAccepted(r?.status)).length;
      const progress = list.length ? Math.round((acceptedInCat / list.length) * 100) : 0;

      return {
        id: cat,
        name: cat,
        progress,
        maxPoints: list.reduce((s, r) => s + Number(r.maxScore || 0), 0),
        points: list.reduce((s, r) => {
          const p = typeof r.score === "number" ? r.score : (typeof r.data?.marksObtained === "number" ? r.data.marksObtained : 0);
          return s + (p || 0);
        }, 0),
        sectionsWithComments: 0, // if you add comments later
        indicators: list.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          status: r?.status,
          score: r.score ?? r.data?.marksObtained ?? null,
          updatedAt: r.updatedAt ?? null,
          data: r.data ?? null,
          sectionId: r.sectionId,
          maxScore: r.maxScore,
          category: r.category,
          year: r.year ?? year?? null,
        })),
      };
    });

    const formData = {
      stateUt: previewData.stateUt,
      year: year ?? null,
      summary: {
        totalIndicators: previewData.totalIndicators,
        accepted: totals.accepted,
        submitted: totals.submitted,
        notStarted: totals.notStarted,
        totalScore: totals.totalScore,
      },
      sections,
      // documents placeholder – UnifiedReviewPage's DocumentsTab expects an array
      documents: [],
    };

    const now = new Date().toISOString();

    const unified: UnifiedSubmission = {
      id: `preview-${previewData.stateUt}-${year || "all"}`,
      submissionId: `PREVIEW-${previewData.stateUt}-${year || "ALL"}`,
      stateUt: previewData.stateUt,
      submittedBy: user?.id || "current-user",
      rejectionCount: 0,
      formData,
      reviewComments: [],
      attachedFiles: [],
      status: "PREVIEW",
      currentOwnerRole: user?.role || "STATE_APPROVER",
      createdAt: now,
      updatedAt: now,
      user: {
        id: user?.id || "current-user",
        email: user?.email || "preview@example.com",
        firstName: user?.firstName || "Preview",
        lastName: user?.lastName || "User",
        contactNumber: user?.contactNumber || null,
        role: user?.role || "STATE_APPROVER" ,
        stateUt: previewData.stateUt,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      finalScore: null,
      sections,
    };

    setSubmission(unified);
  }, [previewData, user, year]);

  const flatIndicators: IndicatorRow[] = useMemo(() => {
    if (!data) return [];
    return data.categories.flatMap((cat) => data.indicators[cat] || []);
  }, [data]);

  const summary = useMemo(() => {
    const total = data?.totalIndicators ?? 0;
    let accepted = 0;
    let submitted = 0;
    let notStarted = 0;
    let totalScore = 0;

    for (const row of flatIndicators) {
      const st = (row?.status || "").toUpperCase();
      if (st.includes("ACCEPT") || st.includes("APPROVE")) accepted++;
      else if (st.includes("SUBMIT")) submitted++;
      else if (st.includes("NOT_STARTED")) notStarted++;

      if (typeof row.score === "number") totalScore += row.score;
      else if (typeof (row.data?.marksObtained) === "number") totalScore += row.data.marksObtained;
    }

    return { total, accepted, submitted, notStarted, totalScore };
  }, [data, flatIndicators]);

  const handleBack = () => navigate(-1);

  // Fetch all indicators data for state approver if viewAll is true
  useEffect(() => {
    let isActive = true;
    
    
    async function fetchStateData() {
      if (!urlParams.viewAll || !urlParams.stateId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await apiService.get(`/submissions/state/${urlParams.stateId}/all`, {
          params: {
            includeNodalOfficers: urlParams.includeNodalOfficers
          }
        });

        if (!isActive) return;
        
        if (response?.data) {
          const { indicators = [], nodalOfficerIndicators = [] } = response.data;
          
          // Combine and deduplicate indicators
          const allIndicators = [
            ...indicators,
            ...nodalOfficerIndicators
          ].filter((indicator, index, self) => 
            index === self.findIndex((i) => i.indicatorId === indicator.indicatorId)
          );

          // Build form data with combined indicators
          const updatedFormData = {
            stateUt: urlParams.stateId,
            indicators: allIndicators,
            metadata: {
              state: urlParams.stateId,
              totalIndicators: allIndicators.length,
              approvedIndicators: allIndicators.filter(i => i?.status === 'APPROVED').length,
              pendingIndicators: allIndicators.filter(i => i?.status !== 'APPROVED').length
            }
          };
          const stateFormData: StateFormData = {
            stateUt: urlParams.stateId || '',
            indicators: allIndicators,
            metadata: {
              state: urlParams.stateId || '',
              totalIndicators: allIndicators.length,
              approvedIndicators: allIndicators.filter(i => i?.status === 'APPROVED').length,
              pendingIndicators: allIndicators.filter(i => i?.status !== 'APPROVED').length
            }
          };

          // Update each form section
    //       for (const [key, value] of Object.entries(updatedFormData)) {
    //         await updateFormData(key, value);
    //       }

    //       notificationService.success('Successfully loaded all state indicators');
    //     } else {
    //       notificationService.error('Failed to load indicators: No data received');
    //     }
    //   } catch (error) {
    //     console.error('Failed to fetch state data:', error);
    //     notificationService.error('Failed to load indicators. Please try again.');
    //   } finally {
    //     setLoading(false);
    //   }
    // }

     // Update form data sequentially
          if (isActive) {
            await updateFormData('indicators', stateFormData.indicators);
            await updateFormData('metadata', stateFormData.metadata);
            await updateFormData('stateUt', stateFormData.stateUt);
            notificationService.success('Successfully loaded all state indicators');
          }
        } else {
          throw new Error('No data received from server');
        }
      } catch (err: any) {
        if (isActive) {
          console.error('Failed to fetch state data:', err);
          setError(err.message || 'Failed to load indicators');
          notificationService.error('Failed to load indicators. Please try again.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    fetchStateData();
    //     }
    //   } catch (error) {
    //     console.error('Failed to fetch state indicators:', error);
    //     notificationService.error('Failed to load state indicators');
    //   } finally {
    //     setLoading(false);
    //   }
    // };

    // fetchStateData();
    return () => {
      isActive = false;
    };
  }, [urlParams.stateId, urlParams.viewAll, urlParams.includeNodalOfficers, updateFormData]);

  // }, [urlParams.stateId, urlParams.viewAll, updateFormData]);

   // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    );
  }

   // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }


 


  // Final submit handler with confirmation modal
  const handleFinalSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    if (!formData) {
      notificationService.error("No form data found. Please go back and fill the form.");
      return;
    }

    // Validation removed - allow submission without validation
    setShowConfirmModal(true);
  };

  // Actual submission logic
const performSubmission = async () => {
  if (!formData) return;

  try {
    setIsSubmitting(true);
        

    setShowConfirmModal(false);
      setLoadingSubmit(true);

    setSubmissionMessage("Form submitted successfully!");
      setShowSuccessModal(true);


    const transformedData = transformFormDataForSubmission(formData, "SUBMITTED_TO_STATE");
    const multipartData = new FormData();
    multipartData.append("submission", JSON.stringify(transformedData));

    appendFilesRecursively(multipartData, formData);

    console.group("🧾 FormData entries being sent:");
    for (const [key, val] of multipartData.entries()) {
      console.log("➡️", key, val instanceof File ? val.name : val);
    }
    console.groupEnd();

    // Resolve token from multiple sources (new and legacy)
    const tokenDataRaw = localStorage.getItem("niri_app:auth_tokens");
    const tokenData = tokenDataRaw ? JSON.parse(tokenDataRaw) : null;
    const tokenFromNewKey = tokenData?.value?.accessToken;
    const tokenFromLegacyKey = localStorage.getItem("access_token") || undefined;
    const token = tokenFromNewKey || tokenFromLegacyKey || "";
    let response;

    if (isEditMode && editingSubmissionId) {
      response = await axios.post(
        `${config.apiBaseUrl}/submission/resubmit/${editingSubmissionId}`,
        multipartData,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );
    } else {
      response = await axios.post(`${config.apiBaseUrl}/submission`, multipartData, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    }

    console.log("✅ Submission successful:", response);
    clearFormData();
    localStorage.removeItem("editing_submission_id");
    localStorage.removeItem("is_edit_mode");

    const successMessage = isEditMode
      ? "Form resubmitted successfully!"
      : "Form submitted successfully!";
    setSubmissionMessage(successMessage);
    setShowSuccessModal(true);

    setTimeout(() => navigate("/dashboard"), 3000);
  } catch (error: unknown) {
    console.error("❌ Submission failed:", error);
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage =
      err?.response?.data?.message || err?.message || "Failed to submit form.";
    notificationService.error(errorMessage, "Submission Error");
  } finally {
    setIsSubmitting(false);
    setLoadingSubmit(false);
  }
};
  // Get URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const stateId = searchParams.get('stateId');
  const role = searchParams.get('role');
  const viewAll = searchParams.get('viewAll') === 'true';

  // Create a mock submission object for UnifiedReviewPage
  const mockSubmission = formData ? {
    id: viewAll ? "all-indicators-preview" : "preview-submission",
    submissionId: viewAll ? `${stateId}-ALL` : "PREVIEW-001",
    stateUt: viewAll ? stateId : ((formData as Record<string, unknown>).stateUt as string || "Preview State"),
    submittedBy: "current-user",
    rejectionCount: 0,
    formData: formData,
    reviewComments: [],
    attachedFiles: [],
    status: viewAll ? "STATE_REVIEW" : (isResubmit ? "RETURNED_FROM_STATE" : "PREVIEW"),
    currentOwnerRole: role || "NODAL_OFFICER",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: user?.id || "current-user",
      email: user?.email || "preview@example.com",
      firstName: user?.firstName || "Preview",
      lastName: user?.lastName || "User",
      contactNumber: user?.contactNumber || null,
      role: user?.role || "NODAL_OFFICER",
      stateUt: user?.state || (formData as Record<string, unknown>).stateUt as string || "Preview State",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    finalScore: null
  } : null;

  if (!formData || !mockSubmission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Form Data Found</h2>
          <p className="text-muted-foreground mb-4">Please go back and fill the form first.</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

   if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading preview…</p>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Nothing to preview"}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }


  return (
    <>

      {/* Use UnifiedReviewPage for preview */}
      <UnifiedReviewPage
        // isPreview={true}
        isPreview
        isMospiApprover={false}
        submission={mockSubmission}
        onFinalSubmit={() => handleFinalSubmit()}
        // isSubmitting={isSubmitting}
        isSubmitting={loadingSubmit}
        isResubmit={isEditMode ? true : isResubmit}
        isEditMode={isEditMode}
      />

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isEditMode ? "Resubmit Form?" : isResubmit ? "Resubmit Form?" : "Submit Form?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isEditMode
                ? "Are you sure you want to resubmit this form? Your changes will be sent for review."
                : isResubmit
                  ? "Are you sure you want to resubmit this form? Your changes will be sent for review."
                  : "Are you sure you want to submit this form? Once submitted, you cannot make changes."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performSubmission}>
              {isEditMode ? "Resubmit" : isResubmit ? "Resubmit" : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              {isResubmit ? "Form Resubmitted!" : "Form Submitted!"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {submissionMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};