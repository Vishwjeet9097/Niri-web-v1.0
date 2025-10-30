import { useState, useEffect } from 'react';
import axios from "axios";
import { apiService } from "@/services/api.service";
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
import { SectionCard } from "../components/SectionCard";
import { Plus, Trash2, Info } from "lucide-react";

export const ReviewSubmitStep = () => {
  const { currentStep, goToStep, goToPrevious } = useStepNavigation(5);
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
    
    if (editingSubmissionId && isEditModeFlag) {
      setIsEditMode(true);
      setEditingSubmissionId(editingSubmissionId);
    }
  }, []);

  // Validation disabled - no validation hook needed

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
      completed: 5,
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

    if (isSubmitting) {
      return;
    }

    // Validation disabled - directly proceed to confirmation modal
    setShowConfirmModal(true);
  };

  function appendFilesRecursively(formDataObj: FormData, data: any, prefix = '') {
  if (!data || typeof data !== 'object') return;

  for (const key in data) {
    const value = data[key];
    const path = prefix ? `${prefix}.${key}` : key;

    // Case 1: Single file object
    if (value && value.file instanceof File) {
      formDataObj.append('files', value.file, value.file.name);
    }

    // Case 2: Array of files (like section2_1.files)
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        appendFilesRecursively(formDataObj, item, `${path}[${index}]`);
      });
    }
    // Case 3: Nested object
    else if (typeof value === 'object') {
      appendFilesRecursively(formDataObj, value, path);
    }
  }
}
const handleConfirmSubmit = async () => {
  setIsSubmitting(true);
  setShowConfirmModal(false);

  try {
    console.log("🚀 Preparing NIRI submission...");

    // 1️⃣ Transform the data
    const transformedSubmission = transformFormDataForSubmission(formData, "SUBMITTED_TO_STATE");

    // 2️⃣ Prepare FormData
    const formDataObj = new FormData();
    formDataObj.append("submission", JSON.stringify(transformedSubmission));

    // 3️⃣ Append all files properly for Multer
    const appendAllFiles = (obj: any, parentKey = "") => {
      if (!obj || typeof obj !== "object") return;

      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;

        // Case 1️⃣: direct File
        if (value instanceof File) {
          console.log("📎 Appending file:", fullKey, value.name);
          formDataObj.append(fullKey, value);
        }

        // Case 2️⃣: nested file.file
        else if (value?.file instanceof File) {
          console.log("📎 Appending nested file:", fullKey, value.file.name);
          formDataObj.append(fullKey, value.file);
        }

        else if (value?.file?.file instanceof File) {
          console.log("📎 Appending deeply nested file:", fullKey, value.file.file.name);
          formDataObj.append(fullKey, value.file.file);
        }

        // Recurse deeper for arrays/objects
        else if (Array.isArray(value)) {
          value.forEach((item, i) => appendAllFiles(item, `${fullKey}[${i}]`));
        } else if (typeof value === "object") {
          appendAllFiles(value, fullKey);
        }
      });
    };

    appendAllFiles(formData);

    // 4️⃣ Debug: confirm files attached
    console.group("🧾 Final FormData contents:");
    for (const [key, val] of formDataObj.entries()) {
      console.log(`➡️ ${key}:`, val instanceof File ? `File(${val.name})` : val);
    }
    console.groupEnd();

    // 5️⃣ Send
    const tokenData = JSON.parse(localStorage.getItem("niri_app:auth_tokens") || "{}");
    const token = tokenData?.value?.accessToken;
console.log("Api base url:", config.apiBaseUrl);
    const response = await axios.post(`${config.apiBaseUrl}/submission`, formDataObj, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("✅ Backend response:", response);
    notificationService.success("Submission successful!", "Form submitted successfully");
    clearFormData();
    setShowSuccessModal(true);

  } catch (error) {
    console.error("❌ Submission failed:", error);
    notificationService.error("Failed to submit form", "Submission Error");
  } finally {
    setIsSubmitting(false);
  }
};


  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setShouldNavigate(true);
  };

  if (showPreview) {
    navigate('submissions/preview');
    return null;
  }

  return (
    <div className="w-full -mx-6 lg:-mx-8">
      <div className="px-6 lg:px-8">
        <Stepper steps={SUBMISSION_STEPS} currentStep={currentStep} onStepClick={goToStep} />

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

      {/* <Alert className="mb-6 border-blue-200 bg-blue-50/50">
        <AlertDescription className="text-sm">
          <strong className="font-semibold">Important:</strong> After submission, your data will go through a multi-tier approval process. You will receive notifications at each stage and can track progress in your dashboard.
        </AlertDescription>
      </Alert> */}
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
            disabled={isSubmitting}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (isEditMode || isResubmit ? 'Resubmitting...' : 'Submitting...') : (isEditMode || isResubmit ? 'Resubmit Data' : 'Submit Data')}
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
    </div>
  );
};