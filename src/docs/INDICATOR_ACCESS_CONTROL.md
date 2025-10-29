# NIRI Indicator Access Control System

यह document NIRI Data Submission Dashboard में role-based indicator access control system को explain करता है।

## Overview

NODAL_OFFICER role के लिए strict indicator-level access control implement किया गया है। Users केवल उन indicators को देख और edit कर सकते हैं जो उन्हें explicitly assign किए गए हैं।

## Key Features

### 1. Dynamic Form Rendering

- **Conditional Rendering**: Form sections केवल तभी show होते हैं जब user को उन indicators तक access हो
- **Field Filtering**: Individual fields भी filter होते हैं based on assigned indicators
- **Section Hiding**: Complete sections hide हो जाते हैं अगर user को कोई भी indicator assign नहीं है

### 2. Backend Integration

- **Login Response**: User profile में `assignedIndicators` array
- **API Filtering**: Backend automatically filters form data based on user access
- **Authorization**: Server-side validation for indicator access

### 3. State Management

- **Global State**: `assignedIndicators` को global state में store करना
- **Caching**: User permissions को cache करना repeated API calls avoid करने के लिए
- **Real-time Updates**: Access changes को real-time में reflect करना

## Implementation

### 1. User Type Extension

```typescript
export interface User {
  // ... existing fields
  assignedIndicators?: string[]; // NODAL_OFFICER के लिए assigned indicators
}
```

### 2. Custom Hook: useIndicatorAccess

```typescript
const {
  loading,
  error,
  assignedIndicators,
  hasIndicatorAccess,
  hasSectionAccess,
  getSectionAccess,
  getAvailableSections,
  hasAnyAccess,
} = useIndicatorAccess();
```

### 3. IndicatorSection Component

```tsx
<IndicatorSection sectionId="infra-financing" title="Infrastructure Financing">
  {/* Section content */}
</IndicatorSection>
```

### 4. Utility Functions

```typescript
// Filter form data by assigned indicators
const filteredData = filterFormDataByIndicators(formData, assignedIndicators);

// Check section access
const hasAccess = hasSectionAccess("infra-financing", assignedIndicators);

// Get available sections
const availableSections = getAvailableSections(assignedIndicators);
```

## Usage Examples

### 1. Basic Form with Access Control

```tsx
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { IndicatorSection } from "@/components/IndicatorSection";

function MyForm() {
  const { hasAnyAccess, isNodalOfficer } = useIndicatorAccess();

  if (isNodalOfficer && !hasAnyAccess()) {
    return <div>No indicators assigned</div>;
  }

  return (
    <div>
      <IndicatorSection
        sectionId="infra-financing"
        title="Infrastructure Financing"
      >
        {/* Form fields */}
      </IndicatorSection>
    </div>
  );
}
```

### 2. Individual Indicator Components

```tsx
import { Section1_1_CapexToGSDP } from "@/components/IndicatorSections/Section1_1_CapexToGSDP";

function MyComponent() {
  return (
    <Section1_1_CapexToGSDP
      value={formData.capexToGsdpRatio}
      onChange={(value) =>
        setFormData((prev) => ({ ...prev, capexToGsdpRatio: value }))
      }
      error={errors.capexToGsdpRatio}
    />
  );
}
```

### 3. Form Submission with Filtering

```tsx
function handleSubmit() {
  let submissionData = formData;

  if (isNodalOfficer && assignedIndicators.length > 0) {
    // Filter data to only include assigned indicators
    submissionData = filterFormDataByIndicators(formData, assignedIndicators);
  }

  // Submit filtered data
  apiService.createSubmission(submissionData);
}
```

## API Endpoints

### 1. Get User Assigned Indicators

```
GET /users/{userId}/indicators
Response: { indicators: string[] }
```

### 2. Update User Indicators

```
PATCH /users/{userId}/indicators
Body: { indicatorCodes: string[] }
```

### 3. Get All Indicators

```
GET /indicators
Response: Indicator[]
```

### 4. Get Indicators by Section

```
GET /indicators/section/{sectionId}
Response: Indicator[]
```

## Error Handling

### 1. Access Denied

- Clear error messages for unauthorized access
- Redirect to first available section
- Graceful fallbacks for missing permissions

### 2. Loading States

- Loading indicators while fetching permissions
- Skeleton screens for better UX
- Error boundaries for failed requests

### 3. Empty States

- Messages when no indicators are assigned
- Guidance for contacting administrators
- Fallback content for restricted sections

## Performance Optimizations

### 1. Lazy Loading

- Indicator sections load only when needed
- Dynamic imports for large components
- Code splitting by indicator groups

### 2. Memoization

- Conditional rendering logic memoized
- Expensive calculations cached
- Re-render optimization

### 3. Caching

- User permissions cached in memory
- API responses cached with TTL
- Local storage for offline access

## Security Considerations

### 1. Frontend Validation

- Client-side access checks for UX
- Form validation based on permissions
- Input sanitization for assigned fields

### 2. Backend Validation

- Server-side authorization checks
- Data filtering at API level
- Audit logging for access attempts

### 3. Data Protection

- Sensitive data not exposed to unauthorized users
- Form data filtered before submission
- Error messages don't leak information

## Testing

### 1. Unit Tests

- Hook functionality testing
- Component rendering tests
- Utility function validation

### 2. Integration Tests

- API integration testing
- Form submission flow testing
- Access control validation

### 3. E2E Tests

- Complete user journey testing
- Role-based access scenarios
- Error handling validation

## Migration Guide

### 1. Existing Forms

- Wrap existing sections with IndicatorSection
- Add useIndicatorAccess hook
- Update form submission logic

### 2. New Components

- Use individual indicator components
- Implement access checks
- Add proper error handling

### 3. API Updates

- Update user registration to include indicators
- Modify login response structure
- Add indicator management endpoints

## Troubleshooting

### Common Issues

1. **No indicators showing**

   - Check user role and assigned indicators
   - Verify API response structure
   - Check console for errors

2. **Form submission failing**

   - Ensure data filtering is working
   - Check backend validation
   - Verify indicator access

3. **Performance issues**
   - Check for unnecessary re-renders
   - Verify memoization is working
   - Check API response caching

### Debug Tools

```typescript
// Enable debug logging
localStorage.setItem("debug", "indicator-access");

// Check current access
console.log(useIndicatorAccess());

// Validate form data
console.log(validateFormDataAccess(formData, assignedIndicators));
```

## Future Enhancements

1. **Dynamic Indicator Assignment**

   - Real-time indicator updates
   - Bulk assignment operations
   - Temporary access grants

2. **Advanced Permissions**

   - Read-only access for some indicators
   - Time-based access restrictions
   - Conditional field requirements

3. **Analytics and Monitoring**
   - Access pattern tracking
   - Performance metrics
   - User behavior analytics

## Support

For questions or issues related to indicator access control:

1. Check this documentation
2. Review console logs for errors
3. Contact the development team
4. Create an issue in the project repository
