import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { FieldRenderer } from './FieldRenderer';
import type { SubsectionRendererProps } from './types';

export const SubsectionRenderer: React.FC<SubsectionRendererProps> = ({
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
  const items = Array.isArray(formData) ? formData : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">{subsectionName}</h4>
        {mode === 'edit' && !disabled && (
          <Button type="button" onClick={onAdd} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add {subsectionName}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items added</p>
      ) : (
        items.map((item, index) => (
          <div key={item.id || index} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{subsectionName} #{index + 1}</span>
              {mode === 'edit' && !disabled && items.length > 0 && (
                <Button
                  type="button"
                  onClick={() => onRemove(index)}
                  variant="ghost"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subsectionData.inputs
                .sort((a, b) => a.sequence - b.sequence)
                .map((field) => {
                  const fieldPath = `${sectionKey}.${subsectionName}[${index}].${field.id}`;
                  return (
                    <FieldRenderer
                      key={field.id}
                      field={field}
                      value={item[field.id]}
                      onChange={(value) => onChange(index, field.id, value)}
                      mode={mode}
                      disabled={disabled}
                      submissionId={submissionId}
                      error={getFieldError?.(fieldPath)}
                      dropdownOptions={getDropdownOptions?.(field.id, field.sectionId, field.label)}
                    />
                  );
                })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

