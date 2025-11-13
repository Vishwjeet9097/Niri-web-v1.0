/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2, Clock, Edit3, Check, X, CheckCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useEditableSectionStore } from '@/utils/EditableSection';
import { handleSaveSection } from "@/utils/ReviewActionHandelers";
// import { getDropdown } from '@/utils/getDropDowns';
import { useFormDataStore } from '@/utils/FormDataStore';
import { Section_1_3 } from "./Sections/Section_1_3";
import { Section_1_4 } from "./Sections/Section_1_4";
import {Section_1_5} from "./Sections/Section_1_5";


interface InfraFinancingReviewProps {
  submissionId: string;
  formData?: any;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
}
export const InfraFinancingReview = ({
  submissionId,
  formData,
  submission,
  isPreview = false,
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
  const { setFormDataForSection, updateSectionField, getSectionData } = useFormDataStore();

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
  const [section15State, setSection15State] = useState<any[]>(formData?.section1_5 || []);

  useEffect(() => {
    if (!isRestoringRef.current) {
      setSection15State(formData?.section1_5 || []);
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

  // Require non-empty lists for 1.3 / 1.4 (don't treat empty objects/count-only as presence)
  const hasSection13Manual = Boolean(
    Array.isArray(infraPayload?.section1_3?.ulbList) &&
      infraPayload.section1_3.ulbList.length > 0
  );

  const hasSection14Manual = Boolean(
    Array.isArray(infraPayload?.section1_4?.bondList) &&
      infraPayload.section1_4.bondList.length > 0
  );

  // Merge validator result + manual detections, preserving order and deduping
  const merged = Array.from(
    new Set([
      ...detectedSections,
      ...(hasSection13Manual ? ["section1_3"] : []),
      ...(hasSection14Manual ? ["section1_4"] : []),
    ])
  );

  // Final safety filter: if validator included 1.3/1.4 but lists are empty, drop them
  const final = merged.filter((sec) => {
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
    return true;
  });

  return final;
}, [formData]);


  // State for real-time calculation
  const [capitalAllocation, setCapitalAllocation] = useState('');
  const [gsdpForFY, setGsdpForFY] = useState('');

  // State for section 1.2
  const [actualCapex, setActualCapex] = useState('');
  const [stateCapexUtilisation, setStateCapexUtilisation] = useState('');

  // State for save confirmation dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSaveSectionId, setPendingSaveSectionId] = useState<string | null>(null);

  // State for Send Back and Accept confirmation dialogs
  const [showSendBackDialog, setShowSendBackDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [pendingActionSectionId, setPendingActionSectionId] = useState<string | null>(null);

  // Helper function to check user role
  const getUserRole = () => {
    try {
      const authUser = localStorage.getItem('niri_app:auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        return user.value?.role;
      }
    } catch (error) {
      console.error('Error reading user role:', error);
    }
    return null;
  };

  // Initialize section 1.2 state from formData (but not when restoring from cancel)
  useEffect(() => {
    if (!isRestoringRef.current) {
      if (formData?.section1_2?.actualCapex) {
        // Extract numeric value if it's formatted
        const value = typeof formData.section1_2.actualCapex === 'string' 
          ? formData.section1_2.actualCapex.replace(/[₹,Crores\s]/g, '').trim()
          : String(formData.section1_2.actualCapex);
        setActualCapex(value);
      } else {
        setActualCapex('');
      }

      if (formData?.section1_2?.stateCapexUtilisation) {
        // Extract numeric value if it's formatted
        const value = typeof formData.section1_2.stateCapexUtilisation === 'string'
          ? formData.section1_2.stateCapexUtilisation.replace(/[₹,Crores\s]/g, '').trim()
          : String(formData.section1_2.stateCapexUtilisation);
        setStateCapexUtilisation(value);
      } else {
        setStateCapexUtilisation('');
      }
    }
  }, [formData?.section1_2]);

  // State for edit fucntionality indicator wise
  const { setEditable, isEditable, clearAllEditing } = useEditableSectionStore();
  
  // Store original state snapshots when edit mode starts (for cancel functionality)
  const [originalStateSnapshot, setOriginalStateSnapshot] = useState<any>(null);
  // Flag to prevent useEffect from overriding cancel restore
  const isRestoringRef = useRef(false);
  // Counter to force remount of Select components on cancel
  const [selectResetKey, setSelectResetKey] = useState(0);
  
  // Handle edit mode start - store original state snapshot
  const handleEditStart = (sectionId: string) => {
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
      // Increment reset key to force Select components to remount
      setSelectResetKey(prev => prev + 1);
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
      console.log("🔍 InfraFinancingReview - Event submissionId:", eventSubmissionId);
      console.log("🔍 InfraFinancingReview - Current submissionId:", submissionId);
      console.log("🔍 InfraFinancingReview - IDs match:", eventSubmissionId === submissionId);

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

        // 1. Update submission with fresh comments data
        setSubmission((prev) => ({
          ...prev,
          indicatorComment: comments,
          updatedAt: new Date().toISOString(),
        }));
        console.log(
          "✅ InfraFinancingReview - Submission state updated with comments"
        );

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
            // Update submission state with fresh data
            setSubmission(freshSubmission);
            console.log(
              "✅ InfraFinancingReview - Submission state updated with fresh data"
            );

            // Update form data with fresh data
            if (freshSubmission.formData) {
              setFormData(freshSubmission.formData);
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
      Object.keys(formData).forEach(sectionKey => {
        if (sectionKey.startsWith('section')) {
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
  };

  const handleOpenTimeline = (sectionId: string) => {
    setTimelineSection(sectionId);
  };

  const handleCloseTimeline = () => {
    setTimelineSection(null);
  };

  const handleSaveMessage = async (message: string) => {
    // Validate parameters
    if (!message || typeof message !== "string") {
      console.error(
        "❌ InfraFinancingReview - Invalid message parameter:",
        message
      );
      return;
    }

    if (activeSection) {
      try {
        console.log("🔄 InfraFinancingReview - Calling saveMessage with:", {
          activeSection,
          message,
        });
        const updatedSubmission = await saveMessage(activeSection, message);
        console.log(
          "🔄 InfraFinancingReview - saveMessage response:",
          updatedSubmission
        );

        if (updatedSubmission) {
          setSubmissionData(updatedSubmission as unknown as FormData);
          console.log("✅ InfraFinancingReview - Form data updated");

          // Force timeline refresh if modal is open for same section
          if (timelineSection === activeSection) {
            setTimelineSection(null);
            setTimeout(() => {
              setTimelineSection(activeSection);
            }, 100);
          }
        }
      } catch (error) {
        console.error("❌ InfraFinancingReview - Error saving message:", error);
      }
    } else {
      console.log("⚠️ InfraFinancingReview - No active section");
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
    // Check if user is NODAL_OFFICER
    const userRole = getUserRole();
    const isNodalOfficer = userRole === 'NODAL_OFFICER';

    // If NODAL_OFFICER, show confirmation dialog first
    if (isNodalOfficer) {
      setPendingSaveSectionId(sectionId);
      setShowSaveDialog(true);
      return;
    }

    // For non-NODAL_OFFICER users, proceed with save directly
    await performSave(sectionId);
  };

  // Actual save function that performs the save operation
  const performSave = async (sectionId: string) => {
    try {
      // Map visual section id to payload section key
      const payloadSection = `section${sectionId.replace('.', '_')}`;

      // Prepare fields based on section
      let fields: Record<string, any>[] = [];

      switch (sectionId) {
        case '1.1':
          fields = [
            // {year: "2024-25"},
            { capitalAllocation: Number(capitalAllocation) || null },
            { gsdpForFY: Number(gsdpForFY) || null },
            // {allocationPercentage: calculateAllocationPercentage().replace('%', '') || null}

          ];
          break;

        case '1.2':
          fields = [
            {
              year: formData?.section1_2?.year || "2024-25",
              actualCapex: actualCapex ? Number(actualCapex) : null,
              stateCapexUtilisation: stateCapexUtilisation ? Number(stateCapexUtilisation) : null
            }
          ];
          break;

        case '1.3':
          // Use local state for ULB ratings data
          console.log("Section_1_3 state", section13State)
          fields = [{ulbList: (section13State.ulbList || []).map((item: any) => ({
            cityName: item.cityName,
            ulb: item.ulb,
            ratingDate: item.ratingDate,
            rating: item.rating
          }))}];
          break;

        case '1.4':
          // Use local state for bond data
          console.log("Section_1_4 state", section14State)
          // fields = [{
          //   bondList: (section14State.bondList || []).map((item: any) => ({
          //     bondType: item.bondType,
          //     cityName: item.cityName,
          //     issuingAuthority: item.issuingAuthority,
          //     value: item.value,
          fields = [
           { bondList: (section14State.bondList || []).map((item: any) => ({
              bondType: item.bondType,
              cityName: item.cityName,
              issuingAuthority: item.issuingAuthority,
              value: item.value,
            })),
            totalULBs: section14State.totalULBs
          }]
          break;

        case '1.5':
          // Use local state for financial intermediary data
          console.log("Section_1_5 state", section15State)
          fields = (section15State || []).map((item: any) => ({
            organisationName: item.organisationName,
            organisationType: item.organisationType,
            yearEstablished: item.yearEstablished,
            totalFunding: item.totalFunding,
            website: item.website
          }));
          break;

        default:
          console.warn(`Unhandled section: ${sectionId}`);
          return;
      }

      console.log('🔄 payload section:',  payloadSection)

      // Check if user is NODAL_OFFICER to add status to payload
      const userRole = getUserRole();
      const isNodalOfficer = userRole === 'NODAL_OFFICER';
      
      // If NODAL_OFFICER, add status: "RESUBMITTED" to fields
      if (isNodalOfficer && fields.length > 0) {
        // Add status to the first field object (or create a new one if needed)
        fields[0] = {
          ...fields[0],
          status: 'RESUBMITTED',
        };
      }

      await handleSaveSection({
        submissionId,
        category: 'infraFinancing',
        section: payloadSection,
        fields
      });

      // If NODAL_OFFICER, update local state to reflect RESUBMITTED status
      if (isNodalOfficer) {
        // Update local formData state to set status to RESUBMITTED
        const sectionKey = `section${sectionId.replace('.', '_')}`;
        // Update formData prop if it exists
        if (formData && (formData as any)[sectionKey]) {
          (formData as any)[sectionKey] = {
            ...(formData as any)[sectionKey],
            status: 'RESUBMITTED',
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
              status: 'RESUBMITTED',
            };
          }
          return updated;
        });
      }

      // Disable editing after successful save
      setEditable(sectionId, false);
      // Clear the snapshot since save was successful
      setOriginalStateSnapshot(null);

      // Optional: Show success message
      // toast.success(`Section ${sectionId} saved successfully`);

    } catch (error) {
      console.error('Error saving section:', error);
      // Keep section editable if save fails
      // Optional: Show error message
      // toast.error(`Failed to save section ${sectionId}`);
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
    const payload = {
      submissionId,
      category: 'infraFinancing',
      section: `section${sectionId.replace('.', '_')}`,
      status: status,
    };
    try {
      await apiService.indicatorStatus(payload);
      // Update local formData to trigger re-render of action buttons
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      // Defensive: clone formData if possible
      if (formData && formData[sectionKey]) {
        formData[sectionKey] = {
          ...formData[sectionKey],
          status: status ? 'ACCEPTED' : 'REVERTED',
        };
        setSubmissionData({ ...formData });
      }
      console.log("✅ Indicator status updated successfully");
    } catch (error) {
      console.error("❌ Failed to update indicator status:", error);
    }
  }

  // Wrapper function that checks for STATE_APPROVER and shows dialog if needed
  const onIndicatorStatus = async (sectionId: string, status: boolean) => {
    const userRole = getUserRole();
    const isStateApprover = userRole === 'STATE_APPROVER';

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
      await performIndicatorStatus(pendingActionSectionId, false);
      setShowSendBackDialog(false);
      setPendingActionSectionId(null);
      // Close the message modal if it's open
      setActiveSection(null);
    }
  };

  const handleCancelSendBack = () => {
    setShowSendBackDialog(false);
    setPendingActionSectionId(null);
  };

  // Handle Accept confirmation
  const handleConfirmAccept = async () => {
    if (pendingActionSectionId) {
      await performIndicatorStatus(pendingActionSectionId, true);
      setShowAcceptDialog(false);
      setPendingActionSectionId(null);
    }
  };

  const handleCancelAccept = () => {
    setShowAcceptDialog(false);
    setPendingActionSectionId(null);
  };


// 🧑‍💻🧑‍💻Edited by Harsh
const renderActionButtons = (sectionId: string) => {
  // Don't show action buttons in preview mode
  if (isPreview) {
    return null;
  }

  // Check if section status is ACCEPTED
  const sectionKey = `section${sectionId.replace('.', '_')}`;
  const sectionData = formData && formData[sectionKey];
  const sectionStatus = sectionData
    ? Array.isArray(sectionData)
      ? (sectionData as any).status
      : sectionData.status
    : undefined;

  if (sectionStatus === 'ACCEPTED') {
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
      </div>
    );
  }

  const comments = getComments(sectionId);
  const commentCount = comments ? comments.length : 0;
  
  // Check if user is NODAL_OFFICER from localStorage
  const getUserRole = () => {
    try {
      const authUser = localStorage.getItem('niri_app:auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        return user.value?.role;
      }
    } catch (error) {
      console.error('Error reading user role:', error);
    }
    return null;
  };
  const userRole = getUserRole();
  const isNodalOfficer = userRole === 'NODAL_OFFICER';
  const isStateApprover = userRole === 'STATE_APPROVER';
  
  // For STATE_APPROVER, show "Re Submitted" badge if status is RESUBMITTED
  if (isStateApprover && sectionStatus === 'RESUBMITTED') {
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
      </div>
    );
  }
  
  if (sectionStatus === 'REVERTED') {
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
      </div>
    );
  }

  // For NODAL_OFFICER, show "Under Review" badge if status is RESUBMITTED or null/undefined
  if (isNodalOfficer && (sectionStatus === 'RESUBMITTED' || !sectionStatus)) {
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
      </div>
    );
  }

  // For NODAL_OFFICER, if status is not REVERTED, ACCEPTED, or RESUBMITTED, don't show any buttons
  if (isNodalOfficer && sectionStatus !== 'REVERTED' && sectionStatus !== 'ACCEPTED' && sectionStatus !== 'RESUBMITTED') {
    return null;
  }

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
      {!(isStateApprover && sectionStatus === 'RESUBMITTED') && (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => handleOpenModal(sectionId)}
        >
          <RotateCcw className="w-4 h-4" />
          Send Back 
          {/* ({commentCount}) */}
        </Button>
      )}

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
            { assignedIndicators, }
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
            subtitle="Annex 1: Verified with NBRP.csv / Budgeted Estimates for Capital Expenditure"
            className="mb-6 relative"
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
              <Input value={
                (getFormDataValue('section1_1') as { year?: string })?.year || "2024-25"
              } readOnly className='bg-gray-50' />
            </div>
            <div>
              <Label>Capital Allocation for FY (INR)</Label>
              <Input
                value={capitalAllocation}
                onChange={(e) => {
                  // Debug logging removed for performance

                  setCapitalAllocation(e.target.value);
                }}
                placeholder="Enter Capital Allocation value"
                readOnly={!isEditable('1.1')}
                className={isEditable('1.1') ? 'bg-white' : 'bg-gray-50'}
              />
              <div className="text-xs text-gray-500 mt-1">
                Current value: "{capitalAllocation}"
              </div>
            </div>
            <div>
              <Label>GSDP for FY (INR)</Label>
              <Input
                value={gsdpForFY}
                onChange={(e) => {
                  // Debug logging removed for performance

                  setGsdpForFY(e.target.value);
                }}
                placeholder="Enter GSDP value"
                readOnly={!isEditable('1.1')}
                className={isEditable('1.1') ? 'bg-white' : 'bg-gray-50'}
              />
              <div className="text-xs text-gray-500 mt-1">
                Current value: "{gsdpForFY}"
              </div>
            </div>
            <div>
              <Label>% Allocation to GSDP</Label>
              <div className="relative">
                <Input
                  value={calculateAllocationPercentage()}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed pr-8"
                  placeholder={capitalAllocation && gsdpForFY ? "Calculating..." : "Auto-calculated"}
                />
                {calculateAllocationPercentage() && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-sm font-medium">
                    ✓
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Calculation result: "{calculateAllocationPercentage()}"
              </div>
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
            subtitle="Annex 2: Verified with Actuals data"
            className="mb-6"
          >
            <div className="grid grid-cols-2 gap-4 max-w-[70%]">
              <div>
                <Label>Year</Label>
                <Input
                  value={formData?.section1_2?.year || "2024-25"}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label>A₁ - Actual Capex (INR)</Label>
                <Input
                  value={
                    isEditable('1.2')
                      ? actualCapex
                      : actualCapex
                      ? `₹${actualCapex} Crores`
                      : ""
                  }
                  onChange={(e) => {
                    // Only allow numbers and decimal point
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setActualCapex(value);
                  }}
                  placeholder="Enter Actual Capex value"
                  readOnly={!isEditable('1.2')}
                  className={isEditable('1.2') ? 'bg-white' : 'bg-gray-50'}
                />
                {isEditable('1.2') && (
                  <div className="text-xs text-gray-500 mt-1">
                    Current value: "{actualCapex}"
                  </div>
                )}
              </div>
              <div>
                <Label>State Capex Utilisation (INR)</Label>
                <Input
                  value={
                    isEditable('1.2')
                      ? stateCapexUtilisation
                      : stateCapexUtilisation
                      ? `₹${stateCapexUtilisation} Crores`
                      : ""
                  }
                  onChange={(e) => {
                    // Only allow numbers and decimal point
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setStateCapexUtilisation(value);
                  }}
                  placeholder="Enter State Capex Utilisation value"
                  readOnly={!isEditable('1.2')}
                  className={isEditable('1.2') ? 'bg-white' : 'bg-gray-50'}
                />
                {isEditable('1.2') && (
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
                    const stateCapexUtilisationNum = parseFloat(stateCapexUtilisation) || 0;

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
                  className="bg-gray-50 cursor-not-allowed"
                  placeholder="Auto-calculated"
                />
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
            subtitle="Annex 3: Verified with Muni.GOI"
            className="mb-6"
          >
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
            subtitle="Annex 4: Provide Bond Details"
            className="mb-6"
          >
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
            subtitle="Annex 4: Provide link and funding details"
            className="mb-6"
          >
            {/* <div className="space-y-4">
              {formData?.section1_5?.map((item: any, index: number) => (
                <div key={item.id || index} className="">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <Label>Organisation Name</Label>
                      <Input 
                      value={item.organisationName || ""} 
                      readOnly={!isEditable('1.5')}
                      className={isEditable('1.5') ? 'bg-white' : 'bg-gray-50'} 
                      />
                    </div>
                    <div>
                      <Label>Organization Type</Label>
                      <Input 
                      value={item.organisationType || ""} 
                      readOnly={!isEditable('1.5')}
                      className={isEditable('1.5') ? 'bg-white' : 'bg-gray-50'} 
                      />
                    </div>
                    <div>
                      <Label>Year of Establishment</Label>
                      <Input
                       value={item.yearEstablished || ""} 
                       readOnly={!isEditable('1.5')}
                      className={isEditable('1.5') ? 'bg-white' : 'bg-gray-50'} 
                       />
                    </div>
                    <div>
                      <Label>Total Funding (INR)</Label>
                      <Input
                        value={
                          item.totalFunding
                            ? `₹ ${item.totalFunding} Crores`
                            : ""
                        }
                        readOnly={!isEditable('1.5')}
                      className={isEditable('1.5') ? 'bg-white' : 'bg-gray-50'}
                      />
                    </div>
                    <div className="">
                      <Label>Website Link</Label>
                      <Input 
                      value={item.website || ""} 
                      readOnly={!isEditable('1.5')}
                      className={isEditable('1.5') ? 'bg-white' : 'bg-gray-50'}
                       />
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-muted-foreground py-4">
                  No financial intermediary data available
                </div>
              )}
            </div> */}
            <Section_1_5 
              formData={{ section1_5: section15State }}
              isEditable={isEditable}
              setSectionState={setSection15State}
              resetKey={selectResetKey}
            />
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
        onSendBack={(sectionId) => onIndicatorStatus(sectionId, false)}
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
              Are you sure you want to save this section? This will send the data to the State Approver for review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSave}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Confirm & Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for STATE_APPROVER Send Back */}
      <AlertDialog open={showSendBackDialog} onOpenChange={setShowSendBackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send Back</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send back this section? On send back, this will be returned to the Nodal Officer for corrections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSendBack}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSendBack}>Confirm & Send Back</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for STATE_APPROVER Accept */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Accept</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to accept this section? Now it is moved to the Reviewer. No further action can be taken after accept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAccept}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccept}>Confirm & Accept</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
