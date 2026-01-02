import {
  SECTOR_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  OWNERSHIP_OPTIONS,
  MONETIZATION_STATUS_OPTIONS,
  RATING_OPTIONS,
  TRAINING_TYPE_OPTIONS,
} from '@/features/submission/constants/steps';

export interface DropdownOption {
  value: string;
  label: string;
}

/**
 * Get dropdown options based on field metadata
 */
export function getDropdownOptions(
  fieldId: string,
  sectionId: string,
  label?: string
): DropdownOption[] {
  const lowerLabel = label?.toLowerCase() || '';
  const lowerSectionId = sectionId?.toLowerCase() || '';
  
  // Sector dropdowns
  if (lowerLabel.includes('sector') || lowerSectionId.includes('sector')) {
    return SECTOR_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // Status dropdowns
  if (lowerLabel.includes('status') || lowerSectionId.includes('status')) {
    if (lowerLabel.includes('project') || lowerLabel.includes('monetization')) {
      return PROJECT_STATUS_OPTIONS.map(opt => ({ value: opt, label: opt }));
    }
    return MONETIZATION_STATUS_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // Project type
  if (lowerLabel.includes('project type') || lowerLabel.includes('type of project')) {
    return PROJECT_TYPE_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // Ownership
  if (lowerLabel.includes('ownership')) {
    return OWNERSHIP_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // Rating
  if (lowerLabel.includes('rating')) {
    return RATING_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // Training type
  if (lowerLabel.includes('training') && lowerLabel.includes('mode')) {
    return TRAINING_TYPE_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // Yes/No options
  if (lowerLabel.includes('yes/no') || lowerLabel === 'yes/no') {
    return [
      { value: 'Yes', label: 'Yes' },
      { value: 'No', label: 'No' }
    ];
  }
  
  return [];
}


