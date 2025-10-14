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
import { SectionCard } from "../components/SectionCard";
import { Plus, Trash2, Info } from "lucide-react";

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
      color: 'bg-[#D3DCF8] text-primary',
    },
    {
      title: 'Infrastructure Development',
      icon: Building2,
      completed: 4,
      total: 5,
      color: 'bg-[#D3DCF8] text-primary',
    },
    {
      title: 'PPP Development',
      icon: Briefcase,
      completed: 1,
      total: 2,
      color: 'bg-[#D3DCF8] text-primary',
    },
    {
      title: 'Infra Enablers',
      icon: Settings,
      completed: 3,
      total: 4,
      color: 'bg-[#D3DCF8] text-primary',
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

      const res = await apiV2.post(config.formsPath, transformedPayload);

      // Dynamic success message from response
      const successMessage = res.data?.message ||
        'Your submission has been sent to the State Approver for review. You will be notified of its status.';

      setSubmissionMessage(successMessage);
      setShowSuccessModal(true);

      // Clear form data AFTER successful submission
      clearFormData(); // Clear localStorage after successful submission
      localStorage.removeItem("editing_submission"); // Clear editing submission data
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
    <div className="">
      <Stepper steps={SUBMISSION_STEPS} currentStep={currentStep} />

      <div className="mb-6 bg-[#1E40AF14] p-6 rounded-lg border border-[#1E40AF52]">
        <div className="flex items-start gap-4 ">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">Review & Submit</h2>
            <p className="text-sm text-[#727272] mb-4">
              Please review all the information you've provided before submitting your NIRI data. Once submitted, you can track the approval status in your dashboard.
            </p>
            <Badge variant="outline" className="bg-[#1E40AF29] rounded-lg border p-2 border-[#7C96E9] text-primary">
              Reference: NIRI321883
            </Badge>
          </div>
        </div>
      </div>

      <SectionCard
        title={<div className="flex flex-col">
          <span className="text-base font-semibold ">
            <span className="text-primary">Submission Summary - </span> Overview of your data submission{" "}
          </span>
        </div>}
        subtitle=""
        className="mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="">
                <CardContent className="pt-6 text-center">
                  <div className={`w-12 h-12 rounded-lg ${section.color} flex items-center justify-center mb-4 mx-auto`}>
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
              </div>
            );
          })}
        </div>
      </SectionCard>

      <Alert className="mb-6 border-blue-200 bg-blue-50/50">
        <AlertDescription className="text-sm">
          <strong className="font-semibold">Important:</strong> After submission, your data will go through a multi-tier approval process. You will receive notifications at each stage and can track progress in your dashboard.
        </AlertDescription>
      </Alert>
      <div className="mb-6 bg-[#1E40AF14] p-6 rounded-lg border border-[#1E40AF52]">
        <div className="flex items-start gap-4 ">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-primary mb-2">Important</h2>
            <p className="text-sm text-primary mb-4">
              After submission, your data will go through a multi-tier approval process. You will receive notifications at each stage and can track progress in your dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6">
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
            {isSubmitting ? (isResubmit ? 'Resubmitting...' : 'Submitting...') : isValidating ? 'Validating...' : (isResubmit ? 'Resubmit Data' : 'Submit Data')}
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isResubmit ? 'Are you sure you want to resubmit?' : 'Are you sure you want to submit?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isResubmit
                ? 'Once resubmitted, your updated data will be sent to the State Approver for review.'
                : 'Once submitted, your data will be locked for editing and sent to the State Approver for review.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? (isResubmit ? 'Resubmitting...' : 'Submitting...') : (isResubmit ? 'Resubmit to State Approver' : 'Send to State Approver')}
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
