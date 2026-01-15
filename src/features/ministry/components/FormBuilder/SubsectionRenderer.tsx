import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { FieldRenderer } from './FieldRenderer';
import type { SubsectionRendererProps } from './types';

export const SubsectionRenderer: React.FC<SubsectionRendererProps> = React.memo(({
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

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <h4 className="text-base sm:text-lg font-semibold">{subsectionName}</h4>
        {mode === 'edit' && !disabled && (
          <Button type="button" onClick={handleAdd} variant="outline" size="sm" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add {subsectionName}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs sm:text-sm text-muted-foreground">No items added</p>
      ) : (
        items.map((item, index) => (
          <SubsectionItem
            key={item.id || `item-${index}`}
            item={item}
            index={index}
            subsectionName={subsectionName}
            subsectionData={subsectionData}
            sectionKey={sectionKey}
            mode={mode}
            disabled={disabled}
            submissionId={submissionId}
            onChange={onChange}
            onRemove={handleRemove}
            getFieldError={getFieldError}
            getDropdownOptions={getDropdownOptions}
          />
        ))
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Always allow re-render if formData array reference changed
  // This is critical for add/remove functionality
  const prevArray = Array.isArray(prevProps.formData) ? prevProps.formData : [];
  const nextArray = Array.isArray(nextProps.formData) ? nextProps.formData : [];
  
  console.log("🔍 SubsectionRenderer memo check:", {
    prevArrayLength: prevArray.length,
    nextArrayLength: nextArray.length,
    arraysEqual: prevArray === nextArray,
    prevArrayRef: prevArray,
    nextArrayRef: nextArray,
    sectionKey: prevProps.sectionKey === nextProps.sectionKey
  });
  
  // CRITICAL: If array reference changed OR length changed, always re-render
  // This handles add/remove functionality
  if (prevArray !== nextArray || prevArray.length !== nextArray.length) {
    console.log("✅ Re-rendering: array reference or length changed");
    return false; // Re-render needed
  }
  
  // Check other props
  if (
    prevProps.sectionKey !== nextProps.sectionKey ||
    prevProps.mode !== nextProps.mode ||
    prevProps.disabled !== nextProps.disabled ||
    prevProps.submissionId !== nextProps.submissionId
  ) {
    console.log("✅ Re-rendering: other props changed");
    return false; // Re-render needed
  }

  // Everything is the same, no re-render needed
  console.log("⏭️ Skipping re-render: no changes detected");
  return true;
});

// Separate component for subsection items to prevent re-rendering all items
const SubsectionItem: React.FC<{
  item: any;
  index: number;
  subsectionName: string;
  subsectionData: any;
  sectionKey: string;
  mode: 'edit' | 'review';
  disabled: boolean;
  submissionId?: string;
  onChange: (index: number, fieldId: string, value: any) => void;
  onRemove: (index: number) => void;
  getFieldError?: (path: string) => string | undefined;
  getDropdownOptions?: (fieldId: string, sectionId: string, label: string) => Array<{ value: string; label: string }>;
}> = React.memo(({
  item,
  index,
  subsectionName,
  subsectionData,
  sectionKey,
  mode,
  disabled,
  submissionId,
  onChange,
  onRemove,
  getFieldError,
  getDropdownOptions,
}) => {
  // Memoize field change handlers to prevent re-renders
  const fieldChangeHandlers = useMemo(() => {
    const handlers: Record<string, (value: any) => void> = {};
    subsectionData.inputs.forEach((field: any) => {
      handlers[field.id] = (value: any) => onChange(index, field.id, value);
    });
    return handlers;
  }, [onChange, index, subsectionData.inputs]);
  
  return (
    <div className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm font-medium">{subsectionName} #{index + 1}</span>
        {mode === 'edit' && !disabled && (
          <Button
            type="button"
            onClick={() => onRemove(index)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {subsectionData.inputs
          .sort((a, b) => a.sequence - b.sequence)
          .map((field) => {
            const fieldPath = `${sectionKey}.${subsectionName}[${index}].${field.id}`;
            return (
              <FieldRenderer
                key={field.id}
                field={field}
                value={item[field.id]}
                onChange={fieldChangeHandlers[field.id]}
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

