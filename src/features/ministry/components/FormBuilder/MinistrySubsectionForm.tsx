import React, { useMemo, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X, File as FileIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MinistryFileUploadSection } from "@/features/ministry/components/FileUpload/MinistryFileUploadSection";
import { Dropdown } from "@/utils/getDropDowns";
import { cn } from "@/lib/utils";
import { validateField } from "@/features/ministry/utils/validation";
import { capitalizeInitials } from "@/features/ministry/utils/textUtils";
import { MinistryFileTable } from "@/features/ministry/components/FileTable/MinistryFileTable";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { formatYearAsFinancialYear, getCurrentFinancialYear, formatTrainingPeriodForDisplay } from "@/utils/dateUtils";
import type { SubsectionRendererProps } from "./types";

interface MinistrySubsectionFormProps extends SubsectionRendererProps {}

export const MinistrySubsectionForm: React.FC<MinistrySubsectionFormProps> =
  React.memo(
    ({
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
      onPendingDeletion,
      isSectionInEditMode = false,
    }) => {
      const subsectionName = Object.keys(subsection)[0];
      const subsectionData = subsection[subsectionName];

      // Ref to track when "No document available" is confirmed (to skip validation temporarily)
      const skipFileValidationRef = useRef<Record<string, boolean>>({});

      // Check if fields are editable - allow editing if mode is 'edit' OR if disabled is false (for section-specific editing in review mode)
      const isEditable = mode === "edit" || !disabled;

      const items = useMemo(() => {
        const arrayData = Array.isArray(formData) ? formData : [];
        console.log(
          `📋 MinistrySubsectionForm [${sectionKey}.${subsectionName}]: Received ${arrayData.length} items in ${mode} mode:`,
          arrayData
        );
        return arrayData;
      }, [formData, sectionKey, subsectionName, mode]);

      // When in edit mode and the subsection has no rows, add one row by default
      const defaultRowAddedRef = useRef(false);
      useEffect(() => {
        if (items.length > 0) {
          defaultRowAddedRef.current = false;
          return;
        }
        if (isEditable && !defaultRowAddedRef.current) {
          defaultRowAddedRef.current = true;
          onAdd();
        }
      }, [items.length, isEditable, onAdd]);

      // Normalize Yes/No value
      const normalizedYesNoValue = useMemo(() => {
        if (!yesNoValue) return null;
        const str = String(yesNoValue).toLowerCase().trim();
        if (str === "yes" || str === "y") return "yes";
        if (str === "no" || str === "n") return "no";
        return null;
      }, [yesNoValue]);

      const handleAdd = useCallback(() => {
        onAdd();
      }, [onAdd]);

      const handleRemove = useCallback(
        (index: number) => {
          onRemove(index);
        },
        [onRemove]
      );

      // Helper to check if a field is Yes/No
      const isYesNoField = useCallback((field: any) => {
        return (
          field.label?.toLowerCase().includes("yes/no") ||
          field.label === "Yes/No" ||
          field.uiComponent === "Checkbox"
        );
      }, []);

      // Helper to check if a field is Comment/Text Area
      const isCommentField = useCallback((field: any) => {
        return (
          field.label?.toLowerCase().includes("comment") ||
          field.label?.toLowerCase().includes("objective") ||
          field.label?.toLowerCase().includes("description") ||
          field.uiComponent === "Text Area" ||
          field.uiComponent === "TextArea"
        );
      }, []);

      // Helper to check if a field is "No Document Available" - should be excluded from rendering
      // as it's handled by MinistryFileUploadSection component
      const isNoDocumentAvailableField = useCallback((field: any) => {
        return (
          field.label?.toLowerCase().includes("no document available") ||
          field.label?.toLowerCase() === "no document available"
        );
      }, []);

      // Helper to check if a field is a Year field (show as FY and disabled at Ministry)
      const isYearField = useCallback((field: any) => {
        return (
          field.label?.toLowerCase().includes("year") ||
          field.label?.toLowerCase() === "fy" ||
          field.uiComponent === "Year"
        );
      }, []);

      // Default empty year fields to current financial year (year fields are disabled)
      useEffect(() => {
        const inputs = subsectionData.inputs || [];
        const yearFields = inputs.filter((f: any) => isYearField(f));
        if (yearFields.length === 0) return;
        items.forEach((item: any, index: number) => {
          yearFields.forEach((field: any) => {
            const val = item?.[field.id];
            const isEmpty =
              val === null ||
              val === undefined ||
              val === "" ||
              (typeof val === "string" && val.trim() === "");
            if (isEmpty) {
              onChange(index, field.id, getCurrentFinancialYear());
            }
          });
        });
      }, [items, subsectionData.inputs, onChange, isYearField]);

      // Sort and filter fields by sequence and Yes/No value
      // In review mode, always show all fields regardless of Yes/No value
      // Exclude "No Document Available" field as it's handled by MinistryFileUploadSection
      const sortedFields = useMemo(() => {
        const allFields = [...(subsectionData.inputs || [])]
          .filter((field) => !isNoDocumentAvailableField(field)) // Exclude "No Document Available" field
          .sort((a, b) => a.sequence - b.sequence);

        // In review mode, always show all fields (except "No Document Available")
        if (mode === "review") {
          return allFields;
        }

        // If Yes/No value is "no", only show comment fields (edit mode only)
        if (normalizedYesNoValue === "no") {
          return allFields.filter((field) => isCommentField(field));
        }

        // If Yes/No value is "yes", show all fields except comment fields (edit mode only)
        if (normalizedYesNoValue === "yes") {
          return allFields.filter((field) => !isCommentField(field));
        }

        // If no Yes/No value, show all fields
        return allFields;
      }, [
        subsectionData.inputs,
        normalizedYesNoValue,
        isCommentField,
        isNoDocumentAvailableField,
        mode,
      ]);

      // Helper to normalize Yes/No values
      const normalizeYesNoValue = useCallback((val: any): string => {
        if (!val) return "";
        const str = String(val).toLowerCase().trim();
        if (str === "yes" || str === "y") return "yes";
        if (str === "no" || str === "n") return "no";
        return str;
      }, []);

      // Render field based on type
      const renderField = useCallback(
        (field: any, item: any, index: number) => {
          const fieldPath = `${sectionKey}.${subsectionName}[${index}].${field.id}`;
          const fieldValue = item[field.id];
          const error = getFieldError?.(fieldPath);
          // All fields are mandatory - always show asterisk
          const isRequired = true;

          if (isYesNoField(field)) {
            const normalizedValue = normalizeYesNoValue(fieldValue);
            // Ensure value is either "yes", "no", or undefined (not empty string) for RadioGroup
            const radioValue =
              normalizedValue === "" ? undefined : normalizedValue;
            return (
              <div className="space-y-2">
                <Label>
                  {field.label
                    .replace(/\s*\(?\s*Yes\/No\s*\)?\s*/gi, "")
                    .trim()}
                  {isRequired && <span className="text-destructive">*</span>}
                </Label>
                {!isEditable ? (
                  // In review mode (and disabled), show as colored badge matching state review component
                  <div className="flex items-center space-x-2">
                    {normalizedValue ? (
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          normalizedValue === "yes"
                            ? "bg-green-100 text-green-800"
                            : normalizedValue === "no"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {normalizedValue === "yes"
                          ? "Yes"
                          : normalizedValue === "no"
                          ? "No"
                          : ""}
                      </span>
                    ) : (
                      <span></span>
                    )}
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
                      <RadioGroupItem
                        value="yes"
                        id={`${field.id}-${index}-yes`}
                        disabled={disabled}
                      />
                      <Label
                        htmlFor={`${field.id}-${index}-yes`}
                        className="cursor-pointer font-normal"
                      >
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="no"
                        id={`${field.id}-${index}-no`}
                        disabled={disabled}
                      />
                      <Label
                        htmlFor={`${field.id}-${index}-no`}
                        className="cursor-pointer font-normal"
                      >
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
                  {field.label}{" "}
                  {isRequired && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  value={fieldValue || ""}
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
                  className={error ? "border-destructive" : ""}
                  placeholder="Please provide a comment..."
                />
                {error && (
                  <p className="text-sm text-destructive mt-1">{error}</p>
                )}
              </div>
            );
          }

          // Fields that should be text inputs even if marked as Dropdown in backend
          const textFieldExclusions = [
            "type of mechanism",
            "financing mechanism name",
            "intended benefit",
          ];
          const shouldExcludeFromDropdown = textFieldExclusions.some(
            (exclusion) => field.label?.toLowerCase().includes(exclusion)
          );

          // Check if this is a dropdown field - ONLY if explicitly marked as Dropdown in UI Component
          // We ONLY check uiComponent and dataType - NOT validationRules.options or getDropdownOptions result
          // because those might exist for text fields that shouldn't be dropdowns
          // Also exclude specific fields that should be text inputs
          const isDropdownField =
            !shouldExcludeFromDropdown &&
            (field.dataType === "dropdown" ||
              field.uiComponent === "Dropdown" ||
              field.uiComponent === "dropdown");

          // Render dropdown fields first, before the switch statement
          if (isDropdownField) {
            const options =
              getDropdownOptions?.(field.id, field.sectionId, field.label) ||
              field.validationRules?.options?.map((opt: string) => ({
                value: opt,
                label: opt,
              })) ||
              [];

            if (options.length === 0) {
              console.warn(
                `⚠️ Dropdown field "${field.label}" (${field.id}) in subsection has no options. Field type: ${field.dataType}, UI Component: ${field.uiComponent}`
              );
            }

            return (
              <div className="space-y-2" data-field-path={fieldPath}>
                <Label>
                  {field.label}{" "}
                  {isRequired && <span className="text-destructive">*</span>}
                </Label>
                <Dropdown
                  options={options}
                  value={fieldValue || ""}
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
                {error && (
                  <p className="text-sm text-destructive mt-1">{error}</p>
                )}
              </div>
            );
          }

          switch (field.dataType) {
            case "string":
              if (isYearField(field)) {
                return (
                  <div className="space-y-2" data-field-path={fieldPath}>
                    <Label>
                      {field.label}{" "}
                      {isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      value={formatYearAsFinancialYear(fieldValue)}
                      disabled={true}
                      readOnly={true}
                      className={cn(
                        "bg-muted cursor-not-allowed",
                        error ? "border-destructive" : ""
                      )}
                      placeholder={`${getCurrentFinancialYear()}`}
                    />
                    {error && (
                      <p className="text-sm text-destructive mt-1">{error}</p>
                    )}
                  </div>
                );
              }
              return (
                <div className="space-y-2" data-field-path={fieldPath}>
                  <Label>
                    {field.label}{" "}
                    {isRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    value={fieldValue || ""}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      onChange(index, field.id, newValue);

                      // Always validate on change - this will clear errors if field is valid
                      if (onValidateField && field) {
                        onValidateField(fieldPath, newValue, field);
                      }
                    }}
                    onBlur={() => {
                      // Capitalize first letter of every entry (title case) for consistency
                      if (fieldValue && typeof fieldValue === "string" && fieldValue.trim()) {
                        const formatted = capitalizeInitials(fieldValue);
                        if (formatted !== fieldValue) {
                          onChange(index, field.id, formatted);
                          if (onValidateField && field) {
                            onValidateField(fieldPath, formatted, field);
                          }
                          return;
                        }
                      }
                      // Validate on blur as well
                      if (onValidateField && field && fieldValue) {
                        onValidateField(fieldPath, fieldValue, field);
                      }
                    }}
                    disabled={disabled}
                    className={error ? "border-destructive" : ""}
                    placeholder={`Enter ${
                      field.label?.toLowerCase() || "value"
                    }`}
                  />
                  {error && (
                    <p className="text-sm text-destructive mt-1">{error}</p>
                  )}
                </div>
              );

            case "number":
              if (isYearField(field)) {
                return (
                  <div className="space-y-2" data-field-path={fieldPath}>
                    <Label>
                      {field.label}{" "}
                      {isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      type="text"
                      value={formatYearAsFinancialYear(fieldValue)}
                      disabled={true}
                      readOnly={true}
                      className={cn(
                        "bg-muted cursor-not-allowed",
                        error ? "border-destructive" : ""
                      )}
                      placeholder={`${getCurrentFinancialYear()}`}
                    />
                    {error && (
                      <p className="text-sm text-destructive mt-1">{error}</p>
                    )}
                  </div>
                );
              }
              return (
                <div className="space-y-2" data-field-path={fieldPath}>
                  <Label>
                    {field.label}{" "}
                    {isRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type="number"
                    value={fieldValue || ""}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      // Only allow numbers
                      if (newValue === "" || /^-?\d*\.?\d*$/.test(newValue)) {
                        onChange(
                          index,
                          field.id,
                          newValue ? Number(newValue) : ""
                        );

                        // Always validate on change - this will clear errors if field is valid
                        if (onValidateField && field) {
                          onValidateField(
                            fieldPath,
                            newValue ? Number(newValue) : "",
                            field
                          );
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
                    className={error ? "border-destructive" : ""}
                    placeholder={`Enter ${
                      field.label?.toLowerCase() || "number"
                    }`}
                  />
                  {error && (
                    <p className="text-sm text-destructive mt-1">{error}</p>
                  )}
                </div>
              );

            case "date": {
              // Check if this is a MM/YY format field (Training Period)
              const isMMYYFormat =
                field.label?.toLowerCase().includes("training period") ||
                field.label?.toLowerCase().includes("mm/yy") ||
                (field.uiComponent === "Input (Text)" &&
                  field.dataType === "date");

              // Helper to convert date value to format needed by input
              const formatDateForInput = (dateValue: any): string => {
                if (!dateValue) return "";
                if (typeof dateValue === "string") {
                  // If it's already in YYYY-MM-DD format, return as is
                  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                    return dateValue;
                  }
                  // If it's in ISO format, extract YYYY-MM-DD
                  if (dateValue.includes("T")) {
                    return dateValue.split("T")[0];
                  }
                  // Try to parse and format
                  try {
                    const date = new Date(dateValue);
                    if (!isNaN(date.getTime())) {
                      return date.toISOString().split("T")[0];
                    }
                  } catch (e) {
                    // If parsing fails, return empty
                  }
                }
                return "";
              };

              // Helper to format date for display in review mode
              const formatDateForDisplay = (dateValue: any): string => {
                if (!dateValue) return "";
                if (typeof dateValue === "string") {
                  // If it's in YYYY-MM-DD format, format it nicely
                  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                    const [year, month, day] = dateValue.split("-");
                    return `${day}/${month}/${year}`;
                  }
                  // If it's in ISO format, extract and format
                  if (dateValue.includes("T")) {
                    const datePart = dateValue.split("T")[0];
                    const [year, month, day] = datePart.split("-");
                    return `${day}/${month}/${year}`;
                  }
                  return dateValue;
                }
                return String(dateValue);
              };

              return (
                <div className="space-y-2" data-field-path={fieldPath}>
                  <Label>
                    {field.label}{" "}
                    {isRequired && <span className="text-destructive">*</span>}
                  </Label>
                  {isEditable ? (
                    isMMYYFormat ? (
                      // MM/YY format - use MonthYearPicker dropdown
                      <MonthYearPicker
                        value={fieldValue || ""}
                        onChange={(newValue) => {
                          onChange(index, field.id, newValue);
                          // Always validate on change
                          if (onValidateField && field) {
                            onValidateField(fieldPath, newValue, field);
                          }
                        }}
                        disabled={disabled}
                        placeholder="Select month/year"
                        className={error ? "border-destructive" : ""}
                      />
                    ) : (
                      // Standard date format - use date input
                      <Input
                        type="date"
                        value={formatDateForInput(fieldValue)}
                        max={new Date().toISOString().split('T')[0]} // Disable future dates
                        onChange={(e) => {
                          const newValue = e.target.value;
                          onChange(index, field.id, newValue);
                          // Always validate on change
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
                        className={error ? "border-destructive" : ""}
                        placeholder="Select date"
                      />
                    )
                  ) : (
                    <Input
                      type="text"
                      value={
                        isMMYYFormat
                          ? formatTrainingPeriodForDisplay(fieldValue)
                          : formatDateForDisplay(fieldValue)
                      }
                      readOnly={true}
                      className="cursor-not-allowed"
                      placeholder={fieldValue ? undefined : ""}
                    />
                  )}
                  {error && (
                    <p className="text-sm text-destructive mt-1">{error}</p>
                  )}
                </div>
              );
            }

            case "file": { // Find "No document available" field in the subsection inputs
              const noDocAvailableField = subsectionData.inputs?.find(
                (f: any) =>
                  (f.label?.toLowerCase().includes("no document available") ||
                    f.label?.toLowerCase() === "no document available") &&
                  f.id !== field.id
              );
              const noDocAvailableValue =
                noDocAvailableField && item
                  ? item[noDocAvailableField.id]
                  : undefined;

              // Get primaryId specifically for this file field from multiple sources:
              // Priority order:
              // 1. From the file value itself (stored as _primaryId during transformation) - most reliable
              let fileFieldPrimaryId: string | undefined = undefined;
              if (fieldValue && typeof fieldValue === "object") {
                fileFieldPrimaryId = (fieldValue as any)._primaryId;
                // Also check nested valueJson structure
                if (!fileFieldPrimaryId && (fieldValue as any).valueJson) {
                  fileFieldPrimaryId =
                    (fieldValue as any).valueJson._primaryId ||
                    (fieldValue as any).valueJson.primaryId;
                }
              }

              // 2. From fieldPrimaryIds map using field.id (should match inputId from backend)
              const fieldPrimaryIds = item?._fieldPrimaryIds as
                | Record<string, string>
                | undefined;

              if (!fileFieldPrimaryId && fieldPrimaryIds) {
                // Try exact match first
                fileFieldPrimaryId = fieldPrimaryIds[field.id];

                // 3. If still not found, try fuzzy matching on fieldPrimaryIds keys
                if (
                  !fileFieldPrimaryId &&
                  Object.keys(fieldPrimaryIds).length > 0
                ) {
                  const primaryIdKeys = Object.keys(fieldPrimaryIds);

                  // Try case-insensitive match
                  const caseInsensitiveMatch = primaryIdKeys.find(
                    (key) => key.toLowerCase() === field.id.toLowerCase()
                  );
                  if (caseInsensitiveMatch) {
                    fileFieldPrimaryId = fieldPrimaryIds[caseInsensitiveMatch];
                  } else {
                    // Try to find by matching file value - if this field's value matches an item's value,
                    // use that item's primaryId
                    // This is a fallback for when field.id doesn't match the stored key
                    const primaryIdValues = Object.values(fieldPrimaryIds);
                    if (
                      primaryIdValues.length === 1 &&
                      field.dataType === "file"
                    ) {
                      // If only one primaryId exists and this is a file field, use it
                      fileFieldPrimaryId = primaryIdValues[0];
                    } else {
                      // Try to find the primaryId by checking all fields in the item
                      // and matching the file value
                      for (const [key, primaryIdValue] of Object.entries(
                        fieldPrimaryIds
                      )) {
                        // If the item has a value at this key that matches our fieldValue, use its primaryId
                        if (item[key] === fieldValue) {
                          fileFieldPrimaryId = primaryIdValue;
                          break;
                        }
                      }
                    }
                  }
                }
              }

              console.log(
                `[MinistrySubsectionForm] File field ${field.id} at index ${index}:`,
                {
                  fileFieldPrimaryId,
                  fieldPrimaryIds,
                  fieldId: field.id,
                  fieldPrimaryIdsKeys: fieldPrimaryIds
                    ? Object.keys(fieldPrimaryIds)
                    : [],
                  item: item,
                  fieldValue: fieldValue,
                  hasFieldPrimaryIds: !!item?._fieldPrimaryIds,
                  fileValueHasPrimaryId:
                    fieldValue && typeof fieldValue === "object"
                      ? !!(fieldValue as any)._primaryId
                      : false,
                }
              );

              return (
                <div className="space-y-2" data-field-path={fieldPath}>
                  <MinistryFileUploadSection
                    label={field.label}
                    value={fieldValue || null}
                    onChange={(value) => {
                      // Only trigger validation if "No document available" is not checked AND we're not skipping validation
                      const shouldValidate =
                        !skipFileValidationRef.current[fieldPath] &&
                        noDocAvailableValue !== "No document available";

                      // When clearing file (value === null), preserve "No document available" value
                      // Check both the prop and the item directly since prop might be stale
                      const currentNoDocValue =
                        item?.[noDocAvailableField?.id || ""];
                      const shouldPreserveNoDoc =
                        value === null &&
                        noDocAvailableField &&
                        (noDocAvailableValue === "No document available" ||
                          currentNoDocValue === "No document available");

                      onChange(index, field.id, value);

                      // After clearing file, re-set "No document available" if it was previously set
                      // This ensures the value is preserved even if the formData update resets the item
                      if (shouldPreserveNoDoc && noDocAvailableField) {
                        setTimeout(() => {
                          onChange(
                            index,
                            noDocAvailableField.id,
                            "No document available"
                          );
                        }, 150);
                      }

                      // Skip validation if "No document available" is checked (file is not required)
                      if (shouldValidate && onValidateField && field) {
                        onValidateField(fieldPath, value, field);
                      } else if (onClearFieldError) {
                        // Clear error if "No document available" is checked
                        onClearFieldError(fieldPath);
                      }

                      // Reset the skip flag after a short delay
                      if (skipFileValidationRef.current[fieldPath]) {
                        setTimeout(() => {
                          skipFileValidationRef.current[fieldPath] = false;
                        }, 200);
                      }
                    }}
                    required={isRequired}
                    submissionId={submissionId}
                    disabled={disabled}
                    className={error ? "border-destructive" : ""}
                    noDocumentAvailableValue={noDocAvailableValue}
                    onNoDocumentAvailableChange={(newValue) => {
                      if (noDocAvailableField) {
                        // Set flag to skip validation when clearing file
                        if (newValue === "No document available") {
                          skipFileValidationRef.current[fieldPath] = true;
                        }

                        onChange(index, noDocAvailableField.id, newValue);

                        // Validate the "No document available" field
                        const noDocAvailableFieldPath = `${sectionKey}.${subsectionName}[${index}].${noDocAvailableField.id}`;
                        if (onValidateField && noDocAvailableField) {
                          onValidateField(
                            noDocAvailableFieldPath,
                            newValue,
                            noDocAvailableField
                          );
                        }

                        // Clear the file upload field error if "No document available" is confirmed
                        if (
                          newValue === "No document available" &&
                          onClearFieldError
                        ) {
                          onClearFieldError(fieldPath);
                        }
                      }
                    }}
                    noDocumentAvailableFieldId={noDocAvailableField?.id}
                    primaryId={fileFieldPrimaryId}
                    isEditMode={mode === "edit" || isSectionInEditMode}
                    onPendingDeletion={onPendingDeletion}
                  />
                  {error && (
                    <p className="text-sm text-destructive mt-1">{error}</p>
                  )}
                </div>
              );
            }

            default:
              return null;
          }
        },
        [
          sectionKey,
          subsectionName,
          onChange,
          disabled,
          submissionId,
          getFieldError,
          getDropdownOptions,
          isYesNoField,
          isCommentField,
          normalizeYesNoValue,
          onValidateField,
          onClearFieldError,
        ]
      );

      return (
        <div className="space-y-6">
          {/* Form fields for each item - in a grid layout (3 columns) - Only show when editable */}
          {isEditable &&
            items.map((item, index) => (
              <div key={item.id || `item-${index}`} className="mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                  {sortedFields.map((field, fieldIndex) => (
                    <div
                      key={field.id}
                      className={cn(
                        "flex items-end",
                        // If this is the last field, add the delete button next to it
                        fieldIndex === sortedFields.length - 1 && isEditable
                          ? "gap-2"
                          : ""
                      )}
                    >
                      <div className="flex-1">
                        {renderField(field, item, index)}
                      </div>
                      {/* Delete button next to the last field */}
                      {fieldIndex === sortedFields.length - 1 && isEditable && (
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

          {/* Add button - Show when in edit mode; disabled when indicator is submitted */}
          {(mode === "edit" || isEditable) && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={disabled}
                className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add {subsectionName}
              </Button>
            </div>
          )}

          {/* Table view for filled values - Show in both edit and review mode */}
          {items.length > 0 && (
            <div
              className={cn(
                "overflow-x-auto rounded-xl border border-gray-200",
                isEditable ? "mt-6" : ""
              )}
            >
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#DDE3F9]">
                    {sortedFields.map((field, fieldIndex) => (
                      <th
                        key={field.id}
                        className={`py-3 px-4 text-left text-sm font-normal ${
                          fieldIndex === 0 ? "rounded-tl-xl" : ""
                        }`}
                      >
                        {field.label}
                        <span className="text-destructive ml-1">*</span>
                      </th>
                    ))}
                    {isEditable && (
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
                        const isFileField = field.dataType === "file";
                        const isYesNo = isYesNoField(field);

                        // Find "No document available" field for this file field
                        const noDocAvailableField = subsectionData.inputs?.find(
                          (f: any) =>
                            (f.label
                              ?.toLowerCase()
                              .includes("no document available") ||
                              f.label?.toLowerCase() ===
                                "no document available") &&
                            f.id !== field.id
                        );
                        const noDocAvailableValue =
                          noDocAvailableField && item
                            ? item[noDocAvailableField.id]
                            : undefined;

                        return (
                          <td
                            key={field.id}
                            className="py-3 px-4 text-sm align-top"
                          >
                            {isFileField ? (
                              // Show files in table format when not editable, simple display when editable
                              !isEditable ? (
                                noDocAvailableValue ===
                                "No document available" ? (
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
                                ) : fieldValue ? (
                                  <MinistryFileTable
                                    files={fieldValue}
                                    fileKeyPrefix={`${sectionKey}-${subsectionName}-${index}-${field.id}`}
                                  />
                                ) : (
                                  <div className="text-sm text-muted-foreground py-2">
                                    No files uploaded
                                  </div>
                                )
                              ) : fieldValue ? (
                                <div className="flex items-center gap-2">
                                  <FileIcon className="w-4 h-4 text-blue-600" />
                                  <span className="text-blue-600 truncate max-w-[200px]">
                                    {fieldValue?.fileName || "File"}
                                  </span>
                                </div>
                              ) : null
                            ) : isYesNo ? (
                              // Show Yes/No as colored badges when not editable
                              !isEditable ? (
                                fieldValue ? (
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm ${
                                      fieldValue === "yes"
                                        ? "bg-green-100 text-green-800"
                                        : fieldValue === "no"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {fieldValue === "yes"
                                      ? "Yes"
                                      : fieldValue === "no"
                                      ? "No"
                                      : ""}
                                  </span>
                                ) : (
                                  <span></span>
                                )
                              ) : (
                                <span className="capitalize">
                                  {fieldValue === "yes"
                                    ? "Yes"
                                    : fieldValue === "no"
                                    ? "No"
                                    : ""}
                                </span>
                              )
                            ) : (
                              <span
                                className={
                                  fieldValue ? "" : "text-muted-foreground"
                                }
                              >
                                {isYearField(field)
                                  ? formatYearAsFinancialYear(fieldValue)
                                  : (fieldValue || "")}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {isEditable && (
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
    },
    (prevProps, nextProps) => {
      // Always re-render if getFieldError changes (it contains validationErrors)
      // This ensures errors appear immediately when validationErrors state changes
      if (prevProps.getFieldError !== nextProps.getFieldError) {
        return false; // Re-render needed
      }

      const prevArray = Array.isArray(prevProps.formData)
        ? prevProps.formData
        : [];
      const nextArray = Array.isArray(nextProps.formData)
        ? nextProps.formData
        : [];

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
    }
  );
