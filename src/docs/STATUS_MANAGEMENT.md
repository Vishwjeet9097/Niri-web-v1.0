# Status Management System

## Overview

This document describes the centralized status management system implemented across the NIRI application. The system provides consistent status text, styling, and messaging based on submission status and user roles.

## Files

- `src/utils/statusUtils.ts` - Centralized status utilities
- `src/components/ui/UnifiedSubmissionCard.tsx` - Updated to use centralized status
- `src/features/dashboard/components/approver/ApproverSubmissionCard.tsx` - Updated to use centralized status

## Status Mapping

### Status Types and Descriptions

| Status                         | Label        | Description                                | User Context   |
| ------------------------------ | ------------ | ------------------------------------------ | -------------- |
| `DRAFT`                        | Draft        | Being prepared by Nodal Officer            | Nodal Officer  |
| `SUBMITTED_TO_STATE`           | Under Review | Waiting for State Approver Review          | State Approver |
| `SUBMITTED_TO_MOSPI_REVIEWER`  | Under Review | Waiting for Mospi Reviewer Review          | Mospi Reviewer |
| `SUBMITTED_TO_MOSPI_APPROVER`  | Under Review | Waiting for Mospi Approver Review          | Mospi Approver |
| `APPROVED`                     | Approved     | Approved by Mospi Approver                 | All Users      |
| `REJECTED`                     | Rejected     | Rejected and returned for corrections      | All Users      |
| `RETURNED_FROM_STATE`          | Returned     | Returned by State Approver for corrections | Nodal Officer  |
| `RETURNED_FROM_MOSPI_REVIEWER` | Returned     | Returned by Mospi Reviewer for corrections | Nodal Officer  |
| `RETURNED_FROM_MOSPI_APPROVER` | Returned     | Returned by Mospi Approver for corrections | Nodal Officer  |

## Usage

### Basic Status Information

```typescript
import { getStatusInfo } from "@/utils/statusUtils";

const statusInfo = getStatusInfo("SUBMITTED_TO_STATE");
console.log(statusInfo.label); // "Under Review"
console.log(statusInfo.description); // "Waiting for State Approver Review"
```

### Status Pills for UI

```typescript
import { getStatusPills } from "@/utils/statusUtils";

// For State Approver (only shows "Under Review")
const statusPillsForStateApprover = getStatusPills(
  "SUBMITTED_TO_STATE",
  "STATE_APPROVER"
);
// Returns: [{ label: "Under Review", className: "bg-blue-100 text-blue-800 border-blue-200" }]

// For other users (shows both "Under Review" and "Waiting for...")
const statusPillsForOthers = getStatusPills(
  "SUBMITTED_TO_STATE",
  "NODAL_OFFICER"
);
// Returns: [
//   { label: "Under Review", className: "bg-blue-100 text-blue-800 border-blue-200" },
//   { label: "Waiting for State Approver Review", className: "bg-blue-100 text-blue-800 border-blue-200" }
// ]
```

### Waiting Messages

```typescript
import { getWaitingMessage } from "@/utils/statusUtils";

const message = getWaitingMessage("SUBMITTED_TO_STATE", "NODAL_OFFICER");
// Returns: "Your submission is waiting for state approver review"
```

## User Role Context

### Nodal Officer

- Sees status descriptions for their submissions
- Gets specific messages when submissions are returned
- Can see progress through the approval workflow
- **Status Pills**: Sees both "Under Review" and "Waiting for..." messages

### State Approver

- No waiting message displayed
- Can see status of submissions they've reviewed
- **Status Pills**: Sees only "Under Review" (not "Waiting for State Approver Review")

### Mospi Reviewer

- No waiting message displayed
- Can see status of submissions they've reviewed
- **Status Pills**: Sees only "Under Review" (not "Waiting for Mospi Reviewer Review")

### Mospi Approver

- No waiting message displayed
- Can see final approval status
- **Status Pills**: Sees only "Under Review" (not "Waiting for Mospi Approver Review")

## Status Display Examples

### Example 1: SUBMITTED_TO_STATE Status

**For State Approver:**

- Status Pills: `["Under Review"]`
- Message: _(No message displayed)_

**For Nodal Officer:**

- Status Pills: `["Under Review", "Waiting for State Approver Review"]`
- Message: "Your submission is waiting for state approver review"

**For Mospi Reviewer:**

- Status Pills: `["Under Review", "Waiting for State Approver Review"]`
- Message: "This submission is waiting for state approver review"

### Example 2: SUBMITTED_TO_MOSPI_APPROVER Status

**For Mospi Approver:**

- Status Pills: `["Under Review"]`
- Message: _(No message displayed)_

**For Nodal Officer:**

- Status Pills: `["Under Review", "Waiting for Mospi Approver Review"]`
- Message: "Your submission is waiting for mospi approver review"

## Implementation Examples

### In Components

```typescript
import {
  getStatusInfo,
  getStatusPills,
  getWaitingMessage,
} from "@/utils/statusUtils";

function SubmissionCard({ status, currentUserRole }) {
  const statusInfo = getStatusInfo(status);
  const statusPills = getStatusPills(status);
  const waitingMessage = getWaitingMessage(status, currentUserRole);

  return (
    <div>
      <h3>{statusInfo.label}</h3>
      <p>{statusInfo.description}</p>
      {waitingMessage && <p>{waitingMessage}</p>}
      {statusPills.map((pill, index) => (
        <Badge key={index} className={pill.className}>
          {pill.label}
        </Badge>
      ))}
    </div>
  );
}
```

### Status Styling

Each status has consistent styling:

- **Colors**: Blue for under review, Green for approved, Red for rejected, Orange for returned
- **Borders**: Left border with status-specific color
- **Backgrounds**: Light background with status-specific color
- **Badges**: Consistent badge styling across components

## Benefits

1. **Consistency**: Same status text and styling across the application
2. **Maintainability**: Single source of truth for status definitions
3. **User Experience**: Clear, contextual messages based on user role
4. **Scalability**: Easy to add new statuses or modify existing ones
5. **Internationalization**: Centralized text makes translation easier

## Migration Guide

### Before (Old Way)

```typescript
// Hardcoded status text
const statusText = status === "SUBMITTED_TO_STATE" ? "Under Review" : "Unknown";
const description =
  status === "SUBMITTED_TO_STATE" ? "Waiting for State Approver" : "";
```

### After (New Way)

```typescript
// Centralized status utilities
import { getStatusInfo } from "@/utils/statusUtils";
const statusInfo = getStatusInfo(status);
const statusText = statusInfo.label;
const description = statusInfo.description;
```

## Testing

Use the `StatusDisplayExample` component to test different status combinations:

```typescript
import { StatusExamples } from "@/components/StatusDisplayExample";

// Shows examples of all status types
<StatusExamples />;
```

## Future Enhancements

1. **Internationalization**: Add support for multiple languages
2. **Custom Statuses**: Allow custom status definitions
3. **Status History**: Track status changes over time
4. **Notifications**: Status-based notification system
5. **Analytics**: Status-based reporting and analytics
