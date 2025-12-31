import React from 'react';
import { SectionCard } from '@/features/submission/components/SectionCard';
import { FieldRenderer } from './FieldRenderer';
import { SubsectionRenderer } from './SubsectionRenderer';
import type { DynamicFormBuilderProps } from './types';

export const DynamicFormBuilder: React.FC<DynamicFormBuilderProps> = ({
  indicators,
  formData,
  onChange,
  mode = 'edit',
  disabled = false,
  submissionId,
  getFieldError,
  getDropdownOptions,
  onSectionSubmit,
  isIndicatorSubmitted,
}) => {
  const generateItemId = () => crypto.randomUUID();

  const handleFieldChange = (path: string, value: any) => {
    onChange(path, value);
  };

  const handleSubsectionAdd = (sectionKey: string, subsectionName: string) => {
    const currentArray = formData[sectionKey]?.[subsectionName] || [];
    const newItem = { id: generateItemId() };
    const newArray = [...currentArray, newItem];
    onChange(`${sectionKey}.${subsectionName}`, newArray);
  };

  const handleSubsectionRemove = (sectionKey: string, subsectionName: string, index: number) => {
    const currentArray = formData[sectionKey]?.[subsectionName] || [];
    const newArray = currentArray.filter((_: any, i: number) => i !== index);
    onChange(`${sectionKey}.${subsectionName}`, newArray);
  };

  const handleSubsectionFieldChange = (
    sectionKey: string,
    subsectionName: string,
    index: number,
    fieldId: string,
    value: any
  ) => {
    const currentArray = formData[sectionKey]?.[subsectionName] || [];
    const updatedArray = currentArray.map((item: any, i: number) =>
      i === index ? { ...item, [fieldId]: value } : item
    );
    onChange(`${sectionKey}.${subsectionName}`, updatedArray);
  };

  return (
    <div className="space-y-8">
      {indicators.map((indicator, indicatorIndex) => {
        const indicatorName = Object.keys(indicator)[0];
        const sections = indicator[indicatorName];

        return (
          <div key={indicatorIndex} className="space-y-6">
            <h2 className="text-2xl font-bold">{indicatorName}</h2>

            {sections.map((sectionObj) => {
              const sectionName = Object.keys(sectionObj)[0];
              const section = sectionObj[sectionName];
              const sectionKey = `section${section.sNo.replace('.', '_')}`;
              const indicatorId = section.sNo;
              const isSubmitted = isIndicatorSubmitted?.(indicatorId) || false;

              return (
                <SectionCard
                  key={section.sNo}
                  title={`${sectionName} (${section.sNo})`}
                  isCompleted={isSubmitted}
                  onSave={onSectionSubmit ? () => onSectionSubmit(indicatorId) : undefined}
                >
                  {/* Render direct inputs */}
                  {section.inputs.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.inputs
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((field) => {
                          const fieldPath = `${sectionKey}.${field.id}`;
                          const fieldValue = formData[sectionKey]?.[field.id];
                          
                          return (
                            <FieldRenderer
                              key={field.id}
                              field={field}
                              value={fieldValue}
                              onChange={(value) => handleFieldChange(fieldPath, value)}
                              mode={mode}
                              disabled={disabled || isSubmitted}
                              submissionId={submissionId}
                              error={getFieldError?.(fieldPath)}
                              dropdownOptions={getDropdownOptions?.(field.id, field.sectionId, field.label)}
                            />
                          );
                        })}
                    </div>
                  )}

                  {/* Render subsections */}
                  {section.subsection.map((subsection, subIndex) => {
                    const subsectionName = Object.keys(subsection)[0];
                    const subsectionData = formData[sectionKey]?.[subsectionName] || [];

                    return (
                      <SubsectionRenderer
                        key={subIndex}
                        subsection={subsection}
                        sectionKey={sectionKey}
                        formData={subsectionData}
                        onChange={(index, fieldId, value) =>
                          handleSubsectionFieldChange(sectionKey, subsectionName, index, fieldId, value)
                        }
                        onAdd={() => handleSubsectionAdd(sectionKey, subsectionName)}
                        onRemove={(index) => {
                          const currentArray = formData[sectionKey]?.[subsectionName] || [];
                          const newArray = currentArray.filter((_: any, i: number) => i !== index);
                          onChange(`${sectionKey}.${subsectionName}`, newArray);
                        }}
                        mode={mode}
                        disabled={disabled || isSubmitted}
                        submissionId={submissionId}
                        getFieldError={getFieldError}
                        getDropdownOptions={getDropdownOptions}
                      />
                    );
                  })}
                </SectionCard>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

