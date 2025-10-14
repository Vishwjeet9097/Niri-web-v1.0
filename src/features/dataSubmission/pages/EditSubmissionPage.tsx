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
  const { saveFormData, getFormData } = useReviewFormPersistence(id || "");

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

  const handleResubmit = async () => {
    try {
      setIsResubmitting(true);
      
      // Get updated form data from localStorage
      const storageKey = `niri_app:review_form_data_${id}`;
      console.log("🔍 Looking for localStorage key:", storageKey);
      
      // Check all localStorage keys that start with niri_app:review_form_data
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('niri_app:review_form_data_'));
      console.log("🔍 All niri_app:review_form_data keys in localStorage:", allKeys);
      
      const savedFormData = localStorage.getItem(storageKey);
      console.log("🔍 Raw saved form data:", savedFormData);
      
      let updatedFormData = {};
      
      if (savedFormData) {
        try {
          updatedFormData = JSON.parse(savedFormData);
          console.log("🔍 Parsed form data from localStorage:", updatedFormData);
        } catch (error) {
          console.error("❌ Error parsing form data from localStorage:", error);
          updatedFormData = submission?.formData || {};
        }
      } else {
        console.warn("⚠️ No form data found in localStorage, using original submission data");
        console.log("🔍 Original submission formData:", submission?.formData);
        updatedFormData = submission?.formData || {};
      }
      
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
      console.log("🔍 Resubmit payload:", { formData: updatedFormData, comment: "Resubmitted after editing" });
      
      const response = await fetch(resubmitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          formData: updatedFormData,
          comment: "Resubmitted after editing"
        })
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
      
      // Also clear any other related localStorage keys
      const allReviewKeys = Object.keys(localStorage).filter(key => key.includes('review_form_data'));
      allReviewKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log("🧹 Cleared additional key:", key);
      });

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
              <Button 
                onClick={handleResubmit} 
                disabled={isResubmitting}
                className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isResubmitting ? "Submitting..." : ((submission?.status === "RETURNED_FROM_STATE" || submission?.status === "RETURNED_FROM_MOSPI") ? "Update" : "Resubmit")}
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
                onClick={() => setCurrentSection(index)}
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
            onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
            disabled={currentSection === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Section
          </Button>
          
          {currentSection === sections.length - 1 ? (
            // Show Resubmit button on last step
            <Button
              onClick={handleResubmit}
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
              onClick={() => setCurrentSection((prev) => Math.min(sections.length - 1, prev + 1))}
              className="gap-2"
            >
              Next Section
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
