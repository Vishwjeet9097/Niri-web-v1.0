import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Save, X, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useReviewFormPersistence } from "../hooks/useReviewFormPersistence";
import { EditableInfraFinancing } from "../components/editable/EditableInfraFinancing";
import { EditableInfraDevelopment } from "../components/editable/EditableInfraDevelopment";
import { EditablePPPDevelopment } from "../components/editable/EditablePPPDevelopment";
import { EditableInfraEnablers } from "../components/editable/EditableInfraEnablers";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { storageService } from "@/services/storage.service";
import type { SubmissionFormData } from "@/features/submission/types";

const sections = [
  { id: "infra-financing", label: "Infra Financing", points: 250, component: EditableInfraFinancing },
  { id: "infra-development", label: "Infra Development", points: 250, component: EditableInfraDevelopment },
  { id: "ppp-development", label: "PPP Development", points: 250, component: EditablePPPDevelopment },
  { id: "infra-enablers", label: "Infra Enablers", points: 250, component: EditableInfraEnablers },
];

export const EditSubmissionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(0);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { saveFormData, getFormData, formData: currentFormData, getMergedData, changeTracker, initializeFromSubmission } = useReviewFormPersistence(id || "");

  useEffect(() => {
    const loadSubmission = async () => {
      if (!id) {
        navigate("/data-submission/review");
        return;
      }

      try {
        setLoading(true);
        const submissionData = await apiService.getSubmission(id);
        console.log("🔍 EditSubmissionPage - Loaded submission data:", submissionData);
        console.log("🔍 EditSubmissionPage - Form data:", submissionData?.formData);
        setSubmission(submissionData);
        
        // Save submission data to localStorage for normal form
        const originalFormData = {
          infraFinancing: submissionData?.formData?.infraFinancing || {},
          infraDevelopment: submissionData?.formData?.infraDevelopment || {},
          pppDevelopment: submissionData?.formData?.pppDevelopment || {},
          infraEnablers: submissionData?.formData?.infraEnablers || {}
        };
        
        // Save submission ID directly to localStorage
        localStorage.setItem('editing_submission_id', id);
        localStorage.setItem('is_edit_mode', 'true');
        localStorage.setItem('submission_form_data', JSON.stringify(originalFormData));
        
        // Redirect to normal submission form
        navigate('/submissions');
      } catch (error: any) {
        console.error("Failed to load submission:", error);
        notificationService.error(
          error.message || "Failed to load submission",
          "Load Error"
        );
        navigate("/data-submission/review");
      } finally {
        setLoading(false);
      }
    };

    loadSubmission();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Submission not found</p>
          <Button onClick={() => navigate("/data-submission/review")} className="mt-4">
            Back to Review
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      // Save to backend
      await apiService.updateSubmission(id!, {
        formData: submission.formData,
        lastModified: new Date().toISOString(),
      });
      
      toast({
        title: "Changes Saved",
        description: "Your edits have been saved successfully.",
      });
    } catch (error: any) {
      console.error("Failed to save submission:", error);
      notificationService.error(
        error.message || "Failed to save changes. Please try again.",
        "Save Failed"
      );
    }
  };

  const handleSaveAndExit = async () => {
    try {
      await handleSave();
      navigate(`/data-submission/review/${id}`);
    } catch (error) {
      // Error already handled in handleSave
    }
  };

  const handleCancel = () => {
    navigate(`/data-submission/review/${id}`);
  };

  const handleResubmitClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmResubmit = () => {
    setShowConfirmModal(false);
    handleResubmit();
  };

  const handleCancelResubmit = () => {
    setShowConfirmModal(false);
  };

  const handleResubmit = async () => {
    try {
      setIsResubmitting(true);
      
      // Save current form data before resubmit
      console.log("💾 Saving current form data before resubmit");
      saveFormData();
      
      // Wait a bit for the save to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Collect complete data from all sections
      const storageKey = `review_form_data_${id}`;
      console.log("🔍 Looking for localStorage key:", storageKey);
      
      // Check all localStorage keys that start with review_form_data
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('review_form_data_'));
      console.log("🔍 All review_form_data keys in localStorage:", allKeys);
      
      const savedFormData = localStorage.getItem(storageKey);
      console.log("🔍 Raw saved form data:", savedFormData);
      
      // Professional merge: Use edited data where changed, original data where not changed
      const originalData = submission?.formData || {};
      const updatedFormData = getMergedData(originalData);
      
      console.log("🔍 Original submission data:", originalData);
      console.log("🔍 Current form data:", currentFormData);
      console.log("🔍 Change tracker:", changeTracker);
      console.log("🔍 Professional merged data:", updatedFormData);
      
      // Get auth token from correct localStorage key
      const authData = localStorage.getItem('niri_app:auth_tokens');
      if (!authData) {
        throw new Error('Authentication token not found. Please login again.');
      }
      
      const parsedAuthData = JSON.parse(authData);
      const token = parsedAuthData?.value?.accessToken;
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      // Resubmit the submission using correct endpoint
      const resubmitUrl = `http://localhost:3000/submission/resubmit/${id}`;
      
      // Ensure payload structure matches original format (no extra "value" key)
      const resubmitPayload = {
        formData: updatedFormData,
        comment: "Resubmitted after editing"
      };
      
      console.log("🔍 Resubmit payload:", resubmitPayload);
      console.log("🔍 FormData structure:", {
        infraFinancing: Object.keys(updatedFormData.infraFinancing || {}),
        infraDevelopment: Object.keys(updatedFormData.infraDevelopment || {}),
        pppDevelopment: Object.keys(updatedFormData.pppDevelopment || {}),
        infraEnablers: Object.keys(updatedFormData.infraEnablers || {})
      });
      
      const response = await fetch(resubmitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(resubmitPayload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to resubmit submission');
      }
      
      toast({
        title: "Submission Resubmitted",
        description: "Your changes have been resubmitted successfully.",
      });

      // Clear localStorage after successful resubmit
      localStorage.removeItem(storageKey);
      console.log("🧹 Cleared localStorage key:", storageKey);
      
      // Clear all related localStorage keys
      const allReviewKeys = Object.keys(localStorage).filter(key => 
        key.includes('review_form_data') || 
        key.includes(`review_form_data_${id}`)
      );
      allReviewKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log("🧹 Cleared additional key:", key);
      });
      
      // Clear editing submission data
      localStorage.removeItem('editing_submission');
      console.log("🧹 Cleared editing_submission data");

      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Failed to resubmit submission:", error);
      notificationService.error(
        error.message || "Failed to resubmit. Please try again.",
        "Resubmit Failed"
      );
    } finally {
      setIsResubmitting(false);
    }
  };

  const CurrentSectionComponent = sections[currentSection].component;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Review
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Edit Submission: {submission.submissionId || submission.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Submission ID: {submission.id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleCancel} className="gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex gap-2 overflow-x-auto">
            {sections.map((section, index) => (
              <Button
                key={section.id}
                variant={currentSection === index ? "default" : "outline"}
                onClick={() => {
                  // Save current form data to localStorage before switching sections
                  console.log("💾 Saving form data before switching to section:", section.label);
                  
                  // Get current form data from the persistence hook
                  const currentData = getFormData();
                  console.log("🔍 Current form data before save:", currentData);
                  
                  // Save the current data
                  saveFormData();
                  
                  // Small delay to ensure save completes
                  setTimeout(() => {
                    setCurrentSection(index);
                  }, 50);
                }}
                className="whitespace-nowrap"
                size="sm"
              >
                {section.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>Reviewer Edit Mode:</strong> You can edit and update any field in this submission. 
            All changes are automatically saved to your browser's local storage. Click "Save & Exit" when done.
          </p>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {sections[currentSection].label} | {sections[currentSection].points} Points
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Edit data for {sections[currentSection].label.toLowerCase()}
            </p>
          </div>
        </div>

        <CurrentSectionComponent submissionId={id!} submission={submission} />

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t mt-8">
          <Button
            variant="outline"
            onClick={() => {
              // Save current form data to localStorage before moving to previous step
              console.log("💾 Saving form data before moving to previous step");
              
              // Get current form data from the persistence hook
              const currentData = getFormData();
              console.log("🔍 Current form data before save:", currentData);
              
              // Save the current data
              saveFormData();
              
              // Small delay to ensure save completes
              setTimeout(() => {
                setCurrentSection((prev) => Math.max(0, prev - 1));
              }, 50);
            }}
            disabled={currentSection === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Section
          </Button>
          
          {currentSection === sections.length - 1 ? (
            // Show Resubmit button on last step
            <Button
              onClick={handleResubmitClick}
              disabled={isResubmitting}
              className="gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isResubmitting ? "Submitting..." : "Resubmit with Updated Data"}
            </Button>
          ) : (
            // Show Next button for other steps
            <Button
              variant="outline"
              onClick={() => {
                // Save current form data to localStorage before moving to next step
                console.log("💾 Saving form data before moving to next step");
                
                // Get current form data from the persistence hook
                const currentData = getFormData();
                console.log("🔍 Current form data before save:", currentData);
                
                // Save the current data
                saveFormData();
                
                // Small delay to ensure save completes
                setTimeout(() => {
                  setCurrentSection((prev) => Math.min(sections.length - 1, prev + 1));
                }, 50);
              }}
              className="gap-2"
            >
              Next Section
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirm Resubmission
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to resubmit this submission with your updated data? 
                This action will send the updated submission for review.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleCancelResubmit}
                disabled={isResubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmResubmit}
                disabled={isResubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isResubmitting ? "Submitting..." : "Confirm Resubmit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
