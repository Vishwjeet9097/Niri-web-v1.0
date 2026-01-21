import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { MinistryFileUploadSection } from "@/features/ministry/components/FileUpload/MinistryFileUploadSection";
import { Dropdown } from "@/utils/getDropDowns";
import { cn } from "@/lib/utils";
import { validateField } from "@/features/ministry/utils/validation";
import { MinistryFileTable } from "@/features/ministry/components/FileTable/MinistryFileTable";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import type { FileUpload } from "@/features/submission/types";
import type { FieldRendererProps } from "./types";

export const FieldRenderer: React.FC<FieldRendererProps> = React.memo(
  ({
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
    formData,
    sectionKey,
    sectionInputs,
    onFieldChange,
    submissionIndicatorId,
    onPendingDeletion,
    isEditMode: isSectionEditMode,
  }) => {
    // All fields are mandatory - always show asterisk
    const isRequired = true;

    // Ref to track when "No document available" is confirmed (to skip validation temporarily)
    const skipFileValidationRef = useRef<Record<string, boolean>>({});

    // In review mode, show disabled inputs instead of plain text for better visibility
    // But if disabled=false, allow editing even in review mode (for section-specific editing)
    const isReviewMode = mode === "review";
    const isEditable = mode === "edit" || !disabled;

    // Debug logging
    console.log(`[FieldRenderer] Field ${field.id} (${field.label}):`, {
      mode,
      disabled,
      isEditable,
      value: value || "(empty)",
    });

    // Check if this is a Yes/No field (label contains "Yes/No" or is exactly "Yes/No")
    const isYesNoField =
      field.label.toLowerCase().includes("yes/no") || field.label === "Yes/No";

    // Remove "Yes/No" from the label for display
    const getDisplayLabel = (label: string): string => {
      if (isYesNoField) {
        // Remove "Yes/No" and any surrounding spaces/punctuation
        return label.replace(/\s*\(?\s*Yes\/No\s*\)?\s*/gi, "").trim();
      }
      return label;
    };

    // Normalize value for Yes/No fields: convert "Yes"/"No" to "yes"/"no" internally
    const normalizeYesNoValue = (val: any): string => {
      if (!val) return "";
      const str = String(val).toLowerCase().trim();
      if (str === "yes" || str === "y") return "yes";
      if (str === "no" || str === "n") return "no";
      return str; // Return as-is if already normalized
    };

    // Denormalize for display: convert "yes"/"no" to "Yes"/"No" for display
    const denormalizeYesNoValue = (val: any): string => {
      if (!val) return "";
      const str = String(val).toLowerCase().trim();
      if (str === "yes") return "Yes";
      if (str === "no") return "No";
      return String(val); // Return as-is if not yes/no
    };

    // Check if this is a calculated/auto-calculated field
    const isCalculatedField =
      field.uiComponent === "Auto-calculated field" ||
      field.uiComponent === "Calculated" ||
      field.validationRules?.type === "calculated" ||
      field.label?.toLowerCase().includes("auto-calculated") ||
      field.label?.toLowerCase().includes("% capex utilization");

    // Check if this is a calculation input field (must be > 0)
    const isCalculationInputField =
      field.label?.toLowerCase().includes("capital expenditure allocation") ||
      field.label?.toLowerCase().includes("capital expenditure actuals");

    // Render Yes/No fields as radio buttons FIRST (before dropdown check)
    // Yes/No fields are stored as one field in backend but displayed as radio buttons in UI
    if (isYesNoField) {
      const normalizedValue = normalizeYesNoValue(value);
      // Ensure value is either "yes", "no", or undefined (not empty string) for RadioGroup
      const radioValue = normalizedValue === "" ? undefined : normalizedValue;
      const fieldPath = `${field.sectionId}.${field.id}`;
      // Format label: "{indicatorName}?"
      const displayLabel = indicatorName
        ? `${indicatorName}?`
        : `${getDisplayLabel(field.label)}?`;

      return (
        <div className="space-y-2" data-field-path={fieldPath}>
          <Label>
            {displayLabel}{" "}
            {isRequired && <span className="text-destructive">*</span>}
          </Label>
          {!isEditable ? (
            // In review mode (and disabled), show as colored badge matching state review component
            <div className="flex items-center space-x-2">
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
                  : "N/A"}
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
                <RadioGroupItem
                  value="yes"
                  id={`${field.id}-yes`}
                  disabled={disabled}
                />
                <Label
                  htmlFor={`${field.id}-yes`}
                  className="cursor-pointer font-normal"
                >
                  Yes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="no"
                  id={`${field.id}-no`}
                  disabled={disabled}
                />
                <Label
                  htmlFor={`${field.id}-no`}
                  className="cursor-pointer font-normal"
                >
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
      "type of mechanism",
      "financing mechanism name",
      "intended benefit",
    ];
    const shouldExcludeFromDropdown = textFieldExclusions.some((exclusion) =>
      field.label?.toLowerCase().includes(exclusion)
    );

    // Check if this is a dropdown field - ONLY if explicitly marked as Dropdown in UI Component
    // Note: Yes/No fields are handled above, so they won't be treated as dropdowns
    // We ONLY check uiComponent and dataType - NOT validationRules.options or getDropdownOptions result
    // because those might exist for text fields that shouldn't be dropdowns
    // Also exclude specific fields that should be text inputs
    const isDropdownField =
      !shouldExcludeFromDropdown &&
      (field.dataType === "dropdown" ||
        field.uiComponent === "Dropdown" ||
        field.uiComponent === "dropdown");

    // Render dropdown fields before the switch statement
    if (isDropdownField) {
      const dropdownFieldPath = `${field.sectionId}.${field.id}`;
      const options =
        dropdownOptions ||
        field.validationRules?.options?.map((opt) => ({
          value: opt,
          label: opt,
        })) ||
        [];

      // Debug log to help identify dropdown issues
      if (options.length === 0) {
        console.warn(
          `⚠️ Dropdown field "${field.label}" (${field.id}) has no options. Field type: ${field.dataType}, UI Component: ${field.uiComponent}, Label: ${field.label}`
        );
      }

      return (
        <div className="space-y-2" data-field-path={dropdownFieldPath}>
          <Label>
            {field.label}{" "}
            {isRequired && <span className="text-destructive">*</span>}
          </Label>
          {isEditable ? (
            <Dropdown
              options={options}
              value={value || ""}
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
              value={value || ""}
              readOnly={true}
              className={cn("cursor-not-allowed", className)}
              placeholder={value ? undefined : "N/A"}
            />
          )}
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
      );
    }

    switch (field.dataType) {
      case "string":
        // Yes/No fields are already handled above, so we skip them here

        // Check if this is a Comment field (TextArea)
        const isCommentField =
          field.label?.toLowerCase().includes("comment") ||
          field.uiComponent === "Text Area" ||
          field.uiComponent === "TextArea";

        // Check if this is a Year field (should only accept numeric values)
        const isYearField =
          field.label?.toLowerCase().includes("year") ||
          field.label?.toLowerCase() === "fy" ||
          field.uiComponent === "Year";

        // Regular string input or TextArea for comments
        const fieldPath = `${field.sectionId}.${field.id}`;
        return (
          <div className="space-y-2" data-field-path={fieldPath}>
            <Label>
              {field.label}{" "}
              {isRequired && <span className="text-destructive">*</span>}
            </Label>
            {isEditable ? (
              isCommentField ? (
                <Textarea
                  value={value || ""}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={disabled}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-[#C6C6C6] bg-[#fff] px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    "resize-none overflow-hidden",
                    error ? "border-destructive" : "",
                    className
                  )}
                  placeholder="Please provide a comment..."
                  rows={1}
                />
              ) : isYearField ? (
                <Input
                  type="text"
                  inputMode="numeric"
                  value={value || ""}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Only allow numeric characters (digits only, no decimals, no negative)
                    if (newValue === "" || /^\d+$/.test(newValue)) {
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
                  className={error ? "border-destructive" : className}
                  placeholder="Enter year (e.g., 2024)"
                  maxLength={4}
                />
              ) : (
                <Input
                  value={value || ""}
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
                  className={error ? "border-destructive" : className}
                  placeholder={`Enter ${field.label?.toLowerCase() || "value"}`}
                />
              )
            ) : isCommentField ? (
              <Textarea
                value={value || ""}
                readOnly={true}
                className={cn(
                  "cursor-not-allowed resize-none overflow-hidden",
                  className
                )}
                placeholder={value ? undefined : "N/A"}
                rows={1}
              />
            ) : (
              <Input
                type={isYearField ? "text" : undefined}
                value={value || ""}
                readOnly={true}
                className={cn("cursor-not-allowed", className)}
                placeholder={value ? undefined : "N/A"}
              />
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      case "number":
        const numberFieldPath = `${field.sectionId}.${field.id}`;
        return (
          <div className="space-y-2" data-field-path={numberFieldPath}>
            <Label>
              {field.label}{" "}
              {isRequired && <span className="text-destructive">*</span>}
            </Label>
            {isEditable ? (
              <Input
                type="number"
                value={value || ""}
                min={isCalculationInputField ? "0.01" : undefined}
                step="0.01"
                onChange={(e) => {
                  // Don't allow changes to calculated fields
                  if (isCalculatedField) return;

                  const newValue = e.target.value;
                  // Only allow numbers (prevent negative for calculation fields)
                  if (isCalculationInputField) {
                    // For calculation fields, don't allow negative values
                    if (newValue === "" || /^\d*\.?\d*$/.test(newValue)) {
                      onChange(newValue ? Number(newValue) : "");

                      // Always validate on change - this will clear errors if field is valid
                      if (onValidate && field) {
                        onValidate(
                          numberFieldPath,
                          newValue ? Number(newValue) : "",
                          field
                        );
                      }
                    }
                  } else {
                    // For other number fields, allow negative
                    if (newValue === "" || /^-?\d*\.?\d*$/.test(newValue)) {
                      onChange(newValue ? Number(newValue) : "");

                      // Always validate on change - this will clear errors if field is valid
                      if (onValidate && field) {
                        onValidate(
                          numberFieldPath,
                          newValue ? Number(newValue) : "",
                          field
                        );
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
                placeholder={
                  isCalculatedField
                    ? "Auto-Calculated"
                    : `Enter ${field.label?.toLowerCase() || "number"}`
                }
                className={cn(
                  error ? "border-destructive" : "",
                  isCalculatedField
                    ? "cursor-default opacity-100 pointer-events-none"
                    : "",
                  className
                )}
                style={
                  isCalculatedField
                    ? { opacity: 1, backgroundColor: "#fff" }
                    : undefined
                }
              />
            ) : (
              <Input
                type="number"
                value={value ?? ""}
                readOnly={true}
                className={cn("cursor-not-allowed", className)}
                placeholder={
                  value !== null && value !== undefined ? undefined : "N/A"
                }
              />
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      case "date": {
        const dateFieldPath = `${field.sectionId}.${field.id}`;
        // Check if this is a MM/YY format field (Training Period)
        const isMMYYFormat =
          field.label?.toLowerCase().includes("training period") ||
          field.label?.toLowerCase().includes("mm/yy") ||
          (field.uiComponent === "Input (Text)" && field.dataType === "date");

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
          if (!dateValue) return "N/A";
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
          <div className="space-y-2" data-field-path={dateFieldPath}>
            <Label>
              {field.label}{" "}
              {isRequired && <span className="text-destructive">*</span>}
            </Label>
            {isEditable ? (
              isMMYYFormat ? (
                // MM/YY format - use MonthYearPicker dropdown
                <MonthYearPicker
                  value={value || ""}
                  onChange={(newValue) => {
                    onChange(newValue);
                    // Always validate on change
                    if (onValidate && field) {
                      onValidate(dateFieldPath, newValue, field);
                    }
                  }}
                  disabled={disabled}
                  placeholder="Select month/year"
                  className={cn(
                    error ? "border-destructive" : "",
                    className
                  )}
                />
              ) : (
                // Standard date format - use date input
                <Input
                  type="date"
                  value={formatDateForInput(value)}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    onChange(newValue);
                    // Always validate on change
                    if (onValidate && field) {
                      onValidate(dateFieldPath, newValue, field);
                    }
                  }}
                  onBlur={() => {
                    // Validate on blur as well
                    if (onValidate && field && value) {
                      onValidate(dateFieldPath, value, field);
                    }
                  }}
                  disabled={disabled}
                  className={error ? "border-destructive" : className}
                  placeholder="Select date"
                />
              )
            ) : (
              <Input
                type="text"
                value={isMMYYFormat ? value || "" : formatDateForDisplay(value)}
                readOnly={true}
                className={cn("cursor-not-allowed", className)}
                placeholder={value ? undefined : "N/A"}
              />
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );
      }

      case "file":
        const fileFieldPath = `${field.sectionId}.${field.id}`;
        // Find "No document available" field in the section
        const noDocAvailableField = sectionInputs?.find(
          (f: any) =>
            f.label?.toLowerCase().includes("no document available") ||
            f.label?.toLowerCase() === "no document available"
        );
        const noDocAvailableFieldPath =
          noDocAvailableField && sectionKey
            ? `${sectionKey}.${noDocAvailableField.id}`
            : undefined;
        const noDocAvailableValue =
          noDocAvailableFieldPath && formData
            ? formData[sectionKey!]?.[noDocAvailableField.id]
            : undefined;

        console.log(`🔍 [FieldRenderer] File field: ${fileFieldPath}`);
        console.log(
          `🔍 [FieldRenderer] noDocAvailableField:`,
          noDocAvailableField
            ? { id: noDocAvailableField.id, label: noDocAvailableField.label }
            : "NOT FOUND"
        );
        console.log(
          `🔍 [FieldRenderer] noDocAvailableFieldPath: ${noDocAvailableFieldPath}`
        );
        console.log(
          `🔍 [FieldRenderer] noDocAvailableValue: "${noDocAvailableValue}"`
        );
        console.log(
          `🔍 [FieldRenderer] formData[${sectionKey}]:`,
          formData?.[sectionKey!]
        );
        console.log(
          `🔍 [FieldRenderer] skipFileValidationRef[${fileFieldPath}]: ${skipFileValidationRef.current[fileFieldPath]}`
        );

        return (
          <div className="space-y-2" data-field-path={fileFieldPath}>
            {!isEditable ? (
              // In review mode, show files in table format or "No document available" checkbox
              noDocAvailableValue === "No document available" ? (
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
              ) : (
                <MinistryFileTable
                  files={value as FileUpload | FileUpload[] | null}
                  fileKeyPrefix={fileFieldPath}
                />
              )
            ) : (
              <MinistryFileUploadSection
                label={field.label}
                value={value as FileUpload | null}
                onChange={(fileValue) => {
                  console.log(
                    `🔄 [FieldRenderer] File onChange called for ${fileFieldPath}, fileValue:`,
                    fileValue
                  );
                  console.log(
                    `🔄 [FieldRenderer] noDocAvailableValue: "${noDocAvailableValue}"`
                  );

                  // Get the current formData value - it might have been updated
                  const currentNoDocValue =
                    formData?.[sectionKey!]?.[noDocAvailableField?.id || ""];
                  console.log(
                    `🔄 [FieldRenderer] currentNoDocValue from formData: "${currentNoDocValue}"`
                  );
                  console.log(
                    `🔄 [FieldRenderer] skipFileValidationRef[${fileFieldPath}]: ${skipFileValidationRef.current[fileFieldPath]}`
                  );

                  // Only trigger validation if "No document available" is not checked AND we're not skipping validation
                  const shouldValidate =
                    !skipFileValidationRef.current[fileFieldPath] &&
                    noDocAvailableValue !== "No document available" &&
                    currentNoDocValue !== "No document available";
                  console.log(
                    `🔄 [FieldRenderer] shouldValidate: ${shouldValidate} (skipRef: ${skipFileValidationRef.current[fileFieldPath]}, prop: ${noDocAvailableValue}, formData: ${currentNoDocValue})`
                  );

                  // If we're skipping validation, delay the onChange call slightly to allow formData to update
                  if (skipFileValidationRef.current[fileFieldPath]) {
                    console.log(
                      `🔄 [FieldRenderer] Delaying onChange call to allow formData update`
                    );
                    setTimeout(() => {
                      onChange(fileValue);
                      // Clear error after formData has updated
                      if (onClearError) {
                        console.log(
                          `🔄 [FieldRenderer] Clearing error for ${fileFieldPath} (No document available is checked)`
                        );
                        onClearError(fileFieldPath);
                      }
                      // Reset the skip flag
                      skipFileValidationRef.current[fileFieldPath] = false;
                      console.log(
                        `🔄 [FieldRenderer] Reset skipFileValidationRef for ${fileFieldPath}`
                      );
                    }, 100);
                  } else {
                    onChange(fileValue);

                    // Skip validation if "No document available" is checked (file is not required)
                    if (shouldValidate && onValidate) {
                      console.log(
                        `🔄 [FieldRenderer] Running validation for ${fileFieldPath}`
                      );
                      onValidate(fileFieldPath, fileValue, field);
                    } else {
                      if (onClearError) {
                        console.log(
                          `🔄 [FieldRenderer] Clearing error for ${fileFieldPath} (No document available is checked)`
                        );
                        // Clear error if "No document available" is checked
                        onClearError(fileFieldPath);
                      }
                    }
                  }
                }}
                required={isRequired}
                submissionId={submissionId}
                disabled={disabled}
                className={error ? "border-destructive" : className}
                noDocumentAvailableValue={noDocAvailableValue}
                submissionIndicatorId={submissionIndicatorId}
                isEditMode={mode === "edit" || isSectionEditMode}
                onPendingDeletion={onPendingDeletion}
                onNoDocumentAvailableChange={(newValue) => {
                  console.log(
                    `🔄 [FieldRenderer] onNoDocumentAvailableChange called, newValue: "${newValue}"`
                  );
                  console.log(
                    `🔄 [FieldRenderer] noDocAvailableFieldPath: ${noDocAvailableFieldPath}`
                  );
                  console.log(
                    `🔄 [FieldRenderer] fileFieldPath: ${fileFieldPath}`
                  );
                  if (
                    noDocAvailableFieldPath &&
                    onFieldChange &&
                    noDocAvailableField
                  ) {
                    console.log(
                      `🔄 [FieldRenderer] Updating "No document available" field: ${noDocAvailableFieldPath} = "${newValue}"`
                    );

                    // Set flag to skip validation when setting "No document available"
                    if (newValue === "No document available") {
                      skipFileValidationRef.current[fileFieldPath] = true;
                      console.log(
                        `🔄 [FieldRenderer] Set skipFileValidationRef[${fileFieldPath}] to true`
                      );
                    } else {
                      // Clear the skip flag when unchecking (clearing "No document available")
                      skipFileValidationRef.current[fileFieldPath] = false;
                      console.log(
                        `🔄 [FieldRenderer] Cleared skipFileValidationRef[${fileFieldPath}] (unchecking)`
                      );
                    }

                    onFieldChange(
                      noDocAvailableFieldPath,
                      newValue,
                      noDocAvailableField
                    );
                    // Validate the "No document available" field
                    if (onValidate && noDocAvailableField) {
                      console.log(
                        `🔄 [FieldRenderer] Validating "No document available" field: ${noDocAvailableFieldPath}`
                      );
                      onValidate(
                        noDocAvailableFieldPath,
                        newValue,
                        noDocAvailableField
                      );
                    }
                    // Clear the file upload field error if "No document available" is confirmed
                    if (newValue === "No document available" && onClearError) {
                      console.log(
                        `🔄 [FieldRenderer] Clearing file upload error for ${fileFieldPath} (No document available confirmed)`
                      );
                      // File upload is no longer required, so clear the error directly
                      onClearError(fileFieldPath);
                    }
                  } else {
                    console.log(
                      `⚠️ [FieldRenderer] Missing props: noDocAvailableFieldPath: ${!!noDocAvailableFieldPath}, onFieldChange: ${!!onFieldChange}, noDocAvailableField: ${!!noDocAvailableField}`
                    );
                  }
                }}
                noDocumentAvailableFieldId={noDocAvailableField?.id}
              />
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  },
  (prevProps, nextProps) => {
    // Re-render if value, error, disabled state, mode, or formData changed
    // Need to check formData to ensure "No document available" checkbox updates correctly
    // Only check the specific section's data to avoid unnecessary re-renders
    const sectionDataChanged =
      prevProps.sectionKey === nextProps.sectionKey &&
      prevProps.sectionKey &&
      prevProps.formData?.[prevProps.sectionKey] !==
        nextProps.formData?.[nextProps.sectionKey];

    return (
      prevProps.value === nextProps.value &&
      prevProps.error === nextProps.error &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.mode === nextProps.mode &&
      prevProps.sectionKey === nextProps.sectionKey &&
      !sectionDataChanged
    );
  }
);
