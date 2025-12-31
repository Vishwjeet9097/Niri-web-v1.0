import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiService } from "@/services/api.service";
import { getMinistrySubmissionDetails } from "@/services/ministry.service";
import { RefreshCw } from "lucide-react";
import { DynamicFormBuilder } from "../components/FormBuilder";
import { useToast } from "@/hooks/use-toast";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import { useFormPersistence } from "@/features/submission/hooks/useFormPersistence";
import { useFieldValidation } from "@/features/submission/hooks/useFieldValidation";
import { getDropdownOptions } from "../constants/dropdownMappings";
import { transformApiResponseToFormData, getCategoryFromSectionId } from "../utils/formDataTransformer";
import type { AssignedIndicator } from "../components/FormBuilder/types";

export function MinistrySubmissionWrapper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: submissionIdFromParams } = useParams<{ id?: string }>();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [assignedIndicators, setAssignedIndicators] = useState<AssignedIndicator[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submittedIndicators, setSubmittedIndicators] = useState<Set<string>>(new Set());
  const [submissionId, setSubmissionId] = useState<string | null>(submissionIdFromParams || null);
  
  const {
    formData: persistedFormData,
    updateFormData,
  } = useFormPersistence();

  const { getFieldError } = useFieldValidation();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Check for existing submission (only if no submission ID from params)
  useEffect(() => {
    const checkExistingSubmission = async () => {
      // TEMPORARY: Hardcoded submission ID for testing form builder
      // TODO: Uncomment user validation logic below when ready
      const HARDCODED_SUBMISSION_ID = "f07697a6-5595-4f73-baf5-1e0c48a351a2"; // Replace with your test submission ID
      
      // If we have submission ID from params, skip this check
      if (submissionIdFromParams) {
        setSubmissionId(submissionIdFromParams);
        setChecking(false);
        return;
      }

      // TEMPORARY: Use hardcoded submission ID for testing
      setSubmissionId(HARDCODED_SUBMISSION_ID);
      setChecking(false);
      return;

      // ============================================
      // COMMENTED OUT: User validation logic
      // Uncomment this section when ready to enable user validation
      // ============================================
      /*
      try {
        if (!user?.id) return;
        
        console.log("🔍 Checking existing submission for Ministry Approver:", user?.id);
        const res = await apiService.get(`/submission/user/${user.id}`);
        const submission = res?.data?.data || res?.data;

        if (submission && submission.id) {
          console.log("✅ Found existing submission:", submission.id);
          // Use the retrieve API to load the submission
          setSubmissionId(submission.id);
          setChecking(false);
          return;
        } else {
          console.log("🆕 No previous submission, proceeding to form");
          setChecking(false);
        }
      } catch (err: any) {
        if (err?.response?.status === 404) {
          console.log("🆕 No submission found, proceeding to form");
          setChecking(false);
        } else {
          console.warn("⚠️ Error checking submission:", err);
          setChecking(false);
        }
      }
      */
    };

    // TEMPORARY: Skip user role check for testing
    // TODO: Uncomment when ready: if (user?.id && user?.role === "MINISTRY_APPROVER") {
    checkExistingSubmission();
    // TODO: Uncomment when ready: }
  }, [user?.id, user?.role, navigate, submissionIdFromParams]);

  // Fetch form structure using retrieve API only
  useEffect(() => {
    const fetchFormStructure = async () => {
      if (checking) return;
      
      // For Ministry Approver, we only use retrieve API
      // Two scenarios:
      // 1. Submission ID from URL params
      // 2. Submission ID from existing submission check
      if (!submissionId) {
        console.log("⚠️ No submission ID found. Cannot load form without submission.");
        toast({
          title: "No Submission Found",
          description: "No submission found. Please create a submission first.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log("📋 Fetching submission details using retrieve API:", submissionId);
        
        const response = await getMinistrySubmissionDetails(submissionId);
        
        console.log("🔍 Raw API Response:", response);
        console.log("🔍 Response Status:", response?.status);
        console.log("🔍 Response Data:", response?.data);
        console.log("🔍 Is Array:", Array.isArray(response?.data));
        console.log("🔍 Data Length:", response?.data?.length);
        
        if (response?.status && response?.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log("✅ Setting assignedIndicators with:", response.data);
          setAssignedIndicators(response.data);
          console.log("✅ Loaded submission form structure:", response.data);
          
          // Transform API response to form data structure
          const initialFormData = transformApiResponseToFormData(response.data, persistedFormData);
          console.log("✅ Transformed Form Data:", initialFormData);
          setFormData(initialFormData);
        } else {
          console.error("❌ Invalid response structure:", {
            status: response?.status,
            hasData: !!response?.data,
            isArray: Array.isArray(response?.data),
            length: response?.data?.length
          });
          toast({
            title: "No Data",
            description: response?.message || "No form structure found for this submission.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("❌ Error fetching submission details:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load submission details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    // TEMPORARY: Skip user role check for testing
    // TODO: Uncomment when ready: if (!checking && user?.role === "MINISTRY_APPROVER") {
    if (!checking) {
      fetchFormStructure();
    }
    // TODO: Uncomment when ready: }
  }, [checking, user?.role, toast, persistedFormData, submissionId]);

  // Handle field changes
  const handleFieldChange = useCallback((path: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (key.includes('[') && key.includes(']')) {
          const arrayKey = key.substring(0, key.indexOf('['));
          const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
          if (!current[arrayKey]) current[arrayKey] = [];
          if (!current[arrayKey][index]) current[arrayKey][index] = {};
          current = current[arrayKey][index];
        } else {
          if (!current[key]) current[key] = {};
          current = current[key];
        }
      }
      
      const finalKey = keys[keys.length - 1];
      if (finalKey.includes('[') && finalKey.includes(']')) {
        const arrayKey = finalKey.substring(0, finalKey.indexOf('['));
        const index = parseInt(finalKey.substring(finalKey.indexOf('[') + 1, finalKey.indexOf(']')));
        if (!current[arrayKey]) current[arrayKey] = [];
        current[arrayKey][index] = value;
      } else {
        current[finalKey] = value;
      }
      
      return newData;
    });
    
    // updateFormData expects category and data
    // For now, we'll update all categories - this might need adjustment based on your structure
    Object.keys(formData).forEach((key) => {
      if (key.startsWith('section')) {
        const category = getCategoryFromSectionId(key.replace('section', '').replace('_', '.'));
        updateFormData(category, { [key]: formData[key] });
      }
    });
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const updated = { ...prev };
      delete updated[path];
      return updated;
    });
  }, [updateFormData, formData]);

  // Check if indicator is submitted
  const isIndicatorSubmitted = useCallback((indicatorId: string): boolean => {
    return submittedIndicators.has(indicatorId);
  }, [submittedIndicators]);

  // Handle section submission
  const handleSectionSubmit = useCallback(async (sectionId: string) => {
    try {
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      const sectionData = formData[sectionKey];
      
      if (!sectionData) {
        toast({
          title: "Error",
          description: "Section data not found",
          variant: "destructive",
        });
        return;
      }

      // For Ministry Approver, we'll need to implement a specific submission API
      // For now, show a message that this needs to be implemented
      toast({
        title: "Info",
        description: "Ministry submission API integration pending. Please contact administrator.",
        variant: "default",
      });
      return;
      
      // TODO: Implement Ministry Approver submission API
      // let currentSubmissionId = submissionId;
      // if (!currentSubmissionId) {
      //   // Create submission for Ministry Approver
      //   const createResponse = await apiService.post("/ministry/submission/create", {});
      //   currentSubmissionId = createResponse?.id || createResponse?.data?.id;
      //   if (currentSubmissionId) {
      //     setSubmissionId(currentSubmissionId);
      //   }
      // }
      // 
      // if (!currentSubmissionId) {
      //   toast({
      //     title: "Error",
      //     description: "Failed to create submission",
      //     variant: "destructive",
      //   });
      //   return;
      // }
      // 
      // const category = getCategoryFromSectionId(sectionId);
      // const result = await apiService.post("/ministry/submission/submit-section", {
      //   submissionId: currentSubmissionId,
      //   sectionData: { [sectionKey]: sectionData },
      //   category,
      //   indicators: [sectionId]
      // });

      // TODO: Uncomment when API is implemented
      // if (result) {
      //   setSubmittedIndicators(prev => new Set(prev).add(sectionId));
      //   toast({
      //     title: "Success",
      //     description: `Section ${sectionId} submitted successfully`,
      //     variant: "default",
      //   });
      // }
    } catch (error: any) {
      console.error("❌ Error submitting section:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit section",
        variant: "destructive",
      });
    }
  }, [formData, submissionId, toast]);

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
        <p>Checking your submission status...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
        <p>Loading form...</p>
      </div>
    );
  }

  // Add debug logging before rendering
  console.log("🎨 Render - assignedIndicators:", assignedIndicators);
  console.log("🎨 Render - assignedIndicators.length:", assignedIndicators.length);
  console.log("🎨 Render - formData:", formData);
  console.log("🎨 Render - loading:", loading);
  console.log("🎨 Render - checking:", checking);

  if (assignedIndicators.length === 0) {
    console.log("⚠️ No indicators - assignedIndicators is empty");
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground">No indicators assigned</p>
        <p className="text-sm text-muted-foreground mt-2">
          Debug: assignedIndicators.length = {assignedIndicators.length}
        </p>
      </div>
    );
  }

  // Calculate progress for ProgressHeader
  const totalIndicators = assignedIndicators.reduce((count, indicatorObj) => {
    return count + Object.values(indicatorObj).flat().length;
  }, 0);
  const completedCount = submittedIndicators.size;
  const progress = totalIndicators > 0 ? Math.round((completedCount / totalIndicators) * 100) : 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <ProgressHeader
        title="Ministry Submission"
        description="Complete all assigned indicators to submit your data"
        points={0}
        completed={completedCount}
        total={totalIndicators}
        progress={progress}
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ministry Submission</h1>
            <p className="text-muted-foreground mt-1">
              Complete all assigned indicators to submit your data
            </p>
          </div>
        </div>

        <DynamicFormBuilder
          indicators={assignedIndicators}
          formData={formData}
          onChange={handleFieldChange}
          mode="edit"
          disabled={false}
          submissionId={submissionId || undefined}
          getFieldError={(path: string) => {
            // getFieldError requires 4 parameters, but we'll provide defaults
            return getFieldError(path, validationErrors, {}, false);
          }}
          getDropdownOptions={getDropdownOptions}
          onSectionSubmit={handleSectionSubmit}
          isIndicatorSubmitted={isIndicatorSubmitted}
        />
      </div>
    </div>
  );
}

