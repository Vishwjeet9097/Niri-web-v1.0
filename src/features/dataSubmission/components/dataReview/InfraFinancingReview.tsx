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
import { useState, useEffect, useMemo, useRef } from "react";
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

import { Section_1_3 } from "./Sections/Section_1_3";
import { Section_1_4 } from "./Sections/Section_1_4";
import { validateInfraFinancing } from "@/features/submission/validation/infraFinancingValidation";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";

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
  // Section 1.4 state management
  const [section14State, setSection14State] = useState({
    totalULBs: formData?.section1_4?.totalULBs || 0,
    bondList: formData?.section1_4?.bondList || [],
  });

  useEffect(() => {
    if (!isRestoringRef.current) {
      setSection14State({
        totalULBs: formData?.section1_4?.totalULBs || 0,
        bondList: formData?.section1_4?.bondList || [],
      });
    }
  }, [formData?.section1_4]);
  const { saveMessage, getMessage, getComments, getAllComments } =
    useSectionMessages(submissionId, submission);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);
  const { setFormDataForSection, updateSectionField, getSectionData } =
    useFormDataStore();

  // Section 1.3 state management
  const [section13State, setSection13State] = useState({
    totalULBs: formData?.section1_3?.totalULBs || 0,
    ulbList: formData?.section1_3?.ulbList || [],
  });

  useEffect(() => {
    if (!isRestoringRef.current) {
      setSection13State({
        totalULBs: formData?.section1_3?.totalULBs || 0,
        ulbList: formData?.section1_3?.ulbList || [],
      });
    }
  }, [formData?.section1_3]);

  // Section 1.5 state management
  const [section15State, setSection15State] = useState<{
    hasIntermediary?: string;
    ffiArray?: any[];
    comment?: string;
  }>(formData?.section1_5 || { ffiArray: [] });

  // Validation error state
  const [validationErrors, setValidationErrors] = useState<any>({});
  const { assignedIndicators: hookAssignedIndicators } = useIndicatorAccess();

  // Helper function to get error message for a field
  const getFieldError = (fieldPath: string): string | undefined => {
    return validationErrors[fieldPath];
  };

  useEffect(() => {
    if (!isRestoringRef.current) {
      // Handle both old format (array) and new format (object)
      if (Array.isArray(formData?.section1_5)) {
        setSection15State({ ffiArray: formData.section1_5 });
      } else {
        setSection15State(formData?.section1_5 || { ffiArray: [] });
      }
    }
  }, [formData?.section1_5]);

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
  const sectionsWithData = useMemo(() => {
    const detectedSections =
      getSectionsWithData({ infraFinancing: formData }, "infraFinancing") || [];

    const infraPayload =
      formData && (formData as any).section1_1
        ? formData
        : formData
        ? (formData as any).infraFinancing || formData
        : {};

    // Filter out sections 1.1 and 1.2 from detectedSections if they don't have meaningful data
    // (exclude year, percentage, and marksObtained from meaningful data check)
    const filteredDetectedSections = detectedSections.filter((sec) => {
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
      // Don't include them just because they exist in formData
      const section1_3 = infraPayload.section1_3;
      if (section1_3 && typeof section1_3 === "object") {
        const hasSection1_3Data =
          Array.isArray(section1_3.ulbList) && section1_3.ulbList.length > 0;
        if (hasSection1_3Data && !merged.includes("section1_3")) {
          merged.push("section1_3");
        }
      }

      const section1_4 = infraPayload.section1_4;
      if (section1_4 && typeof section1_4 === "object") {
        const hasSection1_4Data =
          Array.isArray(section1_4.bondList) && section1_4.bondList.length > 0;
        if (hasSection1_4Data && !merged.includes("section1_4")) {
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
        if (hasSection1_5Data && !merged.includes("section1_5")) {
          merged.push("section1_5");
        }
      }
    }

    // Final safety filter: verify each section has actual data
    // All sections (including 1.3, 1.4, 1.5) should be filtered based on meaningful data
    // This ensures only saved/submitted indicators are shown to STATE_APPROVER
    const final = merged.filter((sec) => {
      if (sec === "section1_1") {
        const section = infraPayload?.section1_1;
        if (!section) {
          console.log("🚫 Section 1.1 excluded: no section object");
          return false;
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
        console.log(
          `${hasData ? "✅" : "🚫"} Section 1.1 ${
            hasData ? "included" : "excluded"
          }:`,
          section
        );
        return hasData;
      }
      if (sec === "section1_2") {
        const section = infraPayload?.section1_2;
        if (!section) {
          console.log("🚫 Section 1.2 excluded: no section object");
          return false;
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
        console.log(
          `${hasData ? "✅" : "🚫"} Section 1.2 ${
            hasData ? "included" : "excluded"
          }:`,
          section
        );
        return hasData;
      }
      if (sec === "section1_3") {
        return (
          Array.isArray(infraPayload?.section1_3?.ulbList) &&
          infraPayload.section1_3.ulbList.length > 0
        );
      }
      if (sec === "section1_4") {
        return (
          Array.isArray(infraPayload?.section1_4?.bondList) &&
          infraPayload.section1_4.bondList.length > 0
        );
      }
      if (sec === "section1_5") {
        const section = infraPayload?.section1_5;
        if (!section) return false;

        // Check if it has the new format with hasIntermediary
        if (section.hasIntermediary === "yes") {
          return true; // "yes" always has data (even if ffiArray is empty initially)
        }
        if (section.hasIntermediary === "no") {
          // "no" requires a comment to be considered as having data
          const comment = section.comment || "";
          return comment.trim() !== "";
        }
        // Check if it has ffiArray with data (legacy format or yes with items)
        if (Array.isArray(section.ffiArray) && section.ffiArray.length > 0)
          return true;
        // Check if it's the old array format
        if (Array.isArray(section) && section.length > 0) return true;
        return false;
      }
      return true;
    });

    return final;
  }, [formData, isPreview, isNodalOfficer, assignedIndicators]);

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

  // Initialize section 1.2 state from formData (but not when restoring from cancel)
  useEffect(() => {
    if (!isRestoringRef.current) {
      if (formData?.section1_2?.actualCapex) {
        // Extract numeric value if it's formatted
        const value =
          typeof formData.section1_2.actualCapex === "string"
            ? formData.section1_2.actualCapex
                .replace(/[₹,Crores\s]/g, "")
                .trim()
            : String(formData.section1_2.actualCapex);
        setActualCapex(value);
      } else {
        setActualCapex("");
      }

      if (formData?.section1_2?.stateCapexUtilisation) {
        // Extract numeric value if it's formatted
        const value =
          typeof formData.section1_2.stateCapexUtilisation === "string"
            ? formData.section1_2.stateCapexUtilisation
                .replace(/[₹,Crores\s]/g, "")
                .trim()
            : String(formData.section1_2.stateCapexUtilisation);
        setStateCapexUtilisation(value);
      } else {
        setStateCapexUtilisation("");
      }
    }
  }, [formData?.section1_2]);

  // State for edit fucntionality indicator wise
  const { setEditable, isEditable, clearAllEditing } =
    useEditableSectionStore();

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
      // NODAL_OFFICER can only edit when status is DRAFT or RETURNED_FROM_STATE
      const statusAllowsEditing =
        submissionStatus === "DRAFT" ||
        submissionStatus === "RETURNED_FROM_STATE";
      const result = statusAllowsEditing ? isEditable(sectionId) : false;
      console.log(`[InfraFinancingReview] NODAL_OFFICER shouldBeEditable:`, {
        sectionId,
        submissionStatus,
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
      // STATE_APPROVER can edit when status is DRAFT, SUBMITTED_TO_STATE, or RETURNED_FROM_MOSPI
      // Should NOT have editing access when status is SUBMITTED_TO_MOSPI_REVIEWER or SUBMITTED_TO_MOSPI_APPROVER
      if (
        submissionStatus !== "DRAFT" &&
        submissionStatus !== "SUBMITTED_TO_STATE" &&
        submissionStatus !== "RETURNED_FROM_MOSPI"
      ) {
        return false;
      }

      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData = formData && formData[sectionKey];
      const mospiStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.mospi_status
          : sectionData?.mospi_status
        : undefined;

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
      // NODAL_OFFICER can only edit when status is DRAFT or RETURNED_FROM_STATE
      const canEdit =
        submissionStatus === "DRAFT" ||
        submissionStatus === "RETURNED_FROM_STATE";
      console.log(`[InfraFinancingReview] NODAL_OFFICER canEdit check:`, {
        sectionId,
        submissionStatus,
        canEdit,
        reason: canEdit
          ? "Status allows editing"
          : `Status ${submissionStatus} does not allow editing (needs DRAFT or RETURNED_FROM_STATE)`,
      });
      return canEdit;
    }

    if (isStateApprover) {
      // STATE_APPROVER can edit when status is DRAFT, SUBMITTED_TO_STATE, or RETURNED_FROM_MOSPI
      if (
        submissionStatus !== "DRAFT" &&
        submissionStatus !== "SUBMITTED_TO_STATE" &&
        submissionStatus !== "RETURNED_FROM_MOSPI"
      ) {
        return false;
      }

      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData = formData && formData[sectionKey];
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
    // Store a deep copy of all relevant state
    setOriginalStateSnapshot({
      submissionData: JSON.parse(JSON.stringify(submissionData)),
      capitalAllocation,
      gsdpForFY,
      actualCapex,
      stateCapexUtilisation,
      section13State: JSON.parse(JSON.stringify(section13State)),
      section14State: JSON.parse(JSON.stringify(section14State)),
      section15State: JSON.parse(JSON.stringify(section15State)),
    });
    setEditable(sectionId, true);
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
      setSubmissionData(originalStateSnapshot.submissionData);
      setCapitalAllocation(originalStateSnapshot.capitalAllocation);
      setGsdpForFY(originalStateSnapshot.gsdpForFY);
      setActualCapex(originalStateSnapshot.actualCapex);
      setStateCapexUtilisation(originalStateSnapshot.stateCapexUtilisation);
      setSection13State(originalStateSnapshot.section13State);
      setSection14State(originalStateSnapshot.section14State);
      setSection15State(originalStateSnapshot.section15State);
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

    window.addEventListener(
      "niri-comment-updated",
      handleCommentUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "niri-comment-updated",
        handleCommentUpdate as EventListener
      );
    };
  }, [submissionId]);

  // Initialize values from formData when availableimage.png
  useEffect(() => {
    // Debug logging removed for performance

    if (formData && typeof formData === "object" && "section1_1" in formData) {
      const data = formData as {
        section1_1?: { capitalAllocation?: string; gsdpForFY?: string };
      };
      // Debug logging removed for performance

      setCapitalAllocation(data.section1_1?.capitalAllocation || "");
      setGsdpForFY(data.section1_1?.gsdpForFY || "");
    } else {
      // Debug logging removed for performance
    }
  }, [formData]);

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
    const sectionData = formData && formData[sectionKey];
    const currentStatus = sectionData
      ? Array.isArray(sectionData)
        ? (sectionData as any).status
        : sectionData.status
      : undefined;
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

    // If NODAL_OFFICER and status is REVERTED (sent back), show confirmation dialog first
    if (isNodalOfficer && isReverted) {
      console.log(
        `[InfraFinancingReview] ✅ Showing save confirmation dialog for REVERTED indicator`
      );
      setPendingSaveSectionId(sectionId);
      setShowSaveDialog(true);
      return;
    }

    console.log(
      `[InfraFinancingReview] ✅ Proceeding with direct save (not REVERTED or not NODAL_OFFICER)`
    );
    // For non-NODAL_OFFICER users or non-REVERTED status, proceed with submit directly
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
              year: formData?.section1_2?.year || "2024-25",
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
        section1_1: formData?.section1_1 || {
          year: "",
          capitalAllocation: "",
          gsdpForFY: "",
          stateCapexUtilisation: "",
          allocationToGSDP: "",
          capexToCapexActuals: "",
        },
        section1_2: formData?.section1_2 || {
          year: "",
          gsdpForFY: "",
          actualCapex: "",
          budgetaryCapex: "",
          stateCapexUtilisation: "",
          capexActualsToGSDP: "",
        },
        section1_3: section13State || { totalULBs: 0, ulbList: [] },
        section1_4: section14State || { totalULBs: 0, bondList: [] },
        section1_5: {
          ffiArray: section15State?.ffiArray || [],
          hasIntermediary: section15State?.hasIntermediary || "",
          comment: section15State?.comment || "",
        },
      };

      const effectiveAssignedIndicators = assignedIndicators.length > 0 
        ? assignedIndicators 
        : (hookAssignedIndicators.length > 0 ? hookAssignedIndicators : undefined);

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
        setValidationErrors((prev) => ({ ...prev, ...sectionErrors }));
        console.warn("Validation failed for section", sectionId, sectionErrors);
        // Errors are displayed inline in the UI, no need for alert
        return;
      } else {
        // Clear errors for this section only
        setValidationErrors((prev) => {
          const filtered = { ...prev };
          Object.keys(filtered).forEach((key) => {
            if (key.startsWith(sectionPrefix)) {
              delete filtered[key];
            }
          });
          return filtered;
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
      } catch (error) {
        console.error(`[InfraFinancingReview] ❌ Save failed:`, error);
        // Don't close dialog on error so user can try again
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
                onClick={() => {
                  console.log(
                    `[InfraFinancingReview] Edit button clicked for section ${sectionId}`
                  );
                  handleEditStart(sectionId);
                }}
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
        return (
          <div className="flex gap-2">
            {!shouldBeEditable(sectionId) ? (
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
              onClick={() => setEditable(sectionId, false)}
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </>
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

        {!isNodalOfficer && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onIndicatorStatus(sectionId, true)}
            disabled={shouldBeEditable(sectionId)}
          >
            <CheckCircle className="w-4 h-4" />
            Accept
          </Button>
        )}
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
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("1.1")}
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
                  className={
                    getFieldError("section1_1.year")
                      ? "bg-gray-50 border-red-500"
                      : "bg-gray-50"
                  }
                />
                {getFieldError("section1_1.year") && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError("section1_1.year")}</p>
                )}
              </div>
              <div>
                <Label>Capital Allocation for FY <span className="text-xs text-muted-foreground">(INR - values is in CRORES)</span></Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={capitalAllocation}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow numbers and decimal point
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setCapitalAllocation(value);
                      // Clear validation error when user starts typing
                      if (getFieldError("section1_1.capitalAllocation")) {
                        setValidationErrors((prev) => {
                          const updated = { ...prev };
                          delete updated["section1_1.capitalAllocation"];
                          return updated;
                        });
                      }
                    }
                  }}
                  placeholder="Enter Capital Allocation value"
                  readOnly={!shouldBeEditable("1.1")}
                  className={
                    shouldBeEditable("1.1") 
                      ? getFieldError("section1_1.capitalAllocation") 
                        ? "bg-white border-red-500" 
                        : "bg-white"
                      : "bg-gray-50"
                  }
                />
                {/* <div className="text-xs text-gray-500 mt-1">
                  Current value: "{capitalAllocation}"
                </div> */}
              </div>
              <div>
                <Label>GSDP for FY <span className="text-xs text-muted-foreground">(INR - values is in CRORES)</span></Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={gsdpForFY}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow numbers and decimal point
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setGsdpForFY(value);
                      // Clear validation error when user starts typing
                      if (getFieldError("section1_1.gsdpForFY")) {
                        setValidationErrors((prev) => {
                          const updated = { ...prev };
                          delete updated["section1_1.gsdpForFY"];
                          return updated;
                        });
                      }
                    }
                  }}
                  placeholder="Enter GSDP value"
                  readOnly={!shouldBeEditable("1.1")}
                  className={
                    shouldBeEditable("1.1") 
                      ? getFieldError("section1_1.gsdpForFY") 
                        ? "bg-white border-red-500" 
                        : "bg-white"
                      : "bg-gray-50"
                  }
                />
                {/* <div className="text-xs text-gray-500 mt-1">
                  Current value: "{gsdpForFY}"
                </div> */}
              </div>
              <div>
                <Label>% Allocation to GSDP</Label>
                <div className="relative">
                  <Input
                    value={calculateAllocationPercentage()}
                    readOnly
                    className={
                      getFieldError("section1_1.allocationToGSDP")
                        ? "bg-gray-50 cursor-not-allowed pr-8 border-red-500"
                        : "bg-gray-50 cursor-not-allowed pr-8"
                    }
                    placeholder={
                      capitalAllocation && gsdpForFY
                        ? "Calculating..."
                        : "Auto-calculated"
                    }
                  />
                  {calculateAllocationPercentage() && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-sm font-medium">
                      ✓
                    </div>
                  )}
                </div>
                {/* <div className="text-xs text-gray-500 mt-1">
                  Calculation result: "{calculateAllocationPercentage()}"
                </div> */}
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
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("1.2")}
            <div className="grid grid-cols-2 gap-4 max-w-[70%]">
              <div>
                <Label>Year</Label>
                <Input
                  value={formData?.section1_2?.year || "2024-25"}
                  readOnly
                  className={
                    getFieldError("section1_2.year")
                      ? "bg-gray-50 border-red-500"
                      : "bg-gray-50"
                  }
                />
                {getFieldError("section1_2.year") && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError("section1_2.year")}</p>
                )}
              </div>
              <div>
                <Label>A₁ - Actual Capex <span className="text-xs text-muted-foreground">(INR - values is in CRORES)</span></Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={
                    shouldBeEditable("1.2")
                      ? actualCapex
                      : actualCapex
                      ? `${actualCapex}`
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow numbers and decimal point
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setActualCapex(value);
                      // Clear validation error when user starts typing
                      if (getFieldError("section1_2.actualCapex")) {
                        setValidationErrors((prev) => {
                          const updated = { ...prev };
                          delete updated["section1_2.actualCapex"];
                          return updated;
                        });
                      }
                    }
                  }}
                  placeholder="Enter Actual Capex value"
                  readOnly={!isEditable("1.2")}
                  className={
                    isEditable("1.2") 
                      ? getFieldError("section1_2.actualCapex") 
                        ? "bg-white border-red-500" 
                        : "bg-white"
                      : "bg-gray-50"
                  }
                />
                {getFieldError("section1_2.actualCapex") && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError("section1_2.actualCapex")}</p>
                )}
                {isEditable("1.2") && (
                  <div className="text-xs text-gray-500 mt-1">
                    Current value: "{actualCapex}"
                  </div>
                )}
              </div>
              <div>
                <Label>State Capex Utilisation <span className="text-xs text-muted-foreground">(INR - values is in CRORES)</span></Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={
                    shouldBeEditable("1.2")
                      ? stateCapexUtilisation
                      : stateCapexUtilisation
                      ? `${stateCapexUtilisation}`
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow numbers and decimal point
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setStateCapexUtilisation(value);
                      // Clear validation error when user starts typing
                      if (getFieldError("section1_2.stateCapexUtilisation")) {
                        setValidationErrors((prev) => {
                          const updated = { ...prev };
                          delete updated["section1_2.stateCapexUtilisation"];
                          return updated;
                        });
                      }
                    }
                  }}
                  placeholder="Enter State Capex Utilisation value"
                  readOnly={!isEditable("1.2")}
                  className={
                    isEditable("1.2") 
                      ? getFieldError("section1_2.stateCapexUtilisation") 
                        ? "bg-white border-red-500" 
                        : "bg-white"
                      : "bg-gray-50"
                  }
                />
                {getFieldError("section1_2.stateCapexUtilisation") && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError("section1_2.stateCapexUtilisation")}</p>
                )}
                {isEditable("1.2") && (
                  <div className="text-xs text-gray-500 mt-1">
                    Current value: "{stateCapexUtilisation}"
                  </div>
                )}
              </div>
              <div className="">
                <Label>% Capex Actuals to GSDP</Label>
                <Input
                  value={(() => {
                    const actualCapexNum = parseFloat(actualCapex) || 0;
                    const stateCapexUtilisationNum =
                      parseFloat(stateCapexUtilisation) || 0;

                    if (
                      isNaN(actualCapexNum) ||
                      isNaN(stateCapexUtilisationNum) ||
                      stateCapexUtilisationNum === 0
                    ) {
                      return "";
                    }

                    const percentage =
                      (actualCapexNum / stateCapexUtilisationNum) * 100;
                    return percentage.toFixed(1) + "%";
                  })()}
                  readOnly
                  className={
                    getFieldError("section1_2.capexActualsToGSDP")
                      ? "bg-gray-50 cursor-not-allowed border-red-500"
                      : "bg-gray-50 cursor-not-allowed"
                  }
                  placeholder="Auto-calculated"
                />
                {getFieldError("section1_2.capexActualsToGSDP") && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError("section1_2.capexActualsToGSDP")}</p>
                )}
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
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("1.3")}
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
              isEditable={isEditable}
              setSectionState={setSection13State}
              resetKey={selectResetKey}
              validationErrors={validationErrors}
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
            // subtitle="Annex 4: Provide Bond Details"
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("1.4")}
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
                        <Label>Value (INR)</Label>
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
              isEditable={isEditable}
              setSectionState={setSection14State}
              resetKey={selectResetKey}
              validationErrors={validationErrors}
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
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("1.5")}
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
                      setSection15State({
                        ...section15State,
                        hasIntermediary: value,
                        // Clear comment if switching to "yes"
                        ...(value === "yes" ? { comment: undefined } : {}),
                      });
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
                {getFieldError("section1_5.hasIntermediary") && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError("section1_5.hasIntermediary")}</p>
                )}
              </div>

              {/* Show table and Add More button if hasIntermediary is "yes" */}
              {section15State?.hasIntermediary === "yes" && (
                <>
                  {/* Validation error for ffiArray */}
                  {getFieldError("section1_5.ffiArray") && (
                    <p className="text-sm text-red-500">{getFieldError("section1_5.ffiArray")}</p>
                  )}
                  
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
                                      onChange={(e) => {
                                        const updatedArray = [...ffiArray];
                                        updatedArray[index] = {
                                          ...updatedArray[index],
                                          organisationName: e.target.value,
                                        };
                                        setSection15State({
                                          ...section15State,
                                          ffiArray: updatedArray,
                                        });
                                      }}
                                      className={
                                        getFieldError(`section1_5.ffiArray.${index}.organisationName`)
                                          ? "w-full border-red-500"
                                          : "w-full"
                                      }
                                      placeholder="Enter organisation name"
                                    />
                                    {getFieldError(`section1_5.ffiArray.${index}.organisationName`) && (
                                      <p className="text-sm text-red-500 mt-1">{getFieldError(`section1_5.ffiArray.${index}.organisationName`)}</p>
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
                                      onChange={(value) => {
                                        const updatedArray = [...ffiArray];
                                        updatedArray[index] = {
                                          ...updatedArray[index],
                                          organisationType: value,
                                        };
                                        setSection15State({
                                          ...section15State,
                                          ffiArray: updatedArray,
                                        });
                                      }}
                                      placeholder="Select Type"
                                      isEditable={true}
                                      resetKey={selectResetKey}
                                    />
                                    {getFieldError(`section1_5.ffiArray.${index}.organisationType`) && (
                                      <p className="text-sm text-red-500 mt-1">{getFieldError(`section1_5.ffiArray.${index}.organisationType`)}</p>
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
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // Only allow 4-digit years
                                        if (value === "" || /^\d{0,4}$/.test(value)) {
                                          const updatedArray = [...ffiArray];
                                          updatedArray[index] = {
                                            ...updatedArray[index],
                                            yearEstablished: value,
                                          };
                                          setSection15State({
                                            ...section15State,
                                            ffiArray: updatedArray,
                                          });
                                          // Clear validation error when user starts typing
                                          if (getFieldError(`section1_5.ffiArray.${index}.yearEstablished`)) {
                                            setValidationErrors((prev) => {
                                              const updated = { ...prev };
                                              delete updated[`section1_5.ffiArray.${index}.yearEstablished`];
                                              return updated;
                                            });
                                          }
                                        }
                                      }}
                                      className={
                                        getFieldError(`section1_5.ffiArray.${index}.yearEstablished`)
                                          ? "w-full border-red-500"
                                          : "w-full"
                                      }
                                      placeholder="Enter year (YYYY)"
                                    />
                                    {getFieldError(`section1_5.ffiArray.${index}.yearEstablished`) && (
                                      <p className="text-sm text-red-500 mt-1">{getFieldError(`section1_5.ffiArray.${index}.yearEstablished`)}</p>
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
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // Only allow numbers and decimal point
                                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                          const updatedArray = [...ffiArray];
                                          updatedArray[index] = {
                                            ...updatedArray[index],
                                            totalFunding: value,
                                          };
                                          setSection15State({
                                            ...section15State,
                                            ffiArray: updatedArray,
                                          });
                                          // Clear validation error when user starts typing
                                          if (getFieldError(`section1_5.ffiArray.${index}.totalFunding`)) {
                                            setValidationErrors((prev) => {
                                              const updated = { ...prev };
                                              delete updated[`section1_5.ffiArray.${index}.totalFunding`];
                                              return updated;
                                            });
                                          }
                                        }
                                      }}
                                      className={
                                        getFieldError(`section1_5.ffiArray.${index}.totalFunding`)
                                          ? "w-full border-red-500"
                                          : "w-full"
                                      }
                                      placeholder="Enter funding"
                                    />
                                    {getFieldError(`section1_5.ffiArray.${index}.totalFunding`) && (
                                      <p className="text-sm text-red-500 mt-1">{getFieldError(`section1_5.ffiArray.${index}.totalFunding`)}</p>
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
                                      onChange={(e) => {
                                        const updatedArray = [...ffiArray];
                                        updatedArray[index] = {
                                          ...updatedArray[index],
                                          website: e.target.value,
                                        };
                                        setSection15State({
                                          ...section15State,
                                          ffiArray: updatedArray,
                                        });
                                        // Clear validation error when user starts typing
                                        if (getFieldError(`section1_5.ffiArray.${index}.website`)) {
                                          setValidationErrors((prev) => {
                                            const updated = { ...prev };
                                            delete updated[`section1_5.ffiArray.${index}.website`];
                                            return updated;
                                          });
                                        }
                                      }}
                                      className={
                                        getFieldError(`section1_5.ffiArray.${index}.website`)
                                          ? "w-full border-red-500"
                                          : "w-full"
                                      }
                                      placeholder="Enter website"
                                    />
                                    {getFieldError(`section1_5.ffiArray.${index}.website`) && (
                                      <p className="text-sm text-red-500 mt-1">{getFieldError(`section1_5.ffiArray.${index}.website`)}</p>
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
                                    onClick={() => {
                                      const updatedArray = ffiArray.filter(
                                        (_, idx) => idx !== index
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
                  {isEditable("1.5") && !showAddForm1_5 && (
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
                  {showAddForm1_5 && isEditable("1.5") && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">Add New Organization</h4>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <Label>Organisation Name</Label>
                          <Input
                            value={newEntry1_5.organisationName}
                            onChange={(e) =>
                              setNewEntry1_5({
                                ...newEntry1_5,
                                organisationName: e.target.value,
                              })
                            }
                            className={
                              getFieldError("section1_5.ffiArray.new.organisationName")
                                ? "bg-white border-red-500"
                                : "bg-white"
                            }
                            placeholder="Enter organisation name"
                          />
                          {getFieldError("section1_5.ffiArray.new.organisationName") && (
                            <p className="text-sm text-red-500 mt-1">{getFieldError("section1_5.ffiArray.new.organisationName")}</p>
                          )}
                        </div>
                        <div>
                          <Label>Organisation Type</Label>
                          <Dropdown
                            options={dropdownValues.issuingAuthorityList.map(
                              (opt) => ({ label: opt, value: opt })
                            )}
                            value={newEntry1_5.organisationType}
                            onChange={(value) =>
                              setNewEntry1_5({
                                ...newEntry1_5,
                                organisationType: value,
                              })
                            }
                            placeholder="Select Type"
                            isEditable={true}
                          />
                          {getFieldError("section1_5.ffiArray.new.organisationType") && (
                            <p className="text-sm text-red-500 mt-1">{getFieldError("section1_5.ffiArray.new.organisationType")}</p>
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
                            onChange={(e) => {
                              const value = e.target.value;
                              // Only allow 4-digit years
                              if (value === "" || /^\d{0,4}$/.test(value)) {
                                setNewEntry1_5({
                                  ...newEntry1_5,
                                  yearEstablished: value,
                                });
                              }
                            }}
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
                            onChange={(e) => {
                              const value = e.target.value;
                              // Only allow numbers and decimal point
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                setNewEntry1_5({
                                  ...newEntry1_5,
                                  totalFunding: value,
                                });
                                // Clear validation error when user starts typing
                                if (getFieldError("section1_5.ffiArray.new.totalFunding")) {
                                  setValidationErrors((prev) => {
                                    const updated = { ...prev };
                                    delete updated["section1_5.ffiArray.new.totalFunding"];
                                    return updated;
                                  });
                                }
                              }
                            }}
                            className={
                              getFieldError("section1_5.ffiArray.new.totalFunding")
                                ? "bg-white border-red-500"
                                : "bg-white"
                            }
                            placeholder="Enter funding"
                          />
                          {getFieldError("section1_5.ffiArray.new.totalFunding") && (
                            <p className="text-sm text-red-500 mt-1">{getFieldError("section1_5.ffiArray.new.totalFunding")}</p>
                          )}
                        </div>
                        <div>
                          <Label>Website</Label>
                          <Input
                            type="url"
                            value={newEntry1_5.website}
                            onChange={(e) => {
                              setNewEntry1_5({
                                ...newEntry1_5,
                                website: e.target.value,
                              });
                              // Clear validation error when user starts typing
                              if (getFieldError("section1_5.ffiArray.new.website")) {
                                setValidationErrors((prev) => {
                                  const updated = { ...prev };
                                  delete updated["section1_5.ffiArray.new.website"];
                                  return updated;
                                });
                              }
                            }}
                            className={
                              getFieldError("section1_5.ffiArray.new.website")
                                ? "bg-white border-red-500"
                                : "bg-white"
                            }
                            placeholder="Enter website"
                          />
                          {getFieldError("section1_5.ffiArray.new.website") && (
                            <p className="text-sm text-red-500 mt-1">{getFieldError("section1_5.ffiArray.new.website")}</p>
                          )}
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
                      onChange={(e) => {
                        setSection15State({
                          ...section15State,
                          comment: e.target.value,
                        });
                        // Clear validation error when user starts typing
                        if (getFieldError("section1_5.comment")) {
                          setValidationErrors((prev) => {
                            const updated = { ...prev };
                            delete updated["section1_5.comment"];
                            return updated;
                          });
                        }
                      }}
                      className={
                        getFieldError("section1_5.comment") 
                          ? "bg-white mt-2 border-red-500" 
                          : "bg-white mt-2"
                      }
                      placeholder="Enter comment"
                      rows={4}
                    />
                  ) : (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      {section15State?.comment || "No comment provided"}
                    </div>
                  )}
                  {getFieldError("section1_5.comment") && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError("section1_5.comment")}</p>
                  )}
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
