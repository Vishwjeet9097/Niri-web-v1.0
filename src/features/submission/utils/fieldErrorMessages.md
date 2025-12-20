# Centralized Field Error Messages

This document describes the centralized error message system for all mandatory fields across all 20 indicators.

## Overview

The centralized error message system provides:
- **Single source of truth** for error messages
- **Dynamic error handling** for all mandatory fields
- **Reusable across components** (create mode and edit mode)
- **Consistent error messages** across the application

## Files

1. **`fieldErrorMessages.ts`** - Centralized error message definitions and utilities
2. **`useFieldErrorDisplay.ts`** - Hook for displaying errors in components

## Usage

### In Create Mode (Submission Pages)

```typescript
import { useFieldErrorDisplay } from '../hooks/useFieldErrorDisplay';
import { useFieldValidation } from '../hooks/useFieldValidation';

// In your component
const {
  touchedFields,
  validatingIndicator,
  setValidatingIndicator,
  markFieldAsTouched,
  getFieldError: getFieldErrorFromHook,
  markIndicatorFieldsAsTouched,
} = useFieldValidation();

const { getFieldError, getInputValidationClass, renderFieldError } = useFieldErrorDisplay({
  validationErrors: validation.errors,
  indicatorValidationErrors,
  showValidationErrors,
  isFieldTouched: (path) => touchedFields.has(path),
  validatingIndicator,
});

// Use in JSX
<Input
  className={getInputValidationClass("section1_1.capitalAllocation")}
  onChange={createOnChangeHandler("section1_1.capitalAllocation", (e) => {
    // your onChange logic
  })}
/>
{renderFieldError("section1_1.capitalAllocation")}
```

### In Edit Mode (Review Components)

```typescript
import { useFieldErrorDisplay } from '../../submission/hooks/useFieldErrorDisplay';

// In your review component
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

// After validation
const validationResult = validateInfraFinancing(formData);
setValidationErrors(validationResult.errors);

const { getFieldError, getInputValidationClass, renderFieldError } = useFieldErrorDisplay({
  validationErrors,
  showValidationErrors: true, // Always show in edit mode
  // No touched fields needed in edit mode - show all errors
});

// Use in JSX (same as create mode)
<Input
  className={getInputValidationClass("section1_1.capitalAllocation")}
/>
{renderFieldError("section1_1.capitalAllocation")}
```

## Adding New Error Messages

To add error messages for new fields:

1. **Add to `FIELD_ERROR_MESSAGES`** in `fieldErrorMessages.ts`:
```typescript
export const FIELD_ERROR_MESSAGES: Record<string, string> = {
  // ... existing messages
  "sectionX_Y.newField": "Your custom error message here.",
};
```

2. **The system will automatically use it** - no component changes needed!

## Field Path Patterns

Field paths follow this pattern:
- Simple field: `section1_1.capitalAllocation`
- Array field: `section1_3.ulbList`
- Array item field: `section1_3.ulbList.0.ulb` (index-based)
- Nested field: `section2_4.investmentReadyArray.0.projectSize`

## Priority Order

Error messages are resolved in this priority:
1. **Validation error** (from validation files) - highest priority
2. **Field-specific message** (from FIELD_ERROR_MESSAGES)
3. **Default message** (from DEFAULT_ERROR_MESSAGES)

## Benefits

- ✅ Centralized: All error messages in one place
- ✅ Dynamic: Automatically handles all mandatory fields
- ✅ Reusable: Works in create and edit modes
- ✅ Maintainable: Easy to update messages
- ✅ Consistent: Same messages across all components


