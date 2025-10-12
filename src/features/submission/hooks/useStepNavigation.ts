import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBMISSION_STEPS } from '../constants/steps';

export const useStepNavigation = (initialStep: number = 1) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const navigate = useNavigate();

  const goToStep = useCallback((stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= SUBMISSION_STEPS.length) {
      setCurrentStep(stepNumber);
      const step = SUBMISSION_STEPS[stepNumber - 1];
      navigate(`/submissions/${step.key}`);
    }
  }, [navigate]);

  const goToNext = useCallback(() => {
    if (currentStep < SUBMISSION_STEPS.length) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, goToStep]);

  const goToPrevious = useCallback(() => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === SUBMISSION_STEPS.length;

  return {
    currentStep,
    goToStep,
    goToNext,
    goToPrevious,
    isFirstStep,
    isLastStep,
  };
};
