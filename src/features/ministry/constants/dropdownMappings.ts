import {
  SECTOR_OPTIONS,
  ASSET_TYPE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  SCHEME_NAME_OPTIONS,
  TRAINING_MODE_OPTIONS,
  STATUS_OF_PROPOSAL,
  ENVISAGED_IMPACT,
} from './dropdownOptions';

export interface DropdownOption {
  value: string;
  label: string;
}

/**
 * Get dropdown options based on field metadata
 * Only matches fields that are explicitly marked as "Dropdown" in UI Component
 * Uses options from dropdownOptions.json (values should not be changed)
 */
export function getDropdownOptions(
  fieldId: string,
  sectionId: string,
  label?: string
): DropdownOption[] {
  const lowerLabel = label?.toLowerCase() || '';
  const lowerSectionId = sectionId?.toLowerCase() || '';
  const lowerFieldId = fieldId?.toLowerCase() || '';
  
  // 1.2 Asset Monetization Pipeline Utilization - Asset Type (Core/Non-Core)
  if (lowerLabel.includes('asset type')) {
    return ASSET_TYPE_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // Sector dropdowns - Infrastructure Sector, Sector, Infra Sector (multiple indicators: 1.2, 2.2, 2.3, 3.2, 3.3, 4.2)
  // Match: "Infrastructure Sector", "Sector", "Infra Sector"
  if (lowerLabel === 'sector' || 
      lowerLabel === 'infrastructure sector' || 
      lowerLabel === 'infra sector' ||
      lowerLabel.includes('infra sector')) {
    return SECTOR_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // 3.2 Proposals submitted under VGF/IIPDF - Status of Proposal (check first, more specific)
  if (lowerLabel.includes('status of proposal')) {
    return STATUS_OF_PROPOSAL.map(opt => ({ value: opt, label: opt }));
  }
  
  // 2.2 Investment Ready Projects - Status (Tender/Under Bidding)
  // Match: "Status" (exact) or "Status (Tender/Under Bidding)" - but NOT "Status of Proposal" or "Status of Mechanism"
  if (lowerLabel === 'status' || 
      (lowerLabel.includes('status') && (lowerLabel.includes('tender') || lowerLabel.includes('bidding')) && !lowerLabel.includes('proposal') && !lowerLabel.includes('mechanism'))) {
    return PROJECT_STATUS_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // 3.2 Proposals submitted under VGF/IIPDF - Scheme Name (VGF/IIPDF)
  if (lowerLabel.includes('scheme name')) {
    return SCHEME_NAME_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // 4.4 Innovative Practices - Envisaged Impact
  if (lowerLabel.includes('envisaged impact')) {
    return ENVISAGED_IMPACT.map(opt => ({ value: opt, label: opt }));
  }
  
  // 4.5 Infra-Focused Trainings - Mode of Training
  if (lowerLabel.includes('mode of training')) {
    return TRAINING_MODE_OPTIONS.map(opt => ({ value: opt, label: opt }));
  }
  
  // Note: Yes/No fields are handled separately as radio buttons in FieldRenderer,
  // not as dropdowns, so they are not included here
  
  return [];
}


