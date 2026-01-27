import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, X } from 'lucide-react';
import { FileUploadSection } from '@/features/submission/components/FileUploadSection';
import { Dropdown } from '@/utils/getDropDowns';
import { cn } from '@/lib/utils';
import { MinistryFileTable } from '@/features/ministry/components/FileTable/MinistryFileTable';
import type { SubsectionRendererProps } from './types';

interface SubsectionTableProps extends SubsectionRendererProps {}

export const SubsectionTable: React.FC<SubsectionTableProps> = React.memo(({
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
}) => {
  const subsectionName = Object.keys(subsection)[0];
  const subsectionData = subsection[subsectionName];
  const items = useMemo(() => Array.isArray(formData) ? formData : [], [formData]);

  const handleAdd = useCallback(() => {
    console.log("🔘 Add button clicked for subsection:", subsectionName);
    onAdd();
  }, [onAdd, subsectionName]);

  const handleRemove = useCallback((index: number) => {
    onRemove(index);
  }, [onRemove]);

  // Memoize field change handlers for each item
  const getFieldChangeHandler = useCallback((index: number, fieldId: string) => {
    return (value: any) => onChange(index, fieldId, value);
  }, [onChange]);

  // Sort fields by sequence
  const sortedFields = useMemo(() => {
    return [...(subsectionData.inputs || [])].sort((a, b) => a.sequence - b.sequence);
  }, [subsectionData.inputs]);

  if (items.length === 0 && mode === 'edit' && !disabled) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {mode === 'edit' && !disabled && (
          <Button type="button" onClick={handleAdd} variant="outline" size="sm" className="w-full sm:w-auto shrink-0 mb-4">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add {subsectionName}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
        <p className="text-xs sm:text-sm text-muted-foreground">No items added. Click "Add {subsectionName}" to add an item.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {mode === 'edit' && !disabled && (
        <div className="mb-4">
          <Button type="button" onClick={handleAdd} variant="outline" size="sm" className="w-full sm:w-auto shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add {subsectionName}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-xl">
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
                    {field.validationRules?.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
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
                <SubsectionTableRow
                  key={item.id || `item-${index}`}
                  item={item}
                  index={index}
                  subsectionName={subsectionName}
                  subsectionData={subsectionData}
                  sortedFields={sortedFields}
                  sectionKey={sectionKey}
                  mode={mode}
                  disabled={disabled}
                  submissionId={submissionId}
                  onChange={getFieldChangeHandler}
                  onRemove={handleRemove}
                  getFieldError={getFieldError}
                  getDropdownOptions={getDropdownOptions}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Always allow re-render if formData array reference changed
  const prevArray = Array.isArray(prevProps.formData) ? prevProps.formData : [];
  const nextArray = Array.isArray(nextProps.formData) ? nextProps.formData : [];
  
  // CRITICAL: If array reference changed OR length changed, always re-render
  if (prevArray !== nextArray || prevArray.length !== nextArray.length) {
    return false; // Re-render needed
  }
  
  // Check other props
  if (
    prevProps.sectionKey !== nextProps.sectionKey ||
    prevProps.mode !== nextProps.mode ||
    prevProps.disabled !== nextProps.disabled ||
    prevProps.submissionId !== nextProps.submissionId
  ) {
    return false; // Re-render needed
  }

  return true; // No re-render needed
});

// Separate component for table rows to prevent re-rendering all rows
const SubsectionTableRow: React.FC<{
  item: any;
  index: number;
  subsectionName: string;
  subsectionData: any;
  sortedFields: any[];
  sectionKey: string;
  mode: 'edit' | 'review';
  disabled: boolean;
  submissionId?: string;
  onChange: (index: number, fieldId: string) => (value: any) => void;
  onRemove: (index: number) => void;
  getFieldError?: (path: string) => string | undefined;
  getDropdownOptions?: (fieldId: string, sectionId: string, label: string) => Array<{ value: string; label: string }>;
}> = React.memo(({
  item,
  index,
  subsectionName,
  subsectionData,
  sortedFields,
  sectionKey,
  mode,
  disabled,
  submissionId,
  onChange,
  onRemove,
  getFieldError,
  getDropdownOptions,
}) => {
  return (
    <tr className="bg-white">
      {sortedFields.map((field) => {
        const fieldPath = `${sectionKey}.${subsectionName}[${index}].${field.id}`;
        const fieldValue = item[field.id];
        const error = getFieldError?.(fieldPath);
        const isFileField = field.dataType === 'file';
        
        // For table cells, render compact inline fields
        return (
          <td key={field.id} className="py-3 px-4 text-sm align-top">
            {mode === 'edit' ? (
              <div className={cn(
                isFileField ? "min-w-[180px]" : "min-w-[120px] max-w-[200px]"
              )}>
                <CompactFieldRenderer
                  field={field}
                  value={fieldValue}
                  onChange={onChange(index, field.id)}
                  disabled={disabled}
                  submissionId={submissionId}
                  error={error}
                  dropdownOptions={getDropdownOptions?.(field.id, field.sectionId, field.label)}
                />
              </div>
            ) : (
              <div className="text-sm">
                {isFileField ? (
                  // Check if "No document available" is set for this file field
                  (() => {
                    // Find "No document available" field in subsection inputs
                    // We need to get subsectionData from the subsection prop
                    const subsectionData = subsection[subsectionName];
                    const noDocAvailableField = subsectionData?.inputs?.find((f: any) => 
                      (f.label?.toLowerCase().includes('no document available') ||
                       f.label?.toLowerCase() === 'no document available') &&
                      f.id !== field.id
                    );
                    const noDocAvailableValue = noDocAvailableField && item
                      ? item[noDocAvailableField.id]
                      : undefined;
                    
                    // Show "No document available" checkbox if set, otherwise show files
                    if (noDocAvailableValue === 'No document available') {
                      return (
                        <div className="flex items-center space-x-2 py-2">
                          <Checkbox
                            checked={true}
                            disabled
                            className="cursor-not-allowed"
                          />
                          <Label className="text-sm font-normal cursor-not-allowed">
                            No document available
                          </Label>
                        </div>
                      );
                    }
                    
                    // Show files in table format in review mode
                    return fieldValue ? (
                      <MinistryFileTable
                        files={fieldValue}
                        fileKeyPrefix={`${sectionKey}-${subsectionName}-${index}-${field.id}`}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground py-2">
                        No files uploaded
                      </div>
                    );
                  })()
                ) : (() => {
                  // Check if this is a Yes/No field
                  const isYesNoField = field.label.toLowerCase().includes('yes/no') || field.label === 'Yes/No';
                  if (isYesNoField) {
                    const normalizedValue = String(fieldValue || '').toLowerCase().trim();
                    const isYes = normalizedValue === 'yes' || normalizedValue === 'y';
                    const isNo = normalizedValue === 'no' || normalizedValue === 'n';
                    return (
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          isYes
                            ? "bg-green-100 text-green-800"
                            : isNo
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {isYes ? 'Yes' : isNo ? 'No' : ''}
                      </span>
                    );
                  }
                  // Show regular field values (not disabled inputs)
                  return fieldValue || <span className="text-muted-foreground"></span>;
                })()}
              </div>
            )}
          </td>
        );
      })}
      {mode === 'edit' && !disabled && (
        <td className="py-3 px-4">
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={disabled}
            className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Delete item"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </td>
      )}
    </tr>
  );
}, (prevProps, nextProps) => {
  // Only re-render if item data actually changed
  return (
    prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.mode === nextProps.mode &&
    prevProps.disabled === nextProps.disabled
  );
});

// Compact field renderer for table cells (no labels, just inputs)
const CompactFieldRenderer: React.FC<{
  field: any;
  value: any;
  onChange: (value: any) => void;
  disabled: boolean;
  submissionId?: string;
  error?: string;
  dropdownOptions?: Array<{ value: string; label: string }>;
}> = ({ field, value, onChange, disabled, submissionId, error, dropdownOptions }) => {
  const isYesNoField = field.label.toLowerCase().includes('yes/no') || field.label === 'Yes/No';
  // Check if field is a textarea - check uiComponent or if it's a comment/objective field
  const isTextareaField = field.uiComponent === 'Text Area' || 
                         field.uiComponent === 'TextArea' ||
                         field.label.toLowerCase().includes('comment') ||
                         field.label.toLowerCase().includes('objective') ||
                         field.label.toLowerCase().includes('description');
  
  const normalizeYesNoValue = (val: any): string => {
    if (!val) return '';
    const str = String(val).toLowerCase().trim();
    if (str === 'yes' || str === 'y') return 'yes';
    if (str === 'no' || str === 'n') return 'no';
    return str;
  };

  const denormalizeYesNoValue = (val: any): string => {
    if (!val) return '';
    const str = String(val).toLowerCase().trim();
    if (str === 'yes') return 'Yes';
    if (str === 'no') return 'No';
    return String(val);
  };

  if (isYesNoField) {
    const normalizedValue = normalizeYesNoValue(value);
    // Ensure value is either "yes", "no", or undefined (not empty string) for RadioGroup
    const radioValue = normalizedValue === '' ? undefined : normalizedValue;
    return (
      <RadioGroup
        value={radioValue}
        onValueChange={onChange}
        className="flex flex-row gap-4"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id={`${field.id}-yes`} disabled={disabled} />
          <Label htmlFor={`${field.id}-yes`} className="cursor-pointer font-normal text-xs">
            Yes
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id={`${field.id}-no`} disabled={disabled} />
          <Label htmlFor={`${field.id}-no`} className="cursor-pointer font-normal text-xs">
            No
          </Label>
        </div>
      </RadioGroup>
    );
  }

  if (isTextareaField) {
    return (
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={`Enter ${field.label.toLowerCase()}...`}
        className={cn(
          'flex h-10 w-full rounded-md border border-[#C6C6C6] bg-[#fff] px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'resize-none overflow-hidden',
          error ? 'border-destructive' : ''
        )}
        rows={1}
      />
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
  // We ONLY check uiComponent and dataType - NOT validationRules.options or dropdownOptions
  // because those might exist for text fields that shouldn't be dropdowns
  // Also exclude specific fields that should be text inputs
  const isDropdownField = !shouldExcludeFromDropdown && (
                         field.dataType === 'dropdown' || 
                         field.uiComponent === 'Dropdown' ||
                         field.uiComponent === 'dropdown');

  // Render dropdown fields first, before the switch statement
  if (isDropdownField) {
    const options = dropdownOptions ||
      (field.validationRules?.options?.map(opt => ({ value: opt, label: opt })) || []);

    if (options.length === 0) {
      console.warn(`⚠️ Dropdown field "${field.label}" (${field.id}) in table has no options. Field type: ${field.dataType}, UI Component: ${field.uiComponent}`);
    }

    return (
      <Dropdown
        options={options}
        value={value || ''}
        onChange={onChange}
        placeholder={`Select ${field.label}`}
        isEditable={!disabled}
      />
    );
  }

  switch (field.dataType) {
    case 'string':
      // Check if this string field should be a textarea
      const isStringTextarea = field.uiComponent === 'Text Area' || 
                              field.uiComponent === 'TextArea' ||
                              field.label.toLowerCase().includes('objective') ||
                              field.label.toLowerCase().includes('description') ||
                              field.label.toLowerCase().includes('comment');
      
      if (isStringTextarea) {
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            className={cn(
              'flex h-10 w-full rounded-md border border-[#C6C6C6] bg-[#fff] px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
              'resize-none overflow-hidden',
              error ? 'border-destructive' : ''
            )}
            rows={1}
          />
        );
      }
      
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={error ? 'border-destructive text-sm' : 'text-sm'}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          disabled={disabled}
          className={error ? 'border-destructive text-sm' : 'text-sm'}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      );


    case 'file':
      // For table cells, render a compact file upload button matching State Approver style
      if (value && value.fileName) {
        const fileName = value.originalName || value.fileName || 'File uploaded';
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate max-w-[120px] text-blue-600">{fileName}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="text-red-600 hover:text-red-800 disabled:opacity-50 flex-shrink-0"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      }
      // Compact upload button for table cells - matching State Approver style
      const fileInputId = `file-upload-${field.id}-${Date.now()}`;
      return (
        <div className="flex items-center gap-2 w-full">
          <label
            htmlFor={fileInputId}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium text-sm transition flex-shrink-0",
              disabled 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 cursor-pointer"
            )}
          >
            Upload File
          </label>
          <input
            id={fileInputId}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Create FileUpload object matching the expected format
                const fileUpload = {
                  id: crypto.randomUUID(),
                  file: file,
                  fileName: file.name,
                  originalName: file.name,
                  fileSize: file.size,
                  uploadedAt: Date.now(),
                };
                onChange(fileUpload);
              }
              // Reset input to allow selecting the same file again
              e.target.value = '';
            }}
            disabled={disabled}
            className="hidden"
          />
          <span className="text-gray-600 text-xs truncate max-w-[100px]">
            No file chosen
          </span>
        </div>
      );

    default:
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={error ? 'border-destructive text-sm' : 'text-sm'}
        />
      );
  }
};

