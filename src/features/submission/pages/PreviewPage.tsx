import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { storageService } from "@/services/storage.service";
import { apiV2 } from "@/services/ApiService";
import { config } from "@/config/environment";
import { notificationService } from "@/services/NotificationBus";
import { transformFormDataForSubmission, validateFormData, getFormDataSummary } from "@/utils/formDataTransformer";

const PREVIEW_FLAG_KEY = "submission_has_previewed";

export const PreviewPage = () => {
  const navigate = useNavigate();
  const { formData, clearFormData, isResubmit } = useFormPersistence();
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');

  // Mark as previewed on mount (run only once)
  useEffect(() => {
    storageService.set(PREVIEW_FLAG_KEY, true);
    setHasPreviewed(true);
  }, []); // Empty dependency array to run only once

  // Helper to render a section as a readable card with read-only fields
  const renderSection = (
    sectionNum: string,
    title: string,
    fields: { label: string; value: any }[],
  ) => (
    <Card className="mb-4">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-base">
          {sectionNum} - {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field, idx) => (
            <div key={idx} className="mb-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {field.label}
              </label>
              <input
                className="w-full bg-muted/10 border border-border rounded px-2 py-1 text-sm"
                value={field.value ?? ""}
                readOnly
                disabled
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Helper for array sections (table-like)
  const renderArraySection = (
    sectionNum: string,
    title: string,
    columns: string[],
    rows: any[],
  ) => {
    // Safety check: ensure rows is an array
    const safeRows = Array.isArray(rows) ? rows : [];
    
    return (
    <Card className="mb-4">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-base">
          {sectionNum} - {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead>
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-2 py-1 border-b bg-muted/20">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center text-muted-foreground py-2"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                safeRows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((col, j) => (
                      <td key={j} className="px-2 py-1 border-b">
                        {row[col] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    );
  };

  // Helper for object sections (key-value pairs)
  const renderObjectSection = (
    sectionNum: string,
    title: string,
    fields: Array<{ label: string; value: string | number | undefined }>,
  ) => (
    <Card className="mb-4">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-base">
          {sectionNum} - {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="font-medium text-gray-700">{field.label}:</span>
              <span className="text-gray-900">{field.value || "Not provided"}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Final submit handler with confirmation modal
  const handleFinalSubmit = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!hasPreviewed || isSubmitting) return;
    
    // Validate form data before showing confirmation modal
    if (!validateFormData(formData)) {
      notificationService.error('Please complete all required sections before submitting.', 'Incomplete Form');
      return;
    }
    
    // Show confirmation modal
    setShowConfirmModal(true);
  };

  // Handle actual submission after confirmation
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    
    try {
      // Transform form data to required API format ONLY for submission
      const transformedPayload = transformFormDataForSubmission(formData, "SUBMITTED_TO_STATE");
      
      const response = await apiV2.post(config.formsPath, transformedPayload);
      
      // Dynamic success message from response
      const successMessage = response.data?.message || 
        'Your submission has been sent to the State Approver for review. You will be notified of its status.';
      
      setSubmissionMessage(successMessage);
      setShowSuccessModal(true);
      
      // Clear form data AFTER successful submission
      // clearFormData(); // Commented out - don't clear localStorage for now
      storageService.remove(PREVIEW_FLAG_KEY);
      
    } catch (error: unknown) {
      // Dynamic error message from response
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = err?.response?.data?.message || 
        err?.message || 
        'An unexpected error occurred during submission.';
      
      notificationService.error(errorMessage, 'Submission Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Navigate to dashboard after closing success modal
    setTimeout(() => {
      navigate('/dashboard');
    }, 500);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/submissions/review-submit")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Preview</h1>
        <p className="text-sm text-muted-foreground">
          Review your submission before sending. You must preview before final
          submit is enabled.
        </p>
      </div>

      <Tabs defaultValue="infra-financing" className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="infra-financing">Infra Financing</TabsTrigger>
          <TabsTrigger value="infra-development">Infra Development</TabsTrigger>
          <TabsTrigger value="ppp-development">PPP Development</TabsTrigger>
          <TabsTrigger value="infra-enablers">Infra Enablers</TabsTrigger>
        </TabsList>

        {/* Infra Financing */}
        <TabsContent value="infra-financing" className="space-y-4 mt-6">
          {renderSection("1.1", "% Capex to GSDP", [
            { label: "Year", value: formData.infraFinancing?.section1_1?.year },
            {
              label: "Capital Allocation for FY (INR)",
              value: formData.infraFinancing?.section1_1?.capitalAllocation,
            },
            {
              label: "GSDP for FY (INR)",
              value: formData.infraFinancing?.section1_1?.gsdpForFY,
            },
            {
              label: "State Capital Expenditure FY (INR)",
              value: formData.infraFinancing?.section1_1?.stateCapex,
            },
            {
              label: "% Allocation to GSDP",
              value: formData.infraFinancing?.section1_1?.allocationToGSDP,
            },
            {
              label: "Capex to % Capex Actuals",
              value: formData.infraFinancing?.section1_1?.capexToCapexActuals,
            },
          ])}
          {renderSection("1.2", "% Capex Utilization", [
            { label: "Year", value: formData.infraFinancing?.section1_2?.year },
            {
              label: "GSDP for FY (INR)",
              value: formData.infraFinancing?.section1_2?.gsdpForFY,
            },
            {
              label: "Actual Capex (INR)",
              value: formData.infraFinancing?.section1_2?.actualCapex,
            },
            {
              label: "State Capex Utilisation (INR)",
              value: formData.infraFinancing?.section1_2?.stateCapexUtilisation,
            },
            {
              label: "% Capex Actuals to GSDP",
              value: formData.infraFinancing?.section1_2?.capexActualsToGSDP,
            },
          ])}
          {renderObjectSection(
            "1.3",
            "% of Credit Rated ULBs",
            [
              { label: "Credit Rated ULBs", value: formData.infraFinancing?.section1_3?.creditRatedULBs },
              { label: "Total ULBs", value: formData.infraFinancing?.section1_3?.totalULBs },
              { label: "Percentage", value: formData.infraFinancing?.section1_3?.percentage ? `${formData.infraFinancing.section1_3.percentage}%` : "" },
              { label: "Marks Obtained", value: formData.infraFinancing?.section1_3?.marksObtained || "" },
            ],
          )}
          {renderObjectSection(
            "1.4",
            "% of ULBs Issuing Bonds",
            [
              { label: "ULBs Issuing Bonds", value: formData.infraFinancing?.section1_4?.ulbsIssuingBonds },
              { label: "Total ULBs", value: formData.infraFinancing?.section1_4?.totalULBs },
              { label: "Percentage", value: formData.infraFinancing?.section1_4?.percentage ? `${formData.infraFinancing.section1_4.percentage}%` : "" },
              { label: "Marks Obtained", value: formData.infraFinancing?.section1_4?.marksObtained || "" },
            ],
          )}
          {renderObjectSection(
            "1.5",
            "Functional Financial Intermediary",
            [
              { label: "Has Intermediary", value: formData.infraFinancing?.section1_5?.hasIntermediary },
              { label: "Marks Obtained", value: formData.infraFinancing?.section1_5?.marksObtained || "" },
            ],
          )}
        </TabsContent>

        {/* Infra Development */}
        <TabsContent value="infra-development" className="space-y-4 mt-6">
          {renderArraySection(
            "2.1",
            "Availability of Infrastructure Act/Policy",
            ["sector", "files"],
            (formData.infraDevelopment?.section2_1 || []).map((row) => ({
              ...row,
              files: Array.isArray(row.files)
                ? row.files.map((f: any) => f?.fileName || "").join(", ")
                : "",
            })),
          )}
          {renderArraySection(
            "2.2",
            "Availability of Specialized Entity",
            ["sector", "files"],
            (formData.infraDevelopment?.section2_2 || []).map((row) => ({
              ...row,
              files: Array.isArray(row.files)
                ? row.files.map((f: any) => f?.fileName || "").join(", ")
                : "",
            })),
          )}
          {renderArraySection(
            "2.3",
            "Availability of Sector Infra Development Plan",
            ["sector", "files"],
            (formData.infraDevelopment?.section2_3 || []).map((row) => ({
              ...row,
              files: Array.isArray(row.files)
                ? row.files.map((f: any) => f?.fileName || "").join(", ")
                : "",
            })),
          )}
          {renderArraySection(
            "2.4",
            "Availability of Investment Ready Project Pipeline",
            ["projectName", "dprFile"],
            (formData.infraDevelopment?.section2_4 || []).map((row) => ({
              ...row,
              dprFile: row.dprFile?.fileName || "",
            })),
          )}
          {renderArraySection(
            "2.5",
            "Availability of Asset Monetization Pipeline",
            [
              "projectName",
              "sector",
              "type",
              "ownership",
              "estimatedMonetization",
            ],
            formData.infraDevelopment?.section2_5 || [],
          )}
        </TabsContent>

        {/* PPP Development */}
        <TabsContent value="ppp-development" className="space-y-4 mt-6">
          {renderSection("3.1", "Availability of Infrastructure Act/Policy", [
            {
              label: "PPP Act/Policy Available",
              value: formData.pppDevelopment?.section3_1?.available,
            },
            {
              label: "File",
              value: formData.pppDevelopment?.section3_1?.file?.fileName,
            },
          ])}
          {renderSection("3.2", "Functional PPP Cell/Unit", [
            {
              label: "Functional State/UT PPP Cell/Unit",
              value: formData.pppDevelopment?.section3_2?.available,
            },
            {
              label: "File",
              value: formData.pppDevelopment?.section3_2?.file?.fileName,
            },
          ])}
          {renderArraySection(
            "3.3",
            "Proposals Submitted under VGF/IIPDF",
            ["projectName", "sector", "type", "submissionDate", "file"],
            (formData.pppDevelopment?.section3_3 || []).map((row) => ({
              ...row,
              file: row.file?.fileName,
            })),
          )}
          {renderSection("3.4", "Proportion of TPC of PPP Projects", [
            {
              label: "Project Name",
              value: formData.pppDevelopment?.section3_4?.projectName,
            },
            {
              label: "Sector",
              value: formData.pppDevelopment?.section3_4?.sector,
            },
            {
              label: "NIP ID",
              value: formData.pppDevelopment?.section3_4?.nipId,
            },
            {
              label: "Date of Award",
              value: formData.pppDevelopment?.section3_4?.dateOfAward,
            },
            {
              label: "Funding Source",
              value: formData.pppDevelopment?.section3_4?.fundingSource,
            },
            {
              label: "% Capex funded by non-Govt sources",
              value: formData.pppDevelopment?.section3_4?.capexFundedPercentage,
            },
          ])}
        </TabsContent>

        {/* Infra Enablers */}
        <TabsContent value="infra-enablers" className="space-y-4 mt-6">
          {renderSection("4.1", "Eligible Infrastructure Projects", [
            {
              label: "All Eligible Infra Projects on NIP Portal",
              value: formData.infraEnablers?.section4_1?.allEligible,
            },
            {
              label: "Website Link",
              value: formData.infraEnablers?.section4_1?.websiteLink,
            },
          ])}
          {renderSection("4.2", "Availability & Use of State/UT PMG", [
            {
              label: "Availability & Use of State/UT PMG",
              value: formData.infraEnablers?.section4_2?.available,
            },
            {
              label: "File",
              value: formData.infraEnablers?.section4_2?.file?.fileName,
            },
          ])}
          {renderSection("4.3", "Adoption of PM GatiShakti", [
            {
              label: "Adoption of PM GatiShakti",
              value: formData.infraEnablers?.section4_3?.adopted,
            },
            {
              label: "File",
              value: formData.infraEnablers?.section4_3?.file?.fileName,
            },
          ])}
          {renderSection("4.4", "Adoption of ADR", [
            {
              label: "Adoption of ADR",
              value: formData.infraEnablers?.section4_4?.adopted,
            },
            {
              label: "File",
              value: formData.infraEnablers?.section4_4?.file?.fileName,
            },
          ])}
          {renderSection("4.5", "Innovative Practices", [
            {
              label: "Innovation Practices",
              value: formData.infraEnablers?.section4_5?.implemented,
            },
            {
              label: "Practice Name",
              value: formData.infraEnablers?.section4_5?.practiceName,
            },
            {
              label: "Impact",
              value: formData.infraEnablers?.section4_5?.impact,
            },
            {
              label: "File",
              value: formData.infraEnablers?.section4_5?.file?.fileName,
            },
          ])}
          {renderObjectSection(
            "4.6",
            "Capacity Building - Officer Participation",
            [
              { label: "Number of Participants", value: formData.infraEnablers?.section4_6?.numberOfParticipants },
              { label: "Marks Obtained", value: formData.infraEnablers?.section4_6?.marksObtained || "" },
            ],
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-6 border-t">
        <Button 
          type="button"
          onClick={handleFinalSubmit} 
          disabled={!hasPreviewed || isSubmitting}
        >
          {isSubmitting ? (isResubmit ? 'Resubmitting...' : 'Submitting...') : (isResubmit ? 'Resubmit' : 'Final Submit')}
        </Button>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isResubmit ? 'Are you sure you want to resubmit?' : 'Are you sure you want to submit?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isResubmit 
                ? 'Once resubmitted, your updated data will be sent to the State Approver for review.'
                : 'Once submitted, your data will be locked for editing and sent to the State Approver for review.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? (isResubmit ? 'Resubmitting...' : 'Submitting...') : (isResubmit ? 'Resubmit to State Approver' : 'Send to State Approver')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <AlertDialogTitle>{isResubmit ? 'Resubmission Successful!' : 'Submission Successful!'}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-2">
              {submissionMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSuccessModalClose}>
              Continue to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
