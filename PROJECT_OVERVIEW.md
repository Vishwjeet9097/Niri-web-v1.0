# NIRI Web Application - Complete Project Overview

## 📋 Table of Contents
1. [Project Architecture](#project-architecture)
2. [Technology Stack](#technology-stack)
3. [Routing Structure](#routing-structure)
4. [Component Architecture](#component-architecture)
5. [Feature Modules](#feature-modules)
6. [Services & API Layer](#services--api-layer)
7. [Authentication & Authorization](#authentication--authorization)
8. [Data Flow](#data-flow)
9. [Key Functionalities](#key-functionalities)

---

## 🏗️ Project Architecture

### Tech Stack
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.19
- **Routing**: React Router DOM 6.30.1
- **State Management**: Zustand 5.0.8, React Context API
- **UI Library**: shadcn/ui (Radix UI components)
- **Styling**: Tailwind CSS 3.4.17
- **HTTP Client**: Axios 1.12.2
- **Form Management**: React Hook Form 7.61.1 + Zod 3.25.76
- **Data Fetching**: TanStack React Query 5.83.0
- **Notifications**: Sonner 1.7.4

### Project Structure
```
src/
├── app/                    # App-level providers and setup
│   ├── AppProviders.tsx   # Query client, toast providers
│   ├── ErrorBoundary.tsx   # Global error handling
│   └── ThemeProvider.tsx   # Dark/light theme management
├── components/             # Reusable UI components
│   ├── layout/            # Layout components (DashboardLayout, Sidebar, Topbar)
│   ├── ui/                # shadcn/ui components (50+ components)
│   ├── IndicatorSections/ # 20 indicator section components
│   ├── RankingScoring/    # Ranking and scoring components
│   └── submission/        # Submission-related components
├── features/              # Feature-based modules
│   ├── auth/             # Authentication
│   ├── dashboard/        # Role-based dashboards
│   ├── dataSubmission/    # Data review and submission management
│   ├── notifications/     # Notification center
│   ├── submission/       # Form submission workflow
│   └── userManagement/   # User CRUD operations
├── services/             # Business logic & API layer
│   ├── api.service.ts    # Main API service (4900+ lines)
│   ├── auth.service.ts   # Authentication service
│   ├── workflow.service.ts # Workflow management
│   └── [15+ other services]
├── hooks/                # Custom React hooks
├── utils/                 # Utility functions
├── types/                 # TypeScript type definitions
├── config/               # Configuration files
└── routes/               # Route protection components
```

---

## 🛣️ Routing Structure

### Route Configuration (`src/App.tsx`)

#### Public Routes
- `/login` - Login page (SSO/OTP/Manual login)

#### Protected Routes (Require Authentication)
All routes below are wrapped in `<ProtectedRoute>` and `<DashboardLayout>`

##### Main Routes
- `/` → Redirects to `/dashboard`
- `/dashboard` → Role-based dashboard (`RoleBasedDashboard`)
- `/reviewer-dashboard` → Redirects to `/dashboard`

##### Submission Routes (`/submissions/*`)
- `/submissions` → Default: `InfraFinancingStep`
- `/submissions/infra-financing` → Infrastructure Financing form
- `/submissions/infra-development` → Infrastructure Development form
- `/submissions/ppp-development` → PPP Development form
- `/submissions/infra-enablers` → Infrastructure Enablers form
- `/submissions/review-submit` → Review and submit step
- `/submissions/preview` → Preview page

##### Data Submission Review Routes
- `/data-submission/review` → Submission list page (for reviewers/approvers)
- `/data-submission/state-aggregate` → State aggregate review page
- `/data-submission/review/:id` → Submission detail page
- `/data-submission/edit/:id` → Edit submission page

##### User Management (Role-restricted)
- `/user-management` → User management page
  - **Allowed Roles**: `STATE_APPROVER`, `MOSPI_APPROVER`, `MINISTRY_APPROVER`, `ADMIN`

##### Other Routes
- `/ranking` → Ranking & Scoring page
- `/support` → Support & Help (placeholder)
- `/settings` → Settings (placeholder)
- `/unauthorized` → Unauthorized access page
- `*` → 404 Not Found page

### Route Protection
- **ProtectedRoute** (`src/routes/ProtectedRoute.jsx`): Checks authentication and role permissions
- **PrivateRoute** (`src/routes/PrivateRoute.tsx`): Alternative route protection using `Outlet`

---

## 🧩 Component Architecture

### Layout Components

#### DashboardLayout (`src/components/layout/DashboardLayout.tsx`)
- **Header**: Logo, user info, notification center, theme toggle
- **Sidebar**: Role-based menu navigation (from `MENU_CONFIG` in `utils/roles.js`)
- **Main Content**: `<Outlet />` for nested routes
- **Responsive**: Mobile-friendly with collapsible sidebar

#### Menu Configuration (`src/utils/roles.js`)
Role-based menu items:
- **Dashboard**: All roles
- **User Management**: `ADMIN`, `STATE_APPROVER`, `MOSPI_APPROVER`, `MINISTRY_APPROVER`
- **Data Submission**: 
  - `NODAL_OFFICER`: Single menu item
  - `STATE_APPROVER`: Dropdown (Create Submission, Review Submission)
- **Review Submission**: `MOSPI_REVIEWER`, `MOSPI_APPROVER`
- **Ranking & Scoring**: All roles except `ADMIN`
- **Support & Help**: All roles
- **Settings**: All roles

### Feature Components

#### Authentication (`src/features/auth/`)
- **LoginPage.tsx**: 
  - SSO login (disabled)
  - OTP verification
  - Manual login with email/password
  - Font size controls (A-, A, A+)
  - Theme toggle
  - Language selector (English/Hindi)
- **AuthProvider.jsx**: 
  - Context provider for auth state
  - Login/logout functions
  - Role checking (`hasRole`)
  - Token management integration

#### Dashboard (`src/features/dashboard/`)
Role-based dashboards:
- **RoleBasedDashboard.tsx**: Routes to appropriate dashboard based on user role
- **NodalDashboardPage.tsx**: For `NODAL_OFFICER`
- **StateApproverDashboardPage.tsx**: For `STATE_APPROVER`
- **MospiApproverDashboardPage.tsx**: For `MOSPI_APPROVER`
- **ReviewerDashboardPage.tsx**: For `MOSPI_REVIEWER`
- **AdminDashboardPage.tsx**: For `ADMIN`

Dashboard Components:
- **KPICards**: Metrics display (submissions, pending, approved, etc.)
- **SubmissionsTable**: List of submissions with filters
- **RecentActivity**: Activity feed
- **UpcomingDeadlines**: Deadline tracking
- **QuickActions**: Role-specific quick actions

#### Submission Forms (`src/features/submission/`)
Multi-step form workflow:

1. **InfraFinancingStep** (`/submissions/infra-financing`)
   - 5 sections (1.1 to 1.5)
   - ULB dropdown integration
   - Form validation
   - Progress tracking

2. **InfraDevelopmentStep** (`/submissions/infra-development`)
   - 5 sections (2.1 to 2.5)
   - Similar structure to InfraFinancing

3. **PPPDevelopmentStep** (`/submissions/ppp-development`)
   - 4 sections (3.1 to 3.4)
   - PPP-specific fields

4. **InfraEnablersStep** (`/submissions/infra-enablers`)
   - 6 sections (4.1 to 4.6)
   - Enabler-specific fields

5. **ReviewSubmitStep** (`/submissions/review-submit`)
   - Review all entered data
   - Validation summary
   - Submit to state approver

6. **PreviewPage** (`/submissions/preview`)
   - Final preview before submission

**Key Components:**
- **Stepper**: Visual progress indicator
- **ProgressHeader**: Progress percentage display
- **SectionCard**: Individual section wrapper
- **FormActions**: Navigation buttons (Previous/Next/Save/Submit)
- **FileUploadSection**: File upload functionality

**Hooks:**
- `useFormPersistence`: Auto-save form data
- `useStepNavigation`: Step navigation logic
- `useFieldValidation`: Field-level validation
- `useFormValidation`: Form-level validation

#### Data Submission Review (`src/features/dataSubmission/`)
- **SubmissionListPage**: List all submissions with filters
- **SubmissionDetailPage**: Detailed view of a submission
- **EditSubmissionPage**: Edit existing submission
- **StateAggregateReviewPage**: State-level aggregate review

**Review Components:**
- **UnifiedReviewPage**: Main review interface
- **EditableInfraFinancing**: Editable review form
- **EditableInfraDevelopment**: Editable review form
- **EditablePPPDevelopment**: Editable review form
- **EditableInfraEnablers**: Editable review form

**Modals:**
- **ApproveModal**: Approval confirmation
- **RejectModal**: Rejection with comments
- **SendBackModal**: Send back to previous stage
- **SendToApproverModal**: Forward to approver
- **TimelineModal**: Submission timeline

#### User Management (`src/features/userManagement/`)
- **UserManagementPage.tsx**: Main page with user list
- **UserForm.tsx**: Create/edit user form (2255 lines - comprehensive)
- **UserTable.tsx**: User list table with sorting/filtering
- **EmptyState.tsx**: Empty state component
- **CleanupButtons.tsx**: Utility buttons (optional)

**Features:**
- Create users (NODAL_OFFICER, STATE_APPROVER, etc.)
- Edit users (with validation)
- Delete/deactivate users
- Assign indicators to NODAL_OFFICER
- Ministry-specific indicator assignment
- Bulk operations
- Search and filter
- Pagination

---

## 🔐 Authentication & Authorization

### User Roles
Defined in `src/utils/roles.js`:
- `NODAL_OFFICER`: State-level data entry officers
- `STATE_APPROVER`: State-level approvers
- `MOSPI_REVIEWER`: MoSPI reviewers
- `MOSPI_APPROVER`: MoSPI approvers
- `MINISTRY_APPROVER`: Ministry-level approvers
- `ADMIN`: System administrators

### Authentication Flow
1. User enters credentials on `/login`
2. `AuthProvider.login()` calls `UserService.login()`
3. Backend returns user data + tokens
4. `authService.setAuth()` stores tokens and user in localStorage
5. `AuthContext` updates with user data
6. Protected routes check `isAuthenticated` and `hasRole()`

### Token Management
- **Storage**: localStorage via `authService`
- **Refresh**: Token refresh logic in `tokenManager` (currently disabled)
- **Interceptors**: Axios interceptors add `Authorization` header
- **Expiry**: Auto-logout on token expiry

### Authorization
- **Route-level**: `ProtectedRoute` checks roles
- **Component-level**: Conditional rendering based on `user.role`
- **API-level**: Backend validates permissions

---

## 🔄 Data Flow

### Submission Workflow

#### Nodal Officer Flow
1. **Create Submission**: Navigate to `/submissions`
2. **Fill Forms**: Complete 4 steps (Infra Financing, Development, PPP, Enablers)
3. **Review**: Check data in Review & Submit step
4. **Submit**: Submit to State Approver
5. **Status**: `DRAFT` → `SUBMITTED_TO_STATE`

#### State Approver Flow
1. **View Submissions**: `/data-submission/review`
2. **Review**: Open submission detail page
3. **Actions**:
   - **Approve**: Forward to MoSPI Reviewer
   - **Reject**: Send back to Nodal Officer with comments
   - **Edit**: Modify submission data
4. **Status**: `SUBMITTED_TO_STATE` → `SUBMITTED_TO_MOSPI_REVIEWER` or `RETURNED_FROM_MOSPI`

#### MoSPI Reviewer Flow
1. **View Submissions**: `/data-submission/review`
2. **Review**: Detailed review of submission
3. **Actions**:
   - **Forward**: Send to MoSPI Approver
   - **Send Back**: Return to State Approver
   - **Comment**: Add review comments
4. **Status**: `SUBMITTED_TO_MOSPI_REVIEWER` → `SUBMITTED_TO_MOSPI_APPROVER` or `RETURNED_FROM_MOSPI`

#### MoSPI Approver Flow
1. **View Submissions**: `/data-submission/review`
2. **Final Review**: Last level of review
3. **Actions**:
   - **Approve**: Final approval
   - **Reject**: Final rejection
4. **Status**: `SUBMITTED_TO_MOSPI_APPROVER` → `APPROVED` or `REJECTED_FINAL`

### Status Flow Diagram
```
DRAFT
  ↓ (Submit)
SUBMITTED_TO_STATE
  ↓ (Approve)                    ↓ (Reject)
SUBMITTED_TO_MOSPI_REVIEWER     RETURNED_FROM_MOSPI
  ↓ (Forward)                    ↓ (Resubmit)
SUBMITTED_TO_MOSPI_APPROVER      DRAFT
  ↓ (Approve)                    ↓ (Reject)
APPROVED                         REJECTED_FINAL
```

---

## 🎯 Key Functionalities

### 1. Form Submission System
- **Multi-step forms**: 4 main steps + review step
- **Auto-save**: Form data persisted automatically
- **Validation**: Field-level and form-level validation
- **Progress tracking**: Visual progress indicators
- **File uploads**: Support for document uploads
- **Indicator-based access**: Users only see assigned indicators

### 2. User Management
- **CRUD operations**: Create, read, update, delete users
- **Role assignment**: Assign roles to users
- **Indicator assignment**: Assign indicators to NODAL_OFFICER
- **State scoping**: Users scoped to states
- **Ministry assignment**: Ministry approvers can assign indicators
- **Bulk operations**: Bulk delete/deactivate

### 3. Review & Approval Workflow
- **Multi-level review**: State → MoSPI Reviewer → MoSPI Approver
- **Comments system**: Add comments at each stage
- **Status tracking**: Real-time status updates
- **Timeline view**: View submission history
- **Editable review**: Reviewers can edit submissions
- **State aggregation**: Aggregate state-level data

### 4. Dashboard & Analytics
- **Role-based dashboards**: Different views per role
- **KPI cards**: Key performance indicators
- **Submission tables**: List and filter submissions
- **Progress tracking**: Visual progress indicators
- **Recent activity**: Activity feed
- **Deadline tracking**: Upcoming deadlines

### 5. Ranking & Scoring
- **State rankings**: Rank states by scores
- **Category-wise scoring**: Scores by category
- **Export functionality**: Export rankings
- **Filters**: Filter by state, category, etc.
- **Charts**: Visual representation of rankings

### 6. Notification System
- **In-app notifications**: Notification center
- **Toast notifications**: Temporary notifications
- **Unread badges**: Unread notification count
- **Real-time updates**: Live notification updates

### 7. File Management
- **Upload**: Upload files to submissions
- **Download**: Download uploaded files
- **Preview**: Preview files in browser
- **Delete**: Remove files from submissions

### 8. Indicator Access Control
- **Role-based access**: Users see only assigned indicators
- **Section-level access**: Control access at section level
- **Dynamic forms**: Forms adapt to user's assigned indicators
- **Progress calculation**: Progress based on assigned indicators

---

## 🔌 Services & API Layer

### Core Services

#### API Service (`src/services/api.service.ts`)
**Main API service** (4900+ lines) - Handles all backend communication:
- User management (CRUD)
- Submission management (CRUD, workflow actions)
- File upload/download
- Dashboard data
- Indicator management
- Audit logs
- Ranking data

**Key Methods:**
- `login()`, `register()`, `logout()`
- `getSubmissions()`, `getSubmissionById()`, `createSubmission()`, `updateSubmission()`
- `approveSubmission()`, `rejectSubmission()`, `forwardToMospi()`
- `uploadFile()`, `deleteFile()`
- `getAllUsers()`, `getUsersByState()`, `createUser()`, `updateUser()`, `deactivateUser()`
- `getAllIndicators()`, `getSubmittedIndicatorsInState()`

#### Auth Service (`src/services/auth.service.ts`)
- Token storage and retrieval
- User data management
- Authentication state
- Token refresh logic

#### Workflow Service (`src/services/workflow.service.ts`)
- Workflow state management
- Status transitions
- Action handlers

#### Other Services
- **ministry.service.ts**: Ministry-related operations
- **states.service.ts**: State data management
- **ulb.service.ts**: ULB (Urban Local Body) data
- **notification.service.ts**: Notification management
- **draft.service.ts**: Draft management
- **scoring.service.ts**: Scoring calculations
- **storage.service.ts**: LocalStorage abstraction

### API Endpoints (`src/config/endpoints.ts`)
Centralized endpoint configuration:
- `auth.*`: Authentication endpoints
- `submission.*`: Submission endpoints
- `file.*`: File management endpoints
- `dashboard.*`: Dashboard endpoints
- `users.*`: User management endpoints
- `report.*`: Reporting endpoints
- `audit.*`: Audit log endpoints
- `ulb.*`: ULB endpoints

---

## 📊 Data Models

### User Model
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "NODAL_OFFICER" | "STATE_APPROVER" | "MOSPI_REVIEWER" | "MOSPI_APPROVER" | "MINISTRY_APPROVER" | "ADMIN";
  state: string;
  stateUt: string;
  stateId: string;
  assignedIndicators: string[];
  ministryId?: string;
  isActive: boolean;
  contactNumber?: string;
}
```

### Submission Model
```typescript
{
  id: string;
  userId: string;
  stateUt: string;
  status: "DRAFT" | "SUBMITTED_TO_STATE" | "SUBMITTED_TO_MOSPI_REVIEWER" | "SUBMITTED_TO_MOSPI_APPROVER" | "APPROVED" | "RETURNED_FROM_MOSPI" | "REJECTED_FINAL";
  formData: {
    infraFinancing: {...},
    infraDevelopment: {...},
    pppDevelopment: {...},
    infraEnablers: {...}
  };
  reviewComments: ReviewComment[];
  section_status: {
    completedCount: number;
    totalAssigned: number;
    completedIndicators: string[];
  };
  createdAt: string;
  updatedAt: string;
}
```

### Indicator Model
```typescript
{
  id: string;
  code: string; // e.g., "1.1", "2.3"
  name: string;
  category: string;
  section: string;
  maxScore: number;
  description?: string;
}
```

---

## 🎨 UI/UX Features

### Design System
- **Theme**: Dark/light mode support
- **Accessibility**: WCAG compliant components
- **Responsive**: Mobile-first design
- **Typography**: Government portal style
- **Colors**: Professional blue palette

### Key UI Components
- **50+ shadcn/ui components**: Buttons, inputs, dialogs, tables, etc.
- **Custom components**: Submission cards, status badges, progress indicators
- **Form components**: Multi-step forms, validation displays
- **Data visualization**: Charts, tables, KPI cards

---

## 🔧 Configuration

### Environment Variables (`src/config/environment.ts`)
- `VITE_USE_MOCK`: Toggle mock/real API
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_LOGIN_PATH`: Login endpoint path
- `VITE_FORMS_PATH`: Forms endpoint path

### Build Configuration
- **Vite**: Fast build tool
- **TypeScript**: Type safety
- **ESLint**: Code linting
- **Tailwind**: Utility-first CSS

---

## 📝 Key Files Reference

### Entry Points
- `src/main.tsx`: Application entry point
- `src/App.tsx`: Main app component with routing

### Core Configuration
- `src/config/endpoints.ts`: API endpoints
- `src/config/environment.ts`: Environment config
- `src/utils/roles.js`: Role definitions and menu config

### Type Definitions
- `src/types/index.ts`: Main type definitions
- `src/types/submission.ts`: Submission types
- `src/types/user.ts`: User types

### Utilities
- `src/utils/indicatorUtils.ts`: Indicator utilities
- `src/utils/statusUtils.ts`: Status management
- `src/utils/progressUtils.ts`: Progress calculations
- `src/utils/formDataTransformer.ts`: Data transformation

---

## 🚀 Development Workflow

### Adding a New Feature
1. Create feature folder in `src/features/`
2. Add components, hooks, services
3. Add route in `App.tsx`
4. Add menu item in `MENU_CONFIG` (if needed)
5. Update types in `src/types/`

### Adding a New API Endpoint
1. Add endpoint to `src/config/endpoints.ts`
2. Add method to `src/services/api.service.ts`
3. Use in feature components

### Adding a New Role
1. Add role to `ROLES` in `src/utils/roles.js`
2. Add display name to `ROLE_DISPLAY_NAMES`
3. Update `MENU_CONFIG` with role permissions
4. Create role-specific dashboard (if needed)
5. Update route protection logic

---

## 📚 Additional Resources

### Documentation Files
- `README.md`: Project setup and overview
- `NIRI_Documentation.md`: Detailed documentation
- `docs/TESTING.md`: Testing guidelines
- `docs/kt/`: Knowledge transfer documents

### Key Concepts
- **Indicator-based access**: Users only see/access assigned indicators
- **Multi-level workflow**: State → MoSPI Reviewer → MoSPI Approver
- **Form persistence**: Auto-save form data
- **Role-based UI**: Different interfaces per role
- **State scoping**: Data scoped to user's state

---

## 🎯 Summary

This is a **comprehensive government portal application** for managing National Infrastructure Readiness Index (NIRI) submissions with:

- **6 user roles** with different permissions
- **Multi-step form submission** workflow
- **4-level approval process** (Nodal → State → MoSPI Reviewer → MoSPI Approver)
- **20+ indicator sections** across 4 categories
- **Role-based dashboards** and menus
- **Comprehensive user management** system
- **File upload/download** capabilities
- **Real-time notifications** and status tracking
- **Ranking and scoring** system
- **State-level aggregation** and review

The application follows **modern React best practices** with TypeScript, feature-based architecture, and a clean separation of concerns.



