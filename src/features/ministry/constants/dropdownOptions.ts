/**
 * Ministry Form Dropdown Options
 * 
 * This file imports dropdown options from the JSON file and exports them
 * for use in ministry form input fields.
 * 
 * To add options, update the JSON file and import them here.
 */

import dropdownOptionsJson from './dropdownOptions.json';

// Export all dropdown options with type safety (only options present in JSON)
export const SECTOR_OPTIONS: string[] = dropdownOptionsJson.SECTOR_OPTIONS || [];
export const ASSET_TYPE_OPTIONS: string[] = dropdownOptionsJson.ASSET_TYPE_OPTIONS || [];
export const PROJECT_STATUS_OPTIONS: string[] = dropdownOptionsJson.PROJECT_STATUS_OPTIONS || [];
export const SCHEME_NAME_OPTIONS: string[] = dropdownOptionsJson.SCHEME_NAME_OPTIONS || [];
export const TRAINING_MODE_OPTIONS: string[] = dropdownOptionsJson.TRAINING_MODE_OPTIONS || [];
export const STATUS_OF_PROPOSAL: string[] = dropdownOptionsJson.STATUS_OF_PROPOSAL || [];
export const ENVISAGED_IMPACT: string[] = dropdownOptionsJson.ENVISAGED_IMPACT || [];

/**
 * Type definition for dropdown option keys
 */
export type DropdownOptionKey = 
  | 'SECTOR_OPTIONS'
  | 'ASSET_TYPE_OPTIONS'
  | 'PROJECT_STATUS_OPTIONS'
  | 'SCHEME_NAME_OPTIONS'
  | 'TRAINING_MODE_OPTIONS'
  | 'STATUS_OF_PROPOSAL'
  | 'ENVISAGED_IMPACT';

/**
 * Get dropdown options by key
 */
export function getDropdownOptionsByKey(key: DropdownOptionKey): string[] {
  const optionsMap: Record<DropdownOptionKey, string[]> = {
    SECTOR_OPTIONS,
    ASSET_TYPE_OPTIONS,
    PROJECT_STATUS_OPTIONS,
    SCHEME_NAME_OPTIONS,
    TRAINING_MODE_OPTIONS,
    STATUS_OF_PROPOSAL,
    ENVISAGED_IMPACT,
  };
  
  return optionsMap[key] || [];
}

