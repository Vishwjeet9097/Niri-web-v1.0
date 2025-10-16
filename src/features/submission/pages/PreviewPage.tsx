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
import { SectionCard } from "../components/SectionCard";
import { transformFormDataForSubmission, validateFormData, getFormDataSummary } from "@/utils/formDataTransformer";
import { Label } from "@/components/ui/label";

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
    <SectionCard
      title={<div className="flex flex-col">
        <span className="text-base font-semibold ">
          <span className="text-primary">{sectionNum} </span> {title}{" "}
        </span>
      </div>}
      subtitle=""
      className="mb-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-[70%]">
        {fields.map((field, idx) => (
          <div key={idx} className="mb-2">
            <Label className="font-semibold">
              {field.label}
            </Label>
            <Label>
              {field.value}
            </Label>

          </div>
        ))}
      </div>
    </SectionCard>
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
      <SectionCard
        title={<div className="flex flex-col">
          <span className="text-base font-semibold ">
            <span className="text-primary">{sectionNum} -</span> {title}{" "}
          </span>
        </div>}
        subtitle=""
        className="mb-6"
      >
        <div className="overflow-x-auto rounded-t-xl">
          <table className="min-w-full border-separate border-spacing-0 !border-separate">
            <thead>
              <tr className="bg-[#DDE3F9]">
                {columns.map((col, idx) => (
                  <th key={idx} className={`
                      py-3 px-4 text-left text-sm font-normal
                      ${idx === 0 ? 'rounded-tl-xl' : ''}
                      ${idx === columns.length - 1 ? 'rounded-tr-xl' : ''}
                    `}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeRows.length === 0 ? (
                <tr className="bg-white">
                  <td
                    colSpan={columns.length}
                    className="py-3 px-4 text-sm font-normal"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                safeRows.map((row, i) => (
                  <tr key={i} className="bg-white">
                    {columns.map((col, j) => (
                      <td key={j} className="py-3 px-4 text-sm font-normal">
                        {row[col] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    );
  };

  // Helper for object sections (key-value pairs)
  const renderObjectSection = (
    sectionNum: string,
    title: string,
    fields: Array<{ label: string; value: string | number | undefined }>,
  ) => (
    <SectionCard
      title={<div className="flex flex-col">
        <span className="text-base font-semibold ">
          <span className="text-primary">{sectionNum} -</span> {title}{" "}
        </span>
      </div>}
      subtitle=""
      className="mb-6"
    >
      <div className="flex gap-6">
        {fields.map((field, index) => (
          <div key={index} className="flex flex-col w-full">
            <Label className="font-semibold">{field.label}</Label>
            <Label className="">{field.value || "Not provided"}</Label>
          </div>
        ))}
      </div>
    </SectionCard>
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
      clearFormData(); // Clear localStorage after successful submission
      storageService.remove(PREVIEW_FLAG_KEY);
      localStorage.removeItem("editing_submission"); // Clear editing submission data

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
    <div className="">
      <div className="w-full bg-card rounded-lg p-6 mb-6 border border-[#DDD]">
        <Button

          onClick={() => navigate("/submissions/review-submit")}
          className="mb-4 flex items-center gap-2 bg-[none] border-none p-0 text-primary hover:underline hover:bg-[none]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <h1 className="text-xl text-[#212121] font-bold mb-2">Preview</h1>
        <p className="text-sm text-[#727272]">
          Review your submission before sending. You must preview before final
          submit is enabled.
        </p>
      </div>

      <Tabs defaultValue="infra-financing" className="mb-6">
        <TabsList className="w-full">
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

      <div className="flex justify-end">
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
