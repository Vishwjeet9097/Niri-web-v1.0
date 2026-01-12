import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { getMinistrySubmissionDetails, minstryRegistrationForm } from "@/services/ministry.service";
import { useToast } from "@/hooks/use-toast";
import { transformApiResponseToFormData } from "../utils/formDataTransformer";
import { extractSubmissionId } from "../utils/submissionIdExtractor";
import type { AssignedIndicator } from "../components/FormBuilder/types";

interface UseMinistrySubmissionReturn {
  submissionId: string | null;
  assignedIndicators: AssignedIndicator[];
  formData: Record<string, any>;
  submittedIndicators: Set<string>;
  submittedIndicatorsVersion: number;
  checking: boolean;
  loading: boolean;
  noSubmissionFound: boolean;
  submissionError: string | null;
  handleCreateSubmission: () => Promise<void>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setSubmittedIndicators: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSubmittedIndicatorsVersion: React.Dispatch<React.SetStateAction<number>>;
  isInitialLoadRef: React.MutableRefObject<boolean>;
  prevFormDataRef: React.MutableRefObject<Record<string, any>>;
}

export function useMinistrySubmission(
  persistedFormData: Record<string, any>
): UseMinistrySubmissionReturn {
  const { user } = useAuth();
  const { id: submissionIdFromParams } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const reviewUserId = searchParams.get('userId');
  const { toast } = useToast();
  
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [assignedIndicators, setAssignedIndicators] = useState<AssignedIndicator[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submittedIndicators, setSubmittedIndicators] = useState<Set<string>>(new Set());
  const [submittedIndicatorsVersion, setSubmittedIndicatorsVersion] = useState(0); // Version counter to force re-renders
  const [submissionId, setSubmissionId] = useState<string | null>(submissionIdFromParams || null);
  const [noSubmissionFound, setNoSubmissionFound] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  const hasCheckedSubmissionRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const prevFormDataRef = useRef<Record<string, any>>({});

  // Check for existing submission
  useEffect(() => {
    if (hasCheckedSubmissionRef.current) return;
    
    const checkExistingSubmission = async () => {
      if (submissionIdFromParams) {
        setSubmissionId(submissionIdFromParams);
        setChecking(false);
        setNoSubmissionFound(false);
        setSubmissionError(null);
        hasCheckedSubmissionRef.current = true;
        return;
      }

      const targetUserId = reviewUserId || user?.id;

      try {
        if (!targetUserId) {
          console.log("⚠️ No user ID found");
          setChecking(false);
          setNoSubmissionFound(true);
          setSubmissionError("User not authenticated. Please log in.");
          hasCheckedSubmissionRef.current = true;
          return;
        }

        // Permission checks
        if (reviewUserId && user?.id !== reviewUserId) {
          if (!['ADMIN', 'MOSPI_APPROVER', 'MINISTRY_APPROVER'].includes(user?.role || '')) {
            console.log("⚠️ User doesn't have permission to review ministry submissions");
            setChecking(false);
            setNoSubmissionFound(true);
            setSubmissionError("You don't have permission to review ministry submissions.");
            hasCheckedSubmissionRef.current = true;
            return;
          }
        } else {
          if (user?.role !== "MINISTRY_APPROVER" && user?.role !== "NODAL_OFFICER") {
            console.log("⚠️ User is not a Ministry Approver or Nodal Officer");
            setChecking(false);
            setNoSubmissionFound(true);
            setSubmissionError("You don't have permission to access ministry submissions.");
            hasCheckedSubmissionRef.current = true;
            return;
          }
        }
        
        hasCheckedSubmissionRef.current = true;
        console.log("🔍 Checking existing submission for Ministry Approver using ministry API:", targetUserId);
        setLoading(true);
        const response = await getMinistrySubmissionDetails(targetUserId);

        if (response?.status && response?.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log("✅ Found existing submission with indicators:", response.data.length);
          setAssignedIndicators(response.data);
          
          const initialFormData = transformApiResponseToFormData(response.data, persistedFormData);
          setFormData(initialFormData);
          
          const submittedIndicatorsSet = new Set<string>();
          response.data.forEach((indicatorObj: any) => {
            Object.entries(indicatorObj).forEach(([categoryName, sections]: [string, any]) => {
              if (Array.isArray(sections)) {
                sections.forEach((sectionObj: any) => {
                  Object.entries(sectionObj).forEach(([sectionName, section]: [string, any]) => {
                    if (section.status && section.status !== null) {
                      submittedIndicatorsSet.add(section.sNo);
                    }
                  });
                });
              }
            });
          });
          setSubmittedIndicators(submittedIndicatorsSet);
          setSubmittedIndicatorsVersion(prev => prev + 1); // Increment version to force re-render
          
          isInitialLoadRef.current = true;
          prevFormDataRef.current = { ...initialFormData };
          
          // Extract submission ID
          const extractedId = await extractSubmissionId(response, targetUserId, toast);
          if (extractedId) {
            setSubmissionId(extractedId);
          } else {
            setSubmissionId(null);
            setSubmissionError("Could not extract submissionId from response.");
          }
          
          setChecking(false);
          setLoading(false);
          setNoSubmissionFound(false);
          setSubmissionError(null);
          return;
        } else {
          console.log("🆕 No previous submission found for user - no data returned");
          setChecking(false);
          setLoading(false);
          setNoSubmissionFound(true);
          setSubmissionError(null);
        }
      } catch (err: any) {
        setLoading(false);
        if (err?.response?.status === 404) {
          console.log("🆕 No submission found (404), showing empty state");
          setChecking(false);
          setNoSubmissionFound(true);
          setSubmissionError(null);
        } else {
          console.error("⚠️ Error checking submission:", err);
          setChecking(false);
          setNoSubmissionFound(true);
          setSubmissionError(
            err?.response?.data?.message ||
            err?.message ||
            "Failed to check for existing submission. Please try again."
          );
          toast({
            title: "Error",
            description: "Failed to check for existing submission. Please try again.",
            variant: "destructive",
          });
        }
      }
    };

    const canAccess = (user?.id && user?.role === "MINISTRY_APPROVER") ||  (user?.id && user?.role === "NODAL_OFFICER") ||
                      (reviewUserId && ['ADMIN', 'MOSPI_APPROVER', 'MINISTRY_APPROVER'].includes(user?.role || ''));
    
    if (canAccess) {
      checkExistingSubmission();
    } else if (!user?.id) {
      setChecking(false);
      setNoSubmissionFound(true);
      setSubmissionError("Please log in to access ministry submissions.");
      hasCheckedSubmissionRef.current = true;
    } else {
      setChecking(false);
      setNoSubmissionFound(true);
      setSubmissionError("You don't have permission to access ministry submissions.");
      hasCheckedSubmissionRef.current = true;
    }
  }, [user?.id, user?.role, submissionIdFromParams, reviewUserId, toast, persistedFormData]);

  // Handle creating a new submission
  const handleCreateSubmission = async () => {
    if (!user?.id || !user?.ministryId) {
      toast({
        title: "Error",
        description: "User information is incomplete. Please contact your administrator.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log("🆕 Creating new ministry submission for user:", user.id);
      
      const newSubmission = await minstryRegistrationForm(
        user.id,
        user.role,
        user.ministryId
      );
      
      if (newSubmission?.id || newSubmission?.submissionId) {
        const createdSubmissionId = newSubmission.id || newSubmission.submissionId;
        console.log("✅ Created new submission:", createdSubmissionId);
        setSubmissionId(createdSubmissionId);
        setNoSubmissionFound(false);
        setSubmissionError(null);
        toast({
          title: "Success",
          description: "Submission created successfully.",
          variant: "default",
        });
      } else {
        throw new Error("Submission creation failed - no ID returned");
      }
    } catch (error: any) {
      console.error("❌ Error creating submission:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to create submission. Please try again.",
        variant: "destructive",
      });
      setSubmissionError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create submission. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    submissionId,
    assignedIndicators,
    formData,
    submittedIndicators,
    submittedIndicatorsVersion,
    checking,
    loading,
    noSubmissionFound,
    submissionError,
    handleCreateSubmission,
    setFormData,
    setSubmittedIndicators,
    setSubmittedIndicatorsVersion,
    isInitialLoadRef,
    prevFormDataRef,
  };
}

