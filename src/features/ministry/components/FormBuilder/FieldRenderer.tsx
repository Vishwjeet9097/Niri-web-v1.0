import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUploadSection } from '@/features/submission/components/FileUploadSection';
import { Dropdown } from '@/utils/getDropDowns';
import type { FileUpload } from '@/features/submission/types';
import type { FieldRendererProps } from './types';

export const FieldRenderer: React.FC<FieldRendererProps> = ({
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

  switch (field.dataType) {
    case 'string':
      return (
        <div className="space-y-2">
          <Label>
            {field.label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
          {mode === 'edit' ? (
            <Input
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className={error ? 'border-destructive' : className}
            />
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
};

