import React, { useCallback, useMemo } from "react";
import { MinistrySectionCard } from "../MinistrySectionCard";
import { FieldRenderer } from "./FieldRenderer";
import { MinistrySubsectionForm } from "./MinistrySubsectionForm";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditableSectionStore } from "@/utils/EditableSection";
import type { DynamicFormBuilderProps } from "./types";

export const DynamicFormBuilder: React.FC<DynamicFormBuilderProps> = React.memo(
  ({
    indicators,
    formData,
    onChange,
    mode = "edit",
    disabled = false,
    submissionId,
    getFieldError,
    getDropdownOptions,
    onSectionSubmit,
    onSaveDraft,
    isIndicatorSubmitted,
    submittingIndicator,
    validationErrors,
    onValidateField,
    onClearFieldError,
    renderSectionActionButtons,
  }) => {
    const generateItemId = useCallback(() => crypto.randomUUID(), []);
    // Subscribe to editableSections to trigger re-renders when edit state changes
    const editableSections = useEditableSectionStore(
      (state) => state.editableSections
    );

    // Helper function to check if a section is editable
    const isSectionEditable = useCallback(
      (sectionId: string) => {
        const result = editableSections.some(
          (section) => section.sectionId === sectionId && section.isEditing
        );
        console.log(
          `[DynamicFormBuilder] Checking if section ${sectionId} is editable:`,
          result,
          "Editable sections:",
          editableSections
        );
        return result;
      },
      [editableSections]
    );

    const handleFieldChange = useCallback(
      (path: string, value: any, field?: any) => {
        onChange(path, value, field);
      },
      [onChange]
    );

    const handleSubsectionAdd = useCallback(
      (sectionKey: string, subsectionName: string) => {
        console.log("➕ Adding subsection:", sectionKey, subsectionName);
        // Get current array from formData
        const currentArray = formData[sectionKey]?.[subsectionName] || [];
        console.log("📦 Current array:", currentArray);
        const newItem = { id: generateItemId() };
        const newArray = [...currentArray, newItem];
        console.log("📦 New array:", newArray);
        console.log(
          "📤 Calling onChange with path:",
          `${sectionKey}.${subsectionName}`
        );
        onChange(`${sectionKey}.${subsectionName}`, newArray);
      },
      [formData, generateItemId, onChange]
    );

    const handleSubsectionRemove = useCallback(
      (sectionKey: string, subsectionName: string, index: number) => {
        console.log(
          "➖ Removing subsection:",
          sectionKey,
          subsectionName,
          "at index:",
          index
        );
        // CRITICAL: Use a function form to get the latest formData, not the stale closure value
        // This ensures we always work with the most current state, even if multiple deletions happen quickly
        onChange(`${sectionKey}.${subsectionName}`, (currentValue: any) => {
          // currentValue is the current array from the latest formData state
          // Always use currentValue directly - it's guaranteed to be the latest state
          const currentArray = Array.isArray(currentValue) ? currentValue : [];
          console.log(
            "📦 Current array before removal:",
            currentArray,
            "length:",
            currentArray.length
          );
          console.log(
            "📦 Removing item at index:",
            index,
            "from array with",
            currentArray.length,
            "items"
          );

          // Filter out ONLY the item at the specified index
          const newArray = currentArray.filter((_: any, i: number) => {
            const shouldKeep = i !== index;
            if (!shouldKeep) {
              console.log("📦 Filtering out item at index:", i);
            }
            return shouldKeep;
          });

          console.log(
            "📦 New array after filter:",
            newArray,
            "length:",
            newArray.length
          );
          console.log(
            "📦 Expected length:",
            currentArray.length - 1,
            "Actual length:",
            newArray.length
          );

          if (newArray.length !== currentArray.length - 1) {
            console.error(
              "❌ Array length mismatch! Expected:",
              currentArray.length - 1,
              "Got:",
              newArray.length
            );
            console.error("❌ Current array:", currentArray);
            console.error("❌ New array:", newArray);
          } else {
            console.log("✅ Array length correct after removal");
          }

          return newArray;
        });
      },
      [onChange]
    ); // Removed formData dependency - we use function update instead

    const handleSubsectionFieldChange = useCallback(
      (
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
      },
      [formData, onChange]
    );

    return (
      <div className="space-y-6 sm:space-y-8">
        {indicators.map((indicator, indicatorIndex) => {
          const indicatorName = Object.keys(indicator)[0];
          const sections = indicator[indicatorName];

          return (
            <div key={indicatorIndex} className="space-y-4 sm:space-y-6">
              {/* Category heading removed - shown in ProgressHeader instead */}

              {sections.map((sectionObj) => {
                const sectionName = Object.keys(sectionObj)[0];
                const section = sectionObj[sectionName];
                const sectionKey = `section${section.sNo.replace(".", "_")}`;
                const indicatorId = section.sNo;
                const isSubmitted =
                  isIndicatorSubmitted?.(indicatorId) || false;
                // Check if this specific section is in edit mode
                const isSectionInEditMode = isSectionEditable(indicatorId);
                // Section is disabled if: globally disabled OR (not in edit mode AND in review mode)
                const isSectionDisabled =
                  disabled || (mode === "review" && !isSectionInEditMode);

                console.log(
                  `[DynamicFormBuilder] Section ${indicatorId} edit state:`,
                  {
                    isSectionInEditMode,
                    isSectionDisabled,
                    mode,
                    disabled,
                    editableSectionsCount: editableSections.length,
                  }
                );

                // Check if this indicator has validation errors
                // Check both sectionKey and any subsection paths
                const indicatorErrors = validationErrors
                  ? Object.keys(validationErrors).filter((key) => {
                      // Match sectionKey directly or any subsection within this section
                      return key.startsWith(sectionKey);
                    })
                  : [];
                const hasIndicatorErrors = indicatorErrors.length > 0;

                // Get action buttons for this section if in review mode
                const sectionActionButtons =
                  mode === "review" && renderSectionActionButtons
                    ? renderSectionActionButtons(
                        section.sNo,
                        sectionName,
                        indicatorId
                      )
                    : undefined;

                return (
                  <MinistrySectionCard
                    key={section.sNo}
                    title={`${section.sNo} - ${sectionName}`}
                    onSave={
                      onSectionSubmit
                        ? () => onSectionSubmit(indicatorId)
                        : undefined
                    }
                    indicatorCode={indicatorId}
                    isSaving={submittingIndicator === indicatorId}
                    reviewModeActionButtons={sectionActionButtons}
                  >
                    {/* Show general error message above all fields if validation failed */}
                    {hasIndicatorErrors &&
                      (() => {
                        // Check if there's a subsection error (no subsections added)
                        const subsectionError = indicatorErrors.find((key) => {
                          const errorKey = key.replace(/\[.*?\]/g, ""); // Remove array indices
                          return (
                            errorKey.includes(sectionKey) &&
                            !errorKey.includes("[") &&
                            validationErrors[key]?.includes("At least one") &&
                            validationErrors[key]?.includes("entry is required")
                          );
                        });

                        return (
                          <div
                            className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
                            data-indicator-error={indicatorId}
                          >
                            <p className="text-sm text-destructive font-medium">
                              {subsectionError
                                ? validationErrors[subsectionError]
                                : "Please fill all the mandatory fields."}
                            </p>
                          </div>
                        );
                      })()}
                    {/* Find Yes/No field (if exists) to determine subsection visibility */}
                    {(() => {
                      // Find the Yes/No field in this section to check its value
                      const yesNoField = section.inputs.find(
                        (f: any) =>
                          f.label?.toLowerCase().includes("yes/no") ||
                          f.label === "Yes/No"
                      );
                      const yesNoValue = yesNoField
                        ? (formData[sectionKey]?.[yesNoField.id] || "")
                            .toLowerCase()
                            .trim()
                        : null;

                      return (
                        <>
                          {/* Render direct inputs */}
                          {section.inputs.length > 0 &&
                            (() => {
                              // Separate fields into categories
                              const yesNoFields: any[] = [];
                              const commentFields: any[] = [];
                              const fileUploadFields: any[] = [];
                              const otherFields: any[] = [];

                              section.inputs.forEach((field: any) => {
                                const isYesNo =
                                  field.label
                                    ?.toLowerCase()
                                    .includes("yes/no") ||
                                  field.label === "Yes/No";
                                const isComment =
                                  field.label
                                    ?.toLowerCase()
                                    .includes("comment") ||
                                  field.uiComponent === "Text Area" ||
                                  field.uiComponent === "TextArea";
                                const isFileUpload =
                                  field.dataType === "file" ||
                                  field.uiComponent === "File" ||
                                  field.label
                                    ?.toLowerCase()
                                    .includes("upload file") ||
                                  field.label?.toLowerCase().includes("upload");
                                // Filter out "No Document Available" field - it's handled by MinistryFileUploadSection
                                const isNoDocAvailable =
                                  field.label
                                    ?.toLowerCase()
                                    .includes("no document available") ||
                                  field.label?.toLowerCase() ===
                                    "no document available";

                                if (isYesNo) {
                                  yesNoFields.push(field);
                                } else if (isComment) {
                                  commentFields.push(field);
                                } else if (isFileUpload) {
                                  fileUploadFields.push(field);
                                } else if (!isNoDocAvailable) {
                                  // Exclude "No Document Available" field from otherFields
                                  otherFields.push(field);
                                }
                              });

                              return (
                                <div className="space-y-4 sm:space-y-6">
                                  {/* Render Yes/No field first */}
                                  {yesNoFields.length > 0 && (
                                    <div>
                                      {yesNoFields.map((field) => {
                                        const fieldPath = `${sectionKey}.${field.id}`;
                                        const fieldValue =
                                          formData[sectionKey]?.[field.id];

                                        // Validate field on change
                                        const fieldError =
                                          getFieldError?.(fieldPath) ||
                                          (field.validationRules?.required &&
                                          !fieldValue
                                            ? `${field.label} is required.`
                                            : undefined);

                                        return (
                                          <FieldRenderer
                                            key={field.id}
                                            field={field}
                                            value={fieldValue}
                                            onChange={(value) => {
                                              handleFieldChange(
                                                fieldPath,
                                                value,
                                                field
                                              );
                                              // Real-time validation
                                              if (onValidateField) {
                                                onValidateField(
                                                  fieldPath,
                                                  value,
                                                  field
                                                );
                                              }
                                            }}
                                            mode={mode}
                                            disabled={
                                              isSectionDisabled ||
                                              (isSubmitted &&
                                                !isSectionInEditMode)
                                            }
                                            submissionId={submissionId}
                                            error={fieldError}
                                            dropdownOptions={getDropdownOptions?.(
                                              field.id,
                                              field.sectionId,
                                              field.label
                                            )}
                                            indicatorName={sectionName}
                                            onValidate={onValidateField}
                                            onClearError={onClearFieldError}
                                          />
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Render Upload File field below Yes/No when "yes" is selected */}
                                  {yesNoValue === "yes" &&
                                    fileUploadFields.length > 0 && (
                                      <div className="space-y-2">
                                        {fileUploadFields
                                          .sort(
                                            (a, b) => a.sequence - b.sequence
                                          )
                                          .map((field) => {
                                            const fieldPath = `${sectionKey}.${field.id}`;
                                            const fieldValue =
                                              formData[sectionKey]?.[field.id];

                                            return (
                                              <FieldRenderer
                                                key={field.id}
                                                field={field}
                                                value={fieldValue}
                                                onChange={(value) => {
                                                  handleFieldChange(
                                                    fieldPath,
                                                    value,
                                                    field
                                                  );
                                                  // Real-time validation
                                                  if (onValidateField) {
                                                    onValidateField(
                                                      fieldPath,
                                                      value,
                                                      field
                                                    );
                                                  }
                                                }}
                                                mode={mode}
                                                disabled={
                                                  isSectionDisabled ||
                                                  (isSubmitted &&
                                                    !isSectionInEditMode)
                                                }
                                                submissionId={submissionId}
                                                error={getFieldError?.(
                                                  fieldPath
                                                )}
                                                dropdownOptions={getDropdownOptions?.(
                                                  field.id,
                                                  field.sectionId,
                                                  field.label
                                                )}
                                                indicatorName={sectionName}
                                                onValidate={onValidateField}
                                                onClearError={onClearFieldError}
                                                formData={formData}
                                                sectionKey={sectionKey}
                                                sectionInputs={section.inputs}
                                                onFieldChange={
                                                  handleFieldChange
                                                }
                                              />
                                            );
                                          })}
                                      </div>
                                    )}

                                  {/* Render Comment field below Yes/No when "no" is selected */}
                                  {yesNoValue === "no" &&
                                    commentFields.length > 0 && (
                                      <div className="space-y-2">
                                        {commentFields
                                          .sort(
                                            (a, b) => a.sequence - b.sequence
                                          )
                                          .map((field) => {
                                            const fieldPath = `${sectionKey}.${field.id}`;
                                            const fieldValue =
                                              formData[sectionKey]?.[field.id];

                                            return (
                                              <FieldRenderer
                                                key={field.id}
                                                field={field}
                                                value={fieldValue}
                                                onChange={(value) => {
                                                  handleFieldChange(
                                                    fieldPath,
                                                    value,
                                                    field
                                                  );
                                                  // Real-time validation
                                                  if (onValidateField) {
                                                    onValidateField(
                                                      fieldPath,
                                                      value,
                                                      field
                                                    );
                                                  }
                                                }}
                                                mode={mode}
                                                disabled={
                                                  isSectionDisabled ||
                                                  (isSubmitted &&
                                                    !isSectionInEditMode)
                                                }
                                                submissionId={submissionId}
                                                error={getFieldError?.(
                                                  fieldPath
                                                )}
                                                dropdownOptions={getDropdownOptions?.(
                                                  field.id,
                                                  field.sectionId,
                                                  field.label
                                                )}
                                                indicatorName={sectionName}
                                                onValidate={onValidateField}
                                              />
                                            );
                                          })}
                                      </div>
                                    )}

                                  {/* Render all other fields in grid - only when "yes" is selected or no Yes/No field exists */}
                                  {otherFields.length > 0 &&
                                    (yesNoValue === "yes" || !yesNoField) && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                        {otherFields
                                          .sort(
                                            (a, b) => a.sequence - b.sequence
                                          )
                                          .map((field) => {
                                            const fieldPath = `${sectionKey}.${field.id}`;
                                            const fieldValue =
                                              formData[sectionKey]?.[field.id];

                                            return (
                                              <FieldRenderer
                                                key={field.id}
                                                field={field}
                                                value={fieldValue}
                                                onChange={(value) => {
                                                  handleFieldChange(
                                                    fieldPath,
                                                    value,
                                                    field
                                                  );
                                                  // Real-time validation
                                                  if (onValidateField) {
                                                    onValidateField(
                                                      fieldPath,
                                                      value,
                                                      field
                                                    );
                                                  }
                                                }}
                                                mode={mode}
                                                disabled={
                                                  isSectionDisabled ||
                                                  (isSubmitted &&
                                                    !isSectionInEditMode)
                                                }
                                                submissionId={submissionId}
                                                error={getFieldError?.(
                                                  fieldPath
                                                )}
                                                dropdownOptions={getDropdownOptions?.(
                                                  field.id,
                                                  field.sectionId,
                                                  field.label
                                                )}
                                                indicatorName={sectionName}
                                                onValidate={onValidateField}
                                              />
                                            );
                                          })}
                                      </div>
                                    )}
                                </div>
                              );
                            })()}

                          {/* Render subsections (like "Add Project") */}
                          {/* If Yes/No field exists: only show when "yes" is selected */}
                          {/* If no Yes/No field exists: always show subsections */}
                          {/* Display subsections in table format matching State Approver */}
                          {((yesNoField && yesNoValue === "yes") ||
                            !yesNoField) &&
                            section.subsection.length > 0 && (
                              <div
                                className={cn(
                                  "space-y-4 sm:space-y-6",
                                  section.inputs.length > 0 ? "mt-6" : "" // Only add top margin if there are other fields above
                                )}
                              >
                                {section.subsection.map(
                                  (subsection, subIndex) => {
                                    const subsectionName =
                                      Object.keys(subsection)[0];
                                    const subsectionData =
                                      formData[sectionKey]?.[subsectionName] ||
                                      [];

                                    return (
                                      <MinistrySubsectionForm
                                        key={`${sectionKey}-${subsectionName}-${subIndex}`}
                                        subsection={subsection}
                                        sectionKey={sectionKey}
                                        formData={subsectionData}
                                        onChange={(index, fieldId, value) =>
                                          handleSubsectionFieldChange(
                                            sectionKey,
                                            subsectionName,
                                            index,
                                            fieldId,
                                            value
                                          )
                                        }
                                        onAdd={() =>
                                          handleSubsectionAdd(
                                            sectionKey,
                                            subsectionName
                                          )
                                        }
                                        onRemove={(index) =>
                                          handleSubsectionRemove(
                                            sectionKey,
                                            subsectionName,
                                            index
                                          )
                                        }
                                        mode={mode}
                                        disabled={
                                          isSectionDisabled ||
                                          (isSubmitted && !isSectionInEditMode)
                                        }
                                        submissionId={submissionId}
                                        getFieldError={getFieldError}
                                        getDropdownOptions={getDropdownOptions}
                                        yesNoValue={yesNoValue}
                                        onValidateField={onValidateField}
                                        onClearFieldError={onClearFieldError}
                                      />
                                    );
                                  }
                                )}
                              </div>
                            )}
                        </>
                      );
                    })()}

                    {/* Submit and Save as Draft buttons at the bottom of each indicator */}
                    {(onSectionSubmit || onSaveDraft) && (
                      <div className="mt-6 flex justify-start gap-3">
                        {/* Save as Draft button */}
                        {onSaveDraft && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onSaveDraft(indicatorId)}
                            disabled={
                              isSubmitted ||
                              submittingIndicator === indicatorId ||
                              disabled
                            }
                            className="flex items-center gap-2"
                          >
                            {submittingIndicator === indicatorId ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save as Draft"
                            )}
                          </Button>
                        )}
                        {/* Submit button */}
                        {onSectionSubmit && (
                          <Button
                            type="button"
                            variant="default"
                            onClick={() =>
                              !isSubmitted && onSectionSubmit(indicatorId)
                            }
                            disabled={
                              isSubmitted ||
                              submittingIndicator === indicatorId ||
                              disabled
                            }
                            className="flex items-center gap-2"
                          >
                            {isSubmitted ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Submitted
                              </>
                            ) : submittingIndicator === indicatorId ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Submit"
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </MinistrySectionCard>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for React.memo - shallow comparison for better performance
    // Always re-render if validationErrors change
    if (
      prevProps.mode !== nextProps.mode ||
      prevProps.disabled !== nextProps.disabled ||
      prevProps.submissionId !== nextProps.submissionId ||
      prevProps.validationErrors !== nextProps.validationErrors ||
      prevProps.isIndicatorSubmitted !== nextProps.isIndicatorSubmitted ||
      prevProps.submittingIndicator !== nextProps.submittingIndicator
    ) {
      return false; // Re-render needed
    }

    // Check if indicators changed - this is critical for step navigation
    if (prevProps.indicators.length !== nextProps.indicators.length) {
      return false; // Re-render needed
    }

    // Check if indicator references changed (when switching steps, indicators array changes)
    for (let i = 0; i < prevProps.indicators.length; i++) {
      if (prevProps.indicators[i] !== nextProps.indicators[i]) {
        return false; // Re-render needed - indicator changed (e.g., step navigation)
      }
    }

    // Get section keys that are actually rendered
    const sectionKeys = new Set<string>();
    prevProps.indicators.forEach((indicator) => {
      const indicatorName = Object.keys(indicator)[0];
      const sections = indicator[indicatorName];
      sections.forEach((sectionObj) => {
        const sectionName = Object.keys(sectionObj)[0];
        const section = sectionObj[sectionName];
        sectionKeys.add(`section${section.sNo.replace(".", "_")}`);
      });
    });

    // Only check if the relevant sections changed (reference equality)
    for (const sectionKey of sectionKeys) {
      const prevSection = prevProps.formData[sectionKey];
      const nextSection = nextProps.formData[sectionKey];

      // If both are undefined/null, they're equal
      if (!prevSection && !nextSection) continue;

      // If one is undefined and the other isn't, they're different
      if (!prevSection || !nextSection) return false;

      // Reference equality check (fastest)
      // CRITICAL: If section reference changed, re-render (this handles subsection array updates)
      if (prevSection !== nextSection) {
        console.log(
          "🔄 DynamicFormBuilder: Section reference changed for",
          sectionKey
        );
        return false; // Re-render needed
      }

      // Also check if any subsection arrays within the section changed
      // This is important because subsection arrays might be nested
      if (typeof prevSection === "object" && typeof nextSection === "object") {
        const prevKeys = Object.keys(prevSection);
        const nextKeys = Object.keys(nextSection);

        // If keys differ, re-render
        if (prevKeys.length !== nextKeys.length) {
          console.log(
            "🔄 DynamicFormBuilder: Section keys changed for",
            sectionKey
          );
          return false;
        }

        // Check if any array values changed (subsection arrays)
        for (const key of prevKeys) {
          if (
            Array.isArray(prevSection[key]) ||
            Array.isArray(nextSection[key])
          ) {
            if (prevSection[key] !== nextSection[key]) {
              console.log(
                "🔄 DynamicFormBuilder: Subsection array changed for",
                sectionKey,
                key
              );
              return false; // Re-render needed
            }
          }
        }
      }
    }

    // Deep comparison for validationErrors - always check this
    const prevErrors = prevProps.validationErrors || {};
    const nextErrors = nextProps.validationErrors || {};

    // If validationErrors changed, always re-render
    if (Object.keys(prevErrors).length !== Object.keys(nextErrors).length) {
      return false; // Re-render needed
    }

    for (const key in prevErrors) {
      if (prevErrors[key] !== nextErrors[key]) {
        return false; // Re-render needed
      }
    }

    for (const key in nextErrors) {
      if (!(key in prevErrors)) {
        return false; // Re-render needed
      }
    }

    return true; // No re-render needed
  }
);
