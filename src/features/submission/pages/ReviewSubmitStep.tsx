/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { apiService } from "@/services/api.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "../components/Stepper";
import { useStepNavigation } from "../hooks/useStepNavigation";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { SUBMISSION_STEPS } from "../constants/steps";
import { computeAllStepsSummary } from "../utils/progress";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { useNavigate } from "react-router-dom";
import { debugFormData } from "@/utils/formDataTransformer";
import { SectionCard } from "../components/SectionCard";
import {
  Eye,
  CheckCircle2,
  FileText,
  Building2,
  Briefcase,
  Settings,
  Clock,
  CheckCircle2 as CheckCircle2Icon,
  AlertCircle,
} from "lucide-react";

export const ReviewSubmitStep = () => {
  const { currentStep, goToStep, goToPrevious } = useStepNavigation(5);
  const { formData } = useFormPersistence();
  const {
    assignedIndicators,
    availableIndicators,
    isNodalOfficer,
    isStateApprover,
  } = useIndicatorAccess();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current submission to get indicator statuses
  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        setLoading(true);
        const submissionsResp = await apiService.getSubmissions(1, 100);
        const userSubmission = submissionsResp.submissions.find(
          (sub: any) =>
            sub.status === "DRAFT" ||
            sub.status === "IN_PROGRESS" ||
            sub.status === "RETURNED_FROM_STATE" ||
            sub.status === "PENDING_STATE_APPROVAL"
        );

        if (userSubmission?.id) {
          const fullSubmission = await apiService.getSubmission(
            userSubmission.id
          );
          setSubmission(fullSubmission);
        }
      } catch (error) {
        console.error("Failed to fetch submission:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, []);

  // Debug form data on component mount only
  useEffect(() => {
    // Only debug in development mode to prevent infinite loops
    if (process.env.NODE_ENV === "development") {
      debugFormData(formData);
    }
  }, [formData]); // Include formData dependency

  const summary = computeAllStepsSummary(formData || {}, {
    assignedIndicators,
    isNodalOfficer,
  });
  const sections = [
    {
      title: "Infrastructure Financing",
      icon: FileText,
      completed: summary.infraFinancing.completed,
      total: summary.infraFinancing.total,
      color: "bg-[#D3DCF8] text-primary",
    },
    {
      title: "Infrastructure Development",
      icon: Building2,
      completed: summary.infraDevelopment.completed,
      total: summary.infraDevelopment.total,
      color: "bg-[#D3DCF8] text-primary",
    },
    {
      title: "PPP Development",
      icon: Briefcase,
      completed: summary.pppDevelopment.completed,
      total: summary.pppDevelopment.total,
      color: "bg-[#D3DCF8] text-primary",
    },
    {
      title: "Infra Enablers",
      icon: Settings,
      completed: summary.infraEnablers.completed,
      total: summary.infraEnablers.total,
      color: "bg-[#D3DCF8] text-primary",
    },
  ];

  // Calculate indicator summary
  const getIndicatorSummary = () => {
    if (!submission?.formData) {
      return {
        underReview: [],
        pending: [],
        accepted: [],
      };
    }

    const allIndicators = isNodalOfficer
      ? assignedIndicators
      : availableIndicators;
    const formData = submission.formData;

    const underReview: string[] = [];
    const pending: string[] = [];
    const accepted: string[] = [];

    allIndicators.forEach((indicatorCode) => {
      const sectionKey = `section${indicatorCode.replace(".", "_")}`;
      let status: string | undefined;

      // Check in all categories
      const categories = [
        "infraFinancing",
        "infraDevelopment",
        "pppDevelopment",
        "infraEnablers",
      ];
      for (const category of categories) {
        const categoryData = formData[category];
        if (categoryData?.[sectionKey]) {
          status = categoryData[sectionKey]?.status;
          break;
        }
      }

      const upperStatus = status?.toUpperCase() || "";

      if (upperStatus === "ACCEPTED" || upperStatus === "APPROVED") {
        accepted.push(indicatorCode);
      } else if (
        upperStatus === "SUBMITTED_TO_STATE" ||
        upperStatus === "RESUBMITTED"
      ) {
        underReview.push(indicatorCode);
      } else {
        pending.push(indicatorCode);
      }
    });

    return { underReview, pending, accepted };
  };

  const indicatorSummary = getIndicatorSummary();

  if (showPreview) {
    // Use absolute path to avoid nested duplicate segments in edit mode
    navigate("/submissions/preview");
    return null;
  }

  return (
    <div className="w-full -mx-6 lg:-mx-8">
      <div className="px-6 lg:px-8">
        <Stepper
          steps={SUBMISSION_STEPS}
          currentStep={currentStep}
          onStepClick={goToStep}
        />

        <div className="mb-6 bg-[#1E40AF14] p-6 rounded-lg border border-[#1E40AF52]">
          <div className="flex items-start gap-4 ">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Review & Preview</h2>
              <p className="text-sm text-[#727272] mb-4">
                Review all the information you've provided and preview your NIRI
                data submission. Indicators are submitted individually, so you
                can track each indicator's status separately.
              </p>
            </div>
          </div>
        </div>

        <SectionCard
          title={
            <div className="flex flex-col">
              <span className="text-base font-semibold ">
                <span className="text-primary">Submission Summary - </span>{" "}
                Overview of your data submission{" "}
              </span>
            </div>
          }
          subtitle=""
          className="mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <div key={index} className="">
                  <CardContent className="pt-6 text-center">
                    <div
                      className={`w-12 h-12 rounded-lg ${section.color} flex items-center justify-center mb-4 mx-auto`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <h4 className="font-medium mb-2">{section.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {section.completed}/{section.total} sections completed
                    </p>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={() =>
                        navigate(`/submissions/${SUBMISSION_STEPS[index].key}`)
                      }
                    >
                      Edit
                    </Button>
                  </CardContent>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Indicator Summary */}
        <SectionCard
          title={
            <div className="flex flex-col">
              <span className="text-base font-semibold">
                <span className="text-primary">Indicator Summary - </span>
                Status overview of all indicators
              </span>
            </div>
          }
          subtitle=""
          className="mb-6"
        >
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading indicator statuses...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Under Review */}
              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-900">
                        Under Review
                      </h4>
                      <p className="text-sm text-yellow-700">
                        {indicatorSummary.underReview.length} indicator
                        {indicatorSummary.underReview.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {indicatorSummary.underReview.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {indicatorSummary.underReview.map((code) => (
                        <Badge
                          key={code}
                          variant="outline"
                          className="bg-yellow-100 text-yellow-800 border-yellow-300"
                        >
                          {code}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No indicators under review
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Pending */}
              <Card className="border-gray-200 bg-gray-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Pending</h4>
                      <p className="text-sm text-gray-700">
                        {indicatorSummary.pending.length} indicator
                        {indicatorSummary.pending.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {indicatorSummary.pending.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {indicatorSummary.pending.map((code) => (
                        <Badge
                          key={code}
                          variant="outline"
                          className="bg-gray-100 text-gray-800 border-gray-300"
                        >
                          {code}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No pending indicators
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Accepted */}
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <CheckCircle2Icon className="w-5 h-5 text-green-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900">Accepted</h4>
                      <p className="text-sm text-green-700">
                        {indicatorSummary.accepted.length} indicator
                        {indicatorSummary.accepted.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {indicatorSummary.accepted.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {indicatorSummary.accepted.map((code) => (
                        <Badge
                          key={code}
                          variant="outline"
                          className="bg-green-100 text-green-800 border-green-300"
                        >
                          {code}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No accepted indicators
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </SectionCard>

        <div className="flex items-center justify-between pt-6">
          <Button variant="outline" onClick={goToPrevious}>
            ← Previous
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Preview Submission
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
