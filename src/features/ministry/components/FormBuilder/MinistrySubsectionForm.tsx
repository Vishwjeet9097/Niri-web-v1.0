import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, X, File as FileIcon } from 'lucide-react';
import { FileUploadSection } from '@/features/submission/components/FileUploadSection';
import { Dropdown } from '@/utils/getDropDowns';
import { cn } from '@/lib/utils';
import { validateField } from '@/features/ministry/utils/validation';
import type { SubsectionRendererProps } from './types';

interface MinistrySubsectionFormProps extends SubsectionRendererProps {}

export const MinistrySubsectionForm: React.FC<MinistrySubsectionFormProps> = React.memo(({
  subsection,
  sectionKey,
  formData,
  onChange,
  onAdd,
  onRemove,
  mode,
  disabled,
  submissionId,
  getFieldError,
  getDropdownOptions,
  yesNoValue,
  onValidateField,
  onClearFieldError,
}) => {
  const subsectionName = Object.keys(subsection)[0];
  const subsectionData = subsection[subsectionName];
  const items = useMemo(() => Array.isArray(formData) ? formData : [], [formData]);
  
  // Normalize Yes/No value
  const normalizedYesNoValue = useMemo(() => {
    if (!yesNoValue) return null;
    const str = String(yesNoValue).toLowerCase().trim();
    if (str === 'yes' || str === 'y') return 'yes';
    if (str === 'no' || str === 'n') return 'no';
    return null;
  }, [yesNoValue]);

  const handleAdd = useCallback(() => {
    onAdd();
  }, [onAdd]);

  const handleRemove = useCallback((index: number) => {
    onRemove(index);
  }, [onRemove]);

  // Helper to check if a field is Yes/No
  const isYesNoField = useCallback((field: any) => {
    return field.label?.toLowerCase().includes('yes/no') || field.label === 'Yes/No' || field.uiComponent === 'Checkbox';
  }, []);

  // Helper to check if a field is Comment/Text Area
  const isCommentField = useCallback((field: any) => {
    return field.label?.toLowerCase().includes('comment') || 
           field.label?.toLowerCase().includes('objective') || 
           field.label?.toLowerCase().includes('description') ||
           field.uiComponent === 'Text Area' ||
           field.uiComponent === 'TextArea';
  }, []);

  // Sort and filter fields by sequence and Yes/No value
  const sortedFields = useMemo(() => {
    const allFields = [...(subsectionData.inputs || [])].sort((a, b) => a.sequence - b.sequence);
    
    // If Yes/No value is "no", only show comment fields
    if (normalizedYesNoValue === 'no') {
      return allFields.filter(field => isCommentField(field));
    }
    
    // If Yes/No value is "yes", show all fields except comment fields
    if (normalizedYesNoValue === 'yes') {
      return allFields.filter(field => !isCommentField(field));
    }
    
    // If no Yes/No value, show all fields
    return allFields;
  }, [subsectionData.inputs, normalizedYesNoValue, isCommentField]);

  // Helper to normalize Yes/No values
  const normalizeYesNoValue = useCallback((val: any): string => {
    if (!val) return '';
    const str = String(val).toLowerCase().trim();
    if (str === 'yes' || str === 'y') return 'yes';
    if (str === 'no' || str === 'n') return 'no';
    return str;
  }, []);

  // Render field based on type
  const renderField = useCallback((field: any, item: any, index: number) => {
    const fieldPath = `${sectionKey}.${subsectionName}[${index}].${field.id}`;
    const fieldValue = item[field.id];
    const error = getFieldError?.(fieldPath);
    // All fields are mandatory - always show asterisk
    const isRequired = true;

    if (isYesNoField(field)) {
      const normalizedValue = normalizeYesNoValue(fieldValue);
      // Ensure value is either "yes", "no", or undefined (not empty string) for RadioGroup
      const radioValue = normalizedValue === '' ? undefined : normalizedValue;
      return (
        <div className="space-y-2">
          <Label>
            {field.label.replace(/\s*\(?\s*Yes\/No\s*\)?\s*/gi, '').trim()}
            {isRequired && <span className="text-destructive">*</span>}
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
              onValueChange={(value) => {
                onChange(index, field.id, value);
                
                // Always validate on change - this will clear errors if field is valid
                if (onValidateField && field) {
                  onValidateField(fieldPath, value, field);
                }
              }}
              className="flex flex-row gap-6"
              disabled={disabled}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id={`${field.id}-${index}-yes`} disabled={disabled} />
                <Label htmlFor={`${field.id}-${index}-yes`} className="cursor-pointer font-normal">
                  Yes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`${field.id}-${index}-no`} disabled={disabled} />
                <Label htmlFor={`${field.id}-${index}-no`} className="cursor-pointer font-normal">
                  No
                </Label>
              </div>
            </RadioGroup>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );
    }

    if (isCommentField(field)) {
      // Use Input instead of Textarea for better alignment
      return (
        <div className="space-y-2" data-field-path={fieldPath}>
          <Label>
            {field.label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
          <Input
            value={fieldValue || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              onChange(index, field.id, newValue);
              
              // Always validate on change - this will clear errors if field is valid
              if (onValidateField && field) {
                onValidateField(fieldPath, newValue, field);
              }
            }}
            onBlur={() => {
              // Validate on blur as well
              if (onValidateField && field && fieldValue) {
                onValidateField(fieldPath, fieldValue, field);
              }
            }}
            disabled={disabled}
            className={error ? 'border-destructive' : ''}
            placeholder="Please provide a comment..."
          />
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
    // We ONLY check uiComponent and dataType - NOT validationRules.options or getDropdownOptions result
    // because those might exist for text fields that shouldn't be dropdowns
    // Also exclude specific fields that should be text inputs
    const isDropdownField = !shouldExcludeFromDropdown && (
                           field.dataType === 'dropdown' || 
                           field.uiComponent === 'Dropdown' ||
                           field.uiComponent === 'dropdown');

    // Render dropdown fields first, before the switch statement
    if (isDropdownField) {
      const options = getDropdownOptions?.(field.id, field.sectionId, field.label) ||
        (field.validationRules?.options?.map((opt: string) => ({ value: opt, label: opt })) || []);

      if (options.length === 0) {
        console.warn(`⚠️ Dropdown field "${field.label}" (${field.id}) in subsection has no options. Field type: ${field.dataType}, UI Component: ${field.uiComponent}`);
      }

      return (
        <div className="space-y-2" data-field-path={fieldPath}>
          <Label>
            {field.label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
          <Dropdown
            options={options}
            value={fieldValue || ''}
            onChange={(value) => {
              onChange(index, field.id, value);
              
              // Always validate on change - this will clear errors if field is valid
              if (onValidateField && field) {
                onValidateField(fieldPath, value, field);
              }
            }}
            placeholder={`Select ${field.label}`}
            isEditable={!disabled}
          />
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
      );
    }

    switch (field.dataType) {
      case 'string':
        return (
          <div className="space-y-2" data-field-path={fieldPath}>
            <Label>
              {field.label} {isRequired && <span className="text-destructive">*</span>}
            </Label>
            <Input
              value={fieldValue || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                onChange(index, field.id, newValue);
                
                // Always validate on change - this will clear errors if field is valid
                if (onValidateField && field) {
                  onValidateField(fieldPath, newValue, field);
                }
              }}
              onBlur={() => {
                // Validate on blur as well
                if (onValidateField && field && fieldValue) {
                  onValidateField(fieldPath, fieldValue, field);
                }
              }}
              disabled={disabled}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2" data-field-path={fieldPath}>
            <Label>
              {field.label} {isRequired && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type="number"
              value={fieldValue || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                // Only allow numbers
                if (newValue === '' || /^-?\d*\.?\d*$/.test(newValue)) {
                  onChange(index, field.id, newValue ? Number(newValue) : '');
                  
                  // Always validate on change - this will clear errors if field is valid
                  if (onValidateField && field) {
                    onValidateField(fieldPath, newValue ? Number(newValue) : '', field);
                  }
                }
              }}
              onBlur={() => {
                // Validate on blur as well
                if (onValidateField && field && fieldValue) {
                  onValidateField(fieldPath, fieldValue, field);
                }
              }}
              disabled={disabled}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );


      case 'file':
        return (
          <div className="space-y-2" data-field-path={fieldPath}>
            <FileUploadSection
              label={field.label}
              value={fieldValue || null}
              onChange={(value) => {
                onChange(index, field.id, value);
                
                // Always validate on change - this will clear errors if field is valid
                if (onValidateField && field) {
                  onValidateField(fieldPath, value, field);
                }
              }}
              required={isRequired}
              submissionId={submissionId}
              disabled={disabled}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  }, [sectionKey, subsectionName, onChange, disabled, submissionId, getFieldError, getDropdownOptions, isYesNoField, isCommentField, normalizeYesNoValue, onValidateField, onClearFieldError]);

  return (
    <div className="space-y-6">
      {/* Form fields for each item - in a grid layout (3 columns) */}
      {items.map((item, index) => (
        <div key={item.id || `item-${index}`} className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            {sortedFields.map((field, fieldIndex) => (
              <div 
                key={field.id}
                className={cn(
                  "flex items-end",
                  // If this is the last field, add the delete button next to it
                  fieldIndex === sortedFields.length - 1 && mode === 'edit' && !disabled ? "gap-2" : ""
                )}
              >
                <div className="flex-1">
                  {renderField(field, item, index)}
                </div>
                {/* Delete button next to the last field */}
                {fieldIndex === sortedFields.length - 1 && mode === 'edit' && !disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                    aria-label="Remove"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 mb-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add button */}
      {mode === 'edit' && !disabled && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add {subsectionName}
          </Button>
        </div>
      )}

      {/* Table view for filled values */}
      {items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#DDE3F9]">
                {sortedFields.map((field, fieldIndex) => (
                  <th
                    key={field.id}
                    className={`py-3 px-4 text-left text-sm font-normal ${
                      fieldIndex === 0 ? 'rounded-tl-xl' : ''
                    }`}
                  >
                    {field.label}
                    <span className="text-destructive ml-1">*</span>
                  </th>
                ))}
                {mode === 'edit' && !disabled && (
                  <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || `item-${index}`} className="bg-white">
                  {sortedFields.map((field) => {
                    const fieldValue = item[field.id];
                    
                    return (
                      <td key={field.id} className="py-3 px-4 text-sm">
                        {field.dataType === 'file' && fieldValue && fieldValue.fileName ? (
                          <div className="flex items-center gap-2">
                            <FileIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-600 truncate max-w-[200px]">
                              {fieldValue.fileName}
                            </span>
                          </div>
                        ) : isYesNoField(field) ? (
                          <span className="capitalize">
                            {fieldValue === 'yes' ? 'Yes' : fieldValue === 'no' ? 'No' : 'N/A'}
                          </span>
                        ) : (
                          <span className={fieldValue ? '' : 'text-muted-foreground'}>
                            {fieldValue || 'N/A'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {mode === 'edit' && !disabled && (
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        disabled={disabled}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Delete item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Always re-render if getFieldError changes (it contains validationErrors)
  // This ensures errors appear immediately when validationErrors state changes
  if (prevProps.getFieldError !== nextProps.getFieldError) {
    return false; // Re-render needed
  }

  const prevArray = Array.isArray(prevProps.formData) ? prevProps.formData : [];
  const nextArray = Array.isArray(nextProps.formData) ? nextProps.formData : [];

  if (prevArray !== nextArray || prevArray.length !== nextArray.length) {
    return false;
  }

  if (
    prevProps.sectionKey !== nextProps.sectionKey ||
    prevProps.mode !== nextProps.mode ||
    prevProps.disabled !== nextProps.disabled ||
    prevProps.submissionId !== nextProps.submissionId
  ) {
    return false;
  }

  if (prevArray === nextArray && prevArray.length > 0) {
    for (let i = 0; i < prevArray.length; i++) {
      if (JSON.stringify(prevArray[i]) !== JSON.stringify(nextArray[i])) {
        return false;
      }
    }
  }

  return true;
});

