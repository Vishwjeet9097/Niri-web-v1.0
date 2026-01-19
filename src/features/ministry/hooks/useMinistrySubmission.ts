import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { getMinistrySubmissionDetails, minstryRegistrationForm, getRemainingMinistryIndicators } from "@/services/ministry.service";
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
  allIndicatorsAssigned: boolean;
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
  const [allIndicatorsAssigned, setAllIndicatorsAssigned] = useState(false);
  
  const hasCheckedSubmissionRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const prevFormDataRef = useRef<Record<string, any>>({});

  // Check for existing submission
  useEffect(() => {
    if (hasCheckedSubmissionRef.current) return;
    
    const checkExistingSubmission = async () => {
      if (submissionIdFromParams) {
        // If we have submissionId from params, use it directly
        setSubmissionId(submissionIdFromParams);
        try {
          setLoading(true);
          const response = await getMinistrySubmissionDetails(submissionIdFromParams);
          
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
                      // Only disable form when status is SUBMITTED_TO_MINISTRY
                      if (section.status === "SUBMITTED_TO_MINISTRY") {
                        submittedIndicatorsSet.add(section.sNo);
                      }
                    });
                  });
                }
              });
            });
            setSubmittedIndicators(submittedIndicatorsSet);
            setSubmittedIndicatorsVersion(prev => prev + 1);
            
            isInitialLoadRef.current = true;
            prevFormDataRef.current = { ...initialFormData };
            
            setChecking(false);
            setLoading(false);
            setNoSubmissionFound(false);
            setSubmissionError(null);
            hasCheckedSubmissionRef.current = true;
            return;
          } else {
            console.log("🆕 No previous submission found for submissionId - no data returned");
            setChecking(false);
            setLoading(false);
            setNoSubmissionFound(true);
            setSubmissionError(null);
            hasCheckedSubmissionRef.current = true;
            return;
          }
        } catch (err: any) {
          setLoading(false);
          console.error("⚠️ Error loading submission by ID:", err);
          setChecking(false);
          setNoSubmissionFound(true);
          setSubmissionError(
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load submission. Please try again."
          );
          hasCheckedSubmissionRef.current = true;
          return;
        }
      }

      // If no submissionId in params, use userId (function will fetch submissionId internally)
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
          if (!['ADMIN', 'MOSPI_APPROVER', 'MINISTRY_APPROVER', 'NODAL_OFFICER'].includes(user?.role || '')) {
            console.log("⚠️ User doesn't have permission to review ministry submissions");
            setChecking(false);
            setNoSubmissionFound(true);
            setSubmissionError("You don't have permission to review ministry submissions.");
            hasCheckedSubmissionRef.current = true;
            return;
          }
        } else {
          if (!['MINISTRY_APPROVER', 'NODAL_OFFICER'].includes(user?.role || '')) {
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
        // Pass userId, function will fetch submissionId internally
        const response = await getMinistrySubmissionDetails(undefined, targetUserId);

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
                    // Only disable form when status is SUBMITTED_TO_MINISTRY
                    if (section.status === "SUBMITTED_TO_MINISTRY") {
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

    const canAccess = (user?.id && ['MINISTRY_APPROVER', 'NODAL_OFFICER'].includes(user?.role || '')) || 
                      (reviewUserId && ['ADMIN', 'MOSPI_APPROVER', 'MINISTRY_APPROVER', 'NODAL_OFFICER'].includes(user?.role || ''));
    
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

  // Check if all indicators are assigned to nodals (only for MINISTRY_APPROVER when no submission found)
  useEffect(() => {
    const checkAllIndicatorsAssigned = async () => {
      // Only check for MINISTRY_APPROVER when no submission is found
      if (user?.role === "MINISTRY_APPROVER" && noSubmissionFound && user?.id && !checking && !loading) {
        try {
          const remainingIndicators = await getRemainingMinistryIndicators(user.id);
          
          // Check if remaining indicators is empty or has no items
          const isEmpty = 
            remainingIndicators == null ||
            (Array.isArray(remainingIndicators) && remainingIndicators.length === 0) ||
            (typeof remainingIndicators === 'object' && !Array.isArray(remainingIndicators) && Object.keys(remainingIndicators).length === 0);
          
          setAllIndicatorsAssigned(isEmpty);
        } catch (error) {
          console.error("⚠️ Error checking remaining indicators:", error);
          // On error, assume not all are assigned (safer to allow creation)
          setAllIndicatorsAssigned(false);
        }
      } else {
        // Reset when conditions are not met
        setAllIndicatorsAssigned(false);
      }
    };

    checkAllIndicatorsAssigned();
  }, [user?.role, user?.id, noSubmissionFound, checking, loading]);

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
      setChecking(true);
      console.log("🆕 Creating new ministry submission for user:", user.id);
      
      const newSubmission = await minstryRegistrationForm(
        user.id,
        user.role,
        user.ministryId
      );
      
      console.log("📦 Create submission response:", newSubmission);
      
      // Extract submissionId - prefer submissionId (SUB- format) over id (UUID)
      const createdSubmissionId = newSubmission?.submissionId || newSubmission?.id;
      
      if (createdSubmissionId) {
        console.log("✅ Created new submission:", createdSubmissionId);
        console.log("📋 SubmissionId type:", typeof createdSubmissionId);
        console.log("📋 SubmissionId value:", createdSubmissionId);
        setSubmissionId(createdSubmissionId);
        setNoSubmissionFound(false);
        setSubmissionError(null);
        
        // Reload form data after creating submission using submission-with-data endpoint
        // This endpoint shows all indicators with their submitted data and status
        try {
          console.log("🔄 Loading form data with submitted indicators for new submission");
          console.log("📡 Will call: /ministry/form/retrieve/submission-with-data/" + createdSubmissionId);
          console.log("📋 Passing submissionId to getMinistrySubmissionDetails:", createdSubmissionId);
          
          // Call the submission-with-data endpoint to get indicators with submitted data
          // IMPORTANT: Pass submissionId (not userId) to ensure it calls submission-with-data endpoint
          const response = await getMinistrySubmissionDetails(createdSubmissionId, undefined);
          
          console.log("📦 Response from submission-with-data:", {
            status: response?.status,
            hasData: !!response?.data,
            dataLength: Array.isArray(response?.data) ? response.data.length : 0,
            submissionId: response?.submissionId
          });
          
          if (response?.status && response?.data && Array.isArray(response.data) && response.data.length > 0) {
            console.log("✅ Loaded form data with indicators:", response.data.length);
            setAssignedIndicators(response.data);
            
            const initialFormData = transformApiResponseToFormData(response.data, persistedFormData);
            setFormData(initialFormData);
            
            // Extract submitted indicators by checking section status
            // The submission-with-data endpoint includes status for each section
            // Only disable form when status is SUBMITTED_TO_MINISTRY
            const submittedIndicatorsSet = new Set<string>();
            response.data.forEach((indicatorObj: any) => {
              Object.entries(indicatorObj).forEach(([categoryName, sections]: [string, any]) => {
                if (Array.isArray(sections)) {
                  sections.forEach((sectionObj: any) => {
                    Object.entries(sectionObj).forEach(([sectionName, section]: [string, any]) => {
                      // Only disable form when status is SUBMITTED_TO_MINISTRY
                      if (section.status === "SUBMITTED_TO_MINISTRY") {
                        submittedIndicatorsSet.add(section.sNo);
                        console.log(`✅ Found submitted indicator: ${section.sNo} - ${sectionName} (status: ${section.status})`);
                      }
                    });
                  });
                }
              });
            });
            
            console.log(`📊 Total submitted indicators: ${submittedIndicatorsSet.size}`, Array.from(submittedIndicatorsSet));
            setSubmittedIndicators(submittedIndicatorsSet);
            setSubmittedIndicatorsVersion(prev => prev + 1);
            
            isInitialLoadRef.current = true;
            prevFormDataRef.current = { ...initialFormData };
          } else {
            console.warn("⚠️ No indicators returned for new submission");
          }
        } catch (loadError: any) {
          console.error("⚠️ Error loading form data after creation:", loadError);
          // Don't fail the entire operation if loading form data fails
          // The form will be empty but submission is created
        }
        
        toast({
          title: "Success",
          description: "Submission created successfully.",
          variant: "default",
        });
      } else {
        console.error("❌ No submission ID found in response:", newSubmission);
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
      setChecking(false);
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
    allIndicatorsAssigned,
    handleCreateSubmission,
    setFormData,
    setSubmittedIndicators,
    setSubmittedIndicatorsVersion,
    isInitialLoadRef,
    prevFormDataRef,
  };
}

