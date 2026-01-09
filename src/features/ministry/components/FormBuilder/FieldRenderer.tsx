import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileUploadSection } from '@/features/submission/components/FileUploadSection';
import { Dropdown } from '@/utils/getDropDowns';
import { cn } from '@/lib/utils';
import { validateField } from '@/features/ministry/utils/validation';
import type { FileUpload } from '@/features/submission/types';
import type { FieldRendererProps } from './types';

export const FieldRenderer: React.FC<FieldRendererProps> = React.memo(({
  field,
  value,
  onChange,
  mode,
  disabled,
  submissionId,
  error,
  dropdownOptions,
  className,
  indicatorName,
  onValidate,
  onClearError,
}) => {
  // All fields are mandatory - always show asterisk
  const isRequired = true;
  
  // In review mode, show disabled inputs instead of plain text for better visibility
  const isReviewMode = mode === 'review';

  // Check if this is a Yes/No field (label contains "Yes/No" or is exactly "Yes/No")
  const isYesNoField = field.label.toLowerCase().includes('yes/no') || field.label === 'Yes/No';
  
  // Remove "Yes/No" from the label for display
  const getDisplayLabel = (label: string): string => {
    if (isYesNoField) {
      // Remove "Yes/No" and any surrounding spaces/punctuation
      return label.replace(/\s*\(?\s*Yes\/No\s*\)?\s*/gi, '').trim();
    }
    return label;
  };
  
  // Normalize value for Yes/No fields: convert "Yes"/"No" to "yes"/"no" internally
  const normalizeYesNoValue = (val: any): string => {
    if (!val) return '';
    const str = String(val).toLowerCase().trim();
    if (str === 'yes' || str === 'y') return 'yes';
    if (str === 'no' || str === 'n') return 'no';
    return str; // Return as-is if already normalized
  };
  
  // Denormalize for display: convert "yes"/"no" to "Yes"/"No" for display
  const denormalizeYesNoValue = (val: any): string => {
    if (!val) return '';
    const str = String(val).toLowerCase().trim();
    if (str === 'yes') return 'Yes';
    if (str === 'no') return 'No';
    return String(val); // Return as-is if not yes/no
  };

  // Check if this is a calculated/auto-calculated field
  const isCalculatedField = field.uiComponent === 'Auto-calculated field' || 
                           field.uiComponent === 'Calculated' ||
                           field.validationRules?.type === 'calculated' ||
                           field.label?.toLowerCase().includes('auto-calculated') ||
                           field.label?.toLowerCase().includes('% capex utilization');
  
  // Check if this is a calculation input field (must be > 0)
  const isCalculationInputField = field.label?.toLowerCase().includes('capital expenditure allocation') ||
                                  field.label?.toLowerCase().includes('capital expenditure actuals');

  // Render Yes/No fields as radio buttons FIRST (before dropdown check)
  // Yes/No fields are stored as one field in backend but displayed as radio buttons in UI
  if (isYesNoField) {
    const normalizedValue = normalizeYesNoValue(value);
    // Ensure value is either "yes", "no", or undefined (not empty string) for RadioGroup
    const radioValue = normalizedValue === '' ? undefined : normalizedValue;
    const fieldPath = `${field.sectionId}.${field.id}`;
    // Format label: "{indicatorName}?"
    const displayLabel = indicatorName 
      ? `${indicatorName}?`
      : `${getDisplayLabel(field.label)}?`;
    
    return (
      <div className="space-y-2" data-field-path={fieldPath}>
        <Label>
          {displayLabel} {isRequired && <span className="text-destructive">*</span>}
        </Label>
        {mode === 'review' ? (
          // In review mode, show as colored badge matching state review component
          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                normalizedValue === 'yes'
                  ? "bg-green-100 text-green-800"
                  : normalizedValue === 'no'
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {normalizedValue === 'yes' ? 'Yes' : normalizedValue === 'no' ? 'No' : 'N/A'}
            </span>
          </div>
        ) : (
          <RadioGroup
            value={radioValue}
            onValueChange={(newValue) => {
              // Store as "yes" or "no" internally (normalized to lowercase)
              onChange(newValue);
              // Validate on change
              if (onValidate && field) {
                onValidate(fieldPath, newValue, field);
              }
            }}
            className="flex flex-row gap-6"
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id={`${field.id}-yes`} disabled={disabled} />
              <Label htmlFor={`${field.id}-yes`} className="cursor-pointer font-normal">
                Yes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id={`${field.id}-no`} disabled={disabled} />
              <Label htmlFor={`${field.id}-no`} className="cursor-pointer font-normal">
                No
              </Label>
            </div>
          </RadioGroup>
        )}
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  // Fields that should be text inputs even if marked as Dropdown in backend
  const textFieldExclusions = [
    'type of mechanism',
    'financing mechanism name',
    'intended benefit',
  ];
  const shouldExcludeFromDropdown = textFieldExclusions.some(exclusion => 
    field.label?.toLowerCase().includes(exclusion)
  );

  // Check if this is a dropdown field - ONLY if explicitly marked as Dropdown in UI Component
  // Note: Yes/No fields are handled above, so they won't be treated as dropdowns
  // We ONLY check uiComponent and dataType - NOT validationRules.options or getDropdownOptions result
  // because those might exist for text fields that shouldn't be dropdowns
  // Also exclude specific fields that should be text inputs
  const isDropdownField = !shouldExcludeFromDropdown && (
                         field.dataType === 'dropdown' || 
                         field.uiComponent === 'Dropdown' ||
                         field.uiComponent === 'dropdown');

  // Render dropdown fields before the switch statement
  if (isDropdownField) {
    const dropdownFieldPath = `${field.sectionId}.${field.id}`;
    const options = dropdownOptions || 
      (field.validationRules?.options?.map(opt => ({ value: opt, label: opt })) || []);
    
    // Debug log to help identify dropdown issues
    if (options.length === 0) {
      console.warn(`⚠️ Dropdown field "${field.label}" (${field.id}) has no options. Field type: ${field.dataType}, UI Component: ${field.uiComponent}, Label: ${field.label}`);
    }
    
    return (
      <div className="space-y-2" data-field-path={dropdownFieldPath}>
        <Label>
          {field.label} {isRequired && <span className="text-destructive">*</span>}
        </Label>
        {mode === 'edit' ? (
          <Dropdown
            options={options}
            value={value || ''}
            onChange={(newValue) => {
              onChange(newValue);
              // Validate on change
              if (onValidate && field) {
                onValidate(dropdownFieldPath, newValue, field);
              }
            }}
            placeholder={`Select ${field.label}`}
            isEditable={!disabled}
          />
        ) : (
          <Input
            value={value || ''}
            readOnly={true}
            className={cn('cursor-not-allowed', className)}
            placeholder={value ? undefined : 'N/A'}
          />
        )}
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  switch (field.dataType) {
    case 'string':
      // Yes/No fields are already handled above, so we skip them here
      
      // Check if this is a Comment field (TextArea)
      const isCommentField = field.label?.toLowerCase().includes('comment') || 
                            field.uiComponent === 'Text Area' ||
                            field.uiComponent === 'TextArea';
      
      // Check if this is a Year field (should only accept numeric values)
      const isYearField = field.label?.toLowerCase().includes('year') || 
                        field.label?.toLowerCase() === 'fy' ||
                        field.uiComponent === 'Year';
      
      // Regular string input or TextArea for comments
      const fieldPath = `${field.sectionId}.${field.id}`;
      return (
        <div className="space-y-2" data-field-path={fieldPath}>
          <Label>
            {field.label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
          {mode === 'edit' ? (
            isCommentField ? (
              <Textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={cn(
                  'flex h-10 w-full rounded-md border border-[#C6C6C6] bg-[#fff] px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                  'resize-none overflow-hidden',
                  error ? 'border-destructive' : '',
                  className
                )}
                placeholder="Please provide a comment..."
                rows={1}
              />
            ) : isYearField ? (
              <Input
                type="text"
                inputMode="numeric"
                value={value || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Only allow numeric characters (digits only, no decimals, no negative)
                  if (newValue === '' || /^\d+$/.test(newValue)) {
                    onChange(newValue);
                    
                    const fieldPath = `${field.sectionId}.${field.id}`;
                    
                    // Always validate on change - this will clear errors if field is valid
                    if (onValidate && field) {
                      onValidate(fieldPath, newValue, field);
                    }
                  }
                }}
                onBlur={() => {
                  // Validate on blur as well
                  if (onValidate && field && value) {
                    const fieldPath = `${field.sectionId}.${field.id}`;
                    onValidate(fieldPath, value, field);
                  }
                }}
                disabled={disabled}
                className={error ? 'border-destructive' : className}
                placeholder="Enter year (e.g., 2024)"
                maxLength={4}
              />
            ) : (
              <Input
                value={value || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  onChange(newValue);
                  
                  const fieldPath = `${field.sectionId}.${field.id}`;
                  
                  // Always validate on change - this will clear errors if field is valid
                  if (onValidate && field) {
                    onValidate(fieldPath, newValue, field);
                  }
                }}
                onBlur={() => {
                  // Validate on blur as well
                  if (onValidate && field && value) {
                    const fieldPath = `${field.sectionId}.${field.id}`;
                    onValidate(fieldPath, value, field);
                  }
                }}
                disabled={disabled}
                className={error ? 'border-destructive' : className}
              />
            )
          ) : (
            isCommentField ? (
              <Textarea
                value={value || ''}
                readOnly={true}
                className={cn(
                  'cursor-not-allowed resize-none overflow-hidden',
                  className
                )}
                placeholder={value ? undefined : 'N/A'}
                rows={1}
              />
            ) : (
              <Input
                type={isYearField ? "text" : undefined}
                value={value || ''}
                readOnly={true}
                className={cn('cursor-not-allowed', className)}
                placeholder={value ? undefined : 'N/A'}
              />
            )
          )}
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
      );

    case 'number':
      const numberFieldPath = `${field.sectionId}.${field.id}`;
      return (
        <div className="space-y-2" data-field-path={numberFieldPath}>
          <Label>
            {field.label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
          {mode === 'edit' ? (
            <Input
              type="number"
              value={value || ''}
              min={isCalculationInputField ? "0.01" : undefined}
              step="0.01"
              onChange={(e) => {
                // Don't allow changes to calculated fields
                if (isCalculatedField) return;
                
                const newValue = e.target.value;
                // Only allow numbers (prevent negative for calculation fields)
                if (isCalculationInputField) {
                  // For calculation fields, don't allow negative values
                  if (newValue === '' || /^\d*\.?\d*$/.test(newValue)) {
                    onChange(newValue ? Number(newValue) : '');
                    
                    // Always validate on change - this will clear errors if field is valid
                    if (onValidate && field) {
                      onValidate(numberFieldPath, newValue ? Number(newValue) : '', field);
                    }
                  }
                } else {
                  // For other number fields, allow negative
                  if (newValue === '' || /^-?\d*\.?\d*$/.test(newValue)) {
                    onChange(newValue ? Number(newValue) : '');
                    
                    // Always validate on change - this will clear errors if field is valid
                    if (onValidate && field) {
                      onValidate(numberFieldPath, newValue ? Number(newValue) : '', field);
                    }
                  }
                }
              }}
              onBlur={() => {
                // Validate on blur as well
                if (onValidate && field && value) {
                  onValidate(numberFieldPath, value, field);
                }
              }}
              disabled={disabled && !isCalculatedField}
              readOnly={isCalculatedField}
              placeholder={isCalculatedField ? "Auto-Calculated" : undefined}
              className={cn(
                error ? 'border-destructive' : '',
                isCalculatedField ? 'cursor-default opacity-100 pointer-events-none' : '',
                className
              )}
              style={isCalculatedField ? { opacity: 1, backgroundColor: '#fff' } : undefined}
            />
          ) : (
            <Input
              type="number"
              value={value ?? ''}
              readOnly={true}
              className={cn('cursor-not-allowed', className)}
              placeholder={value !== null && value !== undefined ? undefined : 'N/A'}
            />
          )}
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
      );

    case 'file':
      const fileFieldPath = `${field.sectionId}.${field.id}`;
      return (
        <div className="space-y-2" data-field-path={fileFieldPath}>
          <FileUploadSection
            label={field.label}
            value={value as FileUpload | null}
            onChange={onChange}
            required={isRequired}
            submissionId={submissionId}
            disabled={disabled || mode === 'review'}
            className={error ? 'border-destructive' : className}
          />
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
      );

    default:
      return null;
  }
}, (prevProps, nextProps) => {
  // Only re-render if value, error, or disabled state changed
  return (
    prevProps.value === nextProps.value &&
    prevProps.error === nextProps.error &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.mode === nextProps.mode
  );
});

