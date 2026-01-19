/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MINISTRY_SUBMISSION_STEPS } from "../constants/steps";
import { SectionCard } from "@/features/submission/components/SectionCard";
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
import type { AssignedIndicator } from "../components/FormBuilder/types";
import { getSubmissionsForCurrentUser } from "@/services/ministry.service";
import { useToast } from "@/hooks/use-toast";

interface MinistryReviewSubmitStepProps {
  assignedIndicators: AssignedIndicator[];
  formData: Record<string, any>;
  submissionId: string | null;
  currentStep: number;
  onStepClick: (stepNumber: number) => void;
  onPrevious: () => void;
}

export const MinistryReviewSubmitStep = ({
  assignedIndicators,
  formData,
  submissionId,
  currentStep,
  onStepClick,
  onPrevious,
}: MinistryReviewSubmitStepProps) => {
  const [loading, setLoading] = useState(false);
  const [submissionUuid, setSubmissionUuid] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Helper function to check if a string is a UUID
  const isUUID = (str: string | null | undefined): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Fetch submission UUID when component loads or submissionId changes
  useEffect(() => {
    const fetchSubmissionUuid = async () => {
      if (!submissionId) {
        setSubmissionUuid(null);
        return;
      }

      // If submissionId is already a UUID, use it directly
      if (isUUID(submissionId)) {
        setSubmissionUuid(submissionId);
        return;
      }

      // Otherwise, fetch the submission to get the UUID
      try {
        const response = await getSubmissionsForCurrentUser();
        let submissionsData: any[] = [];
        
        if (Array.isArray(response)) {
          submissionsData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          submissionsData = response.data;
        }

        // Find the submission by submissionId (display ID) or id (UUID)
        const foundSubmission = submissionsData.find(
          (sub) => sub.id === submissionId || sub.submissionId === submissionId
        );

        if (foundSubmission?.id) {
          // Use the UUID id field
          setSubmissionUuid(foundSubmission.id);
        } else {
          console.warn("Could not find submission with UUID");
          setSubmissionUuid(null);
        }
      } catch (error: any) {
        console.error("Error fetching submission UUID:", error);
        setSubmissionUuid(null);
      }
    };

    fetchSubmissionUuid();
  }, [submissionId]);

  // Calculate summary for each category
  const calculateCategorySummary = () => {
    const summary: Record<string, { completed: number; total: number }> = {};

    assignedIndicators.forEach((indicatorObj) => {
      const categoryName = Object.keys(indicatorObj)[0];
      const sections = indicatorObj[categoryName];

      if (Array.isArray(sections)) {
        let completed = 0;
        const total = sections.length;

        sections.forEach((sectionObj) => {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];
          const sectionKey = `section${section.sNo.replace('.', '_')}`;

          // Check if section has any data
          if (formData[sectionKey] && Object.keys(formData[sectionKey]).length > 0) {
            const hasData = Object.values(formData[sectionKey]).some(
              (value) => value !== '' && value !== null && value !== undefined
            );
            if (hasData) {
              completed++;
            }
          }
        });

        summary[categoryName] = { completed, total };
      }
    });

    return summary;
  };

  const categorySummary = calculateCategorySummary();

  const sections = [
    {
      title: "Infrastructure Financing",
      icon: FileText,
      completed: categorySummary["Infra Financing"]?.completed || 0,
      total: categorySummary["Infra Financing"]?.total || 0,
      color: "bg-[#D3DCF8] text-primary",
      stepKey: "infra-financing",
    },
    {
      title: "Infrastructure Development",
      icon: Building2,
      completed: categorySummary["Infra Development"]?.completed || 0,
      total: categorySummary["Infra Development"]?.total || 0,
      color: "bg-[#D3DCF8] text-primary",
      stepKey: "infra-development",
    },
    {
      title: "PPP Development",
      icon: Briefcase,
      completed: categorySummary["PPP Development"]?.completed || 0,
      total: categorySummary["PPP Development"]?.total || 0,
      color: "bg-[#D3DCF8] text-primary",
      stepKey: "ppp-development",
    },
    {
      title: "Infra Enablers",
      icon: Settings,
      completed: categorySummary["Infra Enablers"]?.completed || 0,
      total: categorySummary["Infra Enablers"]?.total || 0,
      color: "bg-[#D3DCF8] text-primary",
      stepKey: "infra-enablers",
    },
  ];

  // Calculate indicator summary
  const getIndicatorSummary = () => {
    const underReview: string[] = [];
    const pending: string[] = [];
    const accepted: string[] = [];

    assignedIndicators.forEach((indicatorObj) => {
      const categoryName = Object.keys(indicatorObj)[0];
      const sections = indicatorObj[categoryName];

      if (Array.isArray(sections)) {
        sections.forEach((sectionObj) => {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];
          const sectionKey = `section${section.sNo.replace('.', '_')}`;
          const indicatorCode = section.sNo;

          // Check if section has data
          const hasData = formData[sectionKey] && 
            Object.keys(formData[sectionKey]).length > 0 &&
            Object.values(formData[sectionKey]).some(
              (value) => value !== '' && value !== null && value !== undefined
            );

          // For now, categorize based on data presence
          // TODO: Update this when submission status API is implemented
          if (hasData) {
            // Check if there's a status field
            const status = formData[sectionKey]?.status;
            if (status === "ACCEPTED" || status === "APPROVED") {
              accepted.push(indicatorCode);
            } else if (status === "SUBMITTED_TO_STATE" || status === "RESUBMITTED") {
              underReview.push(indicatorCode);
            } else {
              pending.push(indicatorCode);
            }
          } else {
            pending.push(indicatorCode);
          }
        });
      }
    });

    return { underReview, pending, accepted };
  };

  const indicatorSummary = getIndicatorSummary();

  return (
    <div>
      <div className="mb-6 bg-[#1E40AF14] p-4 sm:p-6 rounded-lg border border-[#1E40AF52]">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-semibold mb-2">Review & Preview</h2>
              <p className="text-xs sm:text-sm text-[#727272] mb-4">
                Review all the information you've provided and preview your Ministry
                data submission. Indicators are submitted individually, so you
                can track each indicator's status separately.
              </p>
            </div>
          </div>
        </div>

        <SectionCard
          title={
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-semibold">
                <span className="text-primary">Submission Summary - </span>
                <span className="hidden sm:inline">Overview of your data submission</span>
                <span className="sm:hidden">Overview</span>
              </span>
            </div>
          }
          subtitle=""
          className="mb-4 sm:mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {sections.map((section, index) => {
              const Icon = section.icon;
              const step = MINISTRY_SUBMISSION_STEPS.find((s) => s.key === section.stepKey);
              return (
                <div key={index}>
                  <CardContent className="pt-4 sm:pt-6 text-center">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${section.color} flex items-center justify-center mb-3 sm:mb-4 mx-auto`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h4 className="text-sm sm:text-base font-medium mb-2">{section.title}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                      {section.completed}/{section.total} sections completed
                    </p>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={() => {
                        if (step) {
                          const stepIndex = MINISTRY_SUBMISSION_STEPS.findIndex((s) => s.id === step.id);
                          onStepClick(stepIndex + 1);
                        }
                      }}
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
              <span className="text-sm sm:text-base font-semibold">
                <span className="text-primary">Indicator Summary - </span>
                <span className="hidden sm:inline">Status overview of all indicators</span>
                <span className="sm:hidden">Status overview</span>
              </span>
            </div>
          }
          subtitle=""
          className="mb-4 sm:mb-6"
        >
          {loading ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm sm:text-base">
              Loading indicator statuses...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Under Review */}
              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-700" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-yellow-900">
                        Under Review
                      </h4>
                      <p className="text-xs sm:text-sm text-yellow-700">
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
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900">Pending</h4>
                      <p className="text-xs sm:text-sm text-gray-700">
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
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2Icon className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-green-900">Accepted</h4>
                      <p className="text-xs sm:text-sm text-green-700">
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 pt-6">
          <Button variant="outline" onClick={onPrevious} className="w-full sm:w-auto">
            ← Previous
          </Button>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              disabled={loading || !submissionUuid}
              className="w-full sm:w-auto"
              onClick={() => {
                if (submissionUuid) {
                  navigate(`/ministry/review-submissions/form-review/${submissionUuid}`);
                } else {
                  toast({
                    title: "Error",
                    description: "Could not find submission. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              Review Submission
            </Button>
          </div>
        </div>
    </div>
  );
};

