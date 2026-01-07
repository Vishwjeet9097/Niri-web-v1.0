/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  Edit3,
  Check,
  X,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { MessageModal } from "../modals/MessageModal";
import { TimelineModal } from "../modals/TimelineModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";
import {
  hasInfraFinancingData,
  getSectionsWithData,
} from "@/utils/sectionDataValidator";
import { apiService } from "@/services/api.service";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import {
  computeStepProgress,
  STEP_SECTIONS,
} from "@/features/submission/utils/progress";
import { useEditableSectionStore } from "@/utils/EditableSection";
import { handleSaveSection } from "@/utils/ReviewActionHandelers";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";
import { useFormDataStore } from "@/utils/FormDataStore";
import {
  isSubmissionFromNodalOfficer,
  isIndicatorFromNodalOfficer,
} from "@/utils/indicatorStatusUtils";
import { notificationService } from "@/services/notification.service";

import { Section_1_3 } from "./Sections/Section_1_3";
import { Section_1_4 } from "./Sections/Section_1_4";
import { validateInfraFinancing } from "@/features/submission/validation/infraFinancingValidation";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { useFieldValidation } from "@/features/submission/hooks/useFieldValidation";
import { useFieldErrorDisplay } from "@/features/submission/hooks/useFieldErrorDisplay";
import { getInputValidationClass as getInputValidationClassUtil } from "@/features/submission/utils/validationStyles";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfraFinancingReviewProps {
  submissionId: string;
  formData?: any;
  submission?: any; // Complete submission object (was unknown)
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
  assignedIndicators?: string[]; // Assigned indicators for nodal officers
  isNodalOfficer?: boolean; // Whether the user is a nodal officer
}
export const InfraFinancingReview = ({
  submissionId,
  formData,
  submission,
  isPreview = false,
  assignedIndicators = [],
  isNodalOfficer = false,
}: InfraFinancingReviewProps) => {
  // Declare submissionData early so it can be used in useEffect hooks
  const [submissionData, setSubmissionData] = useState(formData);
  const { saveMessage, getMessage, getComments, getAllComments } =
    useSectionMessages(submissionId, submission);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);

  // Section 1.4 state management
  // Normalize bondList to ensure all fields including tenorOfBond are present
  const initialBondList = (formData?.section1_4?.bondList || []).map(
    (bond: any) => ({
      ...bond,
      tenorOfBond: bond.tenorOfBond || "",
    })
  );
  const [section14State, setSection14State] = useState({
    totalULBs: formData?.section1_4?.totalULBs || 0,
    bondList: initialBondList,
  });

  useEffect(() => {
    // Debug: Log component mount
    console.error(
      `[InfraFinancingReview] Component mounted/updated. submissionId: ${submissionId}`
    );
    if (!isRestoringRef.current) {
      // Prefer submissionData (updated after save) over formData when initializing
      const section1_4 = submissionData?.section1_4 || formData?.section1_4;
      // Normalize bondList to ensure all fields including tenorOfBond are present
      const normalizedBondList = (section1_4?.bondList || []).map(
        (bond: any) => ({
          ...bond,
          tenorOfBond: bond.tenorOfBond || "",
        })
      );
      setSection14State({
        totalULBs: section1_4?.totalULBs || 0,
        bondList: normalizedBondList,
      });
    }
  }, [submissionData?.section1_4, formData?.section1_4]);
  const { setFormDataForSection, updateSectionField, getSectionData } =
    useFormDataStore();

  // Sync submissionData with formData prop when it changes from external source
  // This ensures we always have the latest data when navigating between categories
  useEffect(() => {
    if (formData) {
      setSubmissionData((prev: any) => {
        // If no previous submissionData, use formData
        if (!prev) return formData;

        // Deep comparison to detect if formData has actually changed
        const formDataStr = JSON.stringify(formData);
        const prevStr = JSON.stringify(prev);

        // If formData is different, it means parent component has refreshed with new data
        // In this case, we should use the new formData to ensure we show latest status
        if (formDataStr !== prevStr) {
          console.log(
            "🔄 [InfraFinancingReview] formData prop changed, syncing local state with latest data"
          );
          return formData;
        }

        // If formData hasn't changed, keep previous state (may have local edits)
        return prev;
      });
    }
  }, [formData]);

  // Sync submission prop when it changes (for indicatorScores updates)
  useEffect(() => {
    if (submission && submission.indicatorScores) {
      console.log(
        "🔄 [InfraFinancingReview] submission prop updated with indicatorScores:",
        submission.indicatorScores
      );
    }
  }, [submission]);

  // Section 1.3 state management
  const [section13State, setSection13State] = useState({
    totalULBs: formData?.section1_3?.totalULBs || 0,
    ulbList: formData?.section1_3?.ulbList || [],
  });

  useEffect(() => {
    if (!isRestoringRef.current) {
      // Prefer submissionData (updated after save) over formData when initializing
      const section1_3 = submissionData?.section1_3 || formData?.section1_3;
      setSection13State({
        totalULBs: section1_3?.totalULBs || 0,
        ulbList: section1_3?.ulbList || [],
      });
    }
  }, [submissionData?.section1_3, formData?.section1_3]);

  // Section 1.5 state management
  const [section15State, setSection15State] = useState<{
    hasIntermediary?: string;
    ffiArray?: any[];
    comment?: string;
  }>(formData?.section1_5 || { ffiArray: [] });

  // Validation error state - using centralized hooks
  const { assignedIndicators: hookAssignedIndicators } = useIndicatorAccess();

  // State for edit functionality indicator wise - moved here to be available before useMemo
  const { setEditable, isEditable, clearAllEditing } =
    useEditableSectionStore();

  // Field validation hook for touch tracking
  const {
    touchedFields,
    markFieldAsTouched,
    setValidatingIndicator,
    markIndicatorFieldsAsTouched,
    clearValidatingIndicator,
    clearValidFieldErrors,
    createOnChangeHandler,
    createOnBlurHandler,
    createOnValueChangeHandler,
  } = useFieldValidation();

  // Helper to check if field is touched
  const isFieldTouched = useCallback(
    (path: string) => {
      return touchedFields.has(path);
    },
    [touchedFields]
  );

  // Real-time validation state
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [indicatorValidationErrors, setIndicatorValidationErrors] = useState<
    Record<string, string>
  >({});
  // Section-level validation error messages (shown when save fails)
  const [sectionValidationMessages, setSectionValidationMessages] = useState<
    Record<string, string>
  >({});

  // State to track if indicator 1.1 is accepted and its capitalAllocation value (for STATE_APPROVER validation)
  const [isIndicator1_1AcceptedState, setIsIndicator1_1AcceptedState] =
    useState<boolean | null>(null);
  const [indicator1_1CapitalAllocation, setIndicator1_1CapitalAllocation] =
    useState<number | null>(null);
  // Trigger to refresh indicator 1.1 acceptance check
  const [refreshIndicator1_1Check, setRefreshIndicator1_1Check] = useState(0);

  // State to track if indicator 1.3 is accepted and its totalULBs value (for STATE_APPROVER validation)
  const [isIndicator1_3AcceptedState, setIsIndicator1_3AcceptedState] =
    useState<boolean | null>(null);
  const [indicator1_3TotalULBs, setIndicator1_3TotalULBs] = useState<
    number | null
  >(null);
  // Trigger to refresh indicator 1.3 acceptance check
  const [refreshIndicator1_3Check, setRefreshIndicator1_3Check] = useState(0);

  // Validate that totalULBs in 1.4 matches totalULBs in 1.3 (STATE_APPROVER only)
  useEffect(() => {
    const userRole = getUserRole();
    if (userRole !== "STATE_APPROVER") {
      // Clear validation error for non-STATE_APPROVER users
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section1_4.totalULBs"];
        return updated;
      });
      return;
    }

    // Only validate if indicator 1.3 is accepted and totalULBs is available
    if (!isIndicator1_3AcceptedState || !indicator1_3TotalULBs) {
      // Clear validation error if indicator 1.3 is not accepted
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section1_4.totalULBs"];
        return updated;
      });
      return;
    }

    const currentValue = section14State?.totalULBs || 0;
    if (!currentValue) {
      // Field is empty, don't show validation error yet (let normal validation handle it)
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section1_4.totalULBs"];
        return updated;
      });
      return;
    }

    // Compare values
    const indicator1_3Value = Number(indicator1_3TotalULBs);
    const currentValueNum = Number(currentValue);

    if (isNaN(indicator1_3Value) || isNaN(currentValueNum)) {
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section1_4.totalULBs"];
        return updated;
      });
      return;
    }

    if (indicator1_3Value !== currentValueNum) {
      // Values don't match, show validation error
      setIndicatorValidationErrors((prev) => ({
        ...prev,
        "section1_4.totalULBs": `This value must equal the Total Number of ULBs (${indicator1_3TotalULBs}) from indicator 1.3`,
      }));
    } else {
      // Values match, clear validation error
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section1_4.totalULBs"];
        return updated;
      });
    }
  }, [
    section14State?.totalULBs,
    indicator1_3TotalULBs,
    isIndicator1_3AcceptedState,
  ]);

  // Fetch all submissions for the same state and check if indicator 1.3 is accepted in any of them
  useEffect(() => {
    const checkIndicator1_3AcrossSubmissions = async () => {
      if (!submission) {
        setIsIndicator1_3AcceptedState(false);
        return;
      }

      const currentStateUt =
        (submission as any)?.stateUt || (submission as any)?.user?.stateUt;
      if (!currentStateUt) {
        console.log(
          "❌ [isIndicator1_3Accepted] No stateUt found in submission"
        );
        setIsIndicator1_3AcceptedState(false);
        return;
      }

      console.log(
        "🔍 [isIndicator1_3Accepted] Checking across all submissions for state:",
        currentStateUt
      );

      try {
        // Fetch all submissions
        const submissionsData = await apiService.getSubmissions(1, 100);

        // Handle different response structures
        let submissionsArray: any[] = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (
          submissionsData?.submissions &&
          Array.isArray(submissionsData.submissions)
        ) {
          submissionsArray = submissionsData.submissions;
        } else if (
          (submissionsData as any)?.data &&
          Array.isArray((submissionsData as any).data)
        ) {
          submissionsArray = (submissionsData as any).data;
        }

        // Filter submissions for the same state/UT
        const sameStateSubmissions = submissionsArray.filter((sub: any) => {
          const subStateUt = sub.stateUt || sub.user?.stateUt;
          return (
            subStateUt &&
            String(subStateUt).toUpperCase() ===
              String(currentStateUt).toUpperCase()
          );
        });

        console.log(
          "🔍 [isIndicator1_3Accepted] Found submissions for same state:",
          sameStateSubmissions.length
        );

        // Check each submission for indicator 1.3 acceptance
        for (const sub of sameStateSubmissions) {
          let isAccepted = false;
          let totalULBsValue: number | null = null;

          // Check section_status first
          if (sub?.section_status && typeof sub.section_status === "object") {
            const sectionStatus = (sub.section_status as any)["section1_3"];
            if (sectionStatus === "ACCEPTED" || sectionStatus === "APPROVED") {
              console.log(
                "✅ [isIndicator1_3Accepted] Found indicator 1.3 ACCEPTED in submission:",
                sub.id
              );
              isAccepted = true;
            }
          }

          // Check completedIndicators
          if (
            sub?.section_status?.completedIndicators &&
            Array.isArray(sub.section_status.completedIndicators)
          ) {
            if (sub.section_status.completedIndicators.includes("1.3")) {
              console.log(
                "✅ [isIndicator1_3Accepted] Found indicator 1.3 in completedIndicators for submission:",
                sub.id
              );
              isAccepted = true;
            }
          }

          // Check formData
          if (sub?.formData?.infraFinancing?.section1_3) {
            const section1_3Data = sub.formData.infraFinancing.section1_3;
            const statusValue = section1_3Data.status
              ? String(section1_3Data.status).trim().toUpperCase()
              : null;

            if (statusValue === "ACCEPTED" || statusValue === "APPROVED") {
              console.log(
                "✅ [isIndicator1_3Accepted] Found indicator 1.3 ACCEPTED in formData for submission:",
                sub.id
              );
              isAccepted = true;
            }

            // Extract totalULBs value from accepted indicator 1.3
            if (isAccepted && section1_3Data.totalULBs !== undefined) {
              totalULBsValue = Number(section1_3Data.totalULBs);
              console.log(
                "📊 [isIndicator1_3Accepted] Found totalULBs value:",
                totalULBsValue
              );
            }
          }

          // If indicator 1.3 is accepted, set state and return
          if (isAccepted) {
            setIsIndicator1_3AcceptedState(true);
            setIndicator1_3TotalULBs(totalULBsValue);
            return;
          }
        }

        console.log(
          "❌ [isIndicator1_3Accepted] Indicator 1.3 not found as ACCEPTED in any submission for state:",
          currentStateUt
        );
        setIsIndicator1_3AcceptedState(false);
      } catch (error) {
        console.error(
          "❌ [isIndicator1_3Accepted] Error checking across submissions:",
          error
        );
        setIsIndicator1_3AcceptedState(false);
      }
    };

    checkIndicator1_3AcrossSubmissions();
  }, [submission, refreshIndicator1_3Check]);

  // Helper function to check if indicator 1.3 is accepted (uses cached state)
  const isIndicator1_3Accepted = (): boolean => {
    // Use the cached state from useEffect
    if (isIndicator1_3AcceptedState === null) {
      // Still loading, return false for now
      return false;
    }
    return isIndicator1_3AcceptedState;
  };

  // Helper function to check if totalULBs in 1.4 matches totalULBs in 1.3
  const doesTotalULBsMatch = (): boolean => {
    // Only check at STATE_APPROVER level
    const userRole = getUserRole();
    if (userRole !== "STATE_APPROVER") {
      return true; // No validation for other roles
    }

    // If indicator 1.3 is not accepted, don't validate
    if (!isIndicator1_3Accepted()) {
      return true;
    }

    // If totalULBs is not available, don't validate
    if (!indicator1_3TotalULBs) {
      return true;
    }

    const currentValue = section14State?.totalULBs || 0;
    if (!currentValue) {
      return false; // Field is empty, doesn't match
    }

    // Compare values
    const indicator1_3Value = Number(indicator1_3TotalULBs);
    const currentValueNum = Number(currentValue);

    if (isNaN(indicator1_3Value) || isNaN(currentValueNum)) {
      return false;
    }

    return indicator1_3Value === currentValueNum;
  };

  useEffect(() => {
    if (!isRestoringRef.current) {
      // Prefer submissionData (updated after save) over formData when initializing
      const section1_5 = submissionData?.section1_5 || formData?.section1_5;
      // Handle both old format (array) and new format (object)
      if (Array.isArray(section1_5)) {
        setSection15State({ ffiArray: section1_5 });
      } else {
        setSection15State(section1_5 || { ffiArray: [] });
      }
    }
  }, [submissionData?.section1_5, formData?.section1_5]);

  // Check if this section has any data
  console.log("💡 InfraFinancing formData (raw):", formData);
  console.log(
    "💡 getSectionsWithData(...) =>",
    getSectionsWithData({ infraFinancing: formData }, "infraFinancing")
  );
  console.log(
    "💡 hasInfraFinancingData(formData) =>",
    hasInfraFinancingData({ infraFinancing: formData })
  );

  const hasData = hasInfraFinancingData({ infraFinancing: formData });
  // Store which sections were initially submitted when component first mounts or when data changes
  // This ensures we remember sections even if they're removed from formData after deletion
  // Once a section is marked as submitted, it stays in the set (never removed)
  const initiallySubmittedSections = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check which sections were submitted and add them to the set
    // This runs on mount and when formData/submission changes
    // We only ADD sections, never remove them (once submitted, always submitted)
    const allPossibleSections = [
      "section1_1",
      "section1_2",
      "section1_3",
      "section1_4",
      "section1_5",
    ];
    allPossibleSections.forEach((sectionKey) => {
      // Skip if already marked as submitted
      if (initiallySubmittedSections.current.has(sectionKey)) {
        return;
      }

      // Check submission.section_status first (most reliable)
      let wasSubmitted = false;
      if (
        submission?.section_status &&
        typeof submission.section_status === "object"
      ) {
        const sectionStatus = (submission.section_status as any)[sectionKey];
        if (
          sectionStatus &&
          sectionStatus !== "NOT_STARTED" &&
          sectionStatus !== null &&
          sectionStatus !== undefined
        ) {
          wasSubmitted = true;
        }
      }

      // Also check if section exists in formData
      if (!wasSubmitted && formData && typeof formData === "object") {
        const infraFin =
          (formData as any).infraFinancing ||
          ((formData as any).section1_1 ? formData : null);
        if (
          infraFin &&
          typeof infraFin === "object" &&
          infraFin[sectionKey] !== undefined &&
          infraFin[sectionKey] !== null
        ) {
          wasSubmitted = true;
        }
      }

      if (wasSubmitted) {
        initiallySubmittedSections.current.add(sectionKey);
        console.log(
          `[InfraFinancingReview] Marking ${sectionKey} as submitted`
        );
      }
    });
    console.log(
      `[InfraFinancingReview] Submitted sections set:`,
      Array.from(initiallySubmittedSections.current)
    );
  }, [formData, submission]); // Run when formData or submission changes

  // Helper function to check if a section was previously submitted/saved
  // Uses initiallySubmittedSections ref (set on mount) as the source of truth
  // Also checks current submission.section_status as a fallback
  const wasSectionPreviouslySubmitted = useCallback(
    (sectionKey: string): boolean => {
      // PRIORITY 1: Check if section was marked as initially submitted on mount
      if (initiallySubmittedSections.current.has(sectionKey)) {
        return true;
      }

      // PRIORITY 2: Check submission.section_status - this is also reliable
      if (
        submission?.section_status &&
        typeof submission.section_status === "object"
      ) {
        const sectionStatus = (submission.section_status as any)[sectionKey];
        if (
          sectionStatus &&
          sectionStatus !== "NOT_STARTED" &&
          sectionStatus !== null &&
          sectionStatus !== undefined
        ) {
          return true;
        }
      }

      // PRIORITY 3: Check original formData prop (from backend) - fallback check
      const infraFinFromFormData =
        formData &&
        typeof formData === "object" &&
        ((formData as any).infraFinancing || (formData as any).section1_1)
          ? (formData as any).infraFinancing || formData
          : null;

      const inFormData =
        infraFinFromFormData &&
        typeof infraFinFromFormData === "object" &&
        (infraFinFromFormData as any)[sectionKey] !== undefined &&
        (infraFinFromFormData as any)[sectionKey] !== null;

      return inFormData;
    },
    [formData, submission]
  );

  const sectionsWithData = useMemo(() => {
    const detectedSections =
      getSectionsWithData({ infraFinancing: formData }, "infraFinancing") || [];

    // ALWAYS include sections that were previously submitted, even if they have no data now
    // This ensures submitted indicators never disappear from the UI
    const allPossibleSections = [
      "section1_1",
      "section1_2",
      "section1_3",
      "section1_4",
      "section1_5",
    ];
    const previouslySubmittedSections = allPossibleSections.filter(
      (sectionKey) => {
        return wasSectionPreviouslySubmitted(sectionKey);
      }
    );

    // Merge previously submitted sections with detected sections
    const mergedDetectedSections = Array.from(
      new Set([...detectedSections, ...previouslySubmittedSections])
    );

    const infraPayload =
      formData && (formData as any).section1_1
        ? formData
        : formData
        ? (formData as any).infraFinancing || formData
        : {};

    // Filter out sections 1.1 and 1.2 from mergedDetectedSections if they don't have meaningful data
    // (exclude year, percentage, and marksObtained from meaningful data check)
    // BUT: Always keep sections that were previously submitted
    const filteredDetectedSections = mergedDetectedSections.filter((sec) => {
      // Always keep previously submitted sections
      if (wasSectionPreviouslySubmitted(sec)) {
        return true;
      }
      if (sec === "section1_1") {
        const section = infraPayload?.section1_1;
        if (!section || typeof section !== "object") return false;
        const fieldsToCheck = [
          "gsdpForFY",
          "allocationToGSDP",
          "capitalAllocation",
          "capexToCapexActuals",
          "stateCapexUtilisation",
          "stateCapex",
        ];
        return fieldsToCheck.some((field) => {
          const val = section[field];
          return val !== null && val !== undefined && val !== "" && val !== 0;
        });
      }
      if (sec === "section1_2") {
        const section = infraPayload?.section1_2;
        if (!section || typeof section !== "object") return false;
        const fieldsToCheck = [
          "gsdpForFY",
          "actualCapex",
          "budgetaryCapex",
          "capexActualsToGSDP",
          "stateCapexUtilisation",
          "stateCapex",
        ];
        return fieldsToCheck.some((field) => {
          const val = section[field];
          return val !== null && val !== undefined && val !== "" && val !== 0;
        });
      }
      return true; // Keep all other sections
    });

    // Require non-empty lists for 1.3 / 1.4 (don't treat empty objects/count-only as presence)
    const hasSection13Manual = Boolean(
      Array.isArray(infraPayload?.section1_3?.ulbList) &&
        infraPayload.section1_3.ulbList.length > 0
    );

    const hasSection14Manual = Boolean(
      Array.isArray(infraPayload?.section1_4?.bondList) &&
        infraPayload.section1_4.bondList.length > 0
    );

    // Check for section1_5 manually (similar to 1.3 and 1.4)
    // Section1_5 has data if hasIntermediary is set (yes or no) OR if ffiArray has items
    const hasSection15Manual = Boolean(
      infraPayload?.section1_5 &&
        typeof infraPayload.section1_5 === "object" &&
        (infraPayload.section1_5.hasIntermediary === "yes" ||
          infraPayload.section1_5.hasIntermediary === "no" ||
          (Array.isArray(infraPayload.section1_5.ffiArray) &&
            infraPayload.section1_5.ffiArray.length > 0))
    );

    // Merge validator result + manual detections, preserving order and deduping
    const merged = Array.from(
      new Set([
        ...filteredDetectedSections, // Use filtered detected sections
        ...(hasSection13Manual ? ["section1_3"] : []),
        ...(hasSection14Manual ? ["section1_4"] : []),
        ...(hasSection15Manual ? ["section1_5"] : []),
      ])
    );

    // For preview mode with assigned indicators (nodal officers), always include assigned sections even if they have no data
    // This ensures assigned indicators are visible in preview, regardless of data presence
    if (
      isPreview &&
      isNodalOfficer &&
      assignedIndicators &&
      assignedIndicators.length > 0
    ) {
      const assignedSectionKeys: string[] = [];
      const indicatorToSectionMap: Record<string, string> = {
        "1.1": "section1_1",
        "1.2": "section1_2",
        "1.3": "section1_3",
        "1.4": "section1_4",
        "1.5": "section1_5",
      };

      assignedIndicators.forEach((indicator) => {
        const sectionKey = indicatorToSectionMap[indicator];
        // Exclude sections 1.1 and 1.2 from being added via assigned indicators
        // They should only be shown if they have meaningful data (filtered later)
        if (
          sectionKey &&
          sectionKey !== "section1_1" &&
          sectionKey !== "section1_2" &&
          !merged.includes(sectionKey)
        ) {
          assignedSectionKeys.push(sectionKey);
        }
      });

      merged.push(...assignedSectionKeys);
    }

    // For review mode (not preview) OR preview mode for non-nodal officers (e.g., state approver viewing aggregate):
    // Only include sections that have meaningful data - don't show empty/unsubmitted indicators
    // This ensures state approvers only see indicators that were actually saved/submitted by nodal officers
    if (
      (!isPreview || (isPreview && !isNodalOfficer)) &&
      infraPayload &&
      typeof infraPayload === "object"
    ) {
      // Check sections 1.1 and 1.2 separately to see if they should be added (only if they have meaningful data)
      const section1_1 = infraPayload.section1_1;
      const section1_2 = infraPayload.section1_2;

      // Only add section 1.1 if it has meaningful data (excluding percentage, marksObtained, and year)
      // year is often a default value and alone should not determine visibility
      if (section1_1 && typeof section1_1 === "object") {
        const fieldsToCheck1_1 = [
          "gsdpForFY",
          "allocationToGSDP",
          "capitalAllocation",
          "capexToCapexActuals",
          "stateCapexUtilisation",
          "stateCapex",
        ];
        const hasMeaningfulData1_1 = fieldsToCheck1_1.some((field) => {
          const val = section1_1[field];
          return val !== null && val !== undefined && val !== "" && val !== 0;
        });
        if (hasMeaningfulData1_1 && !merged.includes("section1_1")) {
          merged.push("section1_1");
        }
      }

      // Only add section 1.2 if it has meaningful data (excluding percentage, marksObtained, and year)
      // year is often a default value and alone should not determine visibility
      if (section1_2 && typeof section1_2 === "object") {
        const fieldsToCheck1_2 = [
          "gsdpForFY",
          "actualCapex",
          "budgetaryCapex",
          "capexActualsToGSDP",
          "stateCapexUtilisation",
          "stateCapex",
        ];
        const hasMeaningfulData1_2 = fieldsToCheck1_2.some((field) => {
          const val = section1_2[field];
          return val !== null && val !== undefined && val !== "" && val !== 0;
        });
        if (hasMeaningfulData1_2 && !merged.includes("section1_2")) {
          merged.push("section1_2");
        }
      }

      // For sections 1.3, 1.4, and 1.5, only include if they have meaningful data
      // OR if they are currently in edit mode (to allow adding entries after deletion)
      // Don't include them just because they exist in formData
      const section1_3 = infraPayload.section1_3;
      if (section1_3 && typeof section1_3 === "object") {
        const hasSection1_3Data =
          Array.isArray(section1_3.ulbList) && section1_3.ulbList.length > 0;
        const isSection1_3Editable = isEditable("1.3");
        if (
          (hasSection1_3Data || isSection1_3Editable) &&
          !merged.includes("section1_3")
        ) {
          merged.push("section1_3");
        }
      }

      const section1_4 = infraPayload.section1_4;
      if (section1_4 && typeof section1_4 === "object") {
        const hasSection1_4Data =
          Array.isArray(section1_4.bondList) && section1_4.bondList.length > 0;
        const isSection1_4Editable = isEditable("1.4");
        if (
          (hasSection1_4Data || isSection1_4Editable) &&
          !merged.includes("section1_4")
        ) {
          merged.push("section1_4");
        }
      }

      const section1_5 = infraPayload.section1_5;
      if (section1_5) {
        let hasSection1_5Data = false;
        if (typeof section1_5 === "object") {
          // Check if it has the new format with hasIntermediary
          if (section1_5.hasIntermediary === "yes") {
            hasSection1_5Data = true; // "yes" always has data
          } else if (section1_5.hasIntermediary === "no") {
            // "no" requires a comment to be considered as having data
            const comment = section1_5.comment || "";
            hasSection1_5Data = comment.trim() !== "";
          }
          // Check if it has ffiArray with data (legacy format or yes with items)
          else if (
            Array.isArray(section1_5.ffiArray) &&
            section1_5.ffiArray.length > 0
          ) {
            hasSection1_5Data = true;
          }
        }
        // Check if it's the old array format
        else if (Array.isArray(section1_5) && section1_5.length > 0) {
          hasSection1_5Data = true;
        }
        const isSection1_5Editable = isEditable("1.5");
        if (
          (hasSection1_5Data || isSection1_5Editable) &&
          !merged.includes("section1_5")
        ) {
          merged.push("section1_5");
        }
      }
    }

    // Final safety filter: verify each section has actual submitted data
    // All sections (including 1.3, 1.4, 1.5) should be filtered based on meaningful data
    // For both nodal officers and non-nodal officers: only show indicators that have been submitted
    // This ensures only saved/submitted indicators are shown
    const final = merged.filter((sec) => {
      // First, check if section has SAVE_AS_DRAFT status - exclude it from review
      const sectionKey = sec;
      const section = infraPayload?.[sectionKey];
      if (section?.status && section.status.toUpperCase() === "SAVE_AS_DRAFT") {
        return false; // Exclude SAVE_AS_DRAFT indicators from review
      }

      // Check if section has actual data - only show if submitted OR if in edit mode
      if (sec === "section1_1") {
        const section = infraPayload?.section1_1;
        if (!section) {
          // Check if it's in edit mode even if section doesn't exist
          return isEditable("1.1");
        }
        // Exclude percentage, marksObtained, and year from meaningful data check
        // percentage and marksObtained are calculated/backend fields and should not determine visibility
        // year is often a default value and alone should not determine visibility
        const fieldsToCheck = [
          "gsdpForFY",
          "allocationToGSDP",
          "capitalAllocation",
          "capexToCapexActuals",
          "stateCapexUtilisation",
          "stateCapex",
        ];
        const hasData = fieldsToCheck.some((field) => {
          const val = section[field];
          if (val === null || val === undefined || val === "" || val === 0)
            return false;
          return true;
        });
        const isSectionEditable = isEditable("1.1");
        console.log(
          `${hasData || isSectionEditable ? "✅" : "🚫"} Section 1.1 ${
            hasData || isSectionEditable ? "included" : "excluded"
          }:`,
          section
        );
        return hasData || isSectionEditable;
      }
      if (sec === "section1_2") {
        const section = infraPayload?.section1_2;
        if (!section) {
          // Check if it's in edit mode even if section doesn't exist
          return isEditable("1.2");
        }
        // Exclude percentage, marksObtained, and year from meaningful data check
        // percentage and marksObtained are calculated/backend fields and should not determine visibility
        // year is often a default value and alone should not determine visibility
        const fieldsToCheck = [
          "gsdpForFY",
          "actualCapex",
          "budgetaryCapex",
          "capexActualsToGSDP",
          "stateCapexUtilisation",
          "stateCapex",
        ];
        const hasData = fieldsToCheck.some((field) => {
          const val = section[field];
          if (val === null || val === undefined || val === "" || val === 0)
            return false;
          return true;
        });
        const isSectionEditable = isEditable("1.2");
        console.log(
          `${hasData || isSectionEditable ? "✅" : "🚫"} Section 1.2 ${
            hasData || isSectionEditable ? "included" : "excluded"
          }:`,
          section
        );
        return hasData || isSectionEditable;
      }
      if (sec === "section1_3") {
        const section = infraPayload?.section1_3;
        if (!section) {
          // Check if it's in edit mode even if section doesn't exist
          return isEditable("1.3");
        }
        const hasData =
          Array.isArray(section?.ulbList) && section.ulbList.length > 0;
        const isSectionEditable = isEditable("1.3");
        return hasData || isSectionEditable;
      }
      if (sec === "section1_4") {
        const section = infraPayload?.section1_4;
        if (!section) {
          // Check if it's in edit mode even if section doesn't exist
          return isEditable("1.4");
        }
        const hasData =
          Array.isArray(section?.bondList) && section.bondList.length > 0;
        const isSectionEditable = isEditable("1.4");
        return hasData || isSectionEditable;
      }
      if (sec === "section1_5") {
        const section = infraPayload?.section1_5;
        if (!section) {
          // Check if it's in edit mode even if section doesn't exist
          return isEditable("1.5");
        }

        // Check if it has the new format with hasIntermediary
        if (section.hasIntermediary === "yes") {
          return true; // "yes" always has data (even if ffiArray is empty initially)
        }
        if (section.hasIntermediary === "no") {
          // "no" requires a comment to be considered as having data
          const comment = section.comment || "";
          if (comment.trim() !== "") return true;
        }
        // Check if it has ffiArray with data (legacy format or yes with items)
        if (Array.isArray(section.ffiArray) && section.ffiArray.length > 0)
          return true;
        // Check if it's the old array format
        if (Array.isArray(section) && section.length > 0) return true;

        // If no data, check if it's in edit mode
        return isEditable("1.5");
      }
      return true;
    });

    // ALWAYS ensure sections in edit mode are visible, regardless of data or preview mode
    // This prevents sections from disappearing when user deletes all entries in edit mode
    // Reuse allPossibleSections declared earlier in this useMemo
    const sectionIdMap: Record<string, string> = {
      section1_1: "1.1",
      section1_2: "1.2",
      section1_3: "1.3",
      section1_4: "1.4",
      section1_5: "1.5",
    };

    const sectionsInEditMode = allPossibleSections.filter((sectionKey) => {
      const sectionId = sectionIdMap[sectionKey];
      return sectionId ? isEditable(sectionId) : false;
    });

    // Merge sections in edit mode with final, ensuring they're always visible
    let result = Array.from(new Set([...final, ...sectionsInEditMode]));

    // Final merge: ensure previously submitted sections are always included
    // This ensures submitted indicators never disappear, even after canceling edit or deleting entries
    // Reuse allPossibleSections declared earlier in this useMemo
    const previouslySubmittedSectionsFinal = allPossibleSections.filter(
      (sectionKey) => {
        return wasSectionPreviouslySubmitted(sectionKey);
      }
    );
    result = Array.from(
      new Set([...result, ...previouslySubmittedSectionsFinal])
    );

    return result;
  }, [
    formData,
    isPreview,
    isNodalOfficer,
    assignedIndicators,
    wasSectionPreviouslySubmitted,
  ]);

  // State for real-time calculation
  const [capitalAllocation, setCapitalAllocation] = useState("");
  const [gsdpForFY, setGsdpForFY] = useState("");

  // State for section 1.2
  const [actualCapex, setActualCapex] = useState("");
  const [stateCapexUtilisation, setStateCapexUtilisation] = useState("");

  // State for save confirmation dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSaveSectionId, setPendingSaveSectionId] = useState<
    string | null
  >(null);

  // State for Send Back and Accept confirmation dialogs
  const [showSendBackDialog, setShowSendBackDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [pendingActionSectionId, setPendingActionSectionId] = useState<
    string | null
  >(null);

  // State to track if comment modal was opened from MOSPI_APPROVER "Sent Back" button
  // (Accept no longer requires comment, so it directly shows confirmation)
  const [isMospiApproverSentBack, setIsMospiApproverSentBack] = useState(false);
  const [mospiSentBackSectionId, setMospiSentBackSectionId] = useState<
    string | null
  >(null);

  // State to track if comment modal was opened from STATE_APPROVER "Send Back" button
  const [isStateApproverSentBack, setIsStateApproverSentBack] = useState(false);
  const [stateApproverSentBackSectionId, setStateApproverSentBackSectionId] =
    useState<string | null>(null);

  // State for Add More form in section 1.5
  const [showAddForm1_5, setShowAddForm1_5] = useState(false);
  const [newEntry1_5, setNewEntry1_5] = useState({
    organisationName: "",
    organisationType: "",
    yearEstablished: "",
    totalFunding: "",
    website: "",
  });

  // Helper function to check user role
  const getUserRole = () => {
    try {
      const authUser = localStorage.getItem("niri_app:auth_user");
      if (authUser) {
        const user = JSON.parse(authUser);
        return user.value?.role;
      }
    } catch (error) {
      console.error("Error reading user role:", error);
    }
    return null;
  };

  // Fetch all submissions for the same state and check if indicator 1.1 is accepted in any of them
  useEffect(() => {
    const checkIndicator1_1AcrossSubmissions = async () => {
      if (!submission) {
        setIsIndicator1_1AcceptedState(false);
        return;
      }

      const currentStateUt =
        (submission as any)?.stateUt || (submission as any)?.user?.stateUt;
      if (!currentStateUt) {
        console.log(
          "❌ [isIndicator1_1Accepted] No stateUt found in submission"
        );
        setIsIndicator1_1AcceptedState(false);
        return;
      }

      console.log(
        "🔍 [isIndicator1_1Accepted] Checking across all submissions for state:",
        currentStateUt
      );

      try {
        // Fetch all submissions
        const submissionsData = await apiService.getSubmissions(1, 100);

        // Handle different response structures
        let submissionsArray: any[] = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (
          submissionsData?.submissions &&
          Array.isArray(submissionsData.submissions)
        ) {
          submissionsArray = submissionsData.submissions;
        } else if (
          (submissionsData as any)?.data &&
          Array.isArray((submissionsData as any).data)
        ) {
          submissionsArray = (submissionsData as any).data;
        }

        // Filter submissions for the same state/UT
        const sameStateSubmissions = submissionsArray.filter((sub: any) => {
          const subStateUt = sub.stateUt || sub.user?.stateUt;
          return (
            subStateUt &&
            String(subStateUt).toUpperCase() ===
              String(currentStateUt).toUpperCase()
          );
        });

        console.log(
          "🔍 [isIndicator1_1Accepted] Found submissions for same state:",
          sameStateSubmissions.length
        );

        // Check each submission for indicator 1.1 acceptance
        for (const sub of sameStateSubmissions) {
          let isAccepted = false;
          let capitalAllocationValue: number | null = null;

          // Check section_status first
          if (sub?.section_status && typeof sub.section_status === "object") {
            const sectionStatus = (sub.section_status as any)["section1_1"];
            if (sectionStatus === "ACCEPTED" || sectionStatus === "APPROVED") {
              console.log(
                "✅ [isIndicator1_1Accepted] Found indicator 1.1 ACCEPTED in submission:",
                sub.id
              );
              isAccepted = true;
            }
          }

          // Check completedIndicators
          if (
            sub?.section_status?.completedIndicators &&
            Array.isArray(sub.section_status.completedIndicators)
          ) {
            if (sub.section_status.completedIndicators.includes("1.1")) {
              console.log(
                "✅ [isIndicator1_1Accepted] Found indicator 1.1 in completedIndicators for submission:",
                sub.id
              );
              isAccepted = true;
            }
          }

          // Check formData
          if (sub?.formData?.infraFinancing?.section1_1) {
            const section1_1Data = sub.formData.infraFinancing.section1_1;
            const statusValue = section1_1Data.status
              ? String(section1_1Data.status).trim().toUpperCase()
              : null;

            if (statusValue === "ACCEPTED" || statusValue === "APPROVED") {
              console.log(
                "✅ [isIndicator1_1Accepted] Found indicator 1.1 ACCEPTED in formData for submission:",
                sub.id
              );
              isAccepted = true;
            }

            // Extract capitalAllocation value from accepted indicator 1.1
            if (isAccepted && section1_1Data.capitalAllocation !== undefined) {
              const capAllocStr = String(section1_1Data.capitalAllocation)
                .replace(/[₹,Crores\s]/g, "")
                .trim();
              capitalAllocationValue = Number(capAllocStr);
              if (!isNaN(capitalAllocationValue)) {
                console.log(
                  "📊 [isIndicator1_1Accepted] Found capitalAllocation value:",
                  capitalAllocationValue
                );
              }
            }
          }

          // If indicator 1.1 is accepted, set state and return
          if (isAccepted) {
            setIsIndicator1_1AcceptedState(true);
            setIndicator1_1CapitalAllocation(capitalAllocationValue);
            return;
          }
        }

        console.log(
          "❌ [isIndicator1_1Accepted] Indicator 1.1 not found as ACCEPTED in any submission for state:",
          currentStateUt
        );
        setIsIndicator1_1AcceptedState(false);
      } catch (error) {
        console.error(
          "❌ [isIndicator1_1Accepted] Error checking across submissions:",
          error
        );
        setIsIndicator1_1AcceptedState(false);
      }
    };

    checkIndicator1_1AcrossSubmissions();
  }, [submission, refreshIndicator1_1Check]);

  // Validate that Capital Allocation for FY in 1.2 matches Capital Allocation for FY in 1.1 (STATE_APPROVER only)
  useEffect(() => {
    const userRole = getUserRole();
    if (userRole !== "STATE_APPROVER") {
      // Clear validation error for non-STATE_APPROVER users
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section1_2.stateCapexUtilisation"];
        return updated;
      });
      return;
    }

    // Only validate if indicator 1.1 is accepted and capitalAllocation is available
    if (!isIndicator1_1AcceptedState || !indicator1_1CapitalAllocation) {
      // Clear validation error if indicator 1.1 is not accepted
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section1_2.stateCapexUtilisation"];
        return updated;
      });
      return;
    }

    const currentValue = stateCapexUtilisation || "";
    if (!currentValue || currentValue.trim() === "") {
      // Field is empty, don't show validation error yet (let normal validation handle it)
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section1_2.stateCapexUtilisation"];
        return updated;
      });
      return;
    }

    // Compare values
    const indicator1_1Value = Number(indicator1_1CapitalAllocation);
    const currentValueNum = Number(currentValue);

    if (isNaN(indicator1_1Value) || isNaN(currentValueNum)) {
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section1_2.stateCapexUtilisation"];
        return updated;
      });
      return;
    }

    if (indicator1_1Value !== currentValueNum) {
      // Values don't match, show validation error
      setIndicatorValidationErrors((prev) => ({
        ...prev,
        "section1_2.stateCapexUtilisation": `This value must equal the Capital Allocation for FY (${indicator1_1CapitalAllocation} INR-CRORE) from indicator 1.1`,
      }));
    } else {
      // Values match, clear validation error
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section1_2.stateCapexUtilisation"];
        return updated;
      });
    }
  }, [
    stateCapexUtilisation,
    indicator1_1CapitalAllocation,
    isIndicator1_1AcceptedState,
  ]);

  // Helper function to check if indicator 1.1 is accepted (uses cached state)
  const isIndicator1_1Accepted = (): boolean => {
    // Use the cached state from useEffect
    if (isIndicator1_1AcceptedState === null) {
      // Still loading, return false for now
      return false;
    }
    return isIndicator1_1AcceptedState;
  };

  // Helper function to check if Capital Allocation for FY in 1.2 matches Capital Allocation for FY in 1.1
  const doesCapitalAllocationMatch = (): boolean => {
    // Only check at STATE_APPROVER level
    const userRole = getUserRole();
    if (userRole !== "STATE_APPROVER") {
      return true; // No validation for other roles
    }

    // If indicator 1.1 is not accepted, don't validate
    if (!isIndicator1_1Accepted()) {
      return true;
    }

    // If capitalAllocation is not available, don't validate
    if (!indicator1_1CapitalAllocation) {
      return true;
    }

    const currentValue = stateCapexUtilisation || "";
    if (!currentValue || currentValue.trim() === "") {
      return false; // Field is empty, doesn't match
    }

    // Compare values
    const indicator1_1Value = Number(indicator1_1CapitalAllocation);
    const currentValueNum = Number(currentValue);

    if (isNaN(indicator1_1Value) || isNaN(currentValueNum)) {
      return false;
    }

    return indicator1_1Value === currentValueNum;
  };

  // Initialize section 1.2 state from formData/submissionData (but not when restoring from cancel)
  useEffect(() => {
    if (!isRestoringRef.current) {
      // Prefer submissionData over formData as it's updated after saves
      const section1_2 =
        submissionData?.section1_2 ||
        formData?.section1_2 ||
        (formData as any)?.infraFinancing?.section1_2;

      if (
        section1_2?.actualCapex !== undefined &&
        section1_2?.actualCapex !== null
      ) {
        // Preserve exact value - if string, clean it; if number, convert without adding unnecessary decimals
        let value: string;
        if (typeof section1_2.actualCapex === "string") {
          value = section1_2.actualCapex.replace(/[₹,Crores\s]/g, "").trim();
        } else {
          // If it's a number, convert to string without adding unnecessary decimals
          const num = Number(section1_2.actualCapex);
          // Remove trailing zeros and decimal point if not needed
          value =
            num % 1 === 0
              ? num.toString()
              : num.toString().replace(/\.?0+$/, "");
        }
        setActualCapex(value);
      } else {
        setActualCapex("");
      }

      if (
        section1_2?.stateCapexUtilisation !== undefined &&
        section1_2?.stateCapexUtilisation !== null
      ) {
        // Preserve exact value - if string, clean it; if number, convert without adding unnecessary decimals
        let value: string;
        if (typeof section1_2.stateCapexUtilisation === "string") {
          value = section1_2.stateCapexUtilisation
            .replace(/[₹,Crores\s]/g, "")
            .trim();
        } else {
          // If it's a number, convert to string without adding unnecessary decimals
          const num = Number(section1_2.stateCapexUtilisation);
          // Remove trailing zeros and decimal point if not needed
          value =
            num % 1 === 0
              ? num.toString()
              : num.toString().replace(/\.?0+$/, "");
        }
        setStateCapexUtilisation(value);
      } else {
        setStateCapexUtilisation("");
      }
    }
  }, [submissionData?.section1_2, formData?.section1_2]);

  // Build full form data for validation (moved after variable declarations)
  const fullFormDataForValidation = useMemo(() => {
    return {
      section1_1: {
        year:
          submissionData?.section1_1?.year || formData?.section1_1?.year || "",
        capitalAllocation:
          capitalAllocation !== undefined && capitalAllocation !== null
            ? capitalAllocation
            : submissionData?.section1_1?.capitalAllocation ||
              formData?.section1_1?.capitalAllocation ||
              "",
        gsdpForFY:
          gsdpForFY !== undefined && gsdpForFY !== null
            ? gsdpForFY
            : submissionData?.section1_1?.gsdpForFY ||
              formData?.section1_1?.gsdpForFY ||
              "",
        stateCapexUtilisation:
          submissionData?.section1_1?.stateCapexUtilisation ||
          formData?.section1_1?.stateCapexUtilisation ||
          "",
        allocationToGSDP:
          submissionData?.section1_1?.allocationToGSDP ||
          formData?.section1_1?.allocationToGSDP ||
          "",
        capexToCapexActuals:
          submissionData?.section1_1?.capexToCapexActuals ||
          formData?.section1_1?.capexToCapexActuals ||
          "",
      },
      section1_2: {
        year:
          submissionData?.section1_2?.year || formData?.section1_2?.year || "",
        gsdpForFY:
          submissionData?.section1_2?.gsdpForFY ||
          formData?.section1_2?.gsdpForFY ||
          "",
        actualCapex:
          actualCapex !== undefined && actualCapex !== null
            ? actualCapex
            : submissionData?.section1_2?.actualCapex ||
              formData?.section1_2?.actualCapex ||
              "",
        budgetaryCapex:
          submissionData?.section1_2?.budgetaryCapex ||
          formData?.section1_2?.budgetaryCapex ||
          "",
        stateCapexUtilisation:
          stateCapexUtilisation !== undefined && stateCapexUtilisation !== null
            ? stateCapexUtilisation
            : submissionData?.section1_2?.stateCapexUtilisation ||
              formData?.section1_2?.stateCapexUtilisation ||
              "",
        capexActualsToGSDP:
          submissionData?.section1_2?.capexActualsToGSDP ||
          formData?.section1_2?.capexActualsToGSDP ||
          "",
      },
      section1_3: section13State || { totalULBs: 0, ulbList: [] },
      section1_4: section14State || { totalULBs: 0, bondList: [] },
      section1_5: {
        ffiArray: section15State?.ffiArray || [],
        hasIntermediary: section15State?.hasIntermediary || "",
        comment: section15State?.comment || "",
      },
    };
  }, [
    submissionData,
    formData,
    capitalAllocation,
    gsdpForFY,
    actualCapex,
    stateCapexUtilisation,
    section13State,
    section14State,
    section15State,
  ]);

  // Real-time validation using useMemo
  const validation = useMemo(() => {
    const effectiveAssignedIndicators =
      assignedIndicators.length > 0
        ? assignedIndicators
        : hookAssignedIndicators.length > 0
        ? hookAssignedIndicators
        : undefined;

    return validateInfraFinancing(fullFormDataForValidation, {
      allowedIndicators: effectiveAssignedIndicators,
    });
  }, [fullFormDataForValidation, assignedIndicators, hookAssignedIndicators]);

  // Field error display hook
  const fieldErrorDisplay = useFieldErrorDisplay({
    validationErrors: validation?.errors || {},
    indicatorValidationErrors,
    showValidationErrors,
    isFieldTouched,
    validatingIndicator: null,
  });

  const { getFieldError, getInputValidationClass, renderFieldError } =
    fieldErrorDisplay;

  // Clear valid field errors when validation passes
  useEffect(() => {
    clearValidFieldErrors(validation.errors, setIndicatorValidationErrors);
  }, [validation.errors, clearValidFieldErrors]);

  // Clear section validation messages in real-time when validation passes
  useEffect(() => {
    setSectionValidationMessages((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      // Check each section that has a validation message
      Object.keys(updated).forEach((sectionId) => {
        const sectionPrefix = `section${sectionId.replace(".", "_")}`;
        // Check if there are any validation errors for this section
        const hasSectionErrors = Object.keys(validation.errors).some(
          (errorKey) => errorKey.startsWith(sectionPrefix)
        );

        // If no errors for this section, clear the message
        if (!hasSectionErrors) {
          delete updated[sectionId];
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [validation.errors]);

  // Store original state snapshots when edit mode starts (for cancel functionality)
  const [originalStateSnapshot, setOriginalStateSnapshot] = useState<any>(null);
  // Flag to prevent useEffect from overriding cancel restore
  const isRestoringRef = useRef(false);
  // Counter to force remount of Select components on cancel
  const [selectResetKey, setSelectResetKey] = useState(0);

  // Helper function to check if section should be editable based on mospi_status for STATE_APPROVER
  const shouldBeEditable = (sectionId: string): boolean => {
    const userRole = getUserRole();
    const isStateApprover = userRole === "STATE_APPROVER";
    const isNodalOfficer = userRole === "NODAL_OFFICER";
    const submissionStatus = submission?.status;

    console.log(`[InfraFinancingReview] shouldBeEditable(${sectionId}):`, {
      userRole,
      isNodalOfficer,
      isStateApprover,
      submissionStatus,
      isCurrentlyEditable: isEditable(sectionId),
    });

    // For NODAL_OFFICER, check submission status
    if (isNodalOfficer) {
      // First check if section status is REVERTED - if so, allow editing regardless of overall status
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData =
        (formData && formData[sectionKey]) || getSectionData(sectionKey);
      const sectionStatusValue = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any).status
          : sectionData.status
        : undefined;

      // If section status is REVERTED or RESUBMITTED, allow editing if section is in edit mode
      if (
        sectionStatusValue === "REVERTED" ||
        sectionStatusValue === "RESUBMITTED"
      ) {
        const result = isEditable(sectionId);
        console.log(
          `[InfraFinancingReview] NODAL_OFFICER shouldBeEditable (${sectionStatusValue} section):`,
          {
            sectionId,
            sectionStatusValue,
            isCurrentlyEditable: isEditable(sectionId),
            result,
            reason: result
              ? "Section is in edit mode"
              : "Section is not in edit mode",
          }
        );
        return result;
      }

      // NODAL_OFFICER can only edit when status is DRAFT or RETURNED_FROM_STATE
      const statusAllowsEditing =
        submissionStatus === "DRAFT" ||
        submissionStatus === "RETURNED_FROM_STATE";
      const result = statusAllowsEditing ? isEditable(sectionId) : false;
      console.log(`[InfraFinancingReview] NODAL_OFFICER shouldBeEditable:`, {
        sectionId,
        submissionStatus,
        sectionStatusValue,
        statusAllowsEditing,
        isCurrentlyEditable: isEditable(sectionId),
        result,
        reason: !statusAllowsEditing
          ? `Status ${submissionStatus} does not allow editing`
          : result
          ? "Section is in edit mode"
          : "Section is not in edit mode",
      });
      if (!statusAllowsEditing) {
        return false;
      }
      // If status allows editing, check if section is in edit mode
      return isEditable(sectionId);
    }

    // For STATE_APPROVER, check submission status first
    if (isStateApprover) {
      const sectionKey = `section${sectionId.replace(".", "_")}`;

      // Check multiple sources for status: submission.section_status (most reliable), then formData, submissionData, and store
      // Use the same logic as renderActionButtons to ensure consistency
      let sectionStatusValue: string | undefined;

      // First check submission.section_status (most reliable source)
      if (
        submission?.section_status &&
        typeof submission.section_status === "object"
      ) {
        sectionStatusValue = (submission.section_status as any)[sectionKey];
      }

      // Check both formData prop and store data to ensure we get the correct status after refresh
      // This matches the logic in renderActionButtons
      const storeSectionData = getSectionData(sectionKey) as any;
      const sectionData =
        (formData && formData[sectionKey]) ||
        (submissionData && submissionData[sectionKey]) ||
        storeSectionData;

      // Fallback to sectionData status if not found in submission.section_status
      if (!sectionStatusValue && sectionData) {
        sectionStatusValue = Array.isArray(sectionData)
          ? (sectionData as any).status
          : sectionData.status;
      }

      const mospiStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.mospi_status
          : sectionData?.mospi_status
        : undefined;

      // Debug logging for STATE_APPROVER status check
      console.log(
        `[InfraFinancingReview] shouldBeEditable(${sectionId}) - STATE_APPROVER status check:`,
        {
          sectionKey,
          sectionStatusValue,
          fromSubmissionSectionStatus: submission?.section_status
            ? (submission.section_status as any)[sectionKey]
            : undefined,
          fromFormData: formData?.[sectionKey]
            ? Array.isArray(formData[sectionKey])
              ? (formData[sectionKey] as any).status
              : (formData[sectionKey] as any).status
            : undefined,
          fromSubmissionData: submissionData?.[sectionKey]
            ? Array.isArray(submissionData[sectionKey])
              ? (submissionData[sectionKey] as any).status
              : (submissionData[sectionKey] as any).status
            : undefined,
          fromStore: storeSectionData
            ? Array.isArray(storeSectionData)
              ? undefined
              : (storeSectionData as any).status
            : undefined,
          mospiStatus,
          isEditable: isEditable(sectionId),
        }
      );

      // If section status is RESUBMITTED, allow editing if section is in edit mode
      if (sectionStatusValue === "RESUBMITTED") {
        const result = isEditable(sectionId);
        console.log(
          `[InfraFinancingReview] shouldBeEditable - RESUBMITTED detected for ${sectionId}:`,
          {
            sectionStatusValue,
            isEditable: isEditable(sectionId),
            result,
          }
        );
        return result;
      }

      // STATE_APPROVER can edit when status is DRAFT, SUBMITTED_TO_STATE, or RETURNED_FROM_MOSPI
      // Should NOT have editing access when status is SUBMITTED_TO_MOSPI_REVIEWER or SUBMITTED_TO_MOSPI_APPROVER
      if (
        submissionStatus !== "DRAFT" &&
        submissionStatus !== "SUBMITTED_TO_STATE" &&
        submissionStatus !== "RETURNED_FROM_MOSPI"
      ) {
        return false;
      }

      // If mospi_status is ACCEPTED, section should NOT be editable
      if (mospiStatus === "ACCEPTED") {
        return false;
      }
      // If mospi_status is REVERTED, section CAN be edited
      // But it's only editable if it's currently in edit mode (isEditable returns true)
      if (mospiStatus === "REVERTED") {
        return isEditable(sectionId);
      }
      // If mospi_status is not set, allow editing if in edit mode (for initial state editing)
      return isEditable(sectionId);
    }

    // For other roles or when mospi_status is not set, use existing isEditable logic
    return isEditable(sectionId);
  };

  // Helper function to check if section CAN be edited (permission check, not state check)
  const canEditSection = (sectionId: string): boolean => {
    const userRole = getUserRole();
    const isStateApprover = userRole === "STATE_APPROVER";
    const isNodalOfficer = userRole === "NODAL_OFFICER";
    const submissionStatus = submission?.status;

    console.log(`[InfraFinancingReview] canEditSection(${sectionId}):`, {
      userRole,
      isNodalOfficer,
      isStateApprover,
      submissionStatus,
      submissionId: submission?.id,
    });

    // For NODAL_OFFICER, check submission status
    if (isNodalOfficer) {
      // First check if section status is REVERTED - if so, allow editing regardless of overall status
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData =
        (formData && formData[sectionKey]) || getSectionData(sectionKey);
      const sectionStatusValue = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any).status
          : sectionData.status
        : undefined;

      // If section status is REVERTED, allow editing
      if (sectionStatusValue === "REVERTED") {
        console.log(
          `[InfraFinancingReview] NODAL_OFFICER canEdit check (REVERTED section):`,
          {
            sectionId,
            sectionStatusValue,
            canEdit: true,
            reason: "Section status is REVERTED, allowing editing",
          }
        );
        return true;
      }

      // NODAL_OFFICER can only edit when status is DRAFT or RETURNED_FROM_STATE
      const canEdit =
        submissionStatus === "DRAFT" ||
        submissionStatus === "RETURNED_FROM_STATE";
      console.log(`[InfraFinancingReview] NODAL_OFFICER canEdit check:`, {
        sectionId,
        submissionStatus,
        sectionStatusValue,
        canEdit,
        reason: canEdit
          ? "Status allows editing"
          : `Status ${submissionStatus} does not allow editing (needs DRAFT or RETURNED_FROM_STATE)`,
      });
      return canEdit;
    }

    if (isStateApprover) {
      const sectionKey = `section${sectionId.replace(".", "_")}`;

      // Check multiple sources for status: submission.section_status (most reliable), then formData, submissionData, and store
      let sectionStatusValue: string | undefined;

      // First check submission.section_status (most reliable source)
      if (
        submission?.section_status &&
        typeof submission.section_status === "object"
      ) {
        sectionStatusValue = (submission.section_status as any)[sectionKey];
      }

      // Check both formData prop and store data to ensure we get the correct status after refresh
      const storeSectionData = getSectionData(sectionKey) as any;
      const sectionData =
        (formData && formData[sectionKey]) ||
        (submissionData && submissionData[sectionKey]) ||
        storeSectionData;

      // Fallback to sectionData status if not found in submission.section_status
      if (!sectionStatusValue && sectionData) {
        sectionStatusValue = Array.isArray(sectionData)
          ? (sectionData as any).status
          : sectionData.status;
      }

      // If section status is RESUBMITTED, allow editing (STATE_APPROVER can edit resubmitted sections)
      if (sectionStatusValue === "RESUBMITTED") {
        console.log(
          `[InfraFinancingReview] canEditSection - RESUBMITTED detected for ${sectionId}:`,
          {
            sectionStatusValue,
            canEdit: true,
          }
        );
        return true;
      }

      // STATE_APPROVER can edit when status is DRAFT, SUBMITTED_TO_STATE, or RETURNED_FROM_MOSPI
      if (
        submissionStatus !== "DRAFT" &&
        submissionStatus !== "SUBMITTED_TO_STATE" &&
        submissionStatus !== "RETURNED_FROM_MOSPI"
      ) {
        return false;
      }

      const mospiStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.mospi_status
          : sectionData?.mospi_status
        : undefined;

      // If mospi_status is ACCEPTED, section CANNOT be edited
      if (mospiStatus === "ACCEPTED") {
        return false;
      }
      // If mospi_status is REVERTED, section CAN be edited
      if (mospiStatus === "REVERTED") {
        return true;
      }
    }

    // For other roles or when mospi_status is not set, allow editing
    return true;
  };

  // Handle edit mode start - store original state snapshot
  const handleEditStart = (sectionId: string) => {
    console.log(
      `[InfraFinancingReview] handleEditStart called for section ${sectionId}`
    );
    const userRole = getUserRole();
    const submissionStatus = submission?.status;

    // Check if section CAN be edited (permission check)
    const canEdit = canEditSection(sectionId);
    console.log(
      `[InfraFinancingReview] handleEditStart - canEditSection result:`,
      {
        sectionId,
        userRole,
        submissionStatus,
        canEdit,
      }
    );

    if (!canEdit) {
      console.warn(
        `[InfraFinancingReview] ❌ Cannot edit section ${sectionId} - Permission denied`,
        {
          userRole,
          submissionStatus,
          reason: "canEditSection returned false",
        }
      );
      return;
    }

    console.log(
      `[InfraFinancingReview] ✅ Starting edit mode for section ${sectionId}`
    );

    // For section 1.1, ensure state is initialized from submissionData/formData before storing snapshot
    let capitalAllocationToStore = capitalAllocation;
    let gsdpForFYToStore = gsdpForFY;

    if (sectionId === "1.1") {
      // Prefer submissionData (updated after saves) over formData when entering edit mode
      const section1_1 =
        submissionData?.section1_1 ||
        formData?.section1_1 ||
        (formData as any)?.infraFinancing?.section1_1;

      // Always initialize capitalAllocation from submissionData/formData when entering edit mode
      if (
        section1_1?.capitalAllocation !== undefined &&
        section1_1?.capitalAllocation !== null
      ) {
        let capitalAllocationValue: string;
        if (typeof section1_1.capitalAllocation === "string") {
          capitalAllocationValue = section1_1.capitalAllocation
            .replace(/[₹,Crores\s]/g, "")
            .trim();
        } else {
          // If it's a number, convert to string without adding unnecessary decimals
          const num = Number(section1_1.capitalAllocation);
          capitalAllocationValue =
            num % 1 === 0
              ? num.toString()
              : num.toString().replace(/\.?0+$/, "");
        }

        // Always update state from submissionData/formData when entering edit mode
        setCapitalAllocation(capitalAllocationValue);
        capitalAllocationToStore = capitalAllocationValue;
      } else {
        // If no value, ensure state is empty
        setCapitalAllocation("");
        capitalAllocationToStore = "";
      }

      // Always initialize gsdpForFY from submissionData/formData when entering edit mode
      if (
        section1_1?.gsdpForFY !== undefined &&
        section1_1?.gsdpForFY !== null
      ) {
        let gsdpForFYValue: string;
        if (typeof section1_1.gsdpForFY === "string") {
          gsdpForFYValue = section1_1.gsdpForFY
            .replace(/[₹,Crores\s]/g, "")
            .trim();
        } else {
          // If it's a number, convert to string without adding unnecessary decimals
          const num = Number(section1_1.gsdpForFY);
          gsdpForFYValue =
            num % 1 === 0
              ? num.toString()
              : num.toString().replace(/\.?0+$/, "");
        }

        // Always update state from submissionData/formData when entering edit mode
        setGsdpForFY(gsdpForFYValue);
        gsdpForFYToStore = gsdpForFYValue;
      } else {
        // If no value, ensure state is empty
        setGsdpForFY("");
        gsdpForFYToStore = "";
      }
    }

    // For section 1.2, ensure state is initialized from formData before storing snapshot
    let actualCapexToStore = actualCapex;
    let stateCapexUtilisationToStore = stateCapexUtilisation;

    if (sectionId === "1.2") {
      // Prefer submissionData (updated after saves) over formData when entering edit mode
      const section1_2 =
        submissionData?.section1_2 ||
        formData?.section1_2 ||
        (formData as any)?.infraFinancing?.section1_2;

      // Always initialize actualCapex from submissionData/formData when entering edit mode
      if (
        section1_2?.actualCapex !== undefined &&
        section1_2?.actualCapex !== null
      ) {
        let actualCapexValue: string;
        if (typeof section1_2.actualCapex === "string") {
          actualCapexValue = section1_2.actualCapex
            .replace(/[₹,Crores\s]/g, "")
            .trim();
        } else {
          // If it's a number, convert to string without adding unnecessary decimals
          const num = Number(section1_2.actualCapex);
          actualCapexValue =
            num % 1 === 0
              ? num.toString()
              : num.toString().replace(/\.?0+$/, "");
        }

        // Always update state from submissionData/formData when entering edit mode
        setActualCapex(actualCapexValue);
        actualCapexToStore = actualCapexValue;
      } else {
        // If no value, ensure state is empty
        setActualCapex("");
        actualCapexToStore = "";
      }

      // Always initialize stateCapexUtilisation from submissionData/formData when entering edit mode
      if (
        section1_2?.stateCapexUtilisation !== undefined &&
        section1_2?.stateCapexUtilisation !== null
      ) {
        let stateCapexValue: string;
        if (typeof section1_2.stateCapexUtilisation === "string") {
          stateCapexValue = section1_2.stateCapexUtilisation
            .replace(/[₹,Crores\s]/g, "")
            .trim();
        } else {
          // If it's a number, convert to string without adding unnecessary decimals
          const num = Number(section1_2.stateCapexUtilisation);
          stateCapexValue =
            num % 1 === 0
              ? num.toString()
              : num.toString().replace(/\.?0+$/, "");
        }

        // Always update state from submissionData/formData when entering edit mode
        setStateCapexUtilisation(stateCapexValue);
        stateCapexUtilisationToStore = stateCapexValue;
      } else {
        // If no value, ensure state is empty
        setStateCapexUtilisation("");
        stateCapexUtilisationToStore = "";
      }
    }

    // Store a deep copy of all relevant state
    setOriginalStateSnapshot({
      submissionData: JSON.parse(JSON.stringify(submissionData)),
      capitalAllocation: capitalAllocationToStore,
      gsdpForFY: gsdpForFYToStore,
      actualCapex: actualCapexToStore,
      stateCapexUtilisation: stateCapexUtilisationToStore,
      section13State: JSON.parse(JSON.stringify(section13State)),
      section14State: JSON.parse(JSON.stringify(section14State)),
      section15State: JSON.parse(JSON.stringify(section15State)),
    });
    setEditable(sectionId, true);
    console.log(
      `[InfraFinancingReview] ✅ setEditable(${sectionId}, true) called`
    );

    // Show all validation errors when entering edit mode
    // Build full form data for validation (use the same structure as fullFormDataForValidation)
    const fullData: any = {
      section1_1: {
        year:
          submissionData?.section1_1?.year || formData?.section1_1?.year || "",
        capitalAllocation:
          capitalAllocationToStore !== undefined &&
          capitalAllocationToStore !== null
            ? capitalAllocationToStore
            : submissionData?.section1_1?.capitalAllocation ||
              formData?.section1_1?.capitalAllocation ||
              "",
        gsdpForFY:
          gsdpForFYToStore !== undefined && gsdpForFYToStore !== null
            ? gsdpForFYToStore
            : submissionData?.section1_1?.gsdpForFY ||
              formData?.section1_1?.gsdpForFY ||
              "",
        stateCapexUtilisation:
          submissionData?.section1_1?.stateCapexUtilisation ||
          formData?.section1_1?.stateCapexUtilisation ||
          "",
        allocationToGSDP:
          submissionData?.section1_1?.allocationToGSDP ||
          formData?.section1_1?.allocationToGSDP ||
          "",
        capexToCapexActuals:
          submissionData?.section1_1?.capexToCapexActuals ||
          formData?.section1_1?.capexToCapexActuals ||
          "",
      },
      section1_2: {
        year:
          submissionData?.section1_2?.year || formData?.section1_2?.year || "",
        actualCapex:
          actualCapexToStore !== undefined && actualCapexToStore !== null
            ? actualCapexToStore
            : submissionData?.section1_2?.actualCapex ||
              formData?.section1_2?.actualCapex ||
              "",
        stateCapexUtilisation:
          stateCapexUtilisationToStore !== undefined &&
          stateCapexUtilisationToStore !== null
            ? stateCapexUtilisationToStore
            : submissionData?.section1_2?.stateCapexUtilisation ||
              formData?.section1_2?.stateCapexUtilisation ||
              "",
        gsdpForFY:
          submissionData?.section1_2?.gsdpForFY ||
          formData?.section1_2?.gsdpForFY ||
          "",
        budgetaryCapex:
          submissionData?.section1_2?.budgetaryCapex ||
          formData?.section1_2?.budgetaryCapex ||
          "",
        capexActualsToGSDP:
          submissionData?.section1_2?.capexActualsToGSDP ||
          formData?.section1_2?.capexActualsToGSDP ||
          "",
      },
      section1_3: {
        totalULBs: section13State.totalULBs || 0,
        ulbList: section13State.ulbList || [],
      },
      section1_4: {
        totalULBs: section14State.totalULBs || 0,
        bondList: section14State.bondList || [],
      },
      section1_5: {
        hasIntermediary: section15State?.hasIntermediary || "",
        comment: section15State?.comment || "",
        ffiArray: section15State?.ffiArray || [],
      },
    };

    const effectiveAssignedIndicators =
      assignedIndicators.length > 0
        ? assignedIndicators
        : hookAssignedIndicators.length > 0
        ? hookAssignedIndicators
        : undefined;

    // Run validation for the section
    const validationResult = validateInfraFinancing(fullData, {
      allowedIndicators: effectiveAssignedIndicators,
    });

    // Filter validation errors to only include the section being edited
    const sectionErrors: Record<string, string> = {};
    const sectionPrefix = `section${sectionId.replace(".", "_")}`;
    Object.keys(validationResult.errors).forEach((errorKey) => {
      if (errorKey.startsWith(sectionPrefix)) {
        sectionErrors[errorKey] = validationResult.errors[errorKey];
      }
    });

    // Mark all fields in this section as touched so errors show immediately
    const allSectionFields: string[] = [];

    // Add base fields based on section
    if (sectionId === "1.1") {
      allSectionFields.push(
        `${sectionPrefix}.year`,
        `${sectionPrefix}.capitalAllocation`,
        `${sectionPrefix}.gsdpForFY`
      );
    } else if (sectionId === "1.2") {
      allSectionFields.push(
        `${sectionPrefix}.year`,
        `${sectionPrefix}.actualCapex`,
        `${sectionPrefix}.stateCapexUtilisation`
      );
    } else if (sectionId === "1.3") {
      allSectionFields.push(
        `${sectionPrefix}.totalULBs`,
        `${sectionPrefix}.ulbList`
      );
      if (section13State.ulbList && Array.isArray(section13State.ulbList)) {
        section13State.ulbList.forEach((_: any, index: number) => {
          allSectionFields.push(
            `${sectionPrefix}.ulbList.${index}.cityName`,
            `${sectionPrefix}.ulbList.${index}.bondAmount`
          );
        });
      }
    } else if (sectionId === "1.4") {
      allSectionFields.push(
        `${sectionPrefix}.totalULBs`,
        `${sectionPrefix}.bondList`
      );
      if (section14State.bondList && Array.isArray(section14State.bondList)) {
        section14State.bondList.forEach((_: any, index: number) => {
          allSectionFields.push(
            `${sectionPrefix}.bondList.${index}.cityName`,
            `${sectionPrefix}.bondList.${index}.bondType`,
            `${sectionPrefix}.bondList.${index}.issuingAuthority`,
            `${sectionPrefix}.bondList.${index}.value`,
            `${sectionPrefix}.bondList.${index}.tenorOfBond`
          );
        });
      }
    } else if (sectionId === "1.5") {
      allSectionFields.push(
        `${sectionPrefix}.hasIntermediary`,
        `${sectionPrefix}.comment`,
        `${sectionPrefix}.ffiArray`
      );
      if (section15State.ffiArray && Array.isArray(section15State.ffiArray)) {
        section15State.ffiArray.forEach((_: any, index: number) => {
          allSectionFields.push(
            `${sectionPrefix}.ffiArray.${index}.intermediaryName`,
            `${sectionPrefix}.ffiArray.${index}.sector`,
            `${sectionPrefix}.ffiArray.${index}.websiteLink`
          );
        });
      }
    }

    // Mark all section fields as touched so errors show immediately
    allSectionFields.forEach((field) => {
      markFieldAsTouched(field);
    });
    // Also mark fields with errors from validation
    Object.keys(validationResult.errors).forEach((errorKey) => {
      if (errorKey.startsWith(sectionPrefix)) {
        markFieldAsTouched(errorKey);
      }
    });

    // Set validation errors and show them
    setShowValidationErrors(true);
    setIndicatorValidationErrors((prev) => ({ ...prev, ...sectionErrors }));

    console.log(
      `[InfraFinancingReview] Validation errors for section ${sectionId}:`,
      sectionErrors
    );
  };

  // Handle adding new entry for section 1.5
  const handleAddNewEntry1_5 = () => {
    const newEntryWithId = {
      ...newEntry1_5,
      id: `org-${Date.now()}`,
    };
    const updatedArray = [...(section15State?.ffiArray || []), newEntryWithId];
    setSection15State({
      ...section15State,
      ffiArray: updatedArray,
    });
    // Reset form
    setNewEntry1_5({
      organisationName: "",
      organisationType: "",
      yearEstablished: "",
      totalFunding: "",
      website: "",
    });
    setShowAddForm1_5(false);
  };

  // Handle cancel - restore original state
  const handleCancel = (sectionId: string) => {
    if (originalStateSnapshot) {
      isRestoringRef.current = true;

      // For section 1.3, restore section13State FIRST before updating submissionData
      // This ensures the component receives the correct data immediately
      if (sectionId === "1.3" && originalStateSnapshot.section13State) {
        setSection13State({
          ulbList: originalStateSnapshot.section13State.ulbList || [],
          totalULBs: originalStateSnapshot.section13State.totalULBs || 0,
        });
      }

      // For section 1.4, restore section14State FIRST before updating submissionData
      // This ensures the component receives the correct data immediately
      if (sectionId === "1.4" && originalStateSnapshot.section14State) {
        setSection14State({
          bondList: originalStateSnapshot.section14State.bondList || [],
          totalULBs: originalStateSnapshot.section14State.totalULBs || 0,
        });
      }

      setSubmissionData(originalStateSnapshot.submissionData);
      setCapitalAllocation(originalStateSnapshot.capitalAllocation);
      setGsdpForFY(originalStateSnapshot.gsdpForFY);
      setActualCapex(originalStateSnapshot.actualCapex);
      setStateCapexUtilisation(originalStateSnapshot.stateCapexUtilisation);

      // Only set section13State here if it's NOT section 1.3 (already set above)
      if (sectionId !== "1.3") {
        setSection13State(originalStateSnapshot.section13State);
      }

      // Only set section14State here if it's NOT section 1.4 (already set above)
      if (sectionId !== "1.4") {
        setSection14State(originalStateSnapshot.section14State);
      }

      setSection15State(originalStateSnapshot.section15State);

      // For section 1.1, ensure formData is also restored from snapshot
      if (
        sectionId === "1.1" &&
        originalStateSnapshot.submissionData?.section1_1
      ) {
        // The submissionData already contains the restored formData, so local state
        // will be updated via useEffect when formData changes
        console.log(
          `[InfraFinancingReview] ✅ Cancel - Restored section 1.1 formData:`,
          originalStateSnapshot.submissionData.section1_1
        );
      }

      // For section 1.2, ensure formData is also restored from snapshot
      if (
        sectionId === "1.2" &&
        originalStateSnapshot.submissionData?.section1_2
      ) {
        // The submissionData already contains the restored formData, so local state
        // will be updated via useEffect when formData changes
        console.log(
          `[InfraFinancingReview] ✅ Cancel - Restored section 1.2 formData:`,
          originalStateSnapshot.submissionData.section1_2
        );
      }

      // For section 1.3, ensure submissionData.section1_3 is synced with restored section13State
      if (sectionId === "1.3") {
        // Update submissionData to match the restored section13State
        // This ensures consistency between submissionData and section13State
        setSubmissionData((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          updated.section1_3 = {
            ...updated.section1_3,
            ulbList: originalStateSnapshot.section13State?.ulbList || [],
            totalULBs: originalStateSnapshot.section13State?.totalULBs || 0,
          };
          return updated;
        });

        console.log(
          `[InfraFinancingReview] ✅ Cancel - Restored section 1.3:`,
          {
            section13State: originalStateSnapshot.section13State,
            ulbList: originalStateSnapshot.section13State?.ulbList,
            totalULBs: originalStateSnapshot.section13State?.totalULBs,
          }
        );
      }

      // For section 1.4, ensure submissionData.section1_4 is synced with restored section14State
      if (sectionId === "1.4") {
        // Update submissionData to match the restored section14State
        // This ensures consistency between submissionData and section14State
        setSubmissionData((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          updated.section1_4 = {
            ...updated.section1_4,
            bondList: originalStateSnapshot.section14State?.bondList || [],
            totalULBs: originalStateSnapshot.section14State?.totalULBs || 0,
          };
          return updated;
        });

        console.log(
          `[InfraFinancingReview] ✅ Cancel - Restored section 1.4:`,
          {
            section14State: originalStateSnapshot.section14State,
            bondList: originalStateSnapshot.section14State?.bondList,
            totalULBs: originalStateSnapshot.section14State?.totalULBs,
          }
        );
      }

      // For section 1.5, ensure formData is also restored from snapshot
      if (
        sectionId === "1.5" &&
        originalStateSnapshot.submissionData?.section1_5
      ) {
        // The submissionData already contains the restored formData, so local state
        // will be updated via useEffect when formData changes
        console.log(
          `[InfraFinancingReview] ✅ Cancel - Restored section 1.5 formData:`,
          originalStateSnapshot.submissionData.section1_5
        );
      }

      setOriginalStateSnapshot(null);
      setEditable(sectionId, false);

      // Reset Add More form for section 1.5
      if (sectionId === "1.5") {
        setShowAddForm1_5(false);
        setNewEntry1_5({
          organisationName: "",
          organisationType: "",
          yearEstablished: "",
          totalFunding: "",
          website: "",
        });
      }
      // Increment reset key to force Select components to remount
      setSelectResetKey((prev) => prev + 1);
      // Reset the flag after React has processed the state update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isRestoringRef.current = false;
        });
      });
    } else {
      setEditable(sectionId, false);
    }
  };

  // Real-time update listener
  useEffect(() => {
    const handleCommentUpdate = async (event: CustomEvent) => {
      console.log("🔍 InfraFinancingReview - Event received:", event);
      console.log("🔍 InfraFinancingReview - Event detail:", event.detail);

      const { submissionId: eventSubmissionId, comments } = event.detail;
      console.log(
        "🔍 InfraFinancingReview - Event submissionId:",
        eventSubmissionId
      );
      console.log(
        "🔍 InfraFinancingReview - Current submissionId:",
        submissionId
      );
      console.log(
        "🔍 InfraFinancingReview - IDs match:",
        eventSubmissionId === submissionId
      );

      console.log(
        "🔍 InfraFinancingReview - Event submissionId:",
        eventSubmissionId
      );
      console.log(
        "🔍 InfraFinancingReview - Current submissionId:",
        submissionId
      );
      console.log(
        "🔍 InfraFinancingReview - IDs match:",
        eventSubmissionId === submissionId
      );

      if (eventSubmissionId === submissionId) {
        console.log(
          "🔄 Real-time comment update received in InfraFinancingReview"
        );

        // 1. Note: submission is a prop, not state, so we don't update it here
        // Comments are handled by the useSectionMessages hook

        // 2. Refresh complete submission data (same as first load)
        try {
          console.log(
            "🔄 InfraFinancingReview - Refreshing complete submission data..."
          );
          console.log(
            "🔄 InfraFinancingReview - API call: apiService.getSubmission(",
            submissionId,
            ")"
          );

          const freshSubmission = await apiService.getSubmission(submissionId);
          console.log(
            "🔄 InfraFinancingReview - API response received:",
            freshSubmission
          );

          if (freshSubmission) {
            // Update submission data state with fresh data
            if (freshSubmission.formData) {
              setSubmissionData(freshSubmission.formData);
              console.log(
                "✅ InfraFinancingReview - Form data updated with fresh data"
              );
            }

            console.log(
              "✅ InfraFinancingReview - Fresh submission data loaded:",
              freshSubmission
            );
          } else {
            console.log("❌ InfraFinancingReview - Fresh submission is null");
          }
        } catch (error) {
          console.error(
            "❌ InfraFinancingReview - Failed to refresh submission data:",
            error
          );
        }
      } else {
        console.log(
          "⚠️ InfraFinancingReview - Event submissionId doesn't match current submissionId"
        );
      }
    };

    const handleSubmissionUpdate = async (event: CustomEvent) => {
      const { submissionId: eventSubmissionId, indicatorScore } =
        event.detail || {};
      if (eventSubmissionId === submissionId) {
        // Add a small delay to ensure backend has processed the update
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Refresh complete submission data to get updated indicator scores
        try {
          console.log(
            "🔄 InfraFinancingReview - Refreshing submission data after indicator update..."
          );
          const freshSubmission = await apiService.getSubmission(submissionId);

          if (freshSubmission) {
            // Update submission data state with fresh data (includes indicatorScores in response)
            if (freshSubmission.formData) {
              setSubmissionData(freshSubmission.formData);
            }

            console.log(
              "✅ InfraFinancingReview - Fresh submission data loaded with updated indicator scores:",
              freshSubmission
            );
          }
        } catch (error) {
          console.error(
            "❌ InfraFinancingReview - Failed to refresh submission data after update:",
            error
          );
        }
      }
    };

    window.addEventListener(
      "niri-comment-updated",
      handleCommentUpdate as EventListener
    );

    window.addEventListener(
      "niri-submission-updated",
      handleSubmissionUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "niri-comment-updated",
        handleCommentUpdate as EventListener
      );
      window.removeEventListener(
        "niri-submission-updated",
        handleSubmissionUpdate as EventListener
      );
    };
  }, [submissionId]);

  // Initialize values from formData when available
  useEffect(() => {
    if (!isRestoringRef.current) {
      // Prefer submissionData (updated after save) over formData when initializing
      const section1_1 =
        submissionData?.section1_1 ||
        formData?.section1_1 ||
        (formData as any)?.infraFinancing?.section1_1 ||
        (formData as any)?.section1_1;

      if (section1_1) {
        // Extract capitalAllocation - handle both string and number, with or without formatting
        if (
          section1_1.capitalAllocation !== undefined &&
          section1_1.capitalAllocation !== null
        ) {
          let value: string;
          if (typeof section1_1.capitalAllocation === "string") {
            value = section1_1.capitalAllocation
              .replace(/[₹,Crores\s]/g, "")
              .trim();
          } else {
            // If it's a number, convert to string without adding unnecessary decimals
            const num = Number(section1_1.capitalAllocation);
            value =
              num % 1 === 0
                ? num.toString()
                : num.toString().replace(/\.?0+$/, "");
          }
          setCapitalAllocation(value || "");
        } else {
          setCapitalAllocation("");
        }

        // Extract gsdpForFY - handle both string and number, with or without formatting
        if (
          section1_1.gsdpForFY !== undefined &&
          section1_1.gsdpForFY !== null
        ) {
          let value: string;
          if (typeof section1_1.gsdpForFY === "string") {
            value = section1_1.gsdpForFY.replace(/[₹,Crores\s]/g, "").trim();
          } else {
            // If it's a number, convert to string without adding unnecessary decimals
            const num = Number(section1_1.gsdpForFY);
            value =
              num % 1 === 0
                ? num.toString()
                : num.toString().replace(/\.?0+$/, "");
          }
          setGsdpForFY(value || "");
        } else {
          setGsdpForFY("");
        }
      } else {
        // If no section1_1 data, clear the state
        setCapitalAllocation("");
        setGsdpForFY("");
      }
    }
  }, [submissionData?.section1_1, formData?.section1_1, formData]);

  //🧑‍💻Initialize Section
  useEffect(() => {
    if (formData) {
      Object.keys(formData).forEach((sectionKey) => {
        if (sectionKey.startsWith("section")) {
          setFormDataForSection(formData[sectionKey], sectionKey);
        }
      });
    }
  }, [formData]);

  // Debug formData structure
  // Debug logging removed for performance

  if (formData && typeof formData === "object" && "section1_1" in formData) {
    const data = formData as { section1_1?: unknown };
    // Debug logging removed for performance
  }

  const handleOpenModal = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleCloseModal = () => {
    setActiveSection(null);
    // Reset MOSPI_APPROVER Sent Back flags when modal closes
    // (Accept no longer uses comment modal, so no need to reset Accept flags)
    setIsMospiApproverSentBack(false);
    setMospiSentBackSectionId(null);
    // Reset STATE_APPROVER Sent Back flags when modal closes
    setIsStateApproverSentBack(false);
    setStateApproverSentBackSectionId(null);
  };

  const handleOpenTimeline = (sectionId: string) => {
    setTimelineSection(sectionId);
  };

  const handleCloseTimeline = () => {
    setTimelineSection(null);
  };

  const handleSaveMessage = async (updatedSubmission: unknown) => {
    // MessageModal already saved the comment, so we just need to update state and check flags
    if (updatedSubmission) {
      setSubmissionData(updatedSubmission as unknown as FormData);
      console.log("✅ InfraFinancingReview - Form data updated");

      // Check flags BEFORE closing modal to determine if we need to show confirmation
      const shouldShowSentBackConfirmation =
        (isMospiApproverSentBack && mospiSentBackSectionId) ||
        (isStateApproverSentBack && stateApproverSentBackSectionId);

      // If this was opened from MOSPI_APPROVER or STATE_APPROVER "Sent Back" button, show confirmation dialog
      if (shouldShowSentBackConfirmation) {
        // Store section ID before resetting flags
        const sectionIdToUse =
          mospiSentBackSectionId || stateApproverSentBackSectionId;
        setPendingActionSectionId(sectionIdToUse);
        // Reset the flags
        setIsMospiApproverSentBack(false);
        setMospiSentBackSectionId(null);
        setIsStateApproverSentBack(false);
        setStateApproverSentBackSectionId(null);
        // Close the comment modal
        setActiveSection(null);
        // Show confirmation dialog
        setTimeout(() => {
          setShowSendBackDialog(true);
        }, 100);
        return;
      }

      // Note: Accept action no longer requires comment, so this check is removed
      // Accept button now directly shows confirmation dialog

      // For regular comments (not from Sent Back/Accept), just update timeline if needed
      if (activeSection && timelineSection === activeSection) {
        setTimelineSection(null);
        setTimeout(() => {
          setTimelineSection(activeSection);
        }, 100);
      }
    }
  };

  const getSectionTitle = (sectionId: string) => {
    const titles: Record<string, string> = {
      "1.1": "1.1 - % Capex to GSDP",
      "1.2": "1.2 - % Capex Utilisation",
      "1.3": "1.3 - % of Credit Rated ULBs",
      "1.4": "1.4 - % of ULBs Issuing Bonds",
      "1.5": "1.5 - Functional Financial Intermediary",
    };
    return titles[sectionId] || sectionId;
  };

  const getFormDataValue = (path: string) => {
    if (!formData || typeof formData !== "object") return undefined;
    const data = formData as Record<string, unknown>;
    return data[path];
  };

  // Handles for review edit, accept, send back
  // Add this handler after other handlers
  const onSaveSection = async (sectionId: string) => {
    console.log(
      `[InfraFinancingReview] onSaveSection called for section ${sectionId}`
    );
    // Check if user is NODAL_OFFICER
    const userRole = getUserRole();
    const isNodalOfficer = userRole === "NODAL_OFFICER";

    console.log(`[InfraFinancingReview] onSaveSection - User info:`, {
      userRole,
      isNodalOfficer,
      sectionId,
    });

    // Check if this is a resubmission of a sent-back indicator
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    // Check multiple sources for status: submission.section_status, submissionData, formData
    let currentStatus: string | undefined;

    // First check submission.section_status (most reliable source)
    if (
      submission?.section_status &&
      typeof submission.section_status === "object"
    ) {
      currentStatus = (submission.section_status as any)[sectionKey];
    }

    // Get sectionData for logging and fallback status check
    const sectionData =
      (submissionData && submissionData[sectionKey]) ||
      (formData && formData[sectionKey]);

    // Fallback to sectionData status
    if (!currentStatus) {
      currentStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any).status
          : sectionData.status
        : undefined;
    }

    const upperStatus = (currentStatus || "").toUpperCase();
    const isReverted = upperStatus === "REVERTED";

    console.log(`[InfraFinancingReview] onSaveSection - Status check:`, {
      sectionKey,
      sectionData,
      currentStatus,
      upperStatus,
      isReverted,
      fullSectionData: JSON.stringify(sectionData, null, 2),
      formDataKeys: formData ? Object.keys(formData) : [],
      submissionStatus: submission?.status, // Also log submission-level status for comparison
      sectionStatusType: sectionData
        ? Array.isArray(sectionData)
          ? "array"
          : typeof sectionData
        : "undefined",
      sectionStatusValue: sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)[0]?.status
          : sectionData.status
        : undefined,
    });

    // If NODAL_OFFICER, ALWAYS run validation FIRST before showing dialog
    // This ensures validation errors are shown on UI instead of alerts
    if (isNodalOfficer) {
      console.log(
        `[InfraFinancingReview] Running validation before showing dialog for NODAL_OFFICER`
      );

      // Run validation first (same logic as in performSave)
      // Ensure all sections have default values to prevent undefined errors
      const fullData: any = {
        section1_1: {
          year:
            submissionData?.section1_1?.year ||
            formData?.section1_1?.year ||
            "",
          capitalAllocation:
            shouldBeEditable("1.1") &&
            capitalAllocation !== undefined &&
            capitalAllocation !== null
              ? capitalAllocation
              : submissionData?.section1_1?.capitalAllocation ||
                formData?.section1_1?.capitalAllocation ||
                "",
          gsdpForFY:
            shouldBeEditable("1.1") &&
            gsdpForFY !== undefined &&
            gsdpForFY !== null
              ? gsdpForFY
              : submissionData?.section1_1?.gsdpForFY ||
                formData?.section1_1?.gsdpForFY ||
                "",
          stateCapexUtilisation:
            submissionData?.section1_1?.stateCapexUtilisation ||
            formData?.section1_1?.stateCapexUtilisation ||
            "",
          allocationToGSDP:
            submissionData?.section1_1?.allocationToGSDP ||
            formData?.section1_1?.allocationToGSDP ||
            "",
          capexToCapexActuals:
            submissionData?.section1_1?.capexToCapexActuals ||
            formData?.section1_1?.capexToCapexActuals ||
            "",
        },
        section1_2: {
          year:
            submissionData?.section1_2?.year ||
            formData?.section1_2?.year ||
            "2024-25",
          gsdpForFY:
            submissionData?.section1_2?.gsdpForFY ||
            formData?.section1_2?.gsdpForFY ||
            "",
          actualCapex:
            shouldBeEditable("1.2") &&
            actualCapex !== undefined &&
            actualCapex !== null
              ? actualCapex
              : submissionData?.section1_2?.actualCapex ||
                formData?.section1_2?.actualCapex ||
                "",
          budgetaryCapex:
            submissionData?.section1_2?.budgetaryCapex ||
            formData?.section1_2?.budgetaryCapex ||
            "",
          stateCapexUtilisation:
            shouldBeEditable("1.2") &&
            stateCapexUtilisation !== undefined &&
            stateCapexUtilisation !== null
              ? stateCapexUtilisation
              : submissionData?.section1_2?.stateCapexUtilisation ||
                formData?.section1_2?.stateCapexUtilisation ||
                "",
          capexActualsToGSDP:
            submissionData?.section1_2?.capexActualsToGSDP ||
            formData?.section1_2?.capexActualsToGSDP ||
            "",
        },
        section1_3: section13State || { totalULBs: 0, ulbList: [] },
        section1_4: section14State || { totalULBs: 0, bondList: [] },
        section1_5: {
          ffiArray: section15State?.ffiArray || [],
          hasIntermediary: section15State?.hasIntermediary || "",
          comment: section15State?.comment || "",
        },
      };

      const effectiveAssignedIndicators =
        assignedIndicators.length > 0
          ? assignedIndicators
          : hookAssignedIndicators.length > 0
          ? hookAssignedIndicators
          : undefined;

      const validationResult = validateInfraFinancing(fullData, {
        allowedIndicators: effectiveAssignedIndicators,
      });

      const hasErrors = Object.keys(validationResult.errors).length > 0;
      console.log("[InfraFinancingReview] Validation result:", {
        hasErrors,
        allErrors: validationResult.errors,
        sectionId,
      });

      // Filter validation errors to only include the section being saved
      const sectionErrors: Record<string, string> = {};
      const sectionPrefix = `section${sectionId.replace(".", "_")}`;
      Object.keys(validationResult.errors).forEach((errorKey) => {
        if (errorKey.startsWith(sectionPrefix)) {
          sectionErrors[errorKey] = validationResult.errors[errorKey];
        }
      });

      const errorCount = Object.keys(sectionErrors).length;
      console.log("[InfraFinancingReview] Filtered section errors:", {
        sectionPrefix,
        sectionErrors,
        errorCount,
      });

      // If validation fails, show errors on UI and return (don't show dialog)
      if (errorCount > 0) {
        console.log(
          "[InfraFinancingReview] Validation failed - NOT showing dialog"
        );
        // Mark all fields in this section as touched so ALL errors show
        const allSectionFields: string[] = [];

        // Add base fields based on section
        if (sectionId === "1.1") {
          allSectionFields.push(
            `${sectionPrefix}.year`,
            `${sectionPrefix}.capitalAllocation`,
            `${sectionPrefix}.gsdpForFY`
          );
        } else if (sectionId === "1.2") {
          allSectionFields.push(
            `${sectionPrefix}.year`,
            `${sectionPrefix}.actualCapex`,
            `${sectionPrefix}.stateCapexUtilisation`
          );
        } else if (sectionId === "1.3") {
          allSectionFields.push(
            `${sectionPrefix}.totalULBs`,
            `${sectionPrefix}.ulbList`
          );
          if (section13State.ulbList && Array.isArray(section13State.ulbList)) {
            section13State.ulbList.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.ulbList.${index}.cityName`,
                `${sectionPrefix}.ulbList.${index}.ulb`,
                `${sectionPrefix}.ulbList.${index}.ratingDate`,
                `${sectionPrefix}.ulbList.${index}.rating`
              );
            });
          }
        } else if (sectionId === "1.4") {
          allSectionFields.push(
            `${sectionPrefix}.totalULBs`,
            `${sectionPrefix}.bondList`
          );
          if (
            section14State.bondList &&
            Array.isArray(section14State.bondList)
          ) {
            section14State.bondList.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.bondList.${index}.cityName`,
                `${sectionPrefix}.bondList.${index}.bondType`,
                `${sectionPrefix}.bondList.${index}.issuingAuthority`,
                `${sectionPrefix}.bondList.${index}.value`,
                `${sectionPrefix}.bondList.${index}.tenorOfBond`
              );
            });
          }
        } else if (sectionId === "1.5") {
          allSectionFields.push(
            `${sectionPrefix}.hasIntermediary`,
            `${sectionPrefix}.comment`,
            `${sectionPrefix}.ffiArray`
          );
          if (
            section15State.ffiArray &&
            Array.isArray(section15State.ffiArray)
          ) {
            section15State.ffiArray.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.ffiArray.${index}.organisationName`,
                `${sectionPrefix}.ffiArray.${index}.organisationType`,
                `${sectionPrefix}.ffiArray.${index}.yearEstablished`,
                `${sectionPrefix}.ffiArray.${index}.totalFunding`,
                `${sectionPrefix}.ffiArray.${index}.website`
              );
            });
          }
        }

        // Mark all section fields as touched so ALL errors show
        allSectionFields.forEach((field) => {
          markFieldAsTouched(field);
        });
        // Also mark fields with errors from validation
        Object.keys(validationResult.errors).forEach((errorKey) => {
          if (errorKey.startsWith(sectionPrefix)) {
            markFieldAsTouched(errorKey);
          }
        });

        setShowValidationErrors(true);
        setIndicatorValidationErrors((prev) => ({ ...prev, ...sectionErrors }));
        // Set section-level validation message (same as STATE_APPROVER)
        setSectionValidationMessages((prev) => ({
          ...prev,
          [sectionId]: `Please fill all mandatory fields.`,
        }));
        console.warn(
          `[InfraFinancingReview] ❌ Validation failed for section ${sectionId}:`,
          sectionErrors
        );
        console.log(
          `[InfraFinancingReview] Validation errors count:`,
          Object.keys(sectionErrors).length
        );
        console.log(`[InfraFinancingReview] showValidationErrors set to: true`);
        console.log(
          `[InfraFinancingReview] indicatorValidationErrors updated with:`,
          sectionErrors
        );
        // Errors are displayed inline in the UI, don't show dialog
        return;
      }

      // Validation passed - show confirmation dialog only if status is REVERTED
      console.log(
        "[InfraFinancingReview] Validation passed - Checking if REVERTED:",
        { isReverted, currentStatus, upperStatus }
      );
      if (isReverted) {
        console.log(
          `[InfraFinancingReview] Validation passed - showing save confirmation dialog for REVERTED indicator`
        );
        setPendingSaveSectionId(sectionId);
        setShowSaveDialog(true);
        return;
      } else {
        // If not REVERTED, proceed with direct save
        console.log(
          `[InfraFinancingReview] ✅ Validation passed - proceeding with direct save (not REVERTED)`
        );
        await performSave(sectionId);
        return;
      }
    }

    console.log(
      `🚀🚀🚀 [InfraFinancingReview] ✅ Proceeding with direct save (not NODAL_OFFICER or validation not run)`
    );
    console.log("🚀🚀🚀 [InfraFinancingReview] User check:", {
      isNodalOfficer,
      userRole,
    });
    // For non-NODAL_OFFICER users, proceed with submit directly
    await performSave(sectionId);
  };

  // Actual save function that performs the save operation
  const performSave = async (sectionId: string) => {
    console.log(
      `[InfraFinancingReview] performSave called for section ${sectionId}`
    );
    try {
      // Map visual section id to payload section key
      const payloadSection = `section${sectionId.replace(".", "_")}`;
      console.log(
        `[InfraFinancingReview] performSave - Starting save process:`,
        {
          sectionId,
          payloadSection,
        }
      );

      // Prepare fields based on section
      let fields: Record<string, any>[] = [];

      switch (sectionId) {
        case "1.1":
          fields = [
            // {year: "2024-25"},
            { capitalAllocation: Number(capitalAllocation) || null },
            { gsdpForFY: Number(gsdpForFY) || null },
            // {allocationPercentage: calculateAllocationPercentage().replace('%', '') || null}
          ];
          break;

        case "1.2":
          // Only save data from local state if user is explicitly saving this section
          // Don't read from formData for unsaved values - only use local state values
          fields = [
            {
              year:
                submissionData?.section1_2?.year ||
                formData?.section1_2?.year ||
                "2024-25",
              actualCapex: actualCapex ? Number(actualCapex) : null,
              stateCapexUtilisation: stateCapexUtilisation
                ? Number(stateCapexUtilisation)
                : null,
            },
          ];
          // Only include fields that have actual values (not null/undefined/empty)
          fields[0] = Object.fromEntries(
            Object.entries(fields[0]).filter(
              ([_, value]) =>
                value !== null && value !== undefined && value !== ""
            )
          ) as any;
          break;

        case "1.3":
          // Use local state for ULB ratings data
          console.log("Section_1_3 state", section13State);
          fields = [
            {
              ulbList: (section13State.ulbList || []).map((item: any) => ({
                cityName: item.cityName,
                ulb: item.ulb,
                ratingDate: item.ratingDate,
                rating: item.rating,
              })),
              totalULBs: section13State.totalULBs || 0,
            },
          ];
          break;

        case "1.4":
          // Use local state for bond data
          console.log("Section_1_4 state", section14State);
          // fields = [{
          //   bondList: (section14State.bondList || []).map((item: any) => ({
          //     bondType: item.bondType,
          //     cityName: item.cityName,
          //     issuingAuthority: item.issuingAuthority,
          //     value: item.value,
          fields = [
            {
              bondList: (section14State.bondList || []).map((item: any) => ({
                bondType: item.bondType,
                cityName: item.cityName,
                issuingAuthority: item.issuingAuthority,
                value: item.value,
                tenorOfBond: item.tenorOfBond || "",
              })),
              totalULBs: section14State.totalULBs,
            },
          ];
          break;

        case "1.5":
          // Use local state for financial intermediary data
          console.log("Section_1_5 state", section15State);
          fields = [
            {
              hasIntermediary: section15State?.hasIntermediary || null,
              comment: section15State?.comment || null,
              ffiArray: (section15State?.ffiArray || []).map((item: any) => ({
                organisationName: item.organisationName,
                organisationType: item.organisationType,
                yearEstablished: item.yearEstablished,
                totalFunding: item.totalFunding,
                website: item.website,
              })),
            },
          ];
          break;

        default:
          console.warn(`Unhandled section: ${sectionId}`);
          return;
      }

      console.log("🔄 Saving section:", sectionId);
      console.log("🔄 payload section:", payloadSection);
      console.log("🔄 fields being saved:", JSON.stringify(fields, null, 2));
      console.log(
        "🔄 Only saving section:",
        payloadSection,
        "- not including other sections"
      );

      // Check if user is NODAL_OFFICER or STATE_APPROVER to preserve status
      const userRole = getUserRole();
      const isNodalOfficer = userRole === "NODAL_OFFICER";
      const isStateApprover = userRole === "STATE_APPROVER";

      // Get current status from formData
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData = formData && formData[sectionKey];
      const currentStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any).status
          : sectionData.status
        : undefined;
      const upperStatus = (currentStatus || "").toUpperCase();

      // If NODAL_OFFICER, check current status and set RESUBMITTED only if status was REVERTED
      if (isNodalOfficer && fields.length > 0) {
        // Only set RESUBMITTED if the indicator was previously REVERTED (sent back)
        if (upperStatus === "REVERTED") {
          // Add status to the first field object (or create a new one if needed)
          fields[0] = {
            ...fields[0],
            status: "RESUBMITTED",
          };
        }
      }

      // If STATE_APPROVER, preserve RESUBMITTED status when saving edits
      if (
        isStateApprover &&
        fields.length > 0 &&
        upperStatus === "RESUBMITTED"
      ) {
        // Preserve RESUBMITTED status when STATE_APPROVER saves edits
        fields[0] = {
          ...fields[0],
          status: "RESUBMITTED",
        };
      }

      // --- VALIDATION ---
      // For individual section saves, only validate the section being saved
      // Don't block saves due to other incomplete sections
      // Ensure all sections have default values to prevent undefined errors
      const fullData: any = {
        section1_1: {
          year:
            submissionData?.section1_1?.year ||
            formData?.section1_1?.year ||
            "",
          // Use local state values when in edit mode, otherwise use submissionData (prefer over formData)
          capitalAllocation:
            shouldBeEditable("1.1") &&
            capitalAllocation !== undefined &&
            capitalAllocation !== null
              ? capitalAllocation
              : submissionData?.section1_1?.capitalAllocation ||
                formData?.section1_1?.capitalAllocation ||
                "",
          gsdpForFY:
            shouldBeEditable("1.1") &&
            gsdpForFY !== undefined &&
            gsdpForFY !== null
              ? gsdpForFY
              : submissionData?.section1_1?.gsdpForFY ||
                formData?.section1_1?.gsdpForFY ||
                "",
          stateCapexUtilisation:
            submissionData?.section1_1?.stateCapexUtilisation ||
            formData?.section1_1?.stateCapexUtilisation ||
            "",
          allocationToGSDP:
            submissionData?.section1_1?.allocationToGSDP ||
            formData?.section1_1?.allocationToGSDP ||
            "",
          capexToCapexActuals:
            submissionData?.section1_1?.capexToCapexActuals ||
            formData?.section1_1?.capexToCapexActuals ||
            "",
        },
        section1_2: {
          year:
            submissionData?.section1_2?.year ||
            formData?.section1_2?.year ||
            "2024-25",
          gsdpForFY:
            submissionData?.section1_2?.gsdpForFY ||
            formData?.section1_2?.gsdpForFY ||
            "",
          // Use local state values when in edit mode, otherwise use submissionData (prefer over formData)
          actualCapex:
            shouldBeEditable("1.2") &&
            actualCapex !== undefined &&
            actualCapex !== null
              ? actualCapex
              : submissionData?.section1_2?.actualCapex ||
                formData?.section1_2?.actualCapex ||
                "",
          budgetaryCapex:
            submissionData?.section1_2?.budgetaryCapex ||
            formData?.section1_2?.budgetaryCapex ||
            "",
          stateCapexUtilisation:
            shouldBeEditable("1.2") &&
            stateCapexUtilisation !== undefined &&
            stateCapexUtilisation !== null
              ? stateCapexUtilisation
              : submissionData?.section1_2?.stateCapexUtilisation ||
                formData?.section1_2?.stateCapexUtilisation ||
                "",
          capexActualsToGSDP:
            submissionData?.section1_2?.capexActualsToGSDP ||
            formData?.section1_2?.capexActualsToGSDP ||
            "",
        },
        section1_3: section13State || { totalULBs: 0, ulbList: [] },
        section1_4: section14State || { totalULBs: 0, bondList: [] },
        section1_5: {
          ffiArray: section15State?.ffiArray || [],
          hasIntermediary: section15State?.hasIntermediary || "",
          comment: section15State?.comment || "",
        },
      };

      const effectiveAssignedIndicators =
        assignedIndicators.length > 0
          ? assignedIndicators
          : hookAssignedIndicators.length > 0
          ? hookAssignedIndicators
          : undefined;

      const validationResult = validateInfraFinancing(fullData, {
        allowedIndicators: effectiveAssignedIndicators,
      });

      // Filter validation errors to only include the section being saved
      const sectionErrors: Record<string, string> = {};
      const sectionPrefix = `section${sectionId.replace(".", "_")}`;
      Object.keys(validationResult.errors).forEach((errorKey) => {
        if (errorKey.startsWith(sectionPrefix)) {
          sectionErrors[errorKey] = validationResult.errors[errorKey];
        }
      });

      // Only block save if there are errors in the section being saved
      if (Object.keys(sectionErrors).length > 0) {
        // Mark all fields in this section as touched so ALL errors show
        const allSectionFields: string[] = [];

        // Add base fields based on section
        if (sectionId === "1.1") {
          allSectionFields.push(
            `${sectionPrefix}.year`,
            `${sectionPrefix}.capitalAllocation`,
            `${sectionPrefix}.gsdpForFY`
          );
        } else if (sectionId === "1.2") {
          allSectionFields.push(
            `${sectionPrefix}.year`,
            `${sectionPrefix}.actualCapex`,
            `${sectionPrefix}.stateCapexUtilisation`
          );
        } else if (sectionId === "1.3") {
          allSectionFields.push(
            `${sectionPrefix}.totalULBs`,
            `${sectionPrefix}.ulbList`
          );
          if (section13State.ulbList && Array.isArray(section13State.ulbList)) {
            section13State.ulbList.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.ulbList.${index}.cityName`,
                `${sectionPrefix}.ulbList.${index}.bondAmount`
              );
            });
          }
        } else if (sectionId === "1.4") {
          allSectionFields.push(
            `${sectionPrefix}.totalULBs`,
            `${sectionPrefix}.bondList`
          );
          if (
            section14State.bondList &&
            Array.isArray(section14State.bondList)
          ) {
            section14State.bondList.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.bondList.${index}.cityName`,
                `${sectionPrefix}.bondList.${index}.bondType`,
                `${sectionPrefix}.bondList.${index}.issuingAuthority`,
                `${sectionPrefix}.bondList.${index}.value`,
                `${sectionPrefix}.bondList.${index}.tenorOfBond`
              );
            });
          }
        } else if (sectionId === "1.5") {
          allSectionFields.push(
            `${sectionPrefix}.hasIntermediary`,
            `${sectionPrefix}.comment`,
            `${sectionPrefix}.ffiArray`
          );
          if (
            section15State.ffiArray &&
            Array.isArray(section15State.ffiArray)
          ) {
            section15State.ffiArray.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.ffiArray.${index}.intermediaryName`,
                `${sectionPrefix}.ffiArray.${index}.sector`,
                `${sectionPrefix}.ffiArray.${index}.websiteLink`
              );
            });
          }
        }

        // Mark all section fields as touched so ALL errors show
        allSectionFields.forEach((field) => {
          markFieldAsTouched(field);
        });
        // Also mark fields with errors from validation
        Object.keys(validationResult.errors).forEach((errorKey) => {
          if (errorKey.startsWith(sectionPrefix)) {
            markFieldAsTouched(errorKey);
          }
        });

        setShowValidationErrors(true);
        setIndicatorValidationErrors((prev) => ({ ...prev, ...sectionErrors }));
        // Set section-level validation message
        const errorCount = Object.keys(sectionErrors).length;
        setSectionValidationMessages((prev) => ({
          ...prev,
          [sectionId]: `Please fill all mandatory fields.`,
        }));
        console.warn("Validation failed for section", sectionId, sectionErrors);
        // Throw validation error so handleConfirmSave can catch it and close dialog
        const validationError = new Error("VALIDATION_FAILED");
        (validationError as any).isValidationError = true;
        throw validationError;
      } else {
        // Clear errors for this section only
        setIndicatorValidationErrors((prev) => {
          const filtered = { ...prev };
          Object.keys(filtered).forEach((key) => {
            if (key.startsWith(sectionPrefix)) {
              delete filtered[key];
            }
          });
          return filtered;
        });
        // Clear section-level validation message on successful validation
        setSectionValidationMessages((prev) => {
          const updated = { ...prev };
          delete updated[sectionId];
          return updated;
        });
      }

      // Ensure we're only sending data for the specific section being saved
      // Create a clean payload with only the section we're saving
      const savePayload = {
        submissionId,
        category: "infraFinancing",
        section: payloadSection,
        fields, // Only fields for this specific section
      };

      console.log(
        "🔄 Final save payload:",
        JSON.stringify(savePayload, null, 2)
      );
      console.log("🔄 Ensuring only section", payloadSection, "is being saved");

      console.log(
        `[InfraFinancingReview] performSave - Calling handleSaveSection API...`
      );
      const saveResult = await handleSaveSection(savePayload);
      console.log(
        `[InfraFinancingReview] ✅ performSave - API call successful:`,
        saveResult
      );

      // Update local state and formData immediately after successful save for section 1.1
      if (sectionId === "1.1") {
        // Update local state with saved values (these are the values we just saved)
        const savedCapitalAllocation = capitalAllocation
          ? String(capitalAllocation)
          : "";
        const savedGsdpForFY = gsdpForFY ? String(gsdpForFY) : "";

        // Calculate percentage for display
        const capitalAllocationNum = parseFloat(savedCapitalAllocation) || 0;
        const gsdpForFYNum = parseFloat(savedGsdpForFY) || 0;
        const calculatedPercentage =
          gsdpForFYNum > 0 ? (capitalAllocationNum / gsdpForFYNum) * 100 : 0;

        // Update formData/submissionData to persist the saved values
        setSubmissionData((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (!updated.section1_1) {
            updated.section1_1 = {};
          }
          updated.section1_1 = {
            ...updated.section1_1,
            // Store as string to preserve exact format user entered (no automatic decimals)
            capitalAllocation: savedCapitalAllocation || null,
            gsdpForFY: savedGsdpForFY || null,
            allocationToGSDP:
              calculatedPercentage > 0
                ? calculatedPercentage.toFixed(1) + "%"
                : null,
            year:
              submissionData?.section1_1?.year ||
              formData?.section1_1?.year ||
              "2024-25",
          };
          return updated;
        });

        // Update local state directly to ensure UI reflects changes immediately
        // This ensures values are visible without page refresh
        setCapitalAllocation(savedCapitalAllocation);
        setGsdpForFY(savedGsdpForFY);

        // Also update the formData store to ensure consistency (store as string to preserve format)
        setFormDataForSection(
          {
            capitalAllocation: savedCapitalAllocation || null,
            gsdpForFY: savedGsdpForFY || null,
            allocationToGSDP:
              calculatedPercentage > 0
                ? calculatedPercentage.toFixed(1) + "%"
                : null,
            year:
              submissionData?.section1_1?.year ||
              formData?.section1_1?.year ||
              "2024-25",
          },
          "section1_1"
        );

        console.log(
          `[InfraFinancingReview] ✅ Updated local state and formData for section 1.1:`,
          { savedCapitalAllocation, savedGsdpForFY, calculatedPercentage }
        );
      }

      // Update local state and formData immediately after successful save for section 1.2
      if (sectionId === "1.2") {
        // Update local state with saved values (these are the values we just saved)
        const savedActualCapex = actualCapex ? String(actualCapex) : "";
        const savedStateCapexUtilisation = stateCapexUtilisation
          ? String(stateCapexUtilisation)
          : "";

        // Calculate percentage for display
        const actualCapexNum = parseFloat(savedActualCapex) || 0;
        const stateCapexUtilisationNum =
          parseFloat(savedStateCapexUtilisation) || 0;
        const calculatedPercentage =
          stateCapexUtilisationNum > 0
            ? (actualCapexNum / stateCapexUtilisationNum) * 100
            : 0;

        // Update formData/submissionData to persist the saved values
        setSubmissionData((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (!updated.section1_2) {
            updated.section1_2 = {};
          }
          updated.section1_2 = {
            ...updated.section1_2,
            // Store as string to preserve exact format user entered (no automatic decimals)
            actualCapex: savedActualCapex || null,
            stateCapexUtilisation: savedStateCapexUtilisation || null,
            capexActualsToGSDP:
              calculatedPercentage > 0
                ? calculatedPercentage.toFixed(1) + "%"
                : null,
            year:
              submissionData?.section1_2?.year ||
              formData?.section1_2?.year ||
              "2024-25",
          };
          return updated;
        });

        // Update local state directly to ensure UI reflects changes immediately
        // This ensures values are visible without page refresh
        setActualCapex(savedActualCapex);
        setStateCapexUtilisation(savedStateCapexUtilisation);

        // Also update the formData store to ensure consistency (store as string to preserve format)
        setFormDataForSection(
          {
            actualCapex: savedActualCapex || null,
            stateCapexUtilisation: savedStateCapexUtilisation || null,
            capexActualsToGSDP:
              calculatedPercentage > 0
                ? calculatedPercentage.toFixed(1) + "%"
                : null,
            year:
              submissionData?.section1_2?.year ||
              formData?.section1_2?.year ||
              "2024-25",
          },
          "section1_2"
        );

        console.log(
          `[InfraFinancingReview] ✅ Updated local state and formData for section 1.2:`,
          { savedActualCapex, savedStateCapexUtilisation, calculatedPercentage }
        );
      }

      // Update local state and formData immediately after successful save for section 1.3
      if (sectionId === "1.3") {
        // Update formData/submissionData to persist the saved values
        setSubmissionData((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (!updated.section1_3) {
            updated.section1_3 = {};
          }
          updated.section1_3 = {
            ...updated.section1_3,
            ulbList: section13State.ulbList || [],
            totalULBs: section13State.totalULBs || 0,
          };
          return updated;
        });

        // Also update the formData store to ensure consistency
        setFormDataForSection(
          {
            ulbList: section13State.ulbList || [],
            totalULBs: section13State.totalULBs || 0,
          },
          "section1_3"
        );

        // ✅ CRITICAL: Update section13State directly to ensure UI reflects changes immediately
        // This is similar to how sections 1.1 and 1.2 update their local state variables
        setSection13State({
          ulbList: section13State.ulbList || [],
          totalULBs: section13State.totalULBs || 0,
        });

        console.log(
          `[InfraFinancingReview] ✅ Updated local state and formData for section 1.3:`,
          {
            ulbList: section13State.ulbList,
            totalULBs: section13State.totalULBs,
          }
        );
      }

      // Update local state and formData immediately after successful save for section 1.4
      if (sectionId === "1.4") {
        // Update formData/submissionData to persist the saved values
        setSubmissionData((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (!updated.section1_4) {
            updated.section1_4 = {};
          }
          updated.section1_4 = {
            ...updated.section1_4,
            bondList: section14State.bondList || [],
            totalULBs: section14State.totalULBs || 0,
          };
          return updated;
        });

        // Also update the formData store to ensure consistency
        setFormDataForSection(
          {
            bondList: section14State.bondList || [],
            totalULBs: section14State.totalULBs || 0,
          },
          "section1_4"
        );

        // ✅ CRITICAL: Update section14State directly to ensure UI reflects changes immediately
        // This is similar to how sections 1.1, 1.2, and 1.3 update their local state variables
        setSection14State({
          bondList: section14State.bondList || [],
          totalULBs: section14State.totalULBs || 0,
        });

        console.log(
          `[InfraFinancingReview] ✅ Updated local state and formData for section 1.4:`,
          {
            bondList: section14State.bondList,
            totalULBs: section14State.totalULBs,
          }
        );
      }

      // Update local state and formData immediately after successful save for section 1.5
      if (sectionId === "1.5") {
        // Update formData/submissionData to persist the saved values
        setSubmissionData((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (!updated.section1_5) {
            updated.section1_5 = {};
          }
          updated.section1_5 = {
            ...updated.section1_5,
            hasIntermediary: section15State?.hasIntermediary || null,
            comment: section15State?.comment || null,
            ffiArray: section15State?.ffiArray || [],
          };
          return updated;
        });

        // Also update the formData store to ensure consistency
        setFormDataForSection(
          {
            hasIntermediary: section15State?.hasIntermediary || null,
            comment: section15State?.comment || null,
            ffiArray: section15State?.ffiArray || [],
          },
          "section1_5"
        );

        console.log(
          `[InfraFinancingReview] ✅ Updated local state and formData for section 1.5:`,
          {
            hasIntermediary: section15State?.hasIntermediary,
            ffiArray: section15State?.ffiArray,
          }
        );
      }

      // If NODAL_OFFICER, update local state to reflect RESUBMITTED status only if it was REVERTED
      if (isNodalOfficer) {
        // Only update to RESUBMITTED if the indicator was previously REVERTED (sent back)
        if (upperStatus === "REVERTED") {
          // Update formData prop if it exists
          if (formData && (formData as any)[sectionKey]) {
            (formData as any)[sectionKey] = {
              ...(formData as any)[sectionKey],
              status: "RESUBMITTED",
            };
            setSubmissionData({ ...formData });
          }
          // Also update submissionData to trigger re-render
          setSubmissionData((prev: any) => {
            if (!prev) return prev;
            const updated = { ...prev };
            if (updated[sectionKey]) {
              updated[sectionKey] = {
                ...updated[sectionKey],
                status: "RESUBMITTED",
              };
            }
            return updated;
          });
        }
      }

      // If STATE_APPROVER, preserve RESUBMITTED status in local state after save
      if (isStateApprover && upperStatus === "RESUBMITTED") {
        // Preserve RESUBMITTED status in submissionData
        setSubmissionData((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (updated[sectionKey]) {
            updated[sectionKey] = {
              ...updated[sectionKey],
              status: "RESUBMITTED",
            };
          }
          return updated;
        });
      }

      // Disable editing after successful save
      setEditable(sectionId, false);
      // Clear the snapshot since save was successful
      setOriginalStateSnapshot(null);

      console.log(
        `[InfraFinancingReview] ✅ performSave - Save completed, editing disabled for section ${sectionId}`
      );
      // Optional: Show success message
      // toast.success(`Section ${sectionId} saved successfully`);
    } catch (error) {
      console.error(
        `[InfraFinancingReview] ❌ performSave - Error saving section ${sectionId}:`,
        error
      );
      // Keep section editable if save fails
      // Optional: Show error message
      // toast.error(`Failed to save section ${sectionId}`);
      throw error; // Re-throw so handleConfirmSave can catch it
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmSave = async () => {
    console.log(`[InfraFinancingReview] handleConfirmSave called:`, {
      pendingSaveSectionId,
    });
    if (pendingSaveSectionId) {
      console.log(
        `[InfraFinancingReview] ✅ Confirmed - calling performSave for section ${pendingSaveSectionId}`
      );
      try {
        await performSave(pendingSaveSectionId);
        console.log(`[InfraFinancingReview] ✅ Save completed successfully`);
        setShowSaveDialog(false);
        setPendingSaveSectionId(null);
      } catch (error: any) {
        console.error(`[InfraFinancingReview] ❌ Save failed:`, error);
        // If validation failed, close dialog so error messages are visible
        if (error?.isValidationError) {
          setShowSaveDialog(false);
          setPendingSaveSectionId(null);
          // Error messages are already displayed on UI, no notification needed
        } else {
          // For other errors, don't close dialog so user can try again
        }
      }
    } else {
      console.warn(
        `[InfraFinancingReview] ⚠️ handleConfirmSave called but no pendingSaveSectionId`
      );
    }
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPendingSaveSectionId(null);
  };

  // Actual function that performs the status update
  const performIndicatorStatus = async (sectionId: string, status: boolean) => {
    const userRole = getUserRole();
    const isMospiApprover = userRole === "MOSPI_APPROVER";
    const isStateApprover = userRole === "STATE_APPROVER";

    // For MOSPI_APPROVER, use mospi_status field instead of status
    const payload: any = {
      submissionId,
      category: "infraFinancing",
      section: `section${sectionId.replace(".", "_")}`,
      status: status,
    };

    // If MOSPI_APPROVER, add mospi_status field
    if (isMospiApprover) {
      payload.mospi_status = status ? "ACCEPTED" : "REVERTED";
    }

    // If STATE_APPROVER is sending back (status = false), extract nodalOfficerId from section data
    if (isStateApprover && !status) {
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData = formData && formData[sectionKey];

      const nodalOfficerId = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.nodalOfficerId
          : sectionData?.nodalOfficerId
        : undefined;

      if (nodalOfficerId) {
        payload.nodalOfficerId = nodalOfficerId;
        console.log(
          `📤 [InfraFinancingReview] Sending back indicator ${sectionId} to NODAL_OFFICER: ${nodalOfficerId}`
        );
      }
    }

    try {
      await apiService.indicatorStatus(payload);
      // Update local formData to trigger re-render of action buttons
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const statusField = isMospiApprover ? "mospi_status" : "status";
      const statusValue = status ? "ACCEPTED" : "REVERTED";

      // Defensive: clone formData if possible
      if (formData && formData[sectionKey]) {
        formData[sectionKey] = {
          ...formData[sectionKey],
          [statusField]: statusValue,
        };
        setSubmissionData({ ...formData });
      }
      console.log(
        `✅ Indicator ${
          isMospiApprover ? "mospi_" : ""
        }status updated successfully`
      );

      // Trigger refresh of acceptance checks if indicator 1.1 or 1.3 was accepted
      // Add a small delay to ensure server has processed the acceptance
      if (status && statusValue === "ACCEPTED") {
        setTimeout(() => {
          if (sectionId === "1.1") {
            console.log(
              "🔄 [Auto-refresh] Triggering refresh of indicator 1.1 acceptance check"
            );
            setRefreshIndicator1_1Check((prev) => prev + 1);
          } else if (sectionId === "1.3") {
            console.log(
              "🔄 [Auto-refresh] Triggering refresh of indicator 1.3 acceptance check"
            );
            setRefreshIndicator1_3Check((prev) => prev + 1);
          }
        }, 500); // 500ms delay to ensure server has processed the acceptance
      }

      // Dispatch custom event to notify other components (e.g., UnifiedReviewPage) that indicator status was updated
      if (isMospiApprover) {
        window.dispatchEvent(
          new CustomEvent("niri-indicator-status-updated", {
            detail: { sectionId, status: statusValue },
          })
        );
      }
    } catch (error) {
      console.error(
        `❌ Failed to update indicator ${
          isMospiApprover ? "mospi_" : ""
        }status:`,
        error
      );
    }
  };

  // Wrapper function that checks for STATE_APPROVER and shows dialog if needed
  const onIndicatorStatus = async (sectionId: string, status: boolean) => {
    const userRole = getUserRole();
    const isStateApprover = userRole === "STATE_APPROVER";

    // Check if submission is from STATE_APPROVER
    const isSubmissionFromStateApprover =
      submission?.user?.role === "STATE_APPROVER" ||
      submission?.currentOwnerRole === "STATE_APPROVER";

    // If STATE_APPROVER is trying to send back their own indicator, prevent it
    if (isStateApprover && !status && isSubmissionFromStateApprover) {
      console.log(
        `[InfraFinancingReview] STATE_APPROVER cannot send back their own indicator ${sectionId}`
      );
      return; // Don't show dialog, just return
    }

    // If STATE_APPROVER is accepting their own indicator, show confirmation dialog
    if (isStateApprover && status && isSubmissionFromStateApprover) {
      console.log(
        `[InfraFinancingReview] STATE_APPROVER accepting their own indicator ${sectionId} - showing confirmation dialog`
      );
      setPendingActionSectionId(sectionId);
      setShowAcceptDialog(true);
      return;
    }

    if (isStateApprover && !isSubmissionFromStateApprover) {
      // Show appropriate dialog based on action (only for NODAL_OFFICER submissions)
      setPendingActionSectionId(sectionId);
      if (status) {
        // Accept action
        setShowAcceptDialog(true);
      } else {
        // Send Back action (only for NODAL_OFFICER submissions)
        setShowSendBackDialog(true);
      }
      return;
    }

    // For non-STATE_APPROVER users, proceed directly
    await performIndicatorStatus(sectionId, status);
  };

  // Handle Send Back confirmation
  const handleConfirmSendBack = async () => {
    if (pendingActionSectionId) {
      // Check if user is MOSPI_APPROVER
      const getUserRole = () => {
        try {
          const authUser = localStorage.getItem("niri_app:auth_user");
          if (authUser) {
            const user = JSON.parse(authUser);
            return user.value?.role;
          }
        } catch (error) {
          console.error("Error reading user role:", error);
        }
        return null;
      };
      const userRole = getUserRole();
      const isMospiApprover = userRole === "MOSPI_APPROVER";

      // For MOSPI_APPROVER, update mospi_status to REVERTED
      // For other roles (STATE_APPROVER), use regular status update
      // Both use performIndicatorStatus, which handles the role check internally
      await performIndicatorStatus(pendingActionSectionId, false);

      setShowSendBackDialog(false);
      setPendingActionSectionId(null);
      // Ensure comment modal is closed
      setActiveSection(null);
      // Reset any flags
      setIsStateApproverSentBack(false);
      setStateApproverSentBackSectionId(null);
    }
  };

  const handleCancelSendBack = () => {
    setShowSendBackDialog(false);
    setPendingActionSectionId(null);
  };

  // Handle Accept confirmation
  const handleConfirmAccept = async () => {
    if (pendingActionSectionId) {
      // Check if user is MOSPI_APPROVER
      const getUserRole = () => {
        try {
          const authUser = localStorage.getItem("niri_app:auth_user");
          if (authUser) {
            const user = JSON.parse(authUser);
            return user.value?.role;
          }
        } catch (error) {
          console.error("Error reading user role:", error);
        }
        return null;
      };
      const userRole = getUserRole();
      const isMospiApprover = userRole === "MOSPI_APPROVER";
      const isStateApprover = userRole === "STATE_APPROVER";

      // If STATE_APPROVER is accepting, check if there's a comment that needs to be saved first
      // This ensures comments are preserved when accepting indicators with "No" selection
      if (isStateApprover) {
        const sectionKey = `section${pendingActionSectionId.replace(".", "_")}`;
        // For section 1.5, check section15State, otherwise check submissionData
        let sectionData;
        if (pendingActionSectionId === "1.5") {
          sectionData = section15State;
        } else {
          sectionData = submissionData?.[sectionKey];
        }
        const hasComment =
          sectionData?.comment && sectionData.comment.trim() !== "";

        // If there's a comment, save it first before accepting
        if (hasComment) {
          console.log(
            `💬 [Accept] Saving comment for indicator ${pendingActionSectionId} before accepting`
          );
          try {
            await performSave(pendingActionSectionId);
            console.log(
              `✅ [Accept] Comment saved successfully for indicator ${pendingActionSectionId}`
            );
          } catch (error) {
            console.error(
              `❌ [Accept] Failed to save comment for indicator ${pendingActionSectionId}:`,
              error
            );
            // Continue with acceptance even if comment save fails
          }
        }
      }

      // For MOSPI_APPROVER, update mospi_status to ACCEPTED
      // For other roles (STATE_APPROVER), use regular status update
      // Both use performIndicatorStatus, which handles the role check internally
      await performIndicatorStatus(pendingActionSectionId, true);

      setShowAcceptDialog(false);
      setPendingActionSectionId(null);
      // Comment modal is already closed before showing confirmation dialog
    }
  };

  const handleCancelAccept = () => {
    setShowAcceptDialog(false);
    setPendingActionSectionId(null);
  };

  // Helper function to render MOSPI_REVIEWER comments for MOSPI_APPROVER
  const renderMOSPIReviewerComments = (sectionId: string) => {
    const getUserRole = () => {
      try {
        const authUser = localStorage.getItem("niri_app:auth_user");
        if (authUser) {
          const user = JSON.parse(authUser);
          const role = user.value?.role;
          // Normalize role string (trim whitespace, convert to uppercase for comparison)
          return role ? String(role).trim() : null;
        }
      } catch (error) {
        console.error("Error reading user role:", error);
      }
      return null;
    };
    const userRole = getUserRole();
    const isMospiApprover = userRole === "MOSPI_APPROVER";
    if (!isMospiApprover) return null;

    const comments = getComments(sectionId);
    if (!comments || comments.length === 0) return null;

    const mospiReviewerComments = comments.filter((comment: any) => {
      const commentRole = comment.role || comment.userRole || "";
      return commentRole.toUpperCase() === "MOSPI_REVIEWER";
    });

    if (mospiReviewerComments.length === 0) return null;

    // Sort by timestamp (newest first) and get the last (most recent) comment
    const sortedComments = mospiReviewerComments.sort((a: any, b: any) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA; // Descending order (newest first)
    });
    const lastComment = sortedComments[0]; // Get the most recent comment

    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
        <p className="text-sm font-semibold text-green-900 mb-2">
          MoSPI Reviewer Comment:
        </p>
        <div className="mb-2 last:mb-0">
          <p className="text-sm text-green-800">
            {(lastComment as any).text ||
              (lastComment as any).message ||
              (lastComment as any).comment}
          </p>
          {lastComment.timestamp && (
            <p className="text-xs text-green-600 mt-1">
              {new Date(lastComment.timestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Helper to render validation error message for a section
  const renderSectionValidationMessage = (sectionId: string) => {
    if (!sectionValidationMessages[sectionId] || !shouldBeEditable(sectionId)) {
      return null;
    }
    return (
      <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <p className="text-sm text-destructive font-medium">
          {sectionValidationMessages[sectionId]}
        </p>
      </div>
    );
  };

  // 🧑‍💻🧑‍💻Edited by Harsh
  const renderActionButtons = (sectionId: string) => {
    // Don't show action buttons in preview mode
    if (isPreview) {
      return null;
    }

    const comments = getComments(sectionId);
    const commentCount = comments ? comments.length : 0;

    // Check if user is NODAL_OFFICER from localStorage - MUST CHECK ROLE FIRST
    const getUserRole = () => {
      try {
        const authUser = localStorage.getItem("niri_app:auth_user");
        if (authUser) {
          const user = JSON.parse(authUser);
          return user.value?.role;
        }
      } catch (error) {
        console.error("Error reading user role:", error);
      }
      return null;
    };
    const userRole = getUserRole();
    const isNodalOfficer = userRole === "NODAL_OFFICER";
    const isStateApprover = userRole === "STATE_APPROVER";
    const isMospiReviewer = userRole === "MOSPI_REVIEWER";
    const isMospiApprover = userRole === "MOSPI_APPROVER";

    // Hide all action buttons if STATE_APPROVER is viewing a submission that's with MoSPI Reviewer or MoSPI Approver
    const submissionStatus = submission?.status;
    if (
      isStateApprover &&
      (submissionStatus === "SUBMITTED_TO_MOSPI_REVIEWER" ||
        submissionStatus === "SUBMITTED_TO_MOSPI_APPROVER")
    ) {
      return null;
    }

    // Hide all action buttons (Edit, Send Back, Accept) if submission is APPROVED
    // Only show Timeline button for viewing comments
    if (submissionStatus === "APPROVED") {
      return (
        <div className="flex gap-2">
          {commentCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-3 h-3" />
              Timeline ({commentCount})
            </Button>
          )}
        </div>
      );
    }

    // For MOSPI_REVIEWER, show Add Comment and Timeline buttons
    if (isMospiReviewer) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleOpenModal(sectionId)}
          >
            <MessageSquare className="w-4 h-4" />
            Add Comment
          </Button>
          {commentCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-3 h-3" />
              Timeline ({commentCount})
            </Button>
          )}
        </div>
      );
    }

    // For MOSPI_APPROVER, show Sent Back and Accepted buttons (using mospi_status only)
    if (isMospiApprover) {
      // Check mospi_status instead of status for MOSPI_APPROVER
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData = formData && formData[sectionKey];
      const mospiStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.mospi_status
          : sectionData?.mospi_status
        : undefined;

      if (mospiStatus === "ACCEPTED") {
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-green-100 text-green-700 cursor-default"
              disabled
            >
              <CheckCircle className="w-4 h-4" />
              Accepted
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-3 h-3" />
              Timeline ({commentCount})
            </Button>
          </div>
        );
      }

      if (mospiStatus === "REVERTED") {
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-red-100 text-red-700 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Sent Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-3 h-3" />
              Timeline ({commentCount})
            </Button>
          </div>
        );
      }

      // Show Sent Back and Accepted buttons for MOSPI_APPROVER (when mospi_status is null/undefined)
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              // For MOSPI_APPROVER, send back action:
              // 1. Set flag to track this is a "Sent Back" action
              // 2. Open comment modal first
              setIsMospiApproverSentBack(true);
              setMospiSentBackSectionId(sectionId);
              handleOpenModal(sectionId);
            }}
            disabled={shouldBeEditable(sectionId)}
          >
            <RotateCcw className="w-4 h-4" />
            Sent Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              // For MOSPI_APPROVER, accept action:
              // Show confirmation dialog directly (no comment required)
              setPendingActionSectionId(sectionId);
              setShowAcceptDialog(true);
            }}
            disabled={shouldBeEditable(sectionId)}
          >
            <CheckCircle className="w-4 h-4" />
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleOpenTimeline(sectionId)}
          >
            <Clock className="w-4 h-4" />
            Timeline ({commentCount})
          </Button>
        </div>
      );
    }

    // For all other roles, check status field as before
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    // Check both formData prop and store data to ensure we get the correct status after refresh
    const storeSectionData = getSectionData(sectionKey) as any;
    const sectionData = (formData && formData[sectionKey]) || storeSectionData;
    const sectionStatus = sectionData
      ? Array.isArray(sectionData)
        ? (sectionData as any).status
        : sectionData.status
      : undefined;

    // Debug logging
    console.log(`[InfraFinancingReview] Section ${sectionId}:`, {
      sectionKey,
      sectionStatus,
      isStateApprover,
      hasFormData: !!(formData && formData[sectionKey]),
      hasStoreData: !!storeSectionData,
      formDataData: formData && formData[sectionKey],
      storeData: storeSectionData,
    });

    // For STATE_APPROVER, check mospi_status to determine if section should be editable
    if (isStateApprover) {
      const mospiStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.mospi_status
          : sectionData?.mospi_status
        : undefined;

      // If mospi_status is ACCEPTED, show as accepted and non-editable
      if (mospiStatus === "ACCEPTED") {
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-green-100 text-green-700 cursor-default"
              disabled
            >
              <CheckCircle className="w-4 h-4" />
              Accepted
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-4 h-4" />
              Timeline ({commentCount})
            </Button>
          </div>
        );
      }

      // If mospi_status is REVERTED, continue to show Edit button and other actions
      // We'll add the "Returned from Mospi" button in the normal flow below
    }

    // Check if indicator has been submitted (SUBMITTED, RESUBMITTED, or ACCEPTED)
    // REVERTED is excluded because user can resubmit after being sent back
    const isSubmitted =
      sectionStatus === "SUBMITTED" ||
      sectionStatus === "RESUBMITTED" ||
      sectionStatus === "ACCEPTED";

    if (sectionStatus === "ACCEPTED") {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-green-100 text-green-700 cursor-default"
            disabled
          >
            <CheckCircle className="w-4 h-4" />
            Accepted
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleOpenTimeline(sectionId)}
          >
            <Clock className="w-4 h-4" />
            Timeline ({commentCount})
          </Button>
        </div>
      );
    }

    // For STATE_APPROVER, show "Re Submitted" badge if status is RESUBMITTED
    if (isStateApprover && sectionStatus === "RESUBMITTED") {
      console.log(
        `[InfraFinancingReview] RESUBMITTED block hit for section ${sectionId}`
      );
      return (
        <div className="flex gap-2">
          {(() => {
            const editable = shouldBeEditable(sectionId);
            console.log(
              `[InfraFinancingReview] Edit button render for section ${sectionId}:`,
              {
                shouldBeEditable: editable,
                willShowEditButton: !editable,
              }
            );
            return !editable ? (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => handleEditStart(sectionId)}
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => onSaveSection(sectionId)}
                  disabled={false} // Enable save for editing RESUBMITTED indicators
                >
                  <Check className="w-4 h-4" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => handleCancel(sectionId)}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </>
            );
          })()}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-yellow-100 text-yellow-700 cursor-default"
            disabled
          >
            <CheckCircle className="w-4 h-4" />
            Re Submitted
          </Button>
          {!isNodalOfficer && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => onIndicatorStatus(sectionId, true)}
              disabled={shouldBeEditable(sectionId)} // Disable Accept during editing
            >
              <CheckCircle className="w-4 h-4" />
              Accept
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleOpenTimeline(sectionId)}
          >
            <Clock className="w-4 h-4" />
            Timeline ({commentCount})
          </Button>
        </div>
      );
    }

    if (sectionStatus === "REVERTED") {
      // If nodal officer and status is REVERTED, show Edit button + Sent Back badge
      // REVERTED means it was sent back, so user can resubmit (not disabled)
      if (isNodalOfficer) {
        const isCurrentlyEditable = shouldBeEditable(sectionId);
        return (
          <div className="flex gap-2">
            {!isCurrentlyEditable ? (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => handleEditStart(sectionId)}
                disabled={(() => {
                  // For STATE_APPROVER, disable edit button if mospi_status is ACCEPTED
                  if (isStateApprover) {
                    const sectionKey = `section${sectionId.replace(".", "_")}`;
                    const sectionData =
                      (formData && formData[sectionKey]) ||
                      getSectionData(sectionKey);
                    const mospiStatus = sectionData
                      ? Array.isArray(sectionData)
                        ? (sectionData as any)?.mospi_status
                        : sectionData?.mospi_status
                      : undefined;
                    return mospiStatus === "ACCEPTED";
                  }
                  return false;
                })()}
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => onSaveSection(sectionId)}
                  disabled={false} // Can resubmit after being sent back
                >
                  <Check className="w-4 h-4" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => handleCancel(sectionId)}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-red-100 text-red-700 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Sent Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-3 h-3" />
              Timeline ({commentCount})
            </Button>
          </div>
        );
      }

      // For reviewers/approvers, show only the disabled Sent Back button
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-red-100 text-red-700 cursor-default"
            disabled
          >
            <RotateCcw className="w-4 h-4" />
            Sent Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleOpenTimeline(sectionId)}
          >
            <Clock className="w-4 h-4" />
            Timeline ({commentCount})
          </Button>
        </div>
      );
    }

    // For NODAL_OFFICER, show "Resubmitted" badge if status is RESUBMITTED
    if (isNodalOfficer && sectionStatus === "RESUBMITTED") {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-yellow-100 text-yellow-700 cursor-default"
            disabled
          >
            <CheckCircle className="w-4 h-4" />
            Resubmitted
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-7 px-2 text-xs"
            onClick={() => handleOpenTimeline(sectionId)}
          >
            <MessageSquare className="w-3 h-3" />
            View Comments ({commentCount})
          </Button>
        </div>
      );
    }

    // For NODAL_OFFICER, show "Under Review" badge if status is SUBMITTED_TO_STATE or null/undefined
    if (
      isNodalOfficer &&
      (sectionStatus === "SUBMITTED_TO_STATE" || !sectionStatus)
    ) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-yellow-100 text-yellow-700 cursor-default"
            disabled
          >
            <Clock className="w-4 h-4" />
            Under Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-7 px-2 text-xs"
            onClick={() => handleOpenTimeline(sectionId)}
          >
            <MessageSquare className="w-3 h-3" />
            View Comments ({commentCount})
          </Button>
        </div>
      );
    }

    // For NODAL_OFFICER, if status is not REVERTED, ACCEPTED, RESUBMITTED, or SUBMITTED_TO_STATE, don't show any buttons
    if (
      isNodalOfficer &&
      sectionStatus !== "REVERTED" &&
      sectionStatus !== "ACCEPTED" &&
      sectionStatus !== "RESUBMITTED" &&
      sectionStatus !== "SUBMITTED_TO_STATE"
    ) {
      return null;
    }

    return (
      <div className="flex gap-2">
        {/* Show "Returned from Mospi" button for STATE_APPROVER when mospi_status is REVERTED */}
        {isStateApprover &&
          (() => {
            const sectionKey = `section${sectionId.replace(".", "_")}`;
            const sectionData = formData && formData[sectionKey];
            const mospiStatus = sectionData
              ? Array.isArray(sectionData)
                ? (sectionData as any)?.mospi_status
                : sectionData?.mospi_status
              : undefined;
            return mospiStatus === "REVERTED";
          })() && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-orange-100 text-orange-700 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from Mospi
            </Button>
          )}

        {!isEditable(sectionId) ? (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleEditStart(sectionId)}
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => onSaveSection(sectionId)}
              disabled={isSubmitted}
            >
              <Check className="w-4 h-4" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => handleCancel(sectionId)}
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </>
        )}

        {/* Show "Send Back" button for STATE_APPROVER when indicator is returned from MOSPI and originally from NODAL_OFFICER */}
        {isStateApprover &&
          (() => {
            const sectionKey = `section${sectionId.replace(".", "_")}`;
            const sectionData = formData && formData[sectionKey];
            const mospiStatus = sectionData
              ? Array.isArray(sectionData)
                ? (sectionData as any)?.mospi_status
                : sectionData?.mospi_status
              : undefined;

            // Check if this specific indicator was originally submitted by NODAL_OFFICER
            const isFromNodalOfficer = isIndicatorFromNodalOfficer(
              submission as any,
              sectionId
            );

            // Detailed logging for debugging
            console.group(
              `🔍 [InfraFinancingReview] "Send Back" button check for section ${sectionId}`
            );
            console.log("📊 Section data:", {
              sectionKey,
              sectionData: sectionData
                ? Array.isArray(sectionData)
                  ? sectionData[0]
                  : sectionData
                : null,
              mospiStatus,
              hasFormData: !!formData,
            });
            console.log("👤 Submission info:", {
              submissionId: submission?.id,
              submissionStatus: submission?.status,
              currentOwnerRole: submission?.currentOwnerRole,
              submittedBy: submission?.submittedBy,
            });
            console.log("✅ Checks:", {
              isStateApprover,
              mospiStatus,
              isMospiReverted: mospiStatus === "REVERTED",
              isFromNodalOfficer,
              shouldShowButton:
                mospiStatus === "REVERTED" && isFromNodalOfficer,
            });
            console.groupEnd();

            return mospiStatus === "REVERTED" && isFromNodalOfficer;
          })() && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => {
                // Track that this was opened from STATE_APPROVER "Send Back" button
                setIsStateApproverSentBack(true);
                setStateApproverSentBackSectionId(sectionId);
                handleOpenModal(sectionId);
              }}
              disabled={shouldBeEditable(sectionId)}
            >
              <RotateCcw className="w-4 h-4" />
              Send Back
            </Button>
          )}

        {/* Hide Send Back button if STATE_APPROVER is viewing their own submission */}
        {(() => {
          // Check if submission is from STATE_APPROVER
          const isSubmissionFromStateApprover =
            submission?.user?.role === "STATE_APPROVER" ||
            submission?.currentOwnerRole === "STATE_APPROVER";

          // Hide Send Back if current user is STATE_APPROVER AND submission is from STATE_APPROVER
          const shouldShowSendBack = !(
            isStateApprover && isSubmissionFromStateApprover
          );

          console.log(
            `[InfraFinancingReview] Section ${sectionId} - Send Back visibility:`,
            {
              shouldShowSendBack,
              isStateApprover,
              isSubmissionFromStateApprover,
              sectionStatus,
              submissionUserRole: submission?.user?.role,
              currentOwnerRole: submission?.currentOwnerRole,
            }
          );
          return shouldShowSendBack;
        })() && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              // Track that this was opened from STATE_APPROVER "Send Back" button
              if (isStateApprover) {
                setIsStateApproverSentBack(true);
                setStateApproverSentBackSectionId(sectionId);
              }
              handleOpenModal(sectionId);
            }}
            disabled={shouldBeEditable(sectionId)}
          >
            <RotateCcw className="w-4 h-4" />
            Send Back
            {/* ({commentCount}) */}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 h-7 px-2 text-xs"
          onClick={() => handleOpenTimeline(sectionId)}
        >
          <Clock className="w-3 h-3" />
          Timeline ({commentCount})
        </Button>

        {!isNodalOfficer &&
          (() => {
            // For STATE_APPROVER, check if indicator 1.1 is accepted before allowing acceptance of 1.2
            // For STATE_APPROVER, check if indicator 1.3 is accepted before allowing acceptance of 1.4
            const isEditing = shouldBeEditable(sectionId);
            const userRole = getUserRole();
            const isStateApprover = userRole === "STATE_APPROVER";
            const isIndicator1_1AcceptedValue = isIndicator1_1Accepted();
            const capitalAllocationMatches = doesCapitalAllocationMatch();
            const isIndicator1_3AcceptedValue = isIndicator1_3Accepted();
            const totalULBsMatches = doesTotalULBsMatch();
            const shouldDisableFor1_2_NotAccepted =
              isStateApprover &&
              sectionId === "1.2" &&
              !isIndicator1_1AcceptedValue;
            const shouldDisableFor1_2_NotMatching =
              isStateApprover &&
              sectionId === "1.2" &&
              isIndicator1_1AcceptedValue &&
              !capitalAllocationMatches;
            const shouldDisableFor1_4_NotAccepted =
              isStateApprover &&
              sectionId === "1.4" &&
              !isIndicator1_3AcceptedValue;
            const shouldDisableFor1_4_NotMatching =
              isStateApprover &&
              sectionId === "1.4" &&
              isIndicator1_3AcceptedValue &&
              !totalULBsMatches;
            const isDisabled =
              isEditing ||
              shouldDisableFor1_2_NotAccepted ||
              shouldDisableFor1_2_NotMatching ||
              shouldDisableFor1_4_NotAccepted ||
              shouldDisableFor1_4_NotMatching;

            return (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => onIndicatorStatus(sectionId, true)}
                        disabled={isDisabled}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {isDisabled && (
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm">
                        {shouldDisableFor1_2_NotAccepted
                          ? "Indicator 1.1 must be accepted before accepting indicator 1.2"
                          : shouldDisableFor1_2_NotMatching
                          ? `Capital Allocation for FY must equal the Capital Allocation for FY (${indicator1_1CapitalAllocation} INR-CRORE) from indicator 1.1`
                          : shouldDisableFor1_4_NotAccepted
                          ? "Indicator 1.3 must be accepted before accepting indicator 1.4"
                          : shouldDisableFor1_4_NotMatching
                          ? `Total Number of ULBs must equal the Total Number of ULBs (${indicator1_3TotalULBs}) from indicator 1.3`
                          : isEditing
                          ? "Please save your changes before accepting"
                          : ""}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })()}
      </div>
    );
  };

  // Real-time calculation for % Allocation to GSDP
  const calculateAllocationPercentage = () => {
    const capValue = parseFloat(capitalAllocation);
    const gsdpValue = parseFloat(gsdpForFY);

    console.log("🔍 Real-time Calculation:", {
      capitalAllocation,
      gsdpForFY,
      capValue,
      gsdpValue,
      isValid:
        !isNaN(capValue) && !isNaN(gsdpValue) && capValue > 0 && gsdpValue > 0,
    });

    if (
      !isNaN(capValue) &&
      !isNaN(gsdpValue) &&
      capValue > 0 &&
      gsdpValue > 0
    ) {
      const percentage = (capValue / gsdpValue) * 100;
      const result = percentage.toFixed(1) + "%";
      // Debug logging removed for performance

      return result;
    }

    // Return empty string if no valid calculation
    // Debug logging removed for performance

    return "";
  };
  // If no data, show message
  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No Infra Financing data available for review
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {(() => {
          const sections = getSectionsWithData(
            { infraFinancing: formData },
            "infraFinancing"
          );
          const assignedIndicators = STEP_SECTIONS.infraFinancing
            .filter((s) => sections.includes(s.sectionKey))
            .map((s) => s.indicator);
          const { completed, total, progress } = computeStepProgress(
            { infraFinancing: formData } as any,
            "infraFinancing",
            { assignedIndicators }
          );
          return (
            <ProgressHeader
              title="Infra Financing"
              description="Data related to infrastructure financing and budget allocation"
              points={250}
              completed={completed}
              total={total}
              progress={progress}
            />
          );
        })()}
        {/* Section 1.1 */}
        {sectionsWithData.includes("section1_1") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.1 -</span> % Capex to GSDP{" "}
                  </span>
                  {renderActionButtons("1.1")}
                </div>
              </div>
            }
            // subtitle="Annex 1: Verified with NBRP.csv / Budgeted Estimates for Capital Expenditure"
            className="mb-6 relative"
            indicatorCode="1.1"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("1.1")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("1.1")}
            {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 
              </CardTitle>
              {!isPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleOpenModal("1.1")}
                >
                  <MessageSquare className="w-4 h-4" />
                  Add Comment
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Annex 1: Verified with NBRP.csv / Budgeted Estimates for Capital Expenditure
            </p>
          </CardHeader> */}

            <div className="grid grid-cols-2 gap-4 max-w-[70%]">
              <div>
                <Label>Year</Label>
                <Input
                  value={
                    (getFormDataValue("section1_1") as { year?: string })
                      ?.year || "2024-25"
                  }
                  readOnly
                  className={cn(
                    "bg-gray-50",
                    getInputValidationClass("section1_1.year")
                  )}
                />
                {renderFieldError("section1_1.year")}
              </div>
              <div>
                <Label>
                  Capital Allocation for FY{" "}
                  <span className="text-xs text-muted-foreground">
                    (INR-CRORE)
                  </span>
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={
                    shouldBeEditable("1.1")
                      ? capitalAllocation
                      : (() => {
                          // When not editable, prefer submissionData (updated after save) over formData
                          const section1_1 =
                            submissionData?.section1_1 ||
                            formData?.section1_1 ||
                            (formData as any)?.infraFinancing?.section1_1;
                          if (
                            section1_1?.capitalAllocation !== undefined &&
                            section1_1?.capitalAllocation !== null
                          ) {
                            let val: string;
                            if (
                              typeof section1_1.capitalAllocation === "string"
                            ) {
                              val = section1_1.capitalAllocation
                                .replace(/[₹,Crores\s]/g, "")
                                .trim();
                            } else {
                              // If it's a number, convert to string without adding unnecessary decimals
                              const num = Number(section1_1.capitalAllocation);
                              val =
                                num % 1 === 0
                                  ? num.toString()
                                  : num.toString().replace(/\.?0+$/, "");
                            }
                            return val;
                          }
                          return capitalAllocation; // Fallback to state
                        })()
                  }
                  onChange={createOnChangeHandler(
                    "section1_1.capitalAllocation",
                    (e) => {
                      const value = e.target.value;
                      // Only allow numbers and decimal point
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setCapitalAllocation(value);
                        // Mark percentage field as touched to ensure error display if validation fails
                        markFieldAsTouched("section1_1.allocationToGSDP");
                        setShowValidationErrors(true);
                      }
                    }
                  )}
                  placeholder="Enter Capital Allocation value"
                  readOnly={!shouldBeEditable("1.1")}
                  className={cn(
                    shouldBeEditable("1.1") ? "bg-white" : "bg-gray-50",
                    shouldBeEditable("1.1") &&
                      getInputValidationClass("section1_1.capitalAllocation")
                  )}
                />
                {shouldBeEditable("1.1") &&
                  renderFieldError("section1_1.capitalAllocation")}
              </div>
              <div>
                <Label>
                  GSDP for FY{" "}
                  <span className="text-xs text-muted-foreground">
                    (INR-CRORE)
                  </span>
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={
                    shouldBeEditable("1.1")
                      ? gsdpForFY
                      : (() => {
                          // When not editable, prefer submissionData (updated after save) over formData
                          const section1_1 =
                            submissionData?.section1_1 ||
                            formData?.section1_1 ||
                            (formData as any)?.infraFinancing?.section1_1;
                          if (
                            section1_1?.gsdpForFY !== undefined &&
                            section1_1?.gsdpForFY !== null
                          ) {
                            let val: string;
                            if (typeof section1_1.gsdpForFY === "string") {
                              val = section1_1.gsdpForFY
                                .replace(/[₹,Crores\s]/g, "")
                                .trim();
                            } else {
                              // If it's a number, convert to string without adding unnecessary decimals
                              const num = Number(section1_1.gsdpForFY);
                              val =
                                num % 1 === 0
                                  ? num.toString()
                                  : num.toString().replace(/\.?0+$/, "");
                            }
                            return val;
                          }
                          return gsdpForFY; // Fallback to state
                        })()
                  }
                  onChange={createOnChangeHandler(
                    "section1_1.gsdpForFY",
                    (e) => {
                      const value = e.target.value;
                      // Only allow numbers and decimal point
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setGsdpForFY(value);
                        // Mark percentage field as touched to ensure error display if validation fails
                        markFieldAsTouched("section1_1.allocationToGSDP");
                        setShowValidationErrors(true);
                      }
                    }
                  )}
                  placeholder="Enter GSDP value"
                  readOnly={!shouldBeEditable("1.1")}
                  className={cn(
                    shouldBeEditable("1.1") ? "bg-white" : "bg-gray-50",
                    shouldBeEditable("1.1") &&
                      getInputValidationClass("section1_1.gsdpForFY")
                  )}
                />
                {shouldBeEditable("1.1") &&
                  renderFieldError("section1_1.gsdpForFY")}
              </div>
              <div>
                <Label>% Allocation to GSDP</Label>
                <div className="relative">
                  <Input
                    value={(() => {
                      // Get values from local state if in edit mode, otherwise from submissionData/formData
                      let capitalAllocationValue = capitalAllocation;
                      let gsdpForFYValue = gsdpForFY;

                      if (!shouldBeEditable("1.1")) {
                        // In review mode, prefer submissionData (updated after save) over formData
                        const section1_1 =
                          submissionData?.section1_1 ||
                          formData?.section1_1 ||
                          (formData as any)?.infraFinancing?.section1_1;
                        if (
                          section1_1?.capitalAllocation !== undefined &&
                          section1_1?.capitalAllocation !== null
                        ) {
                          if (
                            typeof section1_1.capitalAllocation === "string"
                          ) {
                            capitalAllocationValue =
                              section1_1.capitalAllocation
                                .replace(/[₹,Crores\s]/g, "")
                                .trim();
                          } else {
                            // If it's a number, convert to string without adding unnecessary decimals
                            const num = Number(section1_1.capitalAllocation);
                            capitalAllocationValue =
                              num % 1 === 0
                                ? num.toString()
                                : num.toString().replace(/\.?0+$/, "");
                          }
                        }
                        if (
                          section1_1?.gsdpForFY !== undefined &&
                          section1_1?.gsdpForFY !== null
                        ) {
                          if (typeof section1_1.gsdpForFY === "string") {
                            gsdpForFYValue = section1_1.gsdpForFY
                              .replace(/[₹,Crores\s]/g, "")
                              .trim();
                          } else {
                            // If it's a number, convert to string without adding unnecessary decimals
                            const num = Number(section1_1.gsdpForFY);
                            gsdpForFYValue =
                              num % 1 === 0
                                ? num.toString()
                                : num.toString().replace(/\.?0+$/, "");
                          }
                        }
                      }

                      const capitalAllocationNum =
                        parseFloat(capitalAllocationValue) || 0;
                      const gsdpForFYNum = parseFloat(gsdpForFYValue) || 0;

                      if (
                        isNaN(capitalAllocationNum) ||
                        isNaN(gsdpForFYNum) ||
                        gsdpForFYNum === 0 ||
                        capitalAllocationValue === "" ||
                        gsdpForFYValue === ""
                      ) {
                        // If no values, check if there's a saved percentage in submissionData/formData
                        if (!shouldBeEditable("1.1")) {
                          const section1_1 =
                            submissionData?.section1_1 ||
                            formData?.section1_1 ||
                            (formData as any)?.infraFinancing?.section1_1;
                          if (
                            section1_1?.allocationToGSDP !== undefined &&
                            section1_1?.allocationToGSDP !== null
                          ) {
                            const savedPercentage =
                              typeof section1_1.allocationToGSDP === "string"
                                ? parseFloat(
                                    section1_1.allocationToGSDP
                                      .replace("%", "")
                                      .trim()
                                  )
                                : Number(section1_1.allocationToGSDP);
                            if (!isNaN(savedPercentage)) {
                              return savedPercentage.toFixed(1) + "%";
                            }
                          }
                        }
                        return "";
                      }

                      const percentage =
                        (capitalAllocationNum / gsdpForFYNum) * 100;

                      // Show negative percentage if calculated (for error display)
                      if (percentage < 0) {
                        return percentage.toFixed(1) + "%";
                      }
                      // Cap at 100% if it exceeds (but validation will prevent saving)
                      const cappedPercentage = Math.min(percentage, 100);
                      return cappedPercentage.toFixed(1) + "%";
                    })()}
                    readOnly
                    className={(() => {
                      // Only show error styling in edit mode
                      if (!shouldBeEditable("1.1")) {
                        return cn(
                          "bg-gray-50 cursor-not-allowed pr-8",
                          getInputValidationClass("section1_1.allocationToGSDP")
                        );
                      }
                      return cn(
                        "bg-gray-50 cursor-not-allowed pr-8",
                        getInputValidationClass("section1_1.allocationToGSDP")
                      );
                    })()}
                    placeholder="Auto-calculated"
                  />
                  {(() => {
                    const capitalAllocationNum =
                      parseFloat(capitalAllocation) || 0;
                    const gsdpForFYNum = parseFloat(gsdpForFY) || 0;
                    const isValid =
                      !isNaN(capitalAllocationNum) &&
                      !isNaN(gsdpForFYNum) &&
                      capitalAllocationNum > 0 &&
                      gsdpForFYNum > 0 &&
                      capitalAllocationNum <= gsdpForFYNum &&
                      capitalAllocation !== "" &&
                      gsdpForFY !== "";
                    return isValid ? (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-sm font-medium">
                        ✓
                      </div>
                    ) : null;
                  })()}
                </div>
                {/* Only show error message in edit mode */}
                {shouldBeEditable("1.1") &&
                  (() => {
                    const capitalAllocationNum =
                      parseFloat(capitalAllocation) || 0;
                    const gsdpForFYNum = parseFloat(gsdpForFY) || 0;
                    const isNegative =
                      capitalAllocationNum < 0 || gsdpForFYNum < 0;
                    const exceedsLimit =
                      gsdpForFYNum > 0 && capitalAllocationNum > gsdpForFYNum;

                    return renderFieldError("section1_1.allocationToGSDP");
                  })()}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Section 1.2 */}
        {sectionsWithData.includes("section1_2") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.2 -</span> % Capex
                    Utilisation{" "}
                  </span>
                  {renderActionButtons("1.2")}
                </div>
              </div>
            }
            // subtitle="Annex 2: Verified with Actuals data"
            className="mb-6"
            indicatorCode="1.2"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("1.2")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("1.2")}
            <div className="grid grid-cols-2 gap-4 max-w-[70%]">
              <div>
                <Label>Year</Label>
                <Input
                  value={
                    submissionData?.section1_2?.year ||
                    formData?.section1_2?.year ||
                    "2024-25"
                  }
                  readOnly
                  className={cn(
                    "bg-gray-50",
                    getInputValidationClass("section1_2.year")
                  )}
                />
                {renderFieldError("section1_2.year")}
              </div>
              <div>
                <Label>
                  State Capex Utilisation{" "}
                  <span className="text-xs text-muted-foreground">
                    (INR-CRORE)
                  </span>
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={
                    shouldBeEditable("1.2")
                      ? actualCapex
                      : (() => {
                          // When not editable, prefer submissionData (updated after save) over formData
                          const section1_2 =
                            submissionData?.section1_2 ||
                            formData?.section1_2 ||
                            (formData as any)?.infraFinancing?.section1_2;
                          if (
                            section1_2?.actualCapex !== undefined &&
                            section1_2?.actualCapex !== null
                          ) {
                            let val: string;
                            if (typeof section1_2.actualCapex === "string") {
                              val = section1_2.actualCapex
                                .replace(/[₹,Crores\s]/g, "")
                                .trim();
                            } else {
                              // If it's a number, convert to string without adding unnecessary decimals
                              const num = Number(section1_2.actualCapex);
                              val =
                                num % 1 === 0
                                  ? num.toString()
                                  : num.toString().replace(/\.?0+$/, "");
                            }
                            return val;
                          }
                          return actualCapex; // Fallback to state
                        })()
                  }
                  onChange={createOnChangeHandler(
                    "section1_2.actualCapex",
                    (e) => {
                      const value = e.target.value;
                      // Only allow numbers and decimal point
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setActualCapex(value);
                        markFieldAsTouched("section1_2.capexActualsToGSDP");
                        setShowValidationErrors(true);
                      }
                    }
                  )}
                  placeholder="Enter State Capex Utilisation value"
                  readOnly={!isEditable("1.2")}
                  className={cn(
                    isEditable("1.2") ? "bg-white" : "bg-gray-50",
                    isEditable("1.2") &&
                      getInputValidationClass("section1_2.actualCapex")
                  )}
                />
                {isEditable("1.2") &&
                  renderFieldError("section1_2.actualCapex")}
                {isEditable("1.2") && (
                  <div className="text-xs text-gray-500 mt-1">
                    Current value: "{actualCapex}"
                  </div>
                )}
              </div>
              <div>
                <Label>
                  Capital Allocation for FY{" "}
                  <span className="text-xs text-muted-foreground">
                    (INR-CRORE)
                  </span>
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={
                    shouldBeEditable("1.2")
                      ? stateCapexUtilisation
                      : (() => {
                          // When not editable, prefer submissionData (updated after save) over formData
                          const section1_2 =
                            submissionData?.section1_2 ||
                            formData?.section1_2 ||
                            (formData as any)?.infraFinancing?.section1_2;
                          if (
                            section1_2?.stateCapexUtilisation !== undefined &&
                            section1_2?.stateCapexUtilisation !== null
                          ) {
                            let val: string;
                            if (
                              typeof section1_2.stateCapexUtilisation ===
                              "string"
                            ) {
                              val = section1_2.stateCapexUtilisation
                                .replace(/[₹,Crores\s]/g, "")
                                .trim();
                            } else {
                              // If it's a number, convert to string without adding unnecessary decimals
                              const num = Number(
                                section1_2.stateCapexUtilisation
                              );
                              val =
                                num % 1 === 0
                                  ? num.toString()
                                  : num.toString().replace(/\.?0+$/, "");
                            }
                            return val;
                          }
                          return stateCapexUtilisation; // Fallback to state
                        })()
                  }
                  onChange={createOnChangeHandler(
                    "section1_2.stateCapexUtilisation",
                    (e) => {
                      const value = e.target.value;
                      // Only allow numbers and decimal point
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setStateCapexUtilisation(value);
                        markFieldAsTouched("section1_2.capexActualsToGSDP");
                        setShowValidationErrors(true);
                      }
                    }
                  )}
                  placeholder="Enter Capital Allocation for FY value"
                  readOnly={!isEditable("1.2")}
                  className={cn(
                    isEditable("1.2") ? "bg-white" : "bg-gray-50",
                    isEditable("1.2") &&
                      getInputValidationClass(
                        "section1_2.stateCapexUtilisation"
                      )
                  )}
                />
                {isEditable("1.2") &&
                  renderFieldError("section1_2.stateCapexUtilisation")}
                {isEditable("1.2") && (
                  <div className="text-xs text-gray-500 mt-1">
                    Current value: "{stateCapexUtilisation}"
                  </div>
                )}
              </div>
              <div className="">
                <Label>% Capex Actuals</Label>
                <Input
                  value={(() => {
                    // Get values from local state if in edit mode, otherwise from formData
                    let actualCapexValue = actualCapex;
                    let stateCapexUtilisationValue = stateCapexUtilisation;

                    if (!shouldBeEditable("1.2")) {
                      // In review mode, prefer submissionData (updated after save) over formData
                      const section1_2 =
                        submissionData?.section1_2 ||
                        formData?.section1_2 ||
                        (formData as any)?.infraFinancing?.section1_2;
                      if (
                        section1_2?.actualCapex !== undefined &&
                        section1_2?.actualCapex !== null
                      ) {
                        actualCapexValue =
                          typeof section1_2.actualCapex === "string"
                            ? section1_2.actualCapex
                                .replace(/[₹,Crores\s]/g, "")
                                .trim()
                            : String(section1_2.actualCapex);
                      }
                      if (
                        section1_2?.stateCapexUtilisation !== undefined &&
                        section1_2?.stateCapexUtilisation !== null
                      ) {
                        stateCapexUtilisationValue =
                          typeof section1_2.stateCapexUtilisation === "string"
                            ? section1_2.stateCapexUtilisation
                                .replace(/[₹,Crores\s]/g, "")
                                .trim()
                            : String(section1_2.stateCapexUtilisation);
                      }
                    }

                    const actualCapexNum = parseFloat(actualCapexValue) || 0;
                    const stateCapexUtilisationNum =
                      parseFloat(stateCapexUtilisationValue) || 0;

                    if (
                      isNaN(actualCapexNum) ||
                      isNaN(stateCapexUtilisationNum) ||
                      stateCapexUtilisationNum === 0 ||
                      actualCapexValue === "" ||
                      stateCapexUtilisationValue === ""
                    ) {
                      // If no values, check if there's a saved percentage in submissionData/formData
                      if (!shouldBeEditable("1.2")) {
                        const section1_2 =
                          submissionData?.section1_2 ||
                          formData?.section1_2 ||
                          (formData as any)?.infraFinancing?.section1_2;
                        if (
                          section1_2?.capexActualsToGSDP !== undefined &&
                          section1_2?.capexActualsToGSDP !== null
                        ) {
                          const savedPercentage =
                            typeof section1_2.capexActualsToGSDP === "string"
                              ? parseFloat(
                                  section1_2.capexActualsToGSDP
                                    .replace("%", "")
                                    .trim()
                                )
                              : Number(section1_2.capexActualsToGSDP);
                          if (!isNaN(savedPercentage)) {
                            return savedPercentage.toFixed(1) + "%";
                          }
                        }
                      }
                      return "";
                    }

                    const percentage =
                      (actualCapexNum / stateCapexUtilisationNum) * 100;

                    // Show negative percentage if calculated (for error display)
                    if (percentage < 0) {
                      return percentage.toFixed(1) + "%";
                    }
                    // Cap at 100% if it exceeds (but validation will prevent saving)
                    const cappedPercentage = Math.min(percentage, 100);
                    return cappedPercentage.toFixed(1) + "%";
                  })()}
                  readOnly
                  className={cn(
                    "bg-gray-50 cursor-not-allowed",
                    shouldBeEditable("1.2") &&
                      getInputValidationClass("section1_2.capexActualsToGSDP")
                  )}
                  placeholder="Auto-calculated"
                />
                {shouldBeEditable("1.2") &&
                  renderFieldError("section1_2.capexActualsToGSDP")}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Section 1.3 */}
        {sectionsWithData.includes("section1_3") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.3 -</span> % of Credit
                    Rated ULBs{" "}
                  </span>
                  {renderActionButtons("1.3")}
                </div>
              </div>
            }
            // subtitle="Annex 3: Verified with Muni.GOI"
            className="mb-6"
            indicatorCode="1.3"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("1.3")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("1.3")}
            {/* <div className="space-y-4">
              {/* ✅ Show Total ULBs at the top */}
            {/* {formData?.section1_3?.totalULBs !== undefined && (
                <div className="max-w-xs">
                  <Label>Total Number of ULBs</Label>
                  <Input
                    type="number"
                    value={formData.section1_3.totalULBs || 0}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </div>
              )} */}

            {/* Existing ULB List */}
            {/* {formData?.section1_3?.ulbList?.length > 0 ? (
                formData.section1_3.ulbList.map((item: any, index: number) => (
                  <div key={item.id || index}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>City Name</Label>
                        <Input 
                         value={item.cityName || ""}
                         readOnly={!isEditable('1.3')}
                         className={isEditable('1.3') ? 'bg-white' : 'bg-gray-50'} />
                      </div>
                      <div>
                        <Label>ULB</Label> */}
            {/* <Input
                         value={item.ulb || ""}  
                         readOnly={!isEditable('1.3')}
                         className={isEditable('1.3') ? 'bg-white' : 'bg-gray-50'}
                         /> */}
            {/* {getDropdown(
  dropdownValues.ulbList,
  item.ulb || "",
  (value) => {
    setFormData((prev) => ({
      ...prev,
      section1_3: {
        ...prev.section1_3,
        ulbList: prev.section1_3.ulbList.map((ulbItem) =>
          ulbItem.id === item.id ? { ...ulbItem, ulb: value } : ulbItem
        ),
      },
    }));
  },
  "Select ULB",
  isEditable('1.3') // Pass the editable state
)} */
            /* }
                      </div>
                      <div>
                        <Label>Rating Date</Label>
                        <Input
                          type="text"
                          value={
                            item.ratingDate
                              ? (() => {
                                  try {
                                    const dateStr =
                                      typeof item.ratingDate === "string"
                                        ? item.ratingDate
                                        : "";
                                    if (dateStr.includes("T")) {
                                      const date = new Date(dateStr);
                                      const year = date.getFullYear();
                                      const month = String(
                                        date.getMonth() + 1
                                      ).padStart(2, "0");
                                      const day = String(
                                        date.getDate()
                                      ).padStart(2, "0");
                                      return `${year}-${month}-${day}`;
                                    }
                                    return dateStr.split("T")[0] || dateStr;
                                  } catch {
                                    return item.ratingDate || "";
                                  }
                                })()
                              : ""
                          }
                         readOnly={!isEditable('1.3')}
                         className={isEditable('1.3') ? 'bg-white' : 'bg-gray-50'}
                        />
                      </div>
                      <div>
                        <Label>Rating</Label>
                        <Input 
                        value={item.rating || ""} 
                        readOnly={!isEditable('1.3')}
                        className={isEditable('1.3') ? 'bg-white' : 'bg-gray-50'} 
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No ULB data available
                </div>
              )} */}
            {/* </div> */}

            <Section_1_3
              formData={{ section1_3: section13State }}
              isEditable={shouldBeEditable}
              setSectionState={setSection13State}
              resetKey={selectResetKey}
              validationErrors={validation.errors}
              getFieldError={getFieldError}
            />
          </SectionCard>
        )}

        {/* Section 1.4 */}
        {sectionsWithData.includes("section1_4") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.4 -</span> % of ULBs
                    Issuing Bonds{" "}
                  </span>
                  {renderActionButtons("1.4")}
                </div>
              </div>
            }
            indicatorCode="1.4"
            // subtitle="Annex 4: Provide Bond Details"
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("1.4")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("1.4")}
            <div className="space-y-4">
              {/* ✅ Show Total ULBs at top */}
              {/* {formData?.section1_4?.totalULBs !== undefined && (
                <div className="max-w-xs">
                  <Label>Total Number of ULBs</Label>
                  <Input
                    type="number"
                    value={formData.section1_4.totalULBs || 0}
                    readOnly={!isEditable('1.4')}
                    className={isEditable('1.4') ? 'bg-white' : 'bg-gray-50'}
                  />
                </div>
              )} */}

              {/* ✅ Bond List */}
              {/* {formData?.section1_4?.bondList?.length > 0 ? (
                formData.section1_4.bondList.map((item: any, index: number) => (
                  <div key={item.id || index}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Bond Type</Label>
                        <Input 
                        value={item.bondType || ""} 
                        readOnly={!isEditable('1.4')}
                        className={isEditable('1.4') ? 'bg-white' : 'bg-gray-50'} 
                        />
                      </div>
                      <div>
                        <Label>City Name</Label>
                        <Input 
                        value={item.cityName || ""}
                        readOnly={!isEditable('1.4')}
                        className={isEditable('1.4') ? 'bg-white' : 'bg-gray-50'}  
                         />
                      </div>
                      <div>
                        <Label>Issuing Authority</Label>
                        <Input 
                        value={item.issuingAuthority || ""} 
                        readOnly={!isEditable('1.4')}
                        className={isEditable('1.4') ? 'bg-white' : 'bg-gray-50'} 
                         />
                      </div>
                      <div>
                        <Label>Value (INR-CRORE)</Label>
                        <Input
                          value={item.value ? `₹ ${item.value} Crores` : ""}
                          readOnly={!isEditable('1.4')}
                        className={isEditable('1.4') ? 'bg-white' : 'bg-gray-50'} 
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No bond data available
                </div>
              )} */}
            </div>

            <Section_1_4
              formData={{ section1_4: section14State }}
              isEditable={shouldBeEditable}
              setSectionState={setSection14State}
              resetKey={selectResetKey}
              validationErrors={validation.errors}
              getFieldError={getFieldError}
            />
          </SectionCard>
        )}

        {/* Section 1.5 */}
        {sectionsWithData.includes("section1_5") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.5 -</span> Functional
                    Financial Intermediary{" "}
                  </span>
                  {renderActionButtons("1.5")}
                </div>
              </div>
            }
            // subtitle="Annex 4: Provide link and funding details"
            className="mb-6"
            indicatorCode="1.5"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("1.5")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("1.5")}
            <div className="space-y-4">
              {/* RadioGroup for hasIntermediary */}
              <div>
                <Label className="mb-3 block">
                  Has Functional Financial Intermediary?*
                </Label>
                {shouldBeEditable("1.5") ? (
                  <RadioGroup
                    value={section15State?.hasIntermediary || ""}
                    onValueChange={(value) => {
                      if (value === "no") {
                        // When switching to "no", clear ffiArray and comment
                        // Clear comment so user can enter a fresh comment (don't keep old comment from previous "no" selection)
                        const updatedState = {
                          ...section15State,
                          hasIntermediary: value,
                          ffiArray: [], // Clear the array (files are in the array items)
                          comment: "", // Clear comment - user should enter fresh comment for new "no" selection
                        };
                        setSection15State(updatedState);
                        // Also update formDataState to ensure persistence and document tab updates
                        setFormDataForSection("section1_5", updatedState);
                      } else if (value === "yes") {
                        // When switching to "yes", clear comment but keep ffiArray
                        setSection15State({
                          ...section15State,
                          hasIntermediary: value,
                          comment: undefined, // Clear comment
                        });
                      } else {
                        setSection15State({
                          ...section15State,
                          hasIntermediary: value,
                        });
                      }
                    }}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="1.5-yes" />
                      <Label htmlFor="1.5-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="1.5-no" />
                      <Label htmlFor="1.5-no">No</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        section15State?.hasIntermediary === "yes"
                          ? "bg-green-100 text-green-800"
                          : section15State?.hasIntermediary === "no"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {section15State?.hasIntermediary === "yes"
                        ? "Yes"
                        : section15State?.hasIntermediary === "no"
                        ? "No"
                        : "Not specified"}
                    </span>
                  </div>
                )}
                {renderFieldError("section1_5.hasIntermediary")}
              </div>

              {/* Show table and Add More button if hasIntermediary is "yes" */}
              {section15State?.hasIntermediary === "yes" && (
                <>
                  {/* Validation error for ffiArray */}
                  {renderFieldError("section1_5.ffiArray")}

                  {/* Table Display */}
                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#DDE3F9]">
                          <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                            Organisation Name
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Organisation Type
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Year of Establishment
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Total Funding (₹ Crores)
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Website
                          </th>
                          {shouldBeEditable("1.5") && (
                            <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                              Action
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const ffiArray = Array.isArray(
                            section15State?.ffiArray
                          )
                            ? section15State.ffiArray
                            : [];

                          if (!ffiArray.length) {
                            return (
                              <tr>
                                <td
                                  colSpan={shouldBeEditable("1.5") ? 6 : 5}
                                  className="py-8 text-center text-muted-foreground"
                                >
                                  No financial intermediary data available
                                </td>
                              </tr>
                            );
                          }

                          return ffiArray.map((item: any, index: number) => (
                            <tr key={item.id || index} className="border-b">
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("1.5") ? (
                                  <div>
                                    <Input
                                      value={item.organisationName || ""}
                                      onChange={createOnChangeHandler(
                                        `section1_5.ffiArray.${index}.organisationName`,
                                        (e) => {
                                          const updatedArray = [...ffiArray];
                                          updatedArray[index] = {
                                            ...updatedArray[index],
                                            organisationName: e.target.value,
                                          };
                                          setSection15State({
                                            ...section15State,
                                            ffiArray: updatedArray,
                                          });
                                          setShowValidationErrors(true);
                                        }
                                      )}
                                      className={cn(
                                        "w-full",
                                        getInputValidationClass(
                                          `section1_5.ffiArray.${index}.organisationName`
                                        )
                                      )}
                                      placeholder="Enter organisation name"
                                    />
                                    {renderFieldError(
                                      `section1_5.ffiArray.${index}.organisationName`
                                    )}
                                  </div>
                                ) : (
                                  item.organisationName || "N/A"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("1.5") ? (
                                  <div>
                                    <Dropdown
                                      options={dropdownValues.issuingAuthorityList.map(
                                        (opt) => ({ label: opt, value: opt })
                                      )}
                                      value={item.organisationType || ""}
                                      onChange={createOnValueChangeHandler(
                                        `section1_5.ffiArray.${index}.organisationType`,
                                        (value) => {
                                          const updatedArray = [...ffiArray];
                                          updatedArray[index] = {
                                            ...updatedArray[index],
                                            organisationType: value,
                                          };
                                          setSection15State({
                                            ...section15State,
                                            ffiArray: updatedArray,
                                          });
                                          setShowValidationErrors(true);
                                        }
                                      )}
                                      placeholder="Select Type"
                                      isEditable={true}
                                      resetKey={selectResetKey}
                                    />
                                    {renderFieldError(
                                      `section1_5.ffiArray.${index}.organisationType`
                                    )}
                                  </div>
                                ) : (
                                  item.organisationType || "N/A"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("1.5") ? (
                                  <div>
                                    <Input
                                      type="number"
                                      inputMode="numeric"
                                      min="1900"
                                      max="2100"
                                      value={item.yearEstablished || ""}
                                      onChange={createOnChangeHandler(
                                        `section1_5.ffiArray.${index}.yearEstablished`,
                                        (e) => {
                                          const value = e.target.value;
                                          // Only allow 4-digit years
                                          if (
                                            value === "" ||
                                            /^\d{0,4}$/.test(value)
                                          ) {
                                            const updatedArray = [...ffiArray];
                                            updatedArray[index] = {
                                              ...updatedArray[index],
                                              yearEstablished: value,
                                            };
                                            setSection15State({
                                              ...section15State,
                                              ffiArray: updatedArray,
                                            });
                                            setShowValidationErrors(true);
                                          }
                                        }
                                      )}
                                      className={cn(
                                        "w-full",
                                        getInputValidationClass(
                                          `section1_5.ffiArray.${index}.yearEstablished`
                                        )
                                      )}
                                      placeholder="Enter year (YYYY)"
                                    />
                                    {renderFieldError(
                                      `section1_5.ffiArray.${index}.yearEstablished`
                                    )}
                                  </div>
                                ) : (
                                  item.yearEstablished || "N/A"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("1.5") ? (
                                  <div>
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.01"
                                      min="0"
                                      value={item.totalFunding || ""}
                                      onChange={createOnChangeHandler(
                                        `section1_5.ffiArray.${index}.totalFunding`,
                                        (e) => {
                                          const value = e.target.value;
                                          // Only allow numbers and decimal point
                                          if (
                                            value === "" ||
                                            /^\d*\.?\d*$/.test(value)
                                          ) {
                                            const updatedArray = [...ffiArray];
                                            updatedArray[index] = {
                                              ...updatedArray[index],
                                              totalFunding: value,
                                            };
                                            setSection15State({
                                              ...section15State,
                                              ffiArray: updatedArray,
                                            });
                                            setShowValidationErrors(true);
                                          }
                                        }
                                      )}
                                      className={cn(
                                        "w-full",
                                        getInputValidationClass(
                                          `section1_5.ffiArray.${index}.totalFunding`
                                        )
                                      )}
                                      placeholder="Enter funding"
                                    />
                                    {renderFieldError(
                                      `section1_5.ffiArray.${index}.totalFunding`
                                    )}
                                  </div>
                                ) : (
                                  item.totalFunding || "N/A"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("1.5") ? (
                                  <div>
                                    <Input
                                      type="url"
                                      value={item.website || ""}
                                      onChange={createOnChangeHandler(
                                        `section1_5.ffiArray.${index}.website`,
                                        (e) => {
                                          const updatedArray = [...ffiArray];
                                          updatedArray[index] = {
                                            ...updatedArray[index],
                                            website: e.target.value,
                                          };
                                          setSection15State({
                                            ...section15State,
                                            ffiArray: updatedArray,
                                          });
                                          setShowValidationErrors(true);
                                        }
                                      )}
                                      className={cn(
                                        "w-full",
                                        getInputValidationClass(
                                          `section1_5.ffiArray.${index}.website`
                                        )
                                      )}
                                      placeholder="Enter website"
                                    />
                                    {renderFieldError(
                                      `section1_5.ffiArray.${index}.website`
                                    )}
                                  </div>
                                ) : (
                                  item.website || "N/A"
                                )}
                              </td>
                              {shouldBeEditable("1.5") && (
                                <td className="py-3 px-4 text-sm font-normal">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log(
                                        `[Section_1_5] Delete button clicked for item:`,
                                        item
                                      );
                                      console.log(
                                        `[Section_1_5] isEditable("1.5"):`,
                                        shouldBeEditable("1.5")
                                      );
                                      console.log(
                                        `[Section_1_5] Current ffiArray:`,
                                        ffiArray
                                      );

                                      // Handle deletion: Always use index-based deletion for reliability
                                      // This prevents issues when multiple items have the same ID or no ID
                                      const updatedArray = ffiArray.filter(
                                        (ffiItem, idx) => {
                                          // Always compare by index to ensure we only delete the intended item
                                          const shouldKeep = idx !== index;
                                          console.log(
                                            `[Section_1_5] Comparing by index - idx:`,
                                            idx,
                                            `target index:`,
                                            index,
                                            `shouldKeep:`,
                                            shouldKeep
                                          );
                                          return shouldKeep;
                                        }
                                      );

                                      console.log(
                                        `[Section_1_5] Updated ffiArray:`,
                                        updatedArray
                                      );
                                      setSection15State({
                                        ...section15State,
                                        ffiArray: updatedArray,
                                      });
                                    }}
                                    className="text-red-500 hover:text-red-700 border-none bg-none"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Add More Button - Only visible when in edit mode */}
                  {shouldBeEditable("1.5") && !showAddForm1_5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                      onClick={() => setShowAddForm1_5(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Add More
                    </Button>
                  )}

                  {/* Add Entry Form - Only visible when showAddForm1_5 is true */}
                  {showAddForm1_5 && shouldBeEditable("1.5") && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">Add New Organization</h4>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <Label>Organisation Name</Label>
                          <Input
                            value={newEntry1_5.organisationName}
                            onChange={createOnChangeHandler(
                              "section1_5.ffiArray.new.organisationName",
                              (e) => {
                                setNewEntry1_5({
                                  ...newEntry1_5,
                                  organisationName: e.target.value,
                                });
                                setShowValidationErrors(true);
                              }
                            )}
                            className={cn(
                              "bg-white",
                              getInputValidationClass(
                                "section1_5.ffiArray.new.organisationName"
                              )
                            )}
                            placeholder="Enter organisation name"
                          />
                          {renderFieldError(
                            "section1_5.ffiArray.new.organisationName"
                          )}
                        </div>
                        <div>
                          <Label>Organisation Type</Label>
                          <Dropdown
                            options={dropdownValues.issuingAuthorityList.map(
                              (opt) => ({ label: opt, value: opt })
                            )}
                            value={newEntry1_5.organisationType}
                            onChange={createOnValueChangeHandler(
                              "section1_5.ffiArray.new.organisationType",
                              (value) => {
                                setNewEntry1_5({
                                  ...newEntry1_5,
                                  organisationType: value,
                                });
                                setShowValidationErrors(true);
                              }
                            )}
                            placeholder="Select Type"
                            isEditable={true}
                          />
                          {renderFieldError(
                            "section1_5.ffiArray.new.organisationType"
                          )}
                        </div>
                        <div>
                          <Label>Year of Establishment</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min="1900"
                            max="2100"
                            value={newEntry1_5.yearEstablished}
                            onChange={createOnChangeHandler(
                              "section1_5.ffiArray.new.yearEstablished",
                              (e) => {
                                const value = e.target.value;
                                // Only allow 4-digit years
                                if (value === "" || /^\d{0,4}$/.test(value)) {
                                  setNewEntry1_5({
                                    ...newEntry1_5,
                                    yearEstablished: value,
                                  });
                                  setShowValidationErrors(true);
                                }
                              }
                            )}
                            className="bg-white"
                            placeholder="Enter year (YYYY)"
                          />
                        </div>
                        <div>
                          <Label>Total Funding (₹ Crores)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={newEntry1_5.totalFunding}
                            onChange={createOnChangeHandler(
                              "section1_5.ffiArray.new.totalFunding",
                              (e) => {
                                const value = e.target.value;
                                // Only allow numbers and decimal point
                                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                  setNewEntry1_5({
                                    ...newEntry1_5,
                                    totalFunding: value,
                                  });
                                  setShowValidationErrors(true);
                                }
                              }
                            )}
                            className={cn(
                              "bg-white",
                              getInputValidationClass(
                                "section1_5.ffiArray.new.totalFunding"
                              )
                            )}
                            placeholder="Enter funding"
                          />
                          {renderFieldError(
                            "section1_5.ffiArray.new.totalFunding"
                          )}
                        </div>
                        <div>
                          <Label>Website</Label>
                          <Input
                            type="url"
                            value={newEntry1_5.website}
                            onChange={createOnChangeHandler(
                              "section1_5.ffiArray.new.website",
                              (e) => {
                                setNewEntry1_5({
                                  ...newEntry1_5,
                                  website: e.target.value,
                                });
                                setShowValidationErrors(true);
                              }
                            )}
                            className={cn(
                              "bg-white",
                              getInputValidationClass(
                                "section1_5.ffiArray.new.website"
                              )
                            )}
                            placeholder="Enter website"
                          />
                          {renderFieldError("section1_5.ffiArray.new.website")}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleAddNewEntry1_5}
                          className="flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Save Entry
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddForm1_5(false);
                            setNewEntry1_5({
                              organisationName: "",
                              organisationType: "",
                              yearEstablished: "",
                              totalFunding: "",
                              website: "",
                            });
                          }}
                          className="flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Show comment field if hasIntermediary is "no" */}
              {section15State?.hasIntermediary === "no" && (
                <div>
                  <Label>Comment</Label>
                  {shouldBeEditable("1.5") ? (
                    <Textarea
                      value={section15State?.comment || ""}
                      onChange={createOnChangeHandler(
                        "section1_5.comment",
                        (e) => {
                          setSection15State({
                            ...section15State,
                            comment: e.target.value,
                          });
                          setShowValidationErrors(true);
                        }
                      )}
                      className={cn(
                        "bg-white mt-2",
                        getInputValidationClass("section1_5.comment")
                      )}
                      placeholder="Enter comment"
                      rows={4}
                    />
                  ) : (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      {section15State?.comment || "No comment provided"}
                    </div>
                  )}
                  {renderFieldError("section1_5.comment")}
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>

      <MessageModal
        isOpen={activeSection !== null}
        onClose={handleCloseModal}
        onSave={handleSaveMessage}
        sectionTitle={activeSection ? getSectionTitle(activeSection) : ""}
        sectionId={activeSection || ""}
        submissionId={submissionId}
        existingMessage=""
        commentType={(() => {
          const getUserRole = () => {
            try {
              const authUser = localStorage.getItem("niri_app:auth_user");
              if (authUser) {
                const user = JSON.parse(authUser);
                return user.value?.role;
              }
            } catch (error) {
              console.error("Error reading user role:", error);
            }
            return null;
          };
          const userRole = getUserRole();
          return userRole === "MOSPI_REVIEWER"
            ? "comment"
            : "indicator_comment";
        })()}
        onSendBack={
          // For MOSPI_REVIEWER, don't call onSendBack (no status updates needed)
          (() => {
            const getUserRole = () => {
              try {
                const authUser = localStorage.getItem("niri_app:auth_user");
                if (authUser) {
                  const user = JSON.parse(authUser);
                  return user.value?.role;
                }
              } catch (error) {
                console.error("Error reading user role:", error);
              }
              return null;
            };
            return getUserRole() === "MOSPI_REVIEWER";
          })()
            ? undefined
            : // Pass onSendBack callback to prevent auto-close when we need to show confirmation
            // For MOSPI_APPROVER Sent Back, we'll show confirmation in handleSaveMessage
            // Accept no longer requires comment, so it's not included here
            // For other cases, use the normal flow
            isMospiApproverSentBack
            ? async () => {
                // This prevents auto-close - handleSaveMessage will handle closing and showing confirmation
                console.log(
                  "MOSPI_APPROVER Sent Back - showing confirmation in handleSaveMessage"
                );
              }
            : (sectionId) => onIndicatorStatus(sectionId, false)
        }
      />

      <TimelineModal
        isOpen={timelineSection !== null}
        onClose={handleCloseTimeline}
        sectionId={timelineSection || ""}
        sectionTitle={timelineSection ? getSectionTitle(timelineSection) : ""}
        comments={getAllComments()}
        key={`timeline-${timelineSection}-${
          getAllComments().length
        }-${Date.now()}`} // Force re-render when comments change
      />

      {/* Confirmation Dialog for NODAL_OFFICER Save */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save this indicator? This will resubmit
              it to the State Approver.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSave}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for STATE_APPROVER and MOSPI_APPROVER Send Back */}
      <AlertDialog
        open={showSendBackDialog}
        onOpenChange={setShowSendBackDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send Back</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const getUserRole = () => {
                  try {
                    const authUser = localStorage.getItem("niri_app:auth_user");
                    if (authUser) {
                      const user = JSON.parse(authUser);
                      return user.value?.role;
                    }
                  } catch (error) {
                    console.error("Error reading user role:", error);
                  }
                  return null;
                };
                const userRole = getUserRole();
                const isMospiApprover = userRole === "MOSPI_APPROVER";

                return isMospiApprover
                  ? "Are you sure you want to send this section back to the State Approver? This action will mark the section as REVERTED."
                  : "Are you sure you want to send back this section? On send back, this will be returned to the Nodal Officer for corrections.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSendBack}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSendBack}>
              Confirm & Send Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for STATE_APPROVER and MOSPI_APPROVER Accept */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Accept</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const getUserRole = () => {
                  try {
                    const authUser = localStorage.getItem("niri_app:auth_user");
                    if (authUser) {
                      const user = JSON.parse(authUser);
                      return user.value?.role;
                    }
                  } catch (error) {
                    console.error("Error reading user role:", error);
                  }
                  return null;
                };
                const userRole = getUserRole();
                const isMospiApprover = userRole === "MOSPI_APPROVER";

                return isMospiApprover
                  ? "Are you sure you want to accept this section? This action will mark the section as ACCEPTED and finalize the review."
                  : "Are you sure you want to accept this section? Now it is moved to the Reviewer. No further action can be taken after accept.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAccept}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccept}>
              Confirm & Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
