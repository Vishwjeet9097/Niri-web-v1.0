import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { MINISTRY_SUBMISSION_STEPS } from "../constants/steps";
import type { MinistryStep } from "../types";
import type { AssignedIndicator } from "../components/FormBuilder/types";

interface UseMinistryStepsProps {
  assignedIndicators: AssignedIndicator[];
  formData: Record<string, any>;
}

const categoryToStepMap: Record<string, string> = {
  "Infra Financing": "infra-financing",
  "Infra Development": "infra-development",
  "PPP Development": "ppp-development",
  "Infra Enablers": "infra-enablers",
};

/** Progress counts only indicators that are Submitted (not just filled). */
const SUBMITTED_STATUSES = ["SUBMITTED_TO_MINISTRY", "RESUBMITTED"];

function isSectionSubmitted(section: { status?: string }): boolean {
  const status = (section?.status ?? "").toString().toUpperCase();
  return SUBMITTED_STATUSES.some((s) => status === s.toUpperCase());
}

export function useMinistrySteps({
  assignedIndicators,
  formData,
}: UseMinistryStepsProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  const formDataForProgressRef = useRef(formData);
  useEffect(() => {
    formDataForProgressRef.current = formData;
  }, [formData]);

  const createStepsFromIndicators = useCallback((): MinistryStep[] => {
    const categoriesInResponse = new Set<string>();
    assignedIndicators.forEach((indicatorObj) => {
      const categoryName = Object.keys(indicatorObj)[0];
      if (categoryName) {
        categoriesInResponse.add(categoryName);
      }
    });

    const categorySteps = MINISTRY_SUBMISSION_STEPS.filter((step) => {
      if (step.key === "review-submit") return false;
      const matchingCategory = Array.from(categoriesInResponse).find(
        (cat) => step.title === cat || categoryToStepMap[cat] === step.key
      );
      return matchingCategory !== undefined;
    });

    const reviewStep = MINISTRY_SUBMISSION_STEPS.find((step) => step.key === "review-submit");
    const allSteps = reviewStep ? [...categorySteps, reviewStep] : categorySteps;

    return allSteps.map((step) => {
      if (step.key === "review-submit") {
        return {
          ...step,
          completed: false,
        };
      }

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
            if (isSectionSubmitted(section as { status?: string })) {
              sectionsCompleted++;
            }
          });
        }
      }

      const isCompleted = sectionsCompleted >= totalSections && totalSections > 0;
      
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
  }, [assignedIndicators]);

  const stepsWithProgress = useMemo(() => {
    return createStepsFromIndicators();
  }, [createStepsFromIndicators]);

  const handleStepClick = useCallback((stepNumber: number) => {
    setCurrentStep(stepNumber);
  }, []);

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
  const isReviewStep = useMemo(() => currentStep === stepsWithProgress.length, [currentStep, stepsWithProgress.length]);

  const currentCategoryIndicator = useMemo((): AssignedIndicator | null => {
    if (stepsWithProgress.length === 0 || currentStep < 1 || currentStep > stepsWithProgress.length) {
      return null;
    }

    if (isReviewStep) {
      return null;
    }

    const currentStepData = stepsWithProgress[currentStep - 1];
    if (!currentStepData) return null;

    return assignedIndicators.find((indicatorObj) => {
      const categoryName = Object.keys(indicatorObj)[0];
      return currentStepData.title === categoryName || categoryToStepMap[categoryName] === currentStepData.key;
    }) || null;
  }, [stepsWithProgress, currentStep, assignedIndicators, isReviewStep]);

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
      if (isSectionSubmitted(section as { status?: string })) {
        completed++;
      }
    });

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, progress };
  }, []);

  return {
    stepsWithProgress,
    currentStep,
    isFirstStep,
    isLastStep,
    isReviewStep,
    currentCategoryIndicator,
    handleStepClick,
    handleNext,
    handlePrevious,
    calculateCategoryProgress,
  };
}

