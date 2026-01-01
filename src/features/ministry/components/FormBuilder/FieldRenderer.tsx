import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileUploadSection } from '@/features/submission/components/FileUploadSection';
import { Dropdown } from '@/utils/getDropDowns';
import { cn } from '@/lib/utils';
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
}) => {
  const isRequired = field.validationRules?.required;
  
  if (mode === 'review' && !value && field.dataType !== 'file') {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <p className="text-sm text-muted-foreground">N/A</p>
      </div>
    );
  }

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

  switch (field.dataType) {
    case 'string':
      // Render Yes/No fields as radio buttons
      if (isYesNoField) {
        const normalizedValue = normalizeYesNoValue(value);
        return (
          <div className="space-y-2">
            <Label>
              {getDisplayLabel(field.label)} {isRequired && <span className="text-destructive">*</span>}
            </Label>
            {mode === 'edit' ? (
              <RadioGroup
                value={normalizedValue}
                onValueChange={(newValue) => {
                  // Store as "yes" or "no" internally
                  onChange(newValue);
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
            ) : (
              <p className="text-sm">{denormalizeYesNoValue(value) || 'N/A'}</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      }
      
      // Check if this is a Comment field (TextArea)
      const isCommentField = field.label?.toLowerCase().includes('comment') || 
                            field.uiComponent === 'Text Area' ||
                            field.uiComponent === 'TextArea';
      
      // Regular string input or TextArea for comments
      return (
        <div className="space-y-2">
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
            ) : (
              <Input
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={error ? 'border-destructive' : className}
              />
            )
          ) : (
            <p className="text-sm">{value || 'N/A'}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-2">
          <Label>
            {field.label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
          {mode === 'edit' ? (
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
              disabled={disabled}
              className={error ? 'border-destructive' : className}
            />
          ) : (
            <p className="text-sm">{value ?? 'N/A'}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case 'dropdown':
      const options = dropdownOptions || 
        (field.validationRules?.options?.map(opt => ({ value: opt, label: opt })) || []);
      
      return (
        <div className="space-y-2">
          <Label>
            {field.label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
          {mode === 'edit' ? (
            <Dropdown
              options={options}
              value={value || ''}
              onChange={onChange}
              placeholder={`Select ${field.label}`}
              isEditable={!disabled}
            />
          ) : (
            <p className="text-sm">{value || 'N/A'}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case 'file':
      return (
        <div className="space-y-2">
          <FileUploadSection
            label={field.label}
            value={value as FileUpload | null}
            onChange={onChange}
            required={isRequired}
            submissionId={submissionId}
            disabled={disabled || mode === 'review'}
            className={error ? 'border-destructive' : className}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
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

