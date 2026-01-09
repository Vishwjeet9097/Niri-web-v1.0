import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiService } from "@/services/api.service";
import { getMinistrySubmissionDetails, submitIndicatorToMinistryApprover, minstryRegistrationForm } from "@/services/ministry.service";
import { RefreshCw } from "lucide-react";
import { DynamicFormBuilder } from "../components/FormBuilder";
import { useToast } from "@/hooks/use-toast";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import { useFormPersistence } from "@/features/submission/hooks/useFormPersistence";
import { useFieldValidation } from "@/features/submission/hooks/useFieldValidation";
import { getDropdownOptions } from "../constants/dropdownMappings";
import { transformApiResponseToFormData, getCategoryFromSectionId } from "../utils/formDataTransformer";
import { validateIndicator, validateField, validateSection } from "../utils/validation";
import type { AssignedIndicator } from "../components/FormBuilder/types";
import { MinistryStepper } from "../components/Stepper";
import { MINISTRY_SUBMISSION_STEPS } from "../constants/steps";
import type { MinistryStep } from "../types";
import { FormActions } from "@/features/submission/components/FormActions";
import { MinistryReviewSubmitStep } from "./MinistryReviewSubmitStep";
import { MinistryEmptyState } from "../components/MinistryEmptyState";

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
  const [submittingIndicator, setSubmittingIndicator] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(submissionIdFromParams || null);
  const [noSubmissionFound, setNoSubmissionFound] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  const {
    formData: persistedFormData,
    updateFormData,
  } = useFormPersistence();

  const { getFieldError } = useFieldValidation();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1); // For stepper visual indication
  
  // Refs to prevent duplicate API calls and infinite loops
  const hasCheckedSubmissionRef = useRef(false);
  const hasFetchedFormRef = useRef(false);

  // Check for existing submission (only if no submission ID from params)
  useEffect(() => {
    // Prevent duplicate calls
    if (hasCheckedSubmissionRef.current) return;
    
    const checkExistingSubmission = async () => {
      // If we have submission ID from params, skip this check
      if (submissionIdFromParams) {
        setSubmissionId(submissionIdFromParams);
        setChecking(false);
        setNoSubmissionFound(false);
        setSubmissionError(null);
        hasCheckedSubmissionRef.current = true;
        return;
      }

      try {
        if (!user?.id) {
          console.log("⚠️ No user ID found");
          setChecking(false);
          setNoSubmissionFound(true);
          setSubmissionError("User not authenticated. Please log in.");
          hasCheckedSubmissionRef.current = true;
          return;
        }

        // Allow both MINISTRY_APPROVER and NODAL_OFFICER roles
        if (user?.role !== "MINISTRY_APPROVER" && user?.role !== "NODAL_OFFICER") {
          console.log("⚠️ User is not a Ministry Approver or Nodal Officer");
          setChecking(false);
          setNoSubmissionFound(true);
          setSubmissionError("You don't have permission to access ministry submissions.");
          hasCheckedSubmissionRef.current = true;
          return;
        }
        
        hasCheckedSubmissionRef.current = true;
        console.log(`🔍 Checking existing submission for ${user?.role} using ministry API:`, user?.id);
        // Use the ministry API endpoint directly with userId
        // This will also load the form data, so we don't need a separate fetchFormStructure call
        setLoading(true);
        const response = await getMinistrySubmissionDetails(user.id);

        if (response?.status && response?.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log("✅ Found existing submission with indicators:", response.data.length);
          // Submission exists - load the form data directly here
          setAssignedIndicators(response.data);
          
          // Transform API response to form data structure (includes submitted values)
          const initialFormData = transformApiResponseToFormData(response.data, persistedFormData);
          setFormData(initialFormData);
          
          // Mark submitted indicators based on status from API
          const submittedIndicatorsSet = new Set<string>();
          response.data.forEach((indicatorObj: any) => {
            Object.entries(indicatorObj).forEach(([categoryName, sections]: [string, any]) => {
              if (Array.isArray(sections)) {
                sections.forEach((sectionObj: any) => {
                  Object.entries(sectionObj).forEach(([sectionName, section]: [string, any]) => {
                    // If status is DRAFT or any submitted status, mark as submitted
                    if (section.status && section.status !== null) {
                      submittedIndicatorsSet.add(section.sNo);
                    }
                  });
                });
              }
            });
          });
          setSubmittedIndicators(submittedIndicatorsSet);
          
          // Mark as initial load
          isInitialLoadRef.current = true;
          prevFormDataRef.current = { ...initialFormData };
          
          // Use actual submissionId from API response (same as state submissions)
          // Try to extract submissionId from response
          let actualSubmissionId = response.submissionId || null;
          
          console.log("🔍 Checking for submissionId in response:", {
            hasSubmissionId: !!response.submissionId,
            submissionId: response.submissionId,
            responseKeys: Object.keys(response || {}),
            fullResponse: response,
            responseType: typeof response,
            responseConstructor: response?.constructor?.name,
            // Also log the service response to see what getMinistrySubmissionDetails returned
            serviceResponse: response
          });
          
          // CRITICAL: Log what getMinistrySubmissionDetails actually returned
          console.log("🔍 Full getMinistrySubmissionDetails response:", JSON.stringify(response, null, 2));
          
          // IMPORTANT: Also check if submissionId is in the response object itself
          // Sometimes the API might wrap it differently
          if (!actualSubmissionId && response && typeof response === 'object') {
            // Try to find submissionId in any nested structure
            const searchForSubmissionId = (obj: any, depth = 0): string | null => {
              if (depth > 5) return null; // Prevent infinite recursion
              if (!obj || typeof obj !== 'object') return null;
              
              if (obj.submissionId && typeof obj.submissionId === 'string') {
                return obj.submissionId;
              }
              
              for (const value of Object.values(obj)) {
                if (typeof value === 'object' && value !== null) {
                  const found = searchForSubmissionId(value, depth + 1);
                  if (found) return found;
                }
              }
              
              return null;
            };
            
            actualSubmissionId = searchForSubmissionId(response);
            if (actualSubmissionId) {
              console.log("✅ Found submissionId in nested structure:", actualSubmissionId);
            }
          }
          
          if (actualSubmissionId) {
            console.log("📋 Using actual submission ID for file uploads:", actualSubmissionId);
            setSubmissionId(actualSubmissionId);
          } else {
            // If still no submissionId, try to extract it from the data structure
            // The submissionId might be in the first indicator's submissionIndicatorId's parent submission
            // OR we can fetch it from the simpler endpoint
            console.warn("⚠️ No submissionId in API response, trying to extract from data or fetch from endpoint...");
            
            // First, try to get it from the simpler endpoint
            try {
              const submissionResponse = await apiService.get(
                `/ministry/form/retrieve/submission/${user.id}`,
                { withCredentials: true }
              );
              const submissionData = submissionResponse.data;
              
              console.log("🔍 Submission endpoint response structure:", {
                isArray: Array.isArray(submissionData),
                type: typeof submissionData,
                hasSubmissionId: !!submissionData?.submissionId,
                submissionId: submissionData?.submissionId,
                responseKeys: submissionData && typeof submissionData === 'object' && !Array.isArray(submissionData) ? Object.keys(submissionData) : 'N/A',
                fullResponse: submissionData
              });
              
              // Try to get submissionId from response (check multiple possible structures)
              let fetchedSubmissionId = null;
              
              // Case 1: Direct property
              if (submissionData?.submissionId) {
                fetchedSubmissionId = submissionData.submissionId;
              }
              // Case 2: Nested in submission object
              else if (submissionData?.submission?.id) {
                fetchedSubmissionId = submissionData.submission.id;
              }
              // Case 3: Top-level id
              else if (submissionData?.id) {
                fetchedSubmissionId = submissionData.id;
              }
              // Case 4: Nested in data object
              else if (submissionData?.data?.submissionId) {
                fetchedSubmissionId = submissionData.data.submissionId;
              }
              else if (submissionData?.data?.id) {
                fetchedSubmissionId = submissionData.data.id;
              }
              else if (submissionData?.data?.submission?.id) {
                fetchedSubmissionId = submissionData.data.submission.id;
              }
              
              if (fetchedSubmissionId) {
                console.log("✅ Fetched submission ID from submission endpoint:", fetchedSubmissionId);
                setSubmissionId(fetchedSubmissionId);
              } else {
                // Last resort: Extract submissionId from submissionIndicatorId by querying the database
                // Each indicator has a submissionIndicatorId, and we can use that to get the parent submissionId
                console.warn("⚠️ No submissionId in API response. Extracting from submissionIndicatorId...");
                try {
                  // Find the first submissionIndicatorId in the response data
                  const findFirstSubmissionIndicatorId = (data: any): string | null => {
                    if (!data || typeof data !== 'object') return null;
                    
                    // Check if it's an array
                    if (Array.isArray(data)) {
                      for (const item of data) {
                        const found = findFirstSubmissionIndicatorId(item);
                        if (found) return found;
                      }
                    } else {
                      // Check if this object has submissionIndicatorId
                      if (data.submissionIndicatorId && typeof data.submissionIndicatorId === 'string') {
                        return data.submissionIndicatorId;
                      }
                      
                      // Recursively search in nested objects
                      for (const value of Object.values(data)) {
                        if (typeof value === 'object' && value !== null) {
                          const found = findFirstSubmissionIndicatorId(value);
                          if (found) return found;
                        }
                      }
                    }
                    
                    return null;
                  };
                  
                  const firstSubmissionIndicatorId = findFirstSubmissionIndicatorId(response.data);
                  
                  if (firstSubmissionIndicatorId) {
                    console.log("✅ Found submissionIndicatorId:", firstSubmissionIndicatorId);
                    console.log("🔍 Querying backend to get submissionId from submissionIndicatorId...");
                    
                    // Query the backend to get submissionId from submissionIndicatorId
                    try {
                      // Use the new endpoint to get submissionId from submissionIndicatorId
                      const submissionIdResponse = await apiService.get(
                        `/ministry/form/retrieve/submission-id-from-indicator/${firstSubmissionIndicatorId}`,
                        { withCredentials: true }
                      );
                      
                      const submissionIdData = submissionIdResponse.data;
                      console.log("🔍 SubmissionId from indicator response:", submissionIdData);
                      
                      if (submissionIdData?.submissionId) {
                        console.log("✅ Successfully extracted submissionId from submissionIndicatorId:", submissionIdData.submissionId);
                        setSubmissionId(submissionIdData.submissionId);
                        // Clear loading states before returning
                        setChecking(false);
                        setLoading(false);
                        setNoSubmissionFound(false);
                        setSubmissionError(null);
                        return; // Exit early if we found it
                      } else {
                        console.error("❌ submissionId not found in response from indicator endpoint");
                        setSubmissionId(null);
                        setSubmissionError("Could not extract submissionId from submissionIndicatorId.");
                        // Clear loading states even on error
                        setChecking(false);
                        setLoading(false);
                      }
                    } catch (queryError: any) {
                      console.error("❌ Error querying submissionId from indicator:", queryError);
                      console.error("❌ Error details:", {
                        message: queryError?.message,
                        response: queryError?.response?.data,
                        status: queryError?.response?.status
                      });
                      
                      // Fallback: Show error about backend not returning submissionId
                      console.error("❌ Backend is not returning submissionId in the API response!");
                      console.error("❌ The backend code at line 480 should return: { status, data, message, submissionId }");
                      console.error("❌ But the actual API response is: { status, data, message }");
                      console.error("❌ Please check the backend console logs to see if the service method is logging submissionId.");
                      console.error("❌ If the backend logs show submissionId but the API response doesn't, there may be a response interceptor stripping it.");
                      
                      toast({
                        title: "Backend Configuration Issue",
                        description: "Unable to retrieve submission ID. Please check the backend console logs and verify the service method is returning submissionId. The backend may need to be restarted or there may be a response interceptor issue.",
                        variant: "destructive",
                      });
                      setSubmissionId(null);
                      setSubmissionError("Backend not returning submissionId. Check backend logs.");
                      // Clear loading states on error
                      setChecking(false);
                      setLoading(false);
                    }
                  } else {
                    console.error("❌ Could not find submissionIndicatorId in response data");
                    setSubmissionId(null);
                    setSubmissionError("Could not extract submissionId from response.");
                    // Clear loading states on error
                    setChecking(false);
                    setLoading(false);
                  }
                } catch (extractionError: any) {
                  console.error("❌ Error in extraction fallback:", extractionError);
                  setSubmissionId(null);
                  setSubmissionError("Failed to retrieve submission ID.");
                  // Clear loading states on error
                  setChecking(false);
                  setLoading(false);
                }
              }
            } catch (fetchError: any) {
              console.error("❌ Error fetching submission ID:", fetchError);
              console.error("❌ Error details:", {
                message: fetchError?.message,
                response: fetchError?.response?.data,
                status: fetchError?.response?.status,
                stack: fetchError?.stack
              });
              toast({
                title: "Error",
                description: "Failed to retrieve submission ID. The backend may need to be restarted. Please contact support.",
                variant: "destructive",
              });
              // Don't use "exists" - leave it null
              setSubmissionId(null);
              setSubmissionError("Failed to retrieve submission ID. Backend may need restart.");
            }
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

    if (user?.id && (user?.role === "MINISTRY_APPROVER" || user?.role === "NODAL_OFFICER")) {
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
  }, [user?.id, user?.role, submissionIdFromParams, toast]);

  // Handle field changes - optimized to prevent full re-renders
  // Real-time validation on field change
  const validateFieldOnChange = useCallback((path: string, value: any, field: any) => {
    if (!field) return;
    
    // Extract section key from path (e.g., "section1_1" from "section1_1.fieldId")
    const sectionKey = path.split('.')[0];
    const sectionData = formData[sectionKey] || {};
    
    // Find Yes/No field value in the same section for conditional validation
    let yesNoValue: string | null = null;
    if (sectionData && typeof sectionData === 'object') {
      // Look for Yes/No field in the section data
      Object.keys(sectionData).forEach((key) => {
        // Check if this might be a Yes/No field value
        const val = sectionData[key];
        if (val === 'yes' || val === 'no' || val === 'Yes' || val === 'No') {
          // This could be a Yes/No value, but we need to verify it's from a Yes/No field
          // We'll check if the field being validated is in a section that has Yes/No fields
          // For now, we'll use a simpler approach: check all assignedIndicators to find Yes/No field
          yesNoValue = String(val).toLowerCase();
        }
      });
    }
    
    // Try to find Yes/No field from assignedIndicators
    if (assignedIndicators.length > 0) {
      for (const indicatorObj of assignedIndicators) {
        const indicatorName = Object.keys(indicatorObj)[0];
        const sections = indicatorObj[indicatorName];
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];
          // Check if this section matches the sectionKey
          const sectionId = section.sNo?.replace('.', '_');
          const expectedSectionKey = `section${sectionId}`;
          
          if (expectedSectionKey === sectionKey && section.inputs) {
            // Find Yes/No field in this section
            const yesNoField = section.inputs.find((f: any) => 
              f.label?.toLowerCase().includes('yes/no') || f.label === 'Yes/No'
            );
            if (yesNoField) {
              yesNoValue = (sectionData[yesNoField.id] || '').toLowerCase().trim() || null;
              break;
            }
          }
        }
        if (yesNoValue !== null) break;
      }
    }
    
    // Use imported validation function with Yes/No value
    const error = validateField(field, value, path, yesNoValue);
    
    // Use functional update to ensure we're working with latest state
    setValidationErrors((prev) => {
      const hadError = prev[path] !== undefined;
      
      // Always create a new object to ensure React detects the change
      const newErrors = { ...prev };
      
      if (error) {
        // Set error if validation fails
        newErrors[path] = error;
        if (!hadError) {
          console.log(`❌ Setting error for ${path}:`, error);
        }
      } else {
        // Clear error if field is now valid - always delete even if it doesn't exist
        if (hadError) {
          console.log(`✅ Clearing error for ${path} - field is now valid`);
        }
        delete newErrors[path];
      }
      
      // Always return a new object reference to ensure React detects the change
      // This is critical for triggering re-renders in memoized components
      return newErrors;
    });
  }, [formData, assignedIndicators]);

  // Clear validation error for a field when user starts typing
  const clearFieldError = useCallback((path: string) => {
    setValidationErrors((prev) => {
      if (prev[path]) {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      }
      return prev;
    });
  }, []);

  // Memoized getFieldError function that updates when validationErrors changes
  const getFieldErrorMemoized = useCallback((path: string) => {
    // Only check validationErrors - return undefined if no error exists
    // This ensures errors are cleared immediately when validation passes
    if (validationErrors && validationErrors[path]) {
      return validationErrors[path];
    }
    // Return undefined if no error - this clears the error message
    return undefined;
  }, [validationErrors]);

  // Supports both direct values and function updates (for getting latest state)
  const handleFieldChange = useCallback((path: string, value: any, field?: any) => {
    console.log("🔄 handleFieldChange called - path:", path, "value type:", typeof value === 'function' ? 'function' : typeof value);
    
    setFormData((prev) => {
      const keys = path.split('.');
      const sectionKey = keys[0]; // First key is always the section (e.g., "section1_2")
      
      // Create a new object for the section to ensure reference change
      const newSectionData = prev[sectionKey] ? { ...prev[sectionKey] } : {};
      
      // Navigate to the parent object within the section to get current value
      let currentForValue: any = newSectionData;
      for (let i = 1; i < keys.length - 1; i++) {
        const key = keys[i];
        currentForValue = currentForValue[key] || {};
      }
      
      // Get current value for function updates
      const finalKey = keys[keys.length - 1];
      const currentValue = currentForValue[finalKey];
      
      // If value is a function, call it with the current value to get the new value
      const actualValue = typeof value === 'function' 
        ? value(currentValue)
        : value;
      
      if (typeof value === 'function') {
        console.log("🔄 Function update detected, current value:", currentValue, "new value:", actualValue);
      }
      
      // Navigate to the parent object within the section (for setting)
      let current: any = newSectionData;
      for (let i = 1; i < keys.length - 1; i++) {
        const key = keys[i];
        if (key.includes('[') && key.includes(']')) {
          const arrayKey = key.substring(0, key.indexOf('['));
          const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
          if (!current[arrayKey]) current[arrayKey] = [];
          // Create new array to ensure immutability
          current[arrayKey] = [...current[arrayKey]];
          if (!current[arrayKey][index]) current[arrayKey][index] = {};
          current = current[arrayKey][index];
        } else {
          // Create a new object to ensure immutability
          current[key] = current[key] ? { ...current[key] } : {};
          current = current[key];
        }
      }
      
      // Set the final value
      console.log("🔧 Setting final key:", finalKey, "value type:", Array.isArray(actualValue) ? `Array(${actualValue.length})` : typeof actualValue);
      
      if (finalKey.includes('[') && finalKey.includes(']')) {
        const arrayKey = finalKey.substring(0, finalKey.indexOf('['));
        const index = parseInt(finalKey.substring(finalKey.indexOf('[') + 1, finalKey.indexOf(']')));
        if (!current[arrayKey]) current[arrayKey] = [];
        // Create a new array to ensure reference change
        const newArray = [...current[arrayKey]];
        newArray[index] = actualValue;
        current[arrayKey] = newArray;
        console.log("🔧 Set array item:", arrayKey, "[", index, "] =", actualValue);
      } else {
        // For direct array assignment (like subsection arrays), assign directly
        const oldValue = current[finalKey];
        current[finalKey] = actualValue;
        console.log("🔧 Set direct value:", finalKey, "old length:", Array.isArray(oldValue) ? oldValue.length : 'N/A', "new length:", Array.isArray(actualValue) ? actualValue.length : 'N/A');
        console.log("🔧 Values are equal?", oldValue === actualValue);
      }
      
      // Create new formData with updated section
      const newData = {
        ...prev,
        [sectionKey]: newSectionData
      };
      
      console.log("🔧 Returning newData:", newData);
      console.log("🔧 Section data reference changed?", newData[sectionKey] !== prev[sectionKey]);
      return newData;
    });
    
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const updated = { ...prev };
      delete updated[path];
      return updated;
    });
  }, []);

  // Auto-calculation for indicator 1.1: % Capex Utilization
  // Formula: (Capital Expenditure Actuals / Capital Expenditure Allocation) × 100
  useEffect(() => {
    // Field IDs from API response for indicator 1.1
    const CAPITAL_ALLOCATION_FIELD_ID = "ffeaee40-1485-4921-a201-f85aefb6d1bb";
    const CAPITAL_ACTUALS_FIELD_ID = "a5a7a01d-9eed-4369-923b-8652b45badcf";
    const CAPEX_UTILIZATION_FIELD_ID = "aed92319-dee2-41ee-858f-a10b167ce431";
    const sectionKey = "section1_1";

    const sectionData = formData[sectionKey];
    if (!sectionData) return;

    const capitalAllocation = parseFloat(
      (sectionData[CAPITAL_ALLOCATION_FIELD_ID] || "").toString().replace(/[₹,]/g, "")
    );
    const capitalActuals = parseFloat(
      (sectionData[CAPITAL_ACTUALS_FIELD_ID] || "").toString().replace(/[₹,]/g, "")
    );

    // Calculate percentage if both values are valid
    // Validation: Both fields must be > 0
    let calculatedValue: string | number = "";
    
    // Check if both values are valid numbers and greater than 0
    const isValidAllocation = !isNaN(capitalAllocation) && capitalAllocation > 0;
    const isValidActuals = !isNaN(capitalActuals) && capitalActuals > 0;
    
    if (isValidAllocation && isValidActuals) {
      const percentage = (capitalActuals / capitalAllocation) * 100;
      // Calculate the percentage (allow it to exceed 100 to show validation error)
      if (percentage >= 0) {
        calculatedValue = Math.round(percentage * 100) / 100; // Round to 2 decimal places
      } else {
        // If negative, set to 0 (shouldn't happen with positive inputs, but safety check)
        calculatedValue = 0;
      }
    }
    // If either field is invalid (0, negative, or empty), calculatedValue remains "" (empty)

    // Only update if the calculated value has changed
    const currentCalculatedValue = sectionData[CAPEX_UTILIZATION_FIELD_ID];
    if (currentCalculatedValue !== calculatedValue) {
      setFormData((prev) => {
        const sectionData = prev[sectionKey] || {};
        return {
          ...prev,
          [sectionKey]: {
            ...sectionData,
            [CAPEX_UTILIZATION_FIELD_ID]: calculatedValue,
          },
        };
      });

      // Find the calculated field object and validate it
      if (calculatedValue !== "" && assignedIndicators.length > 0) {
        // Find the field definition for the calculated field
        let calculatedField: any = null;
        for (const indicatorObj of assignedIndicators) {
          const indicatorName = Object.keys(indicatorObj)[0];
          if (indicatorName === "Infra Financing") {
            const sections = indicatorObj[indicatorName];
            for (const sectionObj of sections) {
              const sectionName = Object.keys(sectionObj)[0];
              if (sectionName === "Capital Utilization") {
                const section = sectionObj[sectionName];
                if (section.inputs && Array.isArray(section.inputs)) {
                  calculatedField = section.inputs.find(
                    (input: any) => input.id === CAPEX_UTILIZATION_FIELD_ID
                  );
                  if (calculatedField) break;
                }
              }
            }
          }
        }

        // Validate the calculated field after setting its value
        if (calculatedField && calculatedValue !== "") {
          const calculatedFieldPath = `${sectionKey}.${CAPEX_UTILIZATION_FIELD_ID}`;
          // Validate immediately with the calculated value
          const error = validateField(calculatedField, calculatedValue, calculatedFieldPath);
          
          // Set validation error if percentage exceeds 100
          setValidationErrors((prev) => {
            const newErrors = { ...prev };
            if (error) {
              newErrors[calculatedFieldPath] = error;
            } else {
              // Clear error if valid
              delete newErrors[calculatedFieldPath];
            }
            return newErrors;
          });
        } else if (calculatedValue === "") {
          // Clear validation error if calculated value is cleared
          const calculatedFieldPath = `${sectionKey}.${CAPEX_UTILIZATION_FIELD_ID}`;
          setValidationErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[calculatedFieldPath];
            return newErrors;
          });
        }
      }
    }
  }, [
    formData.section1_1?.["ffeaee40-1485-4921-a201-f85aefb6d1bb"],
    formData.section1_1?.["a5a7a01d-9eed-4369-923b-8652b45badcf"],
    assignedIndicators,
    validateFieldOnChange,
  ]);

  // Sync formData to persistence with debouncing to prevent infinite loops
  // This ensures add/remove operations are persisted
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevFormDataRef = useRef<Record<string, any>>(formData);
  const isInitialLoadRef = useRef(true);
  
  useEffect(() => {
    // Skip sync during initial load (first render after data is loaded)
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevFormDataRef.current = { ...formData };
      return;
    }
    
    // Only sync if formData actually changed
    // Use a more reliable comparison that handles empty arrays correctly
    const prevStr = JSON.stringify(prevFormDataRef.current);
    const currentStr = JSON.stringify(formData);
    const hasChanged = prevStr !== currentStr;
    
    if (!hasChanged) {
      console.log("⏭️ FormData unchanged, skipping sync");
      return;
    }
    
    // Log what changed
    try {
      const prev = JSON.parse(prevStr);
      const current = JSON.parse(currentStr);
      
      // Find sections with array length changes
      const arrayChanges: string[] = [];
      Object.keys(current).forEach((key) => {
        if (key.startsWith('section') && current[key] && typeof current[key] === 'object') {
          Object.keys(current[key]).forEach((subsectionName) => {
            if (Array.isArray(current[key][subsectionName])) {
              const prevLength = prev[key]?.[subsectionName]?.length ?? 0;
              const currentLength = current[key][subsectionName].length;
              if (prevLength !== currentLength) {
                arrayChanges.push(`${key}.${subsectionName}: ${prevLength} → ${currentLength}`);
              }
            }
          });
        }
      });
      
      if (arrayChanges.length > 0) {
        console.log("🔄 Array changes detected:", arrayChanges);
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    console.log("🔄 FormData changed, will sync to persistence after debounce");
    
    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    // Debounce the sync to batch multiple changes
    syncTimeoutRef.current = setTimeout(() => {
      console.log("💾 Syncing formData to persistence...");
      
      // Group sections by category
      const categoryData: Record<string, Record<string, any>> = {
        infraFinancing: {},
        infraDevelopment: {},
        pppDevelopment: {},
        infraEnablers: {},
      };
      
      // Collect all sections by category
      Object.keys(formData).forEach((key) => {
        if (key.startsWith('section')) {
          const sectionId = key.replace('section', '').replace('_', '.');
          const category = getCategoryFromSectionId(sectionId);
          if (category && categoryData[category]) {
            // Deep clone to ensure we capture the exact state including empty arrays
            const sectionData = JSON.parse(JSON.stringify(formData[key]));
            
            // Log empty arrays in this section
            const emptyArraysInSection = Object.entries(sectionData)
              .filter(([_, value]) => Array.isArray(value) && value.length === 0)
              .map(([name]) => name);
            
            if (emptyArraysInSection.length > 0) {
              console.log(`📝 Section ${key} has empty arrays:`, emptyArraysInSection);
            }
            
            categoryData[category][key] = sectionData;
          }
        } else if (['infraFinancing', 'infraDevelopment', 'pppDevelopment', 'infraEnablers'].includes(key)) {
          // Preserve category-level data
          categoryData[key] = { ...categoryData[key], ...formData[key] };
        }
      });
      
      // Sync each category to persistence
      // IMPORTANT: Merge with existing persisted data to preserve other sections
      Object.entries(categoryData).forEach(([category, data]) => {
        if (Object.keys(data).length > 0) {
          // Get existing persisted data for this category
          const existingCategoryData = persistedFormData[category as keyof typeof persistedFormData] || {};
          
          // Merge: new data overwrites existing, but preserve other sections
          // CRITICAL: Deep merge to ensure empty arrays overwrite old arrays
          const mergedData = JSON.parse(JSON.stringify({
            ...existingCategoryData,
            ...data, // New data (including empty arrays) overwrites old
          }));
          
          // For each section in new data, ensure it completely overwrites the old section
          Object.keys(data).forEach((sectionKey) => {
            if (sectionKey.startsWith('section')) {
              // Completely replace the section, not merge it
              mergedData[sectionKey] = JSON.parse(JSON.stringify(data[sectionKey]));
            }
          });
          
          // Log empty arrays to verify they're being synced
          const emptyArrays: string[] = [];
          Object.entries(mergedData).forEach(([sectionKey, sectionData]: [string, any]) => {
            if (sectionKey.startsWith('section') && typeof sectionData === 'object') {
              Object.entries(sectionData).forEach(([subsectionName, subsectionValue]) => {
                if (Array.isArray(subsectionValue) && subsectionValue.length === 0) {
                  emptyArrays.push(`${sectionKey}.${subsectionName}`);
                }
              });
            }
          });
          
          if (emptyArrays.length > 0) {
            console.log(`💾 Category ${category} - Empty arrays being synced:`, emptyArrays);
          } else {
            console.log(`💾 Category ${category} - No empty arrays found in merged data`);
          }
          
          console.log(`💾 Syncing category ${category} with ${Object.keys(mergedData).length} sections`);
          console.log(`💾 Sample section data:`, Object.keys(mergedData).slice(0, 2).map(key => ({
            key,
            subsections: Object.keys(mergedData[key] || {}).filter(k => Array.isArray(mergedData[key][k]))
          })));
          
          updateFormData(category, mergedData);
        }
      });
      
      // Update ref
      prevFormDataRef.current = { ...formData };
      console.log("✅ FormData synced to persistence");
    }, 500); // 500ms debounce
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [formData, updateFormData]);

  // Map API category names to step keys
  const categoryToStepMap: Record<string, string> = {
    "Infra Financing": "infra-financing",
    "Infra Development": "infra-development",
    "PPP Development": "ppp-development",
    "Infra Enablers": "infra-enablers",
  };

  // Use ref to track formData for progress calculation without causing re-renders
  const formDataForProgressRef = useRef(formData);
  useEffect(() => {
    formDataForProgressRef.current = formData;
  }, [formData]);

  // Create steps dynamically based on assigned indicators
  // Remove formData from dependencies to prevent infinite loops
  const createStepsFromIndicators = useCallback((): MinistryStep[] => {
    // Get unique category names from assigned indicators
    const categoriesInResponse = new Set<string>();
    assignedIndicators.forEach((indicatorObj) => {
      const categoryName = Object.keys(indicatorObj)[0];
      if (categoryName) {
        categoriesInResponse.add(categoryName);
      }
    });

    // Filter steps to only include categories that exist in the API response
    // Always include Review & Preview as the last step
    const categorySteps = MINISTRY_SUBMISSION_STEPS.filter((step) => {
      // Skip review step in filtering
      if (step.key === "review-submit") return false;
      
      // Find matching category name from API response
      const matchingCategory = Array.from(categoriesInResponse).find(
        (cat) => step.title === cat || categoryToStepMap[cat] === step.key
      );
      return matchingCategory !== undefined;
    });

    // Add Review & Preview as the last step
    const reviewStep = MINISTRY_SUBMISSION_STEPS.find((step) => step.key === "review-submit");
    const allSteps = reviewStep ? [...categorySteps, reviewStep] : categorySteps;

    // Calculate progress for each step
    return allSteps.map((step) => {
      // Skip progress calculation for review step
      if (step.key === "review-submit") {
        return {
          ...step,
          completed: false,
        };
      }

      // Find the indicator object for this category
      const categoryIndicator = assignedIndicators.find((indicatorObj) => {
        const categoryName = Object.keys(indicatorObj)[0];
        return step.title === categoryName || categoryToStepMap[categoryName] === step.key;
      });

      let sectionsCompleted = 0;
      let totalSections = 0;

      if (categoryIndicator) {
        const categoryName = Object.keys(categoryIndicator)[0];
        const sections = categoryIndicator[categoryName];
        
        if (Array.isArray(sections)) {
          totalSections = sections.length;
          
          sections.forEach((sectionObj) => {
            const sectionName = Object.keys(sectionObj)[0];
            const section = sectionObj[sectionName];
            const sectionKey = `section${section.sNo.replace('.', '_')}`;
            
            // Check if section has any data (use ref to avoid dependency issues)
            const sectionData = formDataForProgressRef.current[sectionKey];
            if (sectionData && Object.keys(sectionData).length > 0) {
              // Recursively check for actual data (not just empty objects/arrays)
              const hasActualData = (data: any): boolean => {
                if (data === null || data === undefined || data === '') {
                  return false;
                }
                if (Array.isArray(data)) {
                  // Array has data if it has items with actual values
                  return data.length > 0 && data.some(item => hasActualData(item));
                }
                if (typeof data === 'object') {
                  // Object has data if it has keys with actual values
                  const keys = Object.keys(data);
                  if (keys.length === 0) return false;
                  return keys.some(key => hasActualData(data[key]));
                }
                // Primitive value that's not empty
                return true;
              };
              
              if (hasActualData(sectionData)) {
                sectionsCompleted++;
              }
            }
          });
        }
      }

      const isCompleted = sectionsCompleted >= totalSections && totalSections > 0;
      
      // Debug logging for completion calculation
      if (isCompleted || sectionsCompleted > 0) {
        console.log(`📊 Step "${step.title}": ${sectionsCompleted}/${totalSections} sections completed, marked as: ${isCompleted ? 'COMPLETED' : 'IN PROGRESS'}`);
      }
      
      return {
        ...step,
        sectionsCompleted,
        totalSections,
        completed: isCompleted,
      };
    });
  }, [assignedIndicators]); // Removed formData dependency to prevent infinite loops

  // Memoize steps - only recalculate when assignedIndicators changes
  // Progress is calculated using ref, so formData changes don't trigger recalculation
  const stepsWithProgress = useMemo(() => {
    return createStepsFromIndicators();
  }, [createStepsFromIndicators]);

  // Function to calculate progress for a specific category
  const calculateCategoryProgress = useCallback((categoryIndicator: AssignedIndicator) => {
    const categoryName = Object.keys(categoryIndicator)[0];
    const sections = categoryIndicator[categoryName];
    
    if (!Array.isArray(sections)) {
      return { completed: 0, total: 0, progress: 0 };
    }
    
    let completed = 0;
    const total = sections.length;
    
    sections.forEach((sectionObj) => {
      const sectionName = Object.keys(sectionObj)[0];
      const section = sectionObj[sectionName];
      const sectionKey = `section${section.sNo.replace('.', '_')}`;
      
      // Check if section has any data
      if (formData[sectionKey] && Object.keys(formData[sectionKey]).length > 0) {
        // Check if at least one field has a non-empty value
        const hasData = Object.values(formData[sectionKey]).some(
          (value) => value !== '' && value !== null && value !== undefined
        );
        if (hasData) {
          completed++;
        }
      }
    });
    
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, progress };
  }, [formData]);

  // Function to handle step click - switch tabs (no scrolling)
  const handleStepClick = useCallback((stepNumber: number) => {
    setCurrentStep(stepNumber);
  }, []);

  // Navigation handlers
  const handleNext = useCallback(() => {
    const totalSteps = stepsWithProgress.length;
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, stepsWithProgress.length]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === stepsWithProgress.length;
  const isReviewStep = useMemo(() => currentStep === stepsWithProgress.length, [currentStep, stepsWithProgress.length]); // Review is the last step

  // Get the current category indicator based on current step - use useMemo to ensure it updates when step changes
  const currentCategoryIndicator = useMemo((): AssignedIndicator | null => {
    if (stepsWithProgress.length === 0 || currentStep < 1 || currentStep > stepsWithProgress.length) {
      return null;
    }

    // If it's the review step, return null (review step handles its own display)
    if (isReviewStep) {
      return null;
    }

    const currentStepData = stepsWithProgress[currentStep - 1];
    if (!currentStepData) return null;

    // Find the indicator object for the current step's category
    return assignedIndicators.find((indicatorObj) => {
      const categoryName = Object.keys(indicatorObj)[0];
      return currentStepData.title === categoryName || categoryToStepMap[categoryName] === currentStepData.key;
    }) || null;
  }, [stepsWithProgress, currentStep, assignedIndicators, isReviewStep]);

  // Handle indicator submission
  const handleSubmitIndicator = useCallback(async (indicatorCode: string) => {
    try {
      setSubmittingIndicator(indicatorCode);
      
      // Get the section key for this indicator
      const sectionKey = `section${indicatorCode.replace('.', '_')}`;
      const sectionData = formData[sectionKey];
      
      // Find the indicator in assignedIndicators
      const currentIndicator = assignedIndicators.find((indicatorObj) => {
        const categoryName = Object.keys(indicatorObj)[0];
        const sections = indicatorObj[categoryName];
        if (Array.isArray(sections)) {
          return sections.some((sectionObj: any) => {
            const sectionName = Object.keys(sectionObj)[0];
            const section = sectionObj[sectionName];
            return section.sNo === indicatorCode;
          });
        }
        return false;
      });

      if (!currentIndicator) {
        toast({
          title: "Error",
          description: `Could not find indicator ${indicatorCode} in form structure.`,
          variant: "destructive",
        });
        setSubmittingIndicator(null);
        return;
      }

      // Find the specific section being submitted (not all sections in the indicator)
      const indicatorName = Object.keys(currentIndicator)[0];
      const sections = currentIndicator[indicatorName];
      let currentSection = null;
      let submissionIndicatorId: string | null = null;
      
      if (Array.isArray(sections)) {
        sections.forEach((sectionObj: any) => {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];
          if (section.sNo === indicatorCode) {
            currentSection = section;
            submissionIndicatorId = section.submissionIndicatorId || null;
          }
        });
      }

      if (!currentSection) {
        toast({
          title: "Error",
          description: `Could not find section ${indicatorCode} in form structure.`,
          variant: "destructive",
        });
        setSubmittingIndicator(null);
        return;
      }

      if (!submissionIndicatorId) {
        toast({
          title: "Error",
          description: `Could not find submission indicator ID for ${indicatorCode}.`,
          variant: "destructive",
        });
        setSubmittingIndicator(null);
        return;
      }

      // Log form data BEFORE validation
      console.log("📋 BEFORE VALIDATION - Full Form Data:", JSON.stringify(formData, null, 2));
      console.log("📋 BEFORE VALIDATION - Section Data:", JSON.stringify(sectionData, null, 2));
      console.log("📋 BEFORE VALIDATION - Section Key:", sectionKey);
      console.log("📋 BEFORE VALIDATION - Indicator Code:", indicatorCode);
      
      // Validate ONLY the section being submitted, not all sections in the indicator
      const sectionErrors = validateSection(currentSection, sectionKey, formData);
      const validationResult = {
        isValid: Object.keys(sectionErrors).length === 0,
        errors: sectionErrors,
      };
      
      console.log("🔍 Validation Result:", {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        errorCount: Object.keys(validationResult.errors).length,
        errorDetails: Object.entries(validationResult.errors).map(([path, message]) => ({
          path,
          message
        }))
      });
      
      // Log errors in a more readable format
      if (!validationResult.isValid) {
        console.log("❌ VALIDATION ERRORS FOUND:");
        console.log("==========================================");
        Object.entries(validationResult.errors).forEach(([path, message], index) => {
          console.log(`${index + 1}. Path: ${path}`);
          console.log(`   Error: ${message}`);
        });
        console.log("==========================================");
      }
      
      if (!validationResult.isValid) {
        console.log("❌ Validation FAILED - Errors found:", validationResult.errors);
        
        // Log the actual field values that are causing validation to fail
        console.log("🔍 Field Values for Failed Validation:");
        Object.keys(validationResult.errors).forEach((errorPath) => {
          if (errorPath.startsWith(sectionKey)) {
            // Extract field path and get value
            const pathParts = errorPath.split('.');
            let value = sectionData;
            
            // Navigate through nested structure
            for (let i = 1; i < pathParts.length; i++) {
              const part = pathParts[i];
              // Handle array indices like [0]
              if (part.includes('[')) {
                const [arrayName, indexStr] = part.split('[');
                const index = parseInt(indexStr.replace(']', ''));
                if (value && value[arrayName] && Array.isArray(value[arrayName])) {
                  value = value[arrayName][index];
                } else {
                  value = undefined;
                  break;
                }
              } else {
                value = value?.[part];
              }
            }
            
            console.log(`   ${errorPath}:`, value, `(Error: ${validationResult.errors[errorPath]})`);
          }
        });
        
        // Set validation errors ONLY for this indicator - clear other indicators' errors
        const newErrors: Record<string, string> = {};
        
        // Only add errors for this specific indicator (sectionKey)
        Object.keys(validationResult.errors).forEach((key) => {
          if (key.startsWith(sectionKey)) {
            newErrors[key] = validationResult.errors[key];
          }
        });
        
        console.log("❌ Setting validation errors:", newErrors);
        
        // Set errors immediately - only for this indicator
        setValidationErrors(newErrors);
        
        // Stop submission immediately
        setSubmittingIndicator(null);
        
        // Scroll after a brief moment to allow DOM update
        setTimeout(() => {
          // Scroll to first error field or general error message
          const firstErrorPath = Object.keys(validationResult.errors)[0];
          if (firstErrorPath) {
            const errorElement = document.querySelector(`[data-field-path="${firstErrorPath}"]`);
            if (errorElement) {
              errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              // If field not found, try scrolling to the general error message
              const generalError = document.querySelector(`[data-indicator-error="${indicatorCode}"]`);
              if (generalError) {
                generalError.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        }, 50);
        
        return;
      }
      
      console.log("✅ Validation PASSED - Proceeding with submission");

      // Clear validation errors for this indicator if validation passes
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        // Remove errors for this indicator's section
        Object.keys(newErrors).forEach((key) => {
          if (key.startsWith(sectionKey)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });

      // Get category from indicator code
      const category = getCategoryFromSectionId(indicatorCode);
      if (!category) {
        toast({
          title: "Error",
          description: `Could not determine category for indicator ${indicatorCode}.`,
          variant: "destructive",
        });
        setSubmittingIndicator(null);
        return;
      }

      // Debug log before submission check
      console.log("🔍 Pre-submission check - submissionId state:", {
        submissionId,
        submissionIdType: typeof submissionId,
        isNull: submissionId === null,
        isEmpty: submissionId === "",
        isExists: submissionId === "exists",
        submissionIdLength: submissionId?.length,
        currentIndicator: indicatorCode,
        sectionKey: sectionKey
      });

      if (!submissionId || submissionId === "exists") {
        console.error("❌ Submission blocked - Invalid submissionId:", {
          submissionId,
          reason: submissionId === "exists" ? "Using 'exists' placeholder" : "submissionId is null or empty",
          timestamp: new Date().toISOString()
        });
        toast({
          title: "Error",
          description: submissionId === "exists" 
            ? "Invalid submission ID. Please refresh the page to get the correct submission ID."
            : "No submission ID available. Please refresh the page.",
          variant: "destructive",
        });
        setSubmittingIndicator(null);
        return;
      }
      
      console.log("✅ SubmissionId validated - proceeding with submission:", {
        submissionId,
        indicatorCode,
        sectionKey
      });

      // Prepare the form data for this specific indicator
      // Only include the section data for this indicator
      const indicatorFormData: Record<string, any> = {
        [sectionKey]: sectionData,
      };

      // Log all formData for debugging - AFTER validation passes
      console.log("==========================================");
      console.log("📋 SUBMITTING INDICATOR:", indicatorCode);
      console.log("==========================================");
      console.log("📋 Full Form Data:", JSON.stringify(formData, null, 2));
      console.log("📋 Indicator Form Data:", JSON.stringify(indicatorFormData, null, 2));
      console.log("📋 Section Data:", JSON.stringify(sectionData, null, 2));
      console.log("📋 Category:", category);
      console.log("📋 Indicator Code:", indicatorCode);
      console.log("📋 Submission Indicator ID:", submissionIndicatorId);
      console.log("==========================================");

      // Call the API to submit indicator data
      const response = await submitIndicatorToMinistryApprover(
        submissionIndicatorId,
        sectionData,
        currentSection,
        submissionId || undefined // Pass submissionId for file uploads
      );

      console.log("✅ Indicator submission response:", response);

      // Mark indicator as submitted immediately after successful submission
      setSubmittedIndicators((prev) => {
        const newSet = new Set(prev);
        newSet.add(indicatorCode);
        return newSet;
      });

      toast({
        title: "Success",
        description: `Indicator ${indicatorCode} submitted successfully.`,
        variant: "default",
      });
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Submission Failed",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to submit indicator. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingIndicator(null);
    }
  }, [formData, submissionId, toast, assignedIndicators]);

  // Helper to check if indicator is submitted
  const isIndicatorSubmitted = useCallback((indicatorCode: string): boolean => {
    return submittedIndicators.has(indicatorCode);
  }, [submittedIndicators]);

  // Handle creating a new submission
  const handleCreateSubmission = useCallback(async () => {
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
  }, [user?.id, user?.role, user?.ministryId, toast]);

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
        <p>Checking your submission status...</p>
      </div>
    );
  }

  // Show empty state if no submission found
  if (noSubmissionFound && !submissionId) {
    return (
      <MinistryEmptyState
        onCreateSubmission={handleCreateSubmission}
        error={submissionError || undefined}
      />
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

  // Debug logging (commented out to reduce console noise - uncomment for debugging)
  // console.log("🎨 Render - currentStep:", currentStep);
  // console.log("🎨 Render - currentCategoryIndicator:", currentCategoryIndicator);
  // console.log("🎨 Render - isReviewStep:", isReviewStep);
  // console.log("🎨 Render - stepsWithProgress.length:", stepsWithProgress.length);

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

  return (
    <div className="w-full -mx-6 lg:-mx-8">
      <div className="px-6 lg:px-8">
        {/* Stepper - acts as tabs */}
        {stepsWithProgress.length > 0 && (
          <MinistryStepper
            steps={stepsWithProgress}
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />
        )}

        {/* Tab Content - Show Review step or current category */}
        {isReviewStep ? (
          <MinistryReviewSubmitStep
            assignedIndicators={assignedIndicators}
            formData={formData}
            submissionId={submissionId}
            currentStep={currentStep}
            onStepClick={handleStepClick}
            onPrevious={handlePrevious}
          />
        ) : currentCategoryIndicator ? (() => {
          const categoryName = Object.keys(currentCategoryIndicator)[0];
          const step = stepsWithProgress.find(
            (s) => s.title === categoryName || categoryToStepMap[categoryName] === s.key
          );
          const categoryProgress = calculateCategoryProgress(currentCategoryIndicator);
          
          return (
            <div>
              {/* ProgressHeader for current category - same as State Approver */}
              <ProgressHeader
                title={categoryName}
                description={step?.description || ""}
                points={step?.points || 250}
                completed={categoryProgress.completed}
                total={categoryProgress.total}
                progress={categoryProgress.progress}
              />

              {/* DynamicFormBuilder for current category */}
              <div className="mt-4 sm:mt-6">
                <DynamicFormBuilder
                  indicators={[currentCategoryIndicator]}
                  formData={formData}
                  onChange={handleFieldChange}
                  mode="edit"
                  disabled={false}
                  submissionId={submissionId || undefined}
                  getFieldError={getFieldErrorMemoized}
                  getDropdownOptions={getDropdownOptions}
                  onSectionSubmit={handleSubmitIndicator}
                  isIndicatorSubmitted={isIndicatorSubmitted}
                  submittingIndicator={submittingIndicator}
                  validationErrors={validationErrors}
                  onValidateField={validateFieldOnChange}
                />
              </div>

              {/* Navigation Buttons - same as State Approver */}
              <div className="mt-6 sm:mt-8">
                <FormActions
                  onPrevious={isFirstStep ? undefined : handlePrevious}
                  onNext={handleNext}
                  isFirstStep={isFirstStep}
                  isLastStep={isLastStep}
                  nextLabel={isLastStep ? "Review & Submit" : "Next"}
                  showSaveDraft={false}
                />
              </div>
            </div>
          );
        })() : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No category data available for the selected step.</p>
          </div>
        )}
      </div>
    </div>
  );
}

