import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Upload,
  Plus,
  Clock,
  RotateCcw,
  CheckCircle,
  X,
  Check,
  Edit3,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageModal } from "../modals/MessageModal";
import { TimelineModal } from "../modals/TimelineModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";
import {
  hasInfraDevelopmentData,
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
import { EditableFileDisplay } from "../EditableFileDisplay";
import type { FileUpload } from "@/types";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";

const toFileArray = (
  value: FileUpload | FileUpload[] | null | undefined
): FileUpload[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const toSingleFile = (
  value: FileUpload | FileUpload[] | null | undefined
): FileUpload | null => {
  if (Array.isArray(value)) {
    return value.length > 0 ? (value[0] as FileUpload) : null;
  }
  return value ?? null;
};

interface InfraDevelopmentReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
  assignedIndicators?: string[]; // Assigned indicators for nodal officers
  isNodalOfficer?: boolean; // Whether the user is a nodal officer
}

export const InfraDevelopmentReview = ({
  submissionId,
  formData,
  submission,
  isPreview = false,
  assignedIndicators = [],
  isNodalOfficer = false,
}: InfraDevelopmentReviewProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);
  const [submissionState, setSubmissionState] = useState(submission);
  const [formDataState, setFormDataState] = useState(formData);

  // Use submissionState for the hook so it gets updated comments
  // Merge submission prop updates with local submissionState
  const currentSubmission = submissionState || submission;
  const { saveMessage, getMessage, getComments, getAllComments } =
    useSectionMessages(submissionId, currentSubmission);

  // Sync submissionState when submission prop changes from parent
  useEffect(() => {
    if (submission) {
      setSubmissionState(submission);
    }
  }, [submission]);

  // Store original formDataState snapshot when edit mode starts (for cancel functionality)
  const [originalFormDataSnapshot, setOriginalFormDataSnapshot] =
    useState<any>(null);
  // Flag to prevent useEffect from overriding cancel restore
  const isRestoringRef = useRef(false);
  // Counter to force remount of Select components on cancel
  const [selectResetKey, setSelectResetKey] = useState(0);

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

  // State for Add More forms in sections 2.1, 2.2, 2.3, 2.4, and 2.5
  const [showAddForm2_1, setShowAddForm2_1] = useState(false);
  const [showAddForm2_2, setShowAddForm2_2] = useState(false);
  const [showAddForm2_3, setShowAddForm2_3] = useState(false);
  const [showAddForm2_4, setShowAddForm2_4] = useState(false);
  const [showAddForm2_5, setShowAddForm2_5] = useState(false);
  const [newEntry2_1, setNewEntry2_1] = useState({
    sector: "",
    files: [] as FileUpload[],
  });
  const [newEntry2_2, setNewEntry2_2] = useState({
    sector: "",
    files: [] as FileUpload[],
  });
  const [newEntry2_3, setNewEntry2_3] = useState({
    sector: "",
    files: [] as FileUpload[],
  });
  const [newEntry2_4, setNewEntry2_4] = useState({
    projectName: "",
    dprFile: null as FileUpload | null,
  });
  const [newEntry2_5, setNewEntry2_5] = useState({
    projectName: "",
    sector: "",
    type: "",
    ownership: "",
    estimatedMonetization: "",
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

  //State for edit button
  const { setEditable, isEditable, clearAllEditing } =
    useEditableSectionStore();

  // Handle edit mode start - store original state snapshot
  const handleEditStart = (sectionId: string) => {
    // Store a deep copy of current formDataState
    setOriginalFormDataSnapshot(JSON.parse(JSON.stringify(formDataState)));
    setEditable(sectionId, true);
  };

  // Handle cancel - restore original state
  const handleCancel = (sectionId: string) => {
    if (originalFormDataSnapshot) {
      isRestoringRef.current = true;
      setFormDataState(originalFormDataSnapshot);
      setOriginalFormDataSnapshot(null);
      setEditable(sectionId, false);
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
    // Reset Add More forms on cancel
    if (sectionId === "2.1") {
      setShowAddForm2_1(false);
      setNewEntry2_1({ sector: "", files: [] });
    } else if (sectionId === "2.2") {
      setShowAddForm2_2(false);
      setNewEntry2_2({ sector: "", files: [] });
    } else if (sectionId === "2.3") {
      setShowAddForm2_3(false);
      setNewEntry2_3({ sector: "", files: [] });
    } else if (sectionId === "2.4") {
      setShowAddForm2_4(false);
      setNewEntry2_4({ projectName: "", dprFile: null });
    } else if (sectionId === "2.5") {
      setShowAddForm2_5(false);
      setNewEntry2_5({
        projectName: "",
        sector: "",
        type: "",
        ownership: "",
        estimatedMonetization: "",
      });
    }
  };

  // Handle adding new entry for section 2.1
  const handleAddNewEntry2_1 = () => {
    const sectionKey = "section2_1";
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;
    const existingArray = Array.isArray(currentSection?.infraActArray)
      ? currentSection.infraActArray
      : [];

    const newEntry = {
      id: `infra-act-${Date.now()}`,
      sector: newEntry2_1.sector,
      files: newEntry2_1.files,
    };

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      infraActArray: [...existingArray, newEntry],
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Reset form
    setNewEntry2_1({ sector: "", files: [] });
    setShowAddForm2_1(false);
  };

  // Handle adding new entry for section 2.2
  const handleAddNewEntry2_2 = () => {
    const sectionKey = "section2_2";
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;
    const existingArray = Array.isArray(currentSection?.specializedEntityArray)
      ? currentSection.specializedEntityArray
      : [];

    const newEntry = {
      id: `specialized-entity-${Date.now()}`,
      sector: newEntry2_2.sector,
      files: newEntry2_2.files,
    };

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      specializedEntityArray: [...existingArray, newEntry],
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Reset form
    setNewEntry2_2({ sector: "", files: [] });
    setShowAddForm2_2(false);
  };

  // Handle adding new entry for section 2.3
  const handleAddNewEntry2_3 = () => {
    const sectionKey = "section2_3";
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;
    const existingArray = Array.isArray(currentSection?.infraDevelopmentArray)
      ? currentSection.infraDevelopmentArray
      : [];

    const newEntry = {
      id: `infra-development-${Date.now()}`,
      sector: newEntry2_3.sector,
      files: newEntry2_3.files,
    };

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      infraDevelopmentArray: [...existingArray, newEntry],
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Reset form
    setNewEntry2_3({ sector: "", files: [] });
    setShowAddForm2_3(false);
  };

  // Handle field updates for section-level fields (not array items)
  const handleSectionFieldUpdate = (
    sectionId: string,
    fieldName: string,
    value: any
  ) => {
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;

    // If switching hasInvestmentReady to "no", reset the Add More form state
    if (
      sectionId === "2.4" &&
      fieldName === "hasInvestmentReady" &&
      value === "no"
    ) {
      setShowAddForm2_4(false);
      setNewEntry2_4({ projectName: "", dprFile: null });
    }

    // If switching hasInfraDevelopmentPlan to "no", reset the Add More form state
    if (
      sectionId === "2.3" &&
      fieldName === "hasInfraDevelopmentPlan" &&
      value === "no"
    ) {
      setShowAddForm2_3(false);
      setNewEntry2_3({ sector: "", files: [] });
    }

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      [fieldName]: value,
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));
  };

  // Handle adding new entry for section 2.4
  const handleAddNewEntry2_4 = () => {
    const sectionKey = "section2_4";
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;
    const existingArray = Array.isArray(currentSection?.investmentReadyArray)
      ? currentSection.investmentReadyArray
      : [];

    const newEntry = {
      id: `investment-ready-${Date.now()}`,
      projectName: newEntry2_4.projectName,
      dprFile: newEntry2_4.dprFile,
    };

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      investmentReadyArray: [...existingArray, newEntry],
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Reset form
    setNewEntry2_4({ projectName: "", dprFile: null });
    setShowAddForm2_4(false);
  };

  // Handle adding new entry for section 2.5
  const handleAddNewEntry2_5 = () => {
    const sectionKey = "section2_5";
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;
    const existingArray = Array.isArray(currentSection?.assetMonetizationArray)
      ? currentSection.assetMonetizationArray
      : [];

    const newEntry = {
      id: `asset-monetization-${Date.now()}`,
      projectName: newEntry2_5.projectName,
      sector: newEntry2_5.sector,
      type: newEntry2_5.type,
      ownership: newEntry2_5.ownership,
      estimatedMonetization: newEntry2_5.estimatedMonetization,
    };

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      assetMonetizationArray: [...existingArray, newEntry],
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Reset form
    setNewEntry2_5({
      projectName: "",
      sector: "",
      type: "",
      ownership: "",
      estimatedMonetization: "",
    });
    setShowAddForm2_5(false);
  };

  const normalizeInfraDevelopment = (data: any) => {
    if (!data || typeof data !== "object") return data;
    const normalized: any = { ...data };

    const ensureArraySection = (
      sectionKey: string,
      arrayKey: string,
      transformItem?: (item: any) => any
    ) => {
      const section = normalized[sectionKey];
      const status =
        (section && section.status) ||
        (Array.isArray(section) ? (section as any).status : undefined);

      let items: any[] = [];
      if (Array.isArray(section?.[arrayKey])) {
        items = section[arrayKey];
      } else if (Array.isArray(section)) {
        items = section;
      } else if (section && Array.isArray(section[arrayKey])) {
        items = section[arrayKey];
      }

      const normalizedItems = Array.isArray(items)
        ? items.map((item) => (transformItem ? transformItem(item) : item))
        : [];

      normalized[sectionKey] = {
        ...(section && !Array.isArray(section) ? section : {}),
        [arrayKey]: normalizedItems,
        ...(status !== undefined ? { status } : {}),
      };
    };

    const mapFilesArray = (item: any) => ({
      ...item,
      files: Array.isArray(item?.files) ? item.files : toFileArray(item?.files),
    });

    ensureArraySection("section2_1", "infraActArray", mapFilesArray);
    ensureArraySection("section2_2", "specializedEntityArray", mapFilesArray);
    ensureArraySection("section2_3", "infraDevelopmentArray", mapFilesArray);

    // Special handling for section2_4 to preserve hasInvestmentReady, comment, and websiteLink
    if (normalized.section2_4) {
      const section2_4 = normalized.section2_4;
      const status = section2_4?.status;
      const hasInvestmentReady = section2_4?.hasInvestmentReady;
      const comment = section2_4?.comment;
      const websiteLink = section2_4?.websiteLink;

      let items: any[] = [];
      if (Array.isArray(section2_4?.investmentReadyArray)) {
        items = section2_4.investmentReadyArray;
      } else if (Array.isArray(section2_4)) {
        items = section2_4;
      }

      const normalizedItems = Array.isArray(items)
        ? items.map((item) => ({
            ...item,
            dprFile: toSingleFile(item?.dprFile),
          }))
        : [];

      normalized.section2_4 = {
        ...(section2_4 && !Array.isArray(section2_4) ? section2_4 : {}),
        investmentReadyArray: normalizedItems,
        ...(hasInvestmentReady !== undefined && hasInvestmentReady !== null
          ? { hasInvestmentReady }
          : {}),
        ...(comment !== undefined && comment !== null ? { comment } : {}),
        ...(websiteLink !== undefined && websiteLink !== null
          ? { websiteLink }
          : {}),
        ...(status !== undefined ? { status } : {}),
      };

      console.log("🔍 [NORMALIZE section2_4]:", {
        original: section2_4,
        normalized: normalized.section2_4,
        hasInvestmentReady,
        comment,
        websiteLink,
      });
    } else {
      ensureArraySection("section2_4", "investmentReadyArray", (item) => ({
        ...item,
        dprFile: toSingleFile(item?.dprFile),
      }));
    }

    ensureArraySection("section2_5", "assetMonetizationArray");

    return normalized;
  };

  // Type assertion for formDataState to avoid TypeScript errors
  const state = (formDataState as any) || {};

  // 🔍 DEBUG: Log state for section2_4
  useEffect(() => {
    if (state?.section2_4) {
      console.log("🔍 [REVIEW STATE] section2_4 in state:", {
        section2_4: state?.section2_4,
        hasInvestmentReady: state?.section2_4?.hasInvestmentReady,
        comment: state?.section2_4?.comment,
        websiteLink: state?.section2_4?.websiteLink,
        arrayLength: Array.isArray(state?.section2_4?.investmentReadyArray)
          ? state.section2_4.investmentReadyArray.length
          : 0,
      });
    }
  }, [state?.section2_4]);

  // Sync formDataState when formData prop changes (but not when restoring from cancel)
  useEffect(() => {
    if (formData && !isRestoringRef.current) {
      const rawData = (formData as any)?.infraDevelopment || formData;
      console.log("🔍 [REVIEW NORMALIZE] Raw formData before normalize:", {
        rawData,
        section2_4: rawData?.section2_4,
      });
      const normalized = normalizeInfraDevelopment(rawData);
      console.log("🔍 [REVIEW NORMALIZE] Normalized formData:", {
        section2_4: normalized?.section2_4,
        hasInvestmentReady: normalized?.section2_4?.hasInvestmentReady,
        comment: normalized?.section2_4?.comment,
        websiteLink: normalized?.section2_4?.websiteLink,
      });
      setFormDataState(normalized);
    }
  }, [formData]);

  // Real-time update listener
  useEffect(() => {
    const handleCommentUpdate = async (event: CustomEvent) => {
      const { submissionId: eventSubmissionId, comments } = event.detail;
      if (eventSubmissionId === submissionId) {
        // Force re-render by updating a dummy state
        // 1. Update submission with fresh comments data
        setSubmissionState((prev) => ({
          ...prev,
          indicatorComment: comments,
          updatedAt: new Date().toISOString(),
        }));

        // 2. Refresh complete submission data (same as first load)
        try {
          console.log("🔄 Refreshing complete submission data...");
          const freshSubmission = await apiService.getSubmission(submissionId);

          if (freshSubmission) {
            // Update submission state with fresh data
            setSubmissionState(freshSubmission);

            // Update form data with fresh data (only this section's slice)
            if (freshSubmission.formData) {
              setFormDataState(
                normalizeInfraDevelopment(
                  freshSubmission.formData.infraDevelopment
                )
              );
            }

            console.log("✅ Fresh submission data loaded:", freshSubmission);
          }
        } catch (error) {
          console.error("❌ Failed to refresh submission data:", error);
        }
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

  // Check if this section has any data
  const hasData = hasInfraDevelopmentData({ infraDevelopment: state });
  let sectionsWithData = getSectionsWithData(
    { infraDevelopment: state },
    "infraDevelopment"
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
      "2.1": "section2_1",
      "2.2": "section2_2",
      "2.3": "section2_3",
      "2.4": "section2_4",
      "2.5": "section2_5",
    };

    assignedIndicators.forEach((indicator) => {
      const sectionKey = indicatorToSectionMap[indicator];
      if (sectionKey && !sectionsWithData.includes(sectionKey)) {
        assignedSectionKeys.push(sectionKey);
      }
    });

    sectionsWithData = [...sectionsWithData, ...assignedSectionKeys];
  }

  // For review mode (not preview) OR preview mode for non-nodal officers (e.g., state approver viewing aggregate):
  // Include all sections that exist in formData AND have meaningful data
  // Array-based sections (2.1, 2.2, 2.3, 2.4, 2.5) should only be included if their arrays have actual data
  // This prevents empty/unassigned indicators from appearing
  if (
    (!isPreview || (isPreview && !isNodalOfficer)) &&
    state &&
    typeof state === "object"
  ) {
    const allPossibleSections = [
      "section2_1",
      "section2_2",
      "section2_3",
      "section2_4",
      "section2_5",
    ];
    const existingSections = allPossibleSections.filter((sectionKey) => {
      // 🔍 DEBUG: Log filtering for sections 2.3 and 2.4
      if (sectionKey === "section2_3" || sectionKey === "section2_4") {
        console.log(`🔍 [REVIEW FILTER] Checking ${sectionKey}:`, {
          existsInState: sectionKey in state,
          section: state[sectionKey],
          stateKeys: Object.keys(state),
        });
      }

      // Check if section key exists in state
      if (!(sectionKey in state)) {
        if (sectionKey === "section2_3" || sectionKey === "section2_4") {
          console.log(`🔍 [REVIEW FILTER] ${sectionKey} NOT found in state`);
        }
        return false;
      }

      const section = state[sectionKey];

      // For array-based sections (2.1, 2.2, 2.3, 2.4, 2.5), check if array has data
      if (sectionKey === "section2_1") {
        const array = Array.isArray(section?.infraActArray)
          ? section.infraActArray
          : [];
        if (array.length === 0) return false;
        // Check if array has valid data (not just empty objects)
        return array.some((item) => {
          if (!item || typeof item !== "object") return false;
          return (
            Object.keys(item).length > 0 &&
            Object.values(item).some(
              (val) => val !== null && val !== undefined && val !== ""
            )
          );
        });
      }
      if (sectionKey === "section2_2") {
        const array = Array.isArray(section?.specializedEntityArray)
          ? section.specializedEntityArray
          : [];
        if (array.length === 0) return false;
        return array.some((item) => {
          if (!item || typeof item !== "object") return false;
          return (
            Object.keys(item).length > 0 &&
            Object.values(item).some(
              (val) => val !== null && val !== undefined && val !== ""
            )
          );
        });
      }
      if (sectionKey === "section2_3") {
        const array = Array.isArray(section?.infraDevelopmentArray)
          ? section.infraDevelopmentArray
          : [];
        // Section 2.3 also has a boolean field and comment field, so check those too
        const hasBoolean =
          section?.hasInfraDevelopmentPlan !== null &&
          section?.hasInfraDevelopmentPlan !== undefined &&
          section?.hasInfraDevelopmentPlan !== "";
        const hasComment =
          section?.comment !== null &&
          section?.comment !== undefined &&
          section?.comment !== "";

        console.log(`🔍 [REVIEW FILTER 2.3] Checking section2_3:`, {
          hasBoolean,
          hasComment,
          arrayLength: array.length,
          section,
        });

        // If boolean is set, always show (even if array is empty, because comment might be filled)
        if (hasBoolean) {
          console.log(
            `✅ [REVIEW FILTER 2.3] Showing because hasBoolean is true`
          );
          return true;
        }
        // If comment is filled, show it
        if (hasComment) {
          console.log(
            `✅ [REVIEW FILTER 2.3] Showing because hasComment is true`
          );
          return true;
        }
        // Otherwise, check if array has meaningful data
        if (array.length === 0) {
          console.log(
            `❌ [REVIEW FILTER 2.3] Not showing - array is empty and no boolean/comment`
          );
          return false;
        }
        const hasArrayData = array.some((item) => {
          if (!item || typeof item !== "object") return false;
          return (
            Object.keys(item).length > 0 &&
            Object.values(item).some(
              (val) => val !== null && val !== undefined && val !== ""
            )
          );
        });
        console.log(`🔍 [REVIEW FILTER 2.3] Array has data:`, hasArrayData);
        return hasArrayData;
      }
      if (sectionKey === "section2_4") {
        const array = Array.isArray(section?.investmentReadyArray)
          ? section.investmentReadyArray
          : [];
        // Section 2.4 also has a boolean field (hasInvestmentReady) and comment field, so check those too
        const hasBoolean =
          section?.hasInvestmentReady !== null &&
          section?.hasInvestmentReady !== undefined &&
          section?.hasInvestmentReady !== "";
        const hasComment =
          section?.comment !== null &&
          section?.comment !== undefined &&
          section?.comment !== "";

        console.log(`🔍 [REVIEW FILTER 2.4] Checking section2_4:`, {
          hasBoolean,
          hasComment,
          arrayLength: array.length,
          section,
        });

        // If boolean is set, always show (even if array is empty, because comment might be filled)
        if (hasBoolean) {
          console.log(
            `✅ [REVIEW FILTER 2.4] Showing because hasBoolean is true`
          );
          return true;
        }
        // If comment is filled, show it
        if (hasComment) {
          console.log(
            `✅ [REVIEW FILTER 2.4] Showing because hasComment is true`
          );
          return true;
        }
        // Otherwise, check if array has meaningful data
        if (array.length === 0) {
          console.log(
            `❌ [REVIEW FILTER 2.4] Not showing - array is empty and no boolean/comment`
          );
          return false;
        }
        const hasArrayData = array.some((item) => {
          if (!item || typeof item !== "object") return false;
          return (
            Object.keys(item).length > 0 &&
            Object.values(item).some(
              (val) => val !== null && val !== undefined && val !== ""
            )
          );
        });
        console.log(`🔍 [REVIEW FILTER 2.4] Array has data:`, hasArrayData);
        return hasArrayData;
      }
      if (sectionKey === "section2_5") {
        const array = Array.isArray(section?.assetMonetizationArray)
          ? section.assetMonetizationArray
          : [];
        if (array.length === 0) return false;
        return array.some((item) => {
          if (!item || typeof item !== "object") return false;
          return (
            Object.keys(item).length > 0 &&
            Object.values(item).some(
              (val) => val !== null && val !== undefined && val !== ""
            )
          );
        });
      }

      // For non-array sections, check if they have any meaningful data
      if (!section || typeof section !== "object") return false;
      return Object.values(section).some((val) => {
        if (val === null || val === undefined || val === "") return false;
        if (Array.isArray(val) && val.length === 0) return false;
        if (typeof val === "object" && Object.keys(val).length === 0)
          return false;
        return true;
      });
    });

    // Merge existing sections with sectionsWithData, avoiding duplicates
    sectionsWithData = Array.from(
      new Set([...sectionsWithData, ...existingSections])
    );
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
      // Update submission and form data so UI remains intact
      setSubmissionState(updatedSubmission);
      if ((updatedSubmission as any).formData) {
        setFormDataState((updatedSubmission as any).formData.infraDevelopment);
      }

      // Check flags BEFORE closing modal to determine if we need to show confirmation
      const shouldShowSentBackConfirmation =
        isMospiApproverSentBack && mospiSentBackSectionId;

      // If this was opened from MOSPI_APPROVER "Sent Back" button, show confirmation dialog
      if (shouldShowSentBackConfirmation) {
        // Store section ID before resetting flags
        const sectionIdToUse = mospiSentBackSectionId;
        setPendingActionSectionId(sectionIdToUse);
        // Reset the flags
        setIsMospiApproverSentBack(false);
        setMospiSentBackSectionId(null);
        // Close the comment modal
        setActiveSection(null);
        // Show confirmation dialog
        setTimeout(() => {
          setShowSendBackDialog(true);
        }, 100);
        return;
      }

      // For regular comments (not from Sent Back), just update timeline if needed
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
      "2.1": "2.1 - Availability of Infrastructure Act/Policy",
      "2.2": "2.2 - Availability of Specialised Entity",
      "2.3": "2.3 - Availability of Sector Infra Development Plan",
      "2.4": "2.4 - Availability of Investment Ready Project Pipeline",
      "2.5": "2.5 - Availability of Asset Monetization Pipeline",
    };
    return titles[sectionId] || sectionId;
  };

  const buildSectionFields = (
    sectionId: string,
    sourceState: any = state
  ): Record<string, any>[] => {
    switch (sectionId) {
      case "2.1": {
        const infraActArray = Array.isArray(
          sourceState?.section2_1?.infraActArray
        )
          ? sourceState.section2_1.infraActArray
          : [];
        const files = infraActArray.map((item: any) => ({
          id: item?.id ?? null,
          sector: item?.sector ?? null,
          files: toFileArray(item?.files).map((file: FileUpload) => ({
            id: file?.id,
            fileName: file?.fileName,
            fileSize: file?.fileSize,
            uploadedAt: file?.uploadedAt,
            filePath: file?.filePath || file?.file,
            fileUrl: file?.fileUrl,
            mimeType: file?.mimeType,
          })),
        }));
        console.log("🔨 Built fields for 2.1:", files);
        return [{ infraActArray: files }];
      }

      case "2.2": {
        const specializedEntityArray = Array.isArray(
          sourceState?.section2_2?.specializedEntityArray
        )
          ? sourceState.section2_2.specializedEntityArray
          : [];
        const files = specializedEntityArray.map((item: any) => ({
          id: item?.id ?? null,
          sector: item?.sector ?? null,
          files: toFileArray(item?.files).map((file: FileUpload) => ({
            id: file?.id,
            fileName: file?.fileName,
            fileSize: file?.fileSize,
            uploadedAt: file?.uploadedAt,
            filePath: file?.filePath || file?.file,
            fileUrl: file?.fileUrl,
            mimeType: file?.mimeType,
          })),
        }));
        console.log("🔨 Built fields for 2.2:", files);
        return [{ specializedEntityArray: files }];
      }

      case "2.3": {
        const infraDevelopmentArray = Array.isArray(
          sourceState?.section2_3?.infraDevelopmentArray
        )
          ? sourceState.section2_3.infraDevelopmentArray
          : [];
        const files = infraDevelopmentArray.map((item: any) => ({
          id: item?.id ?? null,
          sector: item?.sector ?? null,
          files: toFileArray(item?.files).map((file: FileUpload) => ({
            id: file?.id,
            fileName: file?.fileName,
            fileSize: file?.fileSize,
            uploadedAt: file?.uploadedAt,
            filePath: file?.filePath || file?.file,
            fileUrl: file?.fileUrl,
            mimeType: file?.mimeType,
          })),
        }));
        console.log("🔨 Built fields for 2.3:", files);
        return [
          {
            hasInfraDevelopmentPlan:
              sourceState?.section2_3?.hasInfraDevelopmentPlan ?? null,
            comment: sourceState?.section2_3?.comment ?? null,
            infraDevelopmentArray: files,
          },
        ];
      }

      case "2.4": {
        const investmentReadyArray = Array.isArray(
          sourceState?.section2_4?.investmentReadyArray
        )
          ? sourceState.section2_4.investmentReadyArray
          : [];
        return [
          {
            hasInvestmentReady:
              sourceState?.section2_4?.hasInvestmentReady ?? null,
            comment: sourceState?.section2_4?.comment ?? null,
            websiteLink: sourceState?.section2_4?.websiteLink ?? null,
            investmentReadyArray: investmentReadyArray.map((item: any) => ({
              id: item?.id ?? null,
              projectName: item?.projectName ?? null,
              dprFile: toSingleFile(item?.dprFile),
            })),
          },
        ];
      }

      case "2.5": {
        const assetMonetizationArray = Array.isArray(
          sourceState?.section2_5?.assetMonetizationArray
        )
          ? sourceState.section2_5.assetMonetizationArray
          : [];
        return [
          {
            assetMonetizationArray: assetMonetizationArray.map((item: any) => ({
              id: item?.id ?? null,
              projectName: item?.projectName ?? null,
              sector: item?.sector ?? null,
              type: item?.type ?? null,
              ownership: item?.ownership ?? null,
              estimatedMonetization: item?.estimatedMonetization ?? null,
            })),
          },
        ];
      }

      default:
        return [];
    }
  };

  // Changes by Harsh

  // ...existing code...

  const onSaveSection = async (sectionId: string) => {
    // Check if user is NODAL_OFFICER
    const userRole = getUserRole();
    const isNodalOfficer = userRole === "NODAL_OFFICER";

    // If NODAL_OFFICER, show confirmation dialog first
    if (isNodalOfficer) {
      setPendingSaveSectionId(sectionId);
      setShowSaveDialog(true);
      return;
    }

    // For non-NODAL_OFFICER users, proceed with submit directly
    await performSave(sectionId);
  };

  // Actual save function that performs the save operation
  const performSave = async (sectionId: string) => {
    try {
      // Map visual section id to payload section key (e.g. "2.1" -> "section2_1")
      const payloadSection = `section${sectionId.replace(".", "_")}`;

      // Use the local formData state (formDataState) to build fields for this section
      let fields = buildSectionFields(sectionId);

      // Check if user is NODAL_OFFICER to add status to payload
      const userRole = getUserRole();
      const isNodalOfficer = userRole === "NODAL_OFFICER";

      // If NODAL_OFFICER, check current status and set RESUBMITTED only if status was REVERTED
      if (isNodalOfficer && fields.length > 0) {
        // Get current status from formDataState
        const sectionKey = `section${sectionId.replace(".", "_")}`;
        const sectionData = formDataState && formDataState[sectionKey];
        const currentStatus = sectionData
          ? Array.isArray(sectionData)
            ? (sectionData as any).status
            : sectionData.status
          : undefined;
        const upperStatus = (currentStatus || "").toUpperCase();

        // Only set RESUBMITTED if the indicator was previously REVERTED (sent back)
        if (upperStatus === "REVERTED") {
          // Add status to the first field object
          fields[0] = {
            ...fields[0],
            status: "RESUBMITTED",
          };
        }
      }

      await handleSaveSection({
        submissionId,
        category: "infraDevelopment", // updated category for this file
        section: payloadSection,
        fields,
      });

      // If NODAL_OFFICER, update local state to reflect RESUBMITTED status only if it was REVERTED
      if (isNodalOfficer) {
        // Get current status from formDataState
        const sectionKey = `section${sectionId.replace(".", "_")}`;
        const sectionData = formDataState && formDataState[sectionKey];
        const currentStatus = sectionData
          ? Array.isArray(sectionData)
            ? (sectionData as any).status
            : sectionData.status
          : undefined;
        const upperStatus = (currentStatus || "").toUpperCase();

        // Only update to RESUBMITTED if the indicator was previously REVERTED (sent back)
        if (upperStatus === "REVERTED") {
          // Update formDataState to set status to RESUBMITTED
          setFormDataState((prev: any) => {
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

      // Disable editing after successful save
      setEditable(sectionId, false);
      // Clear the snapshot since save was successful
      setOriginalFormDataSnapshot(null);
    } catch (error) {
      console.error("Error saving section:", error);
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmSave = async () => {
    if (pendingSaveSectionId) {
      await performSave(pendingSaveSectionId);
      setShowSaveDialog(false);
      setPendingSaveSectionId(null);
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
      category: "infraDevelopment",
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

      // Defensive: update formDataState if section exists
      if (formDataState && (formDataState as any)[sectionKey] !== undefined) {
        setFormDataState((prev: any) => {
          const sectionData = prev?.[sectionKey];
          // Handle both array and object sections
          if (Array.isArray(sectionData)) {
            // For array sections, add status property to the array (JavaScript allows this)
            const updatedArray = [...sectionData];
            (updatedArray as any)[statusField] = statusValue;
            return {
              ...prev,
              [sectionKey]: updatedArray,
            };
          } else if (sectionData && typeof sectionData === "object") {
            // For object sections, add/update status property
            return {
              ...prev,
              [sectionKey]: {
                ...sectionData,
                [statusField]: statusValue,
              },
            };
          }
          return prev;
        });
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

    if (isStateApprover) {
      // Show appropriate dialog based on action
      setPendingActionSectionId(sectionId);
      if (status) {
        // Accept action
        setShowAcceptDialog(true);
      } else {
        // Send Back action
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
      // Comment modal is already closed before showing confirmation dialog
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

  // Helper function to handle field updates for nested array items
  const handleArrayFieldUpdate = (
    sectionId: string,
    itemIndex: number,
    fieldName: string,
    value: any
  ) => {
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;

    let nextSection: any = null;

    const buildArrayUpdate = (arrayKey: string) => {
      const existingArray = Array.isArray(currentSection?.[arrayKey])
        ? currentSection[arrayKey]
        : [];

      if (!existingArray[itemIndex]) {
        return null;
      }

      const updatedArray = [...existingArray];
      updatedArray[itemIndex] = {
        ...updatedArray[itemIndex],
        [fieldName]: value,
      };

      return {
        ...(currentSection && !Array.isArray(currentSection)
          ? currentSection
          : {}),
        [arrayKey]: updatedArray,
        ...(currentStatus !== undefined ? { status: currentStatus } : {}),
      };
    };

    switch (sectionId) {
      case "2.1":
        nextSection = buildArrayUpdate("infraActArray");
        break;
      case "2.2":
        nextSection = buildArrayUpdate("specializedEntityArray");
        break;
      case "2.3":
        nextSection = buildArrayUpdate("infraDevelopmentArray");
        break;
      case "2.4": {
        const existingArray = Array.isArray(
          currentSection?.investmentReadyArray
        )
          ? currentSection.investmentReadyArray
          : [];

        if (!existingArray[itemIndex]) {
          return;
        }

        const updatedArray = [...existingArray];
        updatedArray[itemIndex] = {
          ...updatedArray[itemIndex],
          [fieldName]: value,
        };

        nextSection = {
          ...(currentSection && !Array.isArray(currentSection)
            ? currentSection
            : {}),
          investmentReadyArray: updatedArray,
          ...(currentStatus !== undefined ? { status: currentStatus } : {}),
        };
        break;
      }
      case "2.5": {
        const existingArray = Array.isArray(
          currentSection?.assetMonetizationArray
        )
          ? currentSection.assetMonetizationArray
          : [];

        if (!existingArray[itemIndex]) {
          return;
        }

        const updatedArray = [...existingArray];
        updatedArray[itemIndex] = {
          ...updatedArray[itemIndex],
          [fieldName]: value,
        };

        nextSection = {
          ...(currentSection && !Array.isArray(currentSection)
            ? currentSection
            : {}),
          assetMonetizationArray: updatedArray,
          ...(currentStatus !== undefined ? { status: currentStatus } : {}),
        };
        break;
      }
      default:
        return;
    }

    if (!nextSection) {
      return;
    }

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: nextSection,
    }));
  };

  // File upload handler - handles response structure correctly
  const handleFileUpload = async (file: File): Promise<FileUpload | null> => {
    if (!submissionId) {
      console.error("No submissionId provided for file upload");
      return null;
    }

    try {
      // Upload file to server
      const response = await apiService.uploadFile(submissionId, file);

      // Handle different response structures (same as EditableFileDisplay)
      // Response might be: { data: { fileName, filePath, ... } } or { fileName, filePath, ... } directly
      const fileData = (response as any)?.data || response;

      // Extract file path from various possible fields
      const storedPath =
        fileData.file ??
        fileData.filePath ??
        fileData.url ??
        fileData.path ??
        null;

      // Create FileUpload object
      const fileUpload: FileUpload = {
        id: fileData.id ?? crypto.randomUUID(),
        file: storedPath, // Store file path (string) not File object
        fileName: fileData.fileName || fileData.filename || file.name,
        fileSize: Number(fileData.fileSize ?? fileData.size ?? file.size ?? 0),
        uploadedAt: Number(fileData.uploadedAt ?? Date.now()),
        filePath: storedPath ?? undefined,
        fileUrl: fileData.fileUrl || fileData.url,
        mimeType: fileData.mimeType,
      };

      console.log("✅ File uploaded successfully:", {
        fileName: fileUpload.fileName,
        filePath: fileUpload.filePath,
        response: response,
      });

      return fileUpload;
    } catch (error: any) {
      console.error("Failed to upload file:", error);
      return null;
    }
  };

  // Helper functions to handle file updates
  const handleFilesUpdate = async (
    sectionId: string,
    itemIndex: number,
    updatedFiles: FileUpload | FileUpload[] | null
  ) => {
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const currentSection = state?.[sectionKey];
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;

    let nextSection: any = null;

    const buildArrayUpdate = (arrayKey: string) => {
      const existingArray = Array.isArray(currentSection?.[arrayKey])
        ? currentSection[arrayKey]
        : [];

      if (!existingArray[itemIndex]) {
        return null;
      }

      const updatedArray = [...existingArray];
      updatedArray[itemIndex] = {
        ...updatedArray[itemIndex],
        files: toFileArray(updatedFiles),
      };

      return {
        ...(currentSection && !Array.isArray(currentSection)
          ? currentSection
          : {}),
        [arrayKey]: updatedArray,
        ...(currentStatus !== undefined ? { status: currentStatus } : {}),
      };
    };

    switch (sectionId) {
      case "2.1":
        nextSection = buildArrayUpdate("infraActArray");
        break;
      case "2.2":
        nextSection = buildArrayUpdate("specializedEntityArray");
        break;
      case "2.3":
        nextSection = buildArrayUpdate("infraDevelopmentArray");
        break;
      case "2.4": {
        const existingArray = Array.isArray(
          currentSection?.investmentReadyArray
        )
          ? currentSection.investmentReadyArray
          : [];

        if (!existingArray[itemIndex]) {
          return;
        }

        const updatedArray = [...existingArray];
        updatedArray[itemIndex] = {
          ...updatedArray[itemIndex],
          dprFile: toSingleFile(updatedFiles),
        };

        nextSection = {
          ...(currentSection && !Array.isArray(currentSection)
            ? currentSection
            : {}),
          investmentReadyArray: updatedArray,
          ...(currentStatus !== undefined ? { status: currentStatus } : {}),
        };
        break;
      }
      default:
        return;
    }

    if (!nextSection) {
      return;
    }

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: nextSection,
    }));

    const nextState = {
      ...state,
      [sectionKey]: nextSection,
    };

    try {
      const fields = buildSectionFields(sectionId, nextState);

      console.log("📤 Saving section with fields:", {
        sectionId,
        sectionKey,
        fields,
        nextSection,
        itemFiles:
          nextSection?.infraActArray?.[itemIndex]?.files ||
          nextSection?.specializedEntityArray?.[itemIndex]?.files ||
          nextSection?.infraDevelopmentArray?.[itemIndex]?.files,
        nextState: nextState?.[sectionKey],
      });

      await handleSaveSection({
        submissionId,
        category: "infraDevelopment",
        section: sectionKey,
        fields,
      });

      let shouldRevert = false;

      switch (sectionId) {
        case "2.1":
          shouldRevert = nextSection.infraActArray.every(
            (item: any) =>
              !Array.isArray(item?.files) || item.files.length === 0
          );
          break;
        case "2.2":
          shouldRevert = nextSection.specializedEntityArray.every(
            (item: any) =>
              !Array.isArray(item?.files) || item.files.length === 0
          );
          break;
        case "2.3":
          shouldRevert = nextSection.infraDevelopmentArray.every(
            (item: any) =>
              !Array.isArray(item?.files) || item.files.length === 0
          );
          break;
        case "2.4":
          shouldRevert = nextSection.investmentReadyArray.every(
            (item: any) => !item?.dprFile
          );
          break;
        default:
          break;
      }

      if (shouldRevert) {
        await onIndicatorStatus(sectionId, false);
      }
    } catch (error) {
      console.error("Failed to auto-save files for section", sectionId, error);
    }
  };

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

    // Hide all action buttons if STATE_APPROVER is viewing a submission that's with MoSPI Reviewer
    const submissionStatus = submission?.status;
    if (isStateApprover && submissionStatus === "SUBMITTED_TO_MOSPI_REVIEWER") {
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
      const sectionData = state && state[sectionKey];
      const mospiStatus = Array.isArray(sectionData)
        ? (sectionData as any)?.mospi_status
        : sectionData?.mospi_status;

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
            disabled={isEditable(sectionId)}
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
            disabled={isEditable(sectionId)}
          >
            <CheckCircle className="w-4 h-4" />
            Accept
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

    // For all other roles, check status field as before
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const sectionData = state && state[sectionKey];
    // Handle both array and object sections
    const sectionStatus = Array.isArray(sectionData)
      ? (sectionData as any)?.status
      : sectionData?.status;

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
                disabled={true} // Already submitted (RESUBMITTED), disable button
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
      if (isNodalOfficer) {
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

    // Debug logging removed for performance

    return (
      <div className="flex gap-2">
        {!isEditable(sectionId) ? (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setEditable(sectionId, true)}
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

        {/* Only show Send Back if status is not RESUBMITTED for STATE_APPROVER */}
        {!(isStateApprover && sectionStatus === "RESUBMITTED") && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleOpenModal(sectionId)}
            disabled={isEditable(sectionId)}
          >
            <RotateCcw className="w-4 h-4" />
            Send Back
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

        {!isNodalOfficer && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onIndicatorStatus(sectionId, true)}
            disabled={isEditable(sectionId)}
          >
            <CheckCircle className="w-4 h-4" />
            Accept
          </Button>
        )}
      </div>
    );
  };

  // If no data, show message
  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No Infra Development data available for review
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {(() => {
          const sections = getSectionsWithData(
            { infraDevelopment: state },
            "infraDevelopment"
          );
          const assignedIndicators = STEP_SECTIONS.infraDevelopment
            .filter((s) => sections.includes(s.sectionKey))
            .map((s) => s.indicator);
          const { completed, total, progress } = computeStepProgress(
            { infraDevelopment: state } as any,
            "infraDevelopment",
            { assignedIndicators }
          );
          return (
            <ProgressHeader
              title="Infrastructure Development"
              description="Physical infrastructure development and completion metrics."
              points={250}
              completed={completed}
              total={total}
              progress={progress}
            />
          );
        })()}
        {/* Section 2.1 */}
        {sectionsWithData.includes("section2_1") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">2.1 -</span> Availability of
                    Infrastructure Act/Policy{" "}
                  </span>
                  {renderActionButtons("2.1")}
                </div>
              </div>
            }
            // subtitle="Annex 4: Provide link and funding details"
            className="mb-6"
          >
            {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">

              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"

              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              {/* Table Display */}
              <div className="overflow-x-auto rounded-xl">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#DDE3F9]">
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                        Sector
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Uploaded File
                      </th>
                      <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                        File Type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const infraActArray = Array.isArray(
                        state?.section2_1?.infraActArray
                      )
                        ? state.section2_1.infraActArray
                        : [];

                      if (!infraActArray.length) {
                        return (
                          <tr>
                            <td
                              colSpan={3}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No data available
                            </td>
                          </tr>
                        );
                      }

                      return infraActArray.map((item: any, index: number) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable("2.1") ? (
                              <Dropdown
                                options={dropdownValues.sector}
                                value={item.sector || ""}
                                onChange={(value) =>
                                  handleArrayFieldUpdate(
                                    "2.1",
                                    index,
                                    "sector",
                                    value
                                  )
                                }
                                placeholder="Select Sector"
                                isEditable={true}
                                resetKey={selectResetKey}
                              />
                            ) : (
                              item.sector || "N/A"
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable("2.1") ? (
                              <div className="space-y-1.5">
                                {item.files && item.files.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.files.map(
                                      (file: any, fileIndex: number) => (
                                        <Badge
                                          key={fileIndex}
                                          variant="secondary"
                                          className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                          title={
                                            file.fileName || "Unknown file"
                                          }
                                        >
                                          <Upload className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">
                                            {file.fileName || "Unknown file"}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updatedFiles =
                                                item.files.filter(
                                                  (_: any, idx: number) =>
                                                    idx !== fileIndex
                                                );
                                              handleFilesUpdate(
                                                "2.1",
                                                index,
                                                updatedFiles.length > 0
                                                  ? updatedFiles
                                                  : []
                                              );
                                            }}
                                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <X className="w-3 h-3 text-destructive hover:text-destructive/80" />
                                          </button>
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    No files
                                  </span>
                                )}
                                <div className="flex items-center">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={async (e) => {
                                      const selectedFile = e.target.files?.[0];
                                      if (selectedFile) {
                                        const uploadedFile =
                                          await handleFileUpload(selectedFile);
                                        if (uploadedFile) {
                                          const existingFiles =
                                            item.files || [];
                                          await handleFilesUpdate(
                                            "2.1",
                                            index,
                                            [...existingFiles, uploadedFile]
                                          );
                                        }
                                        e.target.value = ""; // Reset input
                                      }
                                    }}
                                    className="hidden"
                                    id={`file-input-2.1-${index}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      document
                                        .getElementById(
                                          `file-input-2.1-${index}`
                                        )
                                        ?.click()
                                    }
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              </div>
                            ) : item.files && item.files.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {item.files.map(
                                  (file: any, fileIndex: number) => (
                                    <Badge
                                      key={fileIndex}
                                      variant="secondary"
                                      className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                      title={file.fileName || "Unknown file"}
                                    >
                                      <Upload className="w-3 h-3" />
                                      <span className="truncate">
                                        {file.fileName || "Unknown file"}
                                      </span>
                                    </Badge>
                                  )
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                No files
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {item.files && item.files.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.files.map(
                                  (file: any, fileIndex: number) => (
                                    <Badge
                                      key={fileIndex}
                                      variant="outline"
                                      className="text-xs px-1.5 py-0.5"
                                    >
                                      {file.fileName
                                        ?.split(".")
                                        .pop()
                                        ?.toUpperCase() || "N/A"}
                                    </Badge>
                                  )
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                N/A
                              </span>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Add More Button - Only visible when in edit mode */}
              {isEditable("2.1") && !showAddForm2_1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                  onClick={() => setShowAddForm2_1(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add More
                </Button>
              )}

              {/* Add Entry Form - Only visible when showAddForm2_1 is true */}
              {showAddForm2_1 && isEditable("2.1") && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">
                    Add New Infrastructure Act/Policy Entry
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label>Sector</Label>
                      <Dropdown
                        options={dropdownValues.sector}
                        value={newEntry2_1.sector}
                        onChange={(value) =>
                          setNewEntry2_1({ ...newEntry2_1, sector: value })
                        }
                        placeholder="Select Sector"
                        isEditable={true}
                      />
                    </div>
                    <div>
                      <Label>Upload Files</Label>
                      <EditableFileDisplay
                        files={newEntry2_1.files}
                        isEditable={true}
                        submissionId={submissionId}
                        onFilesChange={(updatedFiles) =>
                          setNewEntry2_1({
                            ...newEntry2_1,
                            files: toFileArray(updatedFiles),
                          })
                        }
                        label=""
                        multiple={true}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAddNewEntry2_1}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Save Entry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddForm2_1(false);
                        setNewEntry2_1({ sector: "", files: [] });
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Upload copy of Act/Policy
              </p>
            </div>
          </SectionCard>
        )}

        {/* Section 2.2 */}
        {sectionsWithData.includes("section2_2") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">2.2 -</span> Availability of
                    Specialised Entity{" "}
                  </span>
                  {renderActionButtons("2.2")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 
              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              {/* Table Display */}
              <div className="overflow-x-auto rounded-xl">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#DDE3F9]">
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                        Sector
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Uploaded File
                      </th>
                      <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                        File Type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const specializedEntityArray = Array.isArray(
                        state?.section2_2?.specializedEntityArray
                      )
                        ? state.section2_2.specializedEntityArray
                        : [];

                      if (!specializedEntityArray.length) {
                        return (
                          <tr>
                            <td
                              colSpan={3}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No data available
                            </td>
                          </tr>
                        );
                      }

                      return specializedEntityArray.map(
                        (item: any, index: number) => (
                          <tr key={item.id || index} className="border-b">
                            <td className="py-3 px-4 text-sm font-normal">
                              {isEditable("2.2") ? (
                                <Dropdown
                                  options={dropdownValues.sector}
                                  value={item.sector || ""}
                                  onChange={(value) =>
                                    handleArrayFieldUpdate(
                                      "2.2",
                                      index,
                                      "sector",
                                      value
                                    )
                                  }
                                  placeholder="Select Sector"
                                  isEditable={true}
                                  resetKey={selectResetKey}
                                />
                              ) : (
                                item.sector || "N/A"
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {isEditable("2.2") ? (
                                <div className="space-y-1.5">
                                  {item.files && item.files.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {item.files.map(
                                        (file: any, fileIndex: number) => (
                                          <Badge
                                            key={fileIndex}
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                            title={
                                              file.fileName || "Unknown file"
                                            }
                                          >
                                            <Upload className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">
                                              {file.fileName || "Unknown file"}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedFiles =
                                                  item.files.filter(
                                                    (_: any, idx: number) =>
                                                      idx !== fileIndex
                                                  );
                                                handleFilesUpdate(
                                                  "2.2",
                                                  index,
                                                  updatedFiles.length > 0
                                                    ? updatedFiles
                                                    : []
                                                );
                                              }}
                                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <X className="w-3 h-3 text-destructive hover:text-destructive/80" />
                                            </button>
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      No files
                                    </span>
                                  )}
                                  <div className="flex items-center">
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx"
                                      onChange={async (e) => {
                                        const selectedFile =
                                          e.target.files?.[0];
                                        if (selectedFile) {
                                          const uploadedFile =
                                            await handleFileUpload(
                                              selectedFile
                                            );
                                          if (uploadedFile) {
                                            const existingFiles =
                                              item.files || [];
                                            await handleFilesUpdate(
                                              "2.2",
                                              index,
                                              [...existingFiles, uploadedFile]
                                            );
                                          }
                                          e.target.value = ""; // Reset input
                                        }
                                      }}
                                      className="hidden"
                                      id={`file-input-2.2-${index}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        document
                                          .getElementById(
                                            `file-input-2.2-${index}`
                                          )
                                          ?.click()
                                      }
                                      className="h-6 px-2 text-xs"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              ) : item.files && item.files.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {item.files.map(
                                    (file: any, fileIndex: number) => (
                                      <Badge
                                        key={fileIndex}
                                        variant="secondary"
                                        className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                        title={file.fileName || "Unknown file"}
                                      >
                                        <Upload className="w-3 h-3" />
                                        <span className="truncate">
                                          {file.fileName || "Unknown file"}
                                        </span>
                                      </Badge>
                                    )
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  No files
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {item.files && item.files.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.files.map(
                                    (file: any, fileIndex: number) => (
                                      <Badge
                                        key={fileIndex}
                                        variant="outline"
                                        className="text-xs px-1.5 py-0.5"
                                      >
                                        {file.fileName
                                          ?.split(".")
                                          .pop()
                                          ?.toUpperCase() || "N/A"}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  N/A
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Add More Button - Only visible when in edit mode */}
              {isEditable("2.2") && !showAddForm2_2 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                  onClick={() => setShowAddForm2_2(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add More
                </Button>
              )}

              {/* Add Entry Form - Only visible when showAddForm2_2 is true */}
              {showAddForm2_2 && isEditable("2.2") && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">
                    Add New Specialized Entity Entry
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label>Sector</Label>
                      <Dropdown
                        options={dropdownValues.sector}
                        value={newEntry2_2.sector}
                        onChange={(value) =>
                          setNewEntry2_2({ ...newEntry2_2, sector: value })
                        }
                        placeholder="Select Sector"
                        isEditable={true}
                      />
                    </div>
                    <div>
                      <Label>Upload Files</Label>
                      <EditableFileDisplay
                        files={newEntry2_2.files}
                        isEditable={true}
                        submissionId={submissionId}
                        onFilesChange={(updatedFiles) =>
                          setNewEntry2_2({
                            ...newEntry2_2,
                            files: toFileArray(updatedFiles),
                          })
                        }
                        label=""
                        multiple={true}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAddNewEntry2_2}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Save Entry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddForm2_2(false);
                        setNewEntry2_2({ sector: "", files: [] });
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">Upload OPM/SPC</p>
            </div>
          </SectionCard>
        )}

        {/* Section 2.3 */}
        {sectionsWithData.includes("section2_3") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">2.3 -</span> Availability of
                    Sector Infra Development Plan{" "}
                  </span>
                  {renderActionButtons("2.3")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 
              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("2.3")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              {/* RadioGroup for hasInfraDevelopmentPlan */}
              <div>
                <Label className="mb-3 block">
                  Has Infrastructure Development Plan?*
                </Label>
                {isEditable("2.3") ? (
                  <RadioGroup
                    value={state?.section2_3?.hasInfraDevelopmentPlan || ""}
                    onValueChange={(value) =>
                      handleSectionFieldUpdate(
                        "2.3",
                        "hasInfraDevelopmentPlan",
                        value
                      )
                    }
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="2.3-yes" />
                      <Label htmlFor="2.3-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="2.3-no" />
                      <Label htmlFor="2.3-no">No</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section2_3?.hasInfraDevelopmentPlan === "yes"
                          ? "bg-green-100 text-green-800"
                          : state?.section2_3?.hasInfraDevelopmentPlan === "no"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {state?.section2_3?.hasInfraDevelopmentPlan === "yes"
                        ? "Yes"
                        : state?.section2_3?.hasInfraDevelopmentPlan === "no"
                        ? "No"
                        : "Not specified"}
                    </span>
                  </div>
                )}
              </div>

              {/* Show table and Add More button if hasInfraDevelopmentPlan is "yes" */}
              {state?.section2_3?.hasInfraDevelopmentPlan === "yes" && (
                <>
                  {/* Table Display */}
                  <div className="overflow-x-auto rounded-xl">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#DDE3F9]">
                          <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                            Sector
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Uploaded File
                          </th>
                          <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                            File Type
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const infraDevelopmentArray = Array.isArray(
                            state?.section2_3?.infraDevelopmentArray
                          )
                            ? state.section2_3.infraDevelopmentArray
                            : [];

                          if (!infraDevelopmentArray.length) {
                            return (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="py-8 text-center text-muted-foreground"
                                >
                                  No data available
                                </td>
                              </tr>
                            );
                          }

                          return infraDevelopmentArray.map(
                            (item: any, index: number) => (
                              <tr key={item.id || index} className="border-b">
                                <td className="py-3 px-4 text-sm font-normal">
                                  {isEditable("2.3") ? (
                                    <Dropdown
                                      options={dropdownValues.sector}
                                      value={item.sector || ""}
                                      onChange={(value) =>
                                        handleArrayFieldUpdate(
                                          "2.3",
                                          index,
                                          "sector",
                                          value
                                        )
                                      }
                                      placeholder="Select Sector"
                                      isEditable={true}
                                      resetKey={selectResetKey}
                                    />
                                  ) : (
                                    item.sector || "N/A"
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-normal">
                                  {isEditable("2.3") ? (
                                    <div className="space-y-1.5">
                                      {item.files && item.files.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                          {item.files.map(
                                            (file: any, fileIndex: number) => (
                                              <Badge
                                                key={fileIndex}
                                                variant="secondary"
                                                className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                                title={
                                                  file.fileName ||
                                                  "Unknown file"
                                                }
                                              >
                                                <Upload className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">
                                                  {file.fileName ||
                                                    "Unknown file"}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const updatedFiles =
                                                      item.files.filter(
                                                        (_: any, idx: number) =>
                                                          idx !== fileIndex
                                                      );
                                                    handleFilesUpdate(
                                                      "2.3",
                                                      index,
                                                      updatedFiles.length > 0
                                                        ? updatedFiles
                                                        : []
                                                    );
                                                  }}
                                                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                  <X className="w-3 h-3 text-destructive hover:text-destructive/80" />
                                                </button>
                                              </Badge>
                                            )
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          No files
                                        </span>
                                      )}
                                      <div className="flex items-center">
                                        <input
                                          type="file"
                                          accept=".pdf,.doc,.docx"
                                          onChange={async (e) => {
                                            const selectedFile =
                                              e.target.files?.[0];
                                            if (selectedFile) {
                                              const uploadedFile =
                                                await handleFileUpload(
                                                  selectedFile
                                                );
                                              if (uploadedFile) {
                                                const existingFiles =
                                                  item.files || [];
                                                await handleFilesUpdate(
                                                  "2.3",
                                                  index,
                                                  [
                                                    ...existingFiles,
                                                    uploadedFile,
                                                  ]
                                                );
                                              }
                                              e.target.value = ""; // Reset input
                                            }
                                          }}
                                          className="hidden"
                                          id={`file-input-2.3-${index}`}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            document
                                              .getElementById(
                                                `file-input-2.3-${index}`
                                              )
                                              ?.click()
                                          }
                                          className="h-6 px-2 text-xs"
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          Add
                                        </Button>
                                      </div>
                                    </div>
                                  ) : item.files && item.files.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {item.files.map(
                                        (file: any, fileIndex: number) => (
                                          <Badge
                                            key={fileIndex}
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                            title={
                                              file.fileName || "Unknown file"
                                            }
                                          >
                                            <Upload className="w-3 h-3" />
                                            <span className="truncate">
                                              {file.fileName || "Unknown file"}
                                            </span>
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      No files
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-normal">
                                  {item.files && item.files.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {item.files.map(
                                        (file: any, fileIndex: number) => (
                                          <Badge
                                            key={fileIndex}
                                            variant="outline"
                                            className="text-xs px-1.5 py-0.5"
                                          >
                                            {file.fileName
                                              ?.split(".")
                                              .pop()
                                              ?.toUpperCase() || "N/A"}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      N/A
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Add More Button - Only visible when in edit mode */}
                  {isEditable("2.3") && !showAddForm2_3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                      onClick={() => setShowAddForm2_3(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Add More
                    </Button>
                  )}

                  {/* Add Entry Form - Only visible when showAddForm2_3 is true */}
                  {showAddForm2_3 && isEditable("2.3") && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">
                        Add New Infrastructure Development Plan Entry
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <Label>Sector</Label>
                          <Dropdown
                            options={dropdownValues.sector}
                            value={newEntry2_3.sector}
                            onChange={(value) =>
                              setNewEntry2_3({ ...newEntry2_3, sector: value })
                            }
                            placeholder="Select Sector"
                            isEditable={true}
                          />
                        </div>
                        <div>
                          <Label>Upload Files</Label>
                          <EditableFileDisplay
                            files={newEntry2_3.files}
                            isEditable={true}
                            submissionId={submissionId}
                            onFilesChange={(updatedFiles) =>
                              setNewEntry2_3({
                                ...newEntry2_3,
                                files: toFileArray(updatedFiles),
                              })
                            }
                            label=""
                            multiple={true}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleAddNewEntry2_3}
                          className="flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Save Entry
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddForm2_3(false);
                            setNewEntry2_3({ sector: "", files: [] });
                          }}
                          className="flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">Upload plan</p>
                </>
              )}

              {/* Show comment field if hasInfraDevelopmentPlan is "no" */}
              {state?.section2_3?.hasInfraDevelopmentPlan === "no" && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {isEditable("2.3") ? (
                    <Textarea
                      value={state?.section2_3?.comment || ""}
                      onChange={(e) =>
                        handleSectionFieldUpdate(
                          "2.3",
                          "comment",
                          e.target.value
                        )
                      }
                      placeholder="Please provide a comment..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      {state?.section2_3?.comment || "No comment provided"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Section 2.4 */}
        {sectionsWithData.includes("section2_4") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">2.4 -</span> Availability of
                    Investment Ready Project Pipeline{" "}
                  </span>
                  {renderActionButtons("2.4")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                2.4 - Availability of Investment Ready Project Pipeline
              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("2.4")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              {/* RadioGroup for hasInvestmentReady */}
              <div>
                <Label className="mb-3 block">
                  Has Investment Ready Project Pipeline?*
                </Label>
                {isEditable("2.4") ? (
                  <RadioGroup
                    value={state?.section2_4?.hasInvestmentReady || ""}
                    onValueChange={(value) =>
                      handleSectionFieldUpdate(
                        "2.4",
                        "hasInvestmentReady",
                        value
                      )
                    }
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="2.4-yes" />
                      <Label htmlFor="2.4-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="2.4-no" />
                      <Label htmlFor="2.4-no">No</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section2_4?.hasInvestmentReady === "yes"
                          ? "bg-green-100 text-green-800"
                          : state?.section2_4?.hasInvestmentReady === "no"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {state?.section2_4?.hasInvestmentReady === "yes"
                        ? "Yes"
                        : state?.section2_4?.hasInvestmentReady === "no"
                        ? "No"
                        : "Not specified"}
                    </span>
                  </div>
                )}
              </div>

              {/* Show table and Add More button if hasInvestmentReady is "yes" */}
              {state?.section2_4?.hasInvestmentReady === "yes" && (
                <>
                  {/* Table Display */}
                  <div className="overflow-x-auto rounded-xl">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#DDE3F9]">
                          <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                            Project Name
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Uploaded File
                          </th>
                          <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                            File Type
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const investmentReadyArray = Array.isArray(
                            state?.section2_4?.investmentReadyArray
                          )
                            ? state.section2_4.investmentReadyArray
                            : [];

                          if (!investmentReadyArray.length) {
                            return (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="py-8 text-center text-muted-foreground"
                                >
                                  No data available
                                </td>
                              </tr>
                            );
                          }

                          return investmentReadyArray.map(
                            (item: any, index: number) => (
                              <tr key={item.id || index} className="border-b">
                                <td className="py-3 px-4 text-sm font-normal">
                                  {isEditable("2.4") ? (
                                    <Input
                                      value={item.projectName || ""}
                                      onChange={(e) =>
                                        handleArrayFieldUpdate(
                                          "2.4",
                                          index,
                                          "projectName",
                                          e.target.value
                                        )
                                      }
                                      className="w-full"
                                      placeholder="Enter project name"
                                    />
                                  ) : (
                                    item.projectName || "N/A"
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-normal">
                                  {isEditable("2.4") ? (
                                    <EditableFileDisplay
                                      files={item.dprFile || null}
                                      isEditable={true}
                                      submissionId={submissionId}
                                      onFilesChange={(updatedFiles) =>
                                        handleFilesUpdate(
                                          "2.4",
                                          index,
                                          updatedFiles
                                        )
                                      }
                                      label=""
                                      multiple={false}
                                    />
                                  ) : item.dprFile && item.dprFile.fileName ? (
                                    <div className="flex items-center gap-2">
                                      <Upload className="w-4 h-4" />
                                      <span className="text-sm">
                                        {item.dprFile.fileName ||
                                          "Unknown file"}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      No file uploaded
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-normal">
                                  {item.dprFile && item.dprFile.fileName ? (
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-1.5 py-0.5"
                                    >
                                      {item.dprFile.fileName
                                        ?.split(".")
                                        .pop()
                                        ?.toUpperCase() || "N/A"}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      N/A
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Add More Button - Only visible when in edit mode */}
                  {isEditable("2.4") && !showAddForm2_4 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                      onClick={() => setShowAddForm2_4(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Add More
                    </Button>
                  )}

                  {/* Add Entry Form - Only visible when showAddForm2_4 is true */}
                  {showAddForm2_4 && isEditable("2.4") && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">
                        Add New Investment Ready Project Entry
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <Label>Project Name</Label>
                          <Input
                            value={newEntry2_4.projectName}
                            onChange={(e) =>
                              setNewEntry2_4({
                                ...newEntry2_4,
                                projectName: e.target.value,
                              })
                            }
                            className="bg-white"
                            placeholder="Enter project name"
                          />
                        </div>
                        <div>
                          <Label>Upload DPR/Feasibility Report</Label>
                          <EditableFileDisplay
                            files={newEntry2_4.dprFile}
                            isEditable={true}
                            submissionId={submissionId}
                            onFilesChange={(updatedFile) =>
                              setNewEntry2_4({
                                ...newEntry2_4,
                                dprFile: toSingleFile(updatedFile),
                              })
                            }
                            label=""
                            multiple={false}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleAddNewEntry2_4}
                          className="flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Save Entry
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddForm2_4(false);
                            setNewEntry2_4({ projectName: "", dprFile: null });
                          }}
                          className="flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* <p className="text-sm text-muted-foreground">
                Annex 8: Upload DPR/Feasibility Report
              </p> */}
                </>
              )}

              {/* Show comment field if hasInvestmentReady is "no" */}
              {state?.section2_4?.hasInvestmentReady === "no" && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {isEditable("2.4") ? (
                    <Textarea
                      value={state?.section2_4?.comment || ""}
                      onChange={(e) =>
                        handleSectionFieldUpdate(
                          "2.4",
                          "comment",
                          e.target.value
                        )
                      }
                      placeholder="Please provide a comment..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      {state?.section2_4?.comment || "No comment provided"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Section 2.5 */}
        {sectionsWithData.includes("section2_5") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">2.5 -</span> Availability of
                    Asset Monetization Pipeline{" "}
                  </span>
                  {renderActionButtons("2.5")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 Availability of Asset Monetization Pipeline
              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("2.5")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#DDE3F9]">
                    <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                      Project/Asset Name
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-normal">
                      Select Sector
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-normal">
                      Select Type
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-normal">
                      Asset Ownership
                    </th>
                    <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                      Estimated Monetization (INR - values is in CRORES)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const assetMonetizationArray = Array.isArray(
                      state?.section2_5?.assetMonetizationArray
                    )
                      ? state.section2_5.assetMonetizationArray
                      : [];

                    if (!assetMonetizationArray.length) {
                      return (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-muted-foreground"
                          >
                            No asset monetization pipeline data available
                          </td>
                        </tr>
                      );
                    }

                    return assetMonetizationArray.map(
                      (item: any, index: number) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable("2.5") ? (
                              <Input
                                value={item.projectName || ""}
                                onChange={(e) =>
                                  handleArrayFieldUpdate(
                                    "2.5",
                                    index,
                                    "projectName",
                                    e.target.value
                                  )
                                }
                                className="w-full"
                              />
                            ) : (
                              item.projectName || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable("2.5") ? (
                              <Dropdown
                                options={dropdownValues.sector}
                                value={item.sector || ""}
                                onChange={(value) =>
                                  handleArrayFieldUpdate(
                                    "2.5",
                                    index,
                                    "sector",
                                    value
                                  )
                                }
                                placeholder="Select Sector"
                                isEditable={true}
                                resetKey={selectResetKey}
                              />
                            ) : (
                              item.sector || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable("2.5") ? (
                              <Dropdown
                                options={dropdownValues.projectType}
                                value={item.type || ""}
                                onChange={(value) =>
                                  handleArrayFieldUpdate(
                                    "2.5",
                                    index,
                                    "type",
                                    value
                                  )
                                }
                                placeholder="Select Type"
                                isEditable={true}
                                resetKey={selectResetKey}
                              />
                            ) : (
                              item.type || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable("2.5") ? (
                              <Dropdown
                                options={dropdownValues.ownership}
                                value={item.ownership || ""}
                                onChange={(value) =>
                                  handleArrayFieldUpdate(
                                    "2.5",
                                    index,
                                    "ownership",
                                    value
                                  )
                                }
                                placeholder="Select Ownership"
                                isEditable={true}
                                resetKey={selectResetKey}
                              />
                            ) : (
                              item.ownership || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable("2.5") ? (
                              <Input
                                value={item.estimatedMonetization || ""}
                                onChange={(e) =>
                                  handleArrayFieldUpdate(
                                    "2.5",
                                    index,
                                    "estimatedMonetization",
                                    e.target.value
                                  )
                                }
                                className="w-full"
                                placeholder="Enter amount"
                              />
                            ) : item.estimatedMonetization ? (
                              `₹ ${item.estimatedMonetization} Crores`
                            ) : (
                              ""
                            )}
                          </td>
                        </tr>
                      )
                    );
                  })()}
                </tbody>
              </table>
            </div>

            {/* Add More Button - Only visible when in edit mode */}
            {isEditable("2.5") && !showAddForm2_5 && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 mt-4"
                onClick={() => setShowAddForm2_5(true)}
              >
                <Plus className="w-4 h-4" />
                Add More
              </Button>
            )}

            {/* Add Entry Form - Only visible when showAddForm2_5 is true */}
            {showAddForm2_5 && isEditable("2.5") && (
              <div className="border rounded-lg p-4 bg-gray-50 mt-4">
                <h4 className="font-medium mb-3">
                  Add New Asset Monetization Entry
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Project/Asset Name</Label>
                    <Input
                      value={newEntry2_5.projectName}
                      onChange={(e) =>
                        setNewEntry2_5({
                          ...newEntry2_5,
                          projectName: e.target.value,
                        })
                      }
                      className="bg-white"
                      placeholder="Enter project/asset name"
                    />
                  </div>
                  <div>
                    <Label>Sector</Label>
                    <Dropdown
                      options={dropdownValues.sector}
                      value={newEntry2_5.sector}
                      onChange={(value) =>
                        setNewEntry2_5({ ...newEntry2_5, sector: value })
                      }
                      placeholder="Select Sector"
                      isEditable={true}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Dropdown
                      options={dropdownValues.projectType}
                      value={newEntry2_5.type}
                      onChange={(value) =>
                        setNewEntry2_5({ ...newEntry2_5, type: value })
                      }
                      placeholder="Select Type"
                      isEditable={true}
                    />
                  </div>
                  <div>
                    <Label>Asset Ownership</Label>
                    <Dropdown
                      options={dropdownValues.ownership}
                      value={newEntry2_5.ownership}
                      onChange={(value) =>
                        setNewEntry2_5({ ...newEntry2_5, ownership: value })
                      }
                      placeholder="Select Ownership"
                      isEditable={true}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Estimated Monetization</Label>
                    <Input
                      value={newEntry2_5.estimatedMonetization}
                      onChange={(e) =>
                        setNewEntry2_5({
                          ...newEntry2_5,
                          estimatedMonetization: e.target.value,
                        })
                      }
                      className="bg-white"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAddNewEntry2_5}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Save Entry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm2_5(false);
                      setNewEntry2_5({
                        projectName: "",
                        sector: "",
                        type: "",
                        ownership: "",
                        estimatedMonetization: "",
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
              Are you sure you want to save this indicator?
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
