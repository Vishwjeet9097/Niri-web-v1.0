# Validation Migration Pattern for Review Components

## Overview
This document outlines the pattern for migrating review components to use centralized validation hooks, matching the create submission components.

## Pattern to Follow

### 1. Replace Manual Validation Logic

**BEFORE:**
```tsx
onChange={(e) => {
  const value = e.target.value;
  setCapitalAllocation(value);
  
  // Manual validation
  if (shouldBeEditable("1.1")) {
    if (value === "") {
      setValidationErrors((prev) => ({
        ...prev,
        "section1_1.capitalAllocation": "Capital Allocation is required.",
      }));
      return;
    }
    // ... more manual validation
  }
}}
```

**AFTER:**
```tsx
onChange={createOnChangeHandler(
  "section1_1.capitalAllocation",
  (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setCapitalAllocation(value);
      markFieldAsTouched("section1_1.allocationToGSDP"); // For calculated fields
      setShowValidationErrors(true);
    }
  }
)}
```

### 2. Replace Error Display

**BEFORE:**
```tsx
className={
  shouldBeEditable("1.1") 
    ? getFieldError("section1_1.capitalAllocation") 
      ? "bg-white border-red-500" 
      : "bg-white"
    : "bg-gray-50"
}
{getFieldError("section1_1.capitalAllocation") && (
  <p className="text-sm text-red-500 mt-1">{getFieldError("section1_1.capitalAllocation")}</p>
)}
```

**AFTER:**
```tsx
className={cn(
  shouldBeEditable("1.1") ? "bg-white" : "bg-gray-50",
  shouldBeEditable("1.1") && getInputValidationClass("section1_1.capitalAllocation")
)}
{shouldBeEditable("1.1") && renderFieldError("section1_1.capitalAllocation")}
```

### 3. For Select Components

**BEFORE:**
```tsx
<Select
  value={entry.sector}
  onValueChange={(value) => {
    updateProject(entry.id, "sector", value);
  }}
>
```

**AFTER:**
```tsx
<Select
  value={entry.sector}
  onValueChange={createOnValueChangeHandler(
    `section2_4.investmentReadyArray.${index}.sector`,
    (value) => {
      updateProject(entry.id, "sector", value);
    }
  )}
>
```

### 4. For Textarea Components

**BEFORE:**
```tsx
<Textarea
  value={formData.section1_5.comment}
  onChange={(e) => {
    setFormData((prev) => ({
      ...prev,
      section1_5: { ...prev.section1_5, comment: e.target.value },
    }));
  }}
/>
```

**AFTER:**
```tsx
<Textarea
  value={formData.section1_5.comment}
  onChange={createOnChangeHandler(
    "section1_5.comment",
    (e) => {
      setFormData((prev) => ({
        ...prev,
        section1_5: { ...prev.section1_5, comment: e.target.value },
      }));
    }
  )}
  className={getInputValidationClass("section1_5.comment")}
/>
{renderFieldError("section1_5.comment")}
```

## Files to Update

1. ✅ `InfraFinancingReview.tsx` - Infrastructure done, sections need updating
2. ⏳ `InfraDevelopmentReview.tsx` - Needs full update
3. ⏳ `PPPDevelopmentReview.tsx` - Needs full update
4. ⏳ `InfraEnablersReview.tsx` - Needs full update

## Key Points

- Remove ALL `setValidationErrors` calls - validation is handled by validation files via `useMemo`
- Use `renderFieldError` instead of manual error display
- Use `getInputValidationClass` for consistent styling
- Use `createOnChangeHandler`, `createOnBlurHandler`, `createOnValueChangeHandler` for touch tracking
- Validation errors appear/disappear automatically based on validation state


