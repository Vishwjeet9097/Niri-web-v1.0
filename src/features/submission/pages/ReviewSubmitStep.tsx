import { useState, useEffect } from 'react';
import { Eye, CheckCircle2, FileText, Building2, Briefcase, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Stepper } from '../components/Stepper';
import { useStepNavigation } from '../hooks/useStepNavigation';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { SUBMISSION_STEPS } from '../constants/steps';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/NotificationBus';
import { apiV2 } from '@/services/ApiService';
import { config } from '@/config/environment';
import { transformFormDataForSubmission, getFormDataSummary, debugFormData } from '@/utils/formDataTransformer';
import { useFormValidation } from '../hooks/useFormValidation';

export const ReviewSubmitStep = () => {
  const { currentStep, goToPrevious } = useStepNavigation(5);
  const { formData, clearFormData, isResubmit } = useFormPersistence();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  
  // Check for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);

  // Check for edit mode on mount
  useEffect(() => {
    const editingSubmissionId = localStorage.getItem('editing_submission_id');
    const isEditModeFlag = localStorage.getItem('is_edit_mode') === 'true';
    
    console.log("🔍 ReviewSubmitStep - localStorage check:", {
      editingSubmissionId,
      isEditModeFlag
    });
    
    if (editingSubmissionId && isEditModeFlag) {
      setIsEditMode(true);
      setEditingSubmissionId(editingSubmissionId);
      console.log("🔍 ReviewSubmitStep - Edit mode detected for submission:", editingSubmissionId);
    } else {
      console.log("🔍 ReviewSubmitStep - Edit mode conditions not met");
    }
  }, []);

  // Use validation hook
  const { validateAndProceed, isValidating } = useFormValidation({
    onValidationSuccess: () => {
      setShowConfirmModal(true);
    },
    onValidationError: (missingSections) => {
      // Validation error handled by notification service
    }
  });

  // Debug form data on component mount only
  useEffect(() => {
    // Only debug in development mode to prevent infinite loops
    if (process.env.NODE_ENV === 'development') {
      debugFormData(formData);
    }
  }, [formData]); // Include formData dependency

  // Handle navigation after successful submission
  useEffect(() => {
    if (shouldNavigate) {
      navigate('/dashboard');
      setShouldNavigate(false);
    }
  }, [shouldNavigate, navigate]);

  const sections = [
    {
      title: 'Infrastructure Financing',
      icon: FileText,
      completed: 5,
      total: 5,
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      title: 'Infrastructure Development',
      icon: Building2,
      completed: 5,
      total: 5,
      color: 'bg-green-500/10 text-green-600',
    },
    {
      title: 'PPP Development',
      icon: Briefcase,
      completed: 4,
      total: 4,
      color: 'bg-purple-500/10 text-purple-600',
    },
    {
      title: 'Infra Enablers',
      icon: Settings,
      completed: 6,
      total: 6,
      color: 'bg-orange-500/10 text-orange-600',
    },
  ];

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isSubmitting || isValidating) {
      return;
    }

    // Use validation hook to validate and proceed
    await validateAndProceed(formData, () => {
      // This callback will only run if validation passes
    });
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    
    try {
      // Transform form data to required API format ONLY for submission
      const transformedPayload = transformFormDataForSubmission(formData, "SUBMITTED_TO_STATE");
      
      let res;
      
      if (isEditMode && editingSubmissionId) {
        // Edit mode - use resubmit API
        console.log("🔄 ReviewSubmitStep - Resubmitting existing submission:", editingSubmissionId);
        console.log("🔄 ReviewSubmitStep - Resubmit payload:", transformedPayload);
        res = await apiV2.post(`http://localhost:3000/submission/resubmit/${editingSubmissionId}`, transformedPayload);
      } else {
        // Normal mode - create new submission
        res = await apiV2.post(config.formsPath, transformedPayload);
      }
      
      // Dynamic success message from response
      const successMessage = res.data?.message || 
        (isEditMode ? 'Your changes have been resubmitted successfully!' : 'Your submission has been sent to the State Approver for review. You will be notified of its status.');
      
      setSubmissionMessage(successMessage);
      setShowSuccessModal(true);
      
      // Clear form data AFTER successful submission
      clearFormData(); // Clear localStorage after successful submission
      localStorage.removeItem("editing_submission_id"); // Clear editing submission ID
      localStorage.removeItem("is_edit_mode"); // Clear edit mode flag
    } catch (e: unknown) {
      // Dynamic error message from response
      const error = e as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error?.response?.data?.message || 
        error?.message || 
        'Failed to submit. Please try again.';
      
      notificationService.error(errorMessage, 'Submission Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setShouldNavigate(true);
  };

  if (showPreview) {
    navigate('/submissions/preview');
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Stepper steps={SUBMISSION_STEPS} currentStep={currentStep} />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Review & Submit</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Please review all the information you've provided before submitting your NIRI data. Once submitted, you can track the approval status in your dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Submission Summary - Overview of your data submission</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-lg ${section.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-medium mb-2">{section.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {section.completed}/{section.total} sections completed
                  </p>
                  <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate(`/submissions/${SUBMISSION_STEPS[index].key}`)}>
                    Edit
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Alert className="mb-6 border-blue-200 bg-blue-50/50">
        <AlertDescription className="text-sm">
          <strong className="font-semibold">Important:</strong> After submission, your data will go through a multi-tier approval process. You will receive notifications at each stage and can track progress in your dashboard.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={goToPrevious}>
          ← Previous
        </Button>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(true)}
            disabled={isSubmitting}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Submission
          </Button>
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isValidating}
          >
            {isSubmitting ? (isEditMode || isResubmit ? 'Resubmitting...' : 'Submitting...') : isValidating ? 'Validating...' : (isEditMode || isResubmit ? 'Resubmit Data' : 'Submit Data')}
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isEditMode || isResubmit ? 'Are you sure you want to resubmit?' : 'Are you sure you want to submit?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isEditMode || isResubmit 
                ? 'Once resubmitted, your updated data will be sent to the State Approver for review.'
                : 'Once submitted, your data will be locked for editing and sent to the State Approver for review.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? (isEditMode || isResubmit ? 'Resubmitting...' : 'Submitting...') : (isEditMode || isResubmit ? 'Resubmit to State Approver' : 'Send to State Approver')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <AlertDialogTitle className="text-green-800">{isResubmit ? 'Data Resubmitted Successfully!' : 'Data Submitted Successfully!'}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-600">
              {submissionMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSuccessModalClose}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
