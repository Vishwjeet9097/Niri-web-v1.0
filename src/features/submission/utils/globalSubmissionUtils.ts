// Utility for tracking submitted indicators globally across all steps
// Usage: import { getSubmittedIndicators, setIndicatorSubmitted, areAllIndicatorsSubmitted, getAllIndicatorCodes } from './globalSubmissionUtils';

import { SUBMISSION_STEPS } from '../constants/steps';

// Map of stepKey to indicator codes
const INDICATOR_CODES: Record<string, string[]> = {
  infraFinancing: ['1.1', '1.2', '1.3', '1.4', '1.5'],
  infraDevelopment: ['2.1', '2.2', '2.3', '2.4', '2.5'],
  pppDevelopment: ['3.1', '3.2', '3.3', '3.4'],
  infraEnablers: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6'],
};

const STORAGE_KEY = 'niri_app:submitted_indicators';

export function getSubmittedIndicators(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { infraFinancing: [], infraDevelopment: [], pppDevelopment: [], infraEnablers: [] };
}

export function setIndicatorSubmitted(stepKey: string, indicatorCode: string) {
  const current = getSubmittedIndicators();
  if (!current[stepKey]) current[stepKey] = [];
  if (!current[stepKey].includes(indicatorCode)) {
    current[stepKey].push(indicatorCode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
}

export function areAllIndicatorsSubmitted(): boolean {
  const current = getSubmittedIndicators();
  for (const stepKey of Object.keys(INDICATOR_CODES)) {
    const required = INDICATOR_CODES[stepKey];
    const submitted = current[stepKey] || [];
    if (required.some((code) => !submitted.includes(code))) return false;
  }
  return true;
}

export function getAllIndicatorCodes(): { stepKey: string; indicatorCode: string }[] {
  return Object.entries(INDICATOR_CODES).flatMap(([stepKey, codes]) =>
    codes.map((indicatorCode) => ({ stepKey, indicatorCode }))
  );
}

// Clear all submitted indicators - call this when starting a new submission or editing an existing one
export function clearSubmittedIndicators() {
  localStorage.removeItem(STORAGE_KEY);
}
