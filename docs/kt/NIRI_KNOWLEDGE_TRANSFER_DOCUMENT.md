# 📘 NIRI Web Application - Complete Knowledge Transfer Document

## संपूर्ण नॉलेज ट्रांसफर दस्तावेज़

**प्रोजेक्ट नाम:** NIRI (National Infrastructure Readiness Index) Web Application  
**वर्जन:** 1.0  
**तिथि:** अक्टूबर 2025  
**तकनीकी ढेर:** React 18, TypeScript, Vite, Tailwind CSS, React Query

**विकसित किया:** AI Hackathon Team

- Sanchita Bhardwaj
- Vishwjeet Kumar
- Sarabjeet Singh
- Others

---

## 📋 Table of Contents

1. [प्रोजेक्ट अवलोकन](#1-प्रोजेक्ट-अवलोकन)
2. [आर्किटेक्चर और प्रौद्योगिकी स्टैक](#2-आर्किटेक्चर-और-प्रौद्योगिकी-स्टैक)
3. [प्रोजेक्ट संरचना](#3-प्रोजेक्ट-संरचना)
4. [प्रमाणीकरण प्रणाली](#4-प्रमाणीकरण-प्रणाली)
5. [रोल-आधारित पहुंच नियंत्रण](#5-रोल-आधारित-पहुंच-नियंत्रण)
6. [डैशबोर्ड प्रणाली](#6-डैशबोर्ड-प्रणाली)
7. [सबमिशन वर्कफ़्लो](#7-सबम징न-वर्कफ्लो)
8. [API और सेवाएं](#8-api-और-सेवाएं)
9. [सुविधा विवरण](#9-सुविधा-विवरण)
10. [स्थापना और विकास](#10-स्थापना-और-विकास)
11. [परिनियोजन](#11-परिनियोजन)
12. [समस्या निवारण](#12-समस्या-निवारण)

---

## 1. प्रोजेक्ट अवलोकन

### 1.1 संक्षिप्त विवरण

NIRI एक **National Infrastructure Readiness Index** मूल्यांकन प्लेटफ़ॉर्म है जो भारत के सभी राज्यों और केंद्र शासित प्रदेशों की अवसंरचना तत्परता को मापता है। यह उपयोगकर्ता लॉगिन, डेटा प्रस्तुत करना, समीक्षा, अनुमोदन और रिपोर्टिंग का समर्थन करता है।

### 1.2 मुख्य उद्देश्य

- राज्यों से अवसंरचना डेटा एकत्र करना
- चरणबद्ध समीक्षा और अनुमोदन
- रैंकिंग और स्कोरिंग
- यूज़र मैनेजमेंट
- एडिट ट्रेल और नोटिफ़िकेशन

### 1.3 प्रौद्योगिकी स्टैक

| Category               | Technologies                        |
| ---------------------- | ----------------------------------- |
| **Frontend Framework** | React 18.3.1, TypeScript 5.8.3      |
| **Build Tool**         | Vite 5.4.19                         |
| **Styling**            | Tailwind CSS 3.4.17                 |
| **UI Components**      | Radix UI, shadcn/ui                 |
| **State Management**   | React Context, React Query 5.83.0   |
| **Routing**            | React Router DOM 6.30.1             |
| **HTTP Client**        | Axios 1.12.2                        |
| **Forms**              | React Hook Form 7.61.1, Zod 3.25.76 |
| **Authentication**     | JWT Tokens                          |
| **Icons**              | Lucide React 0.462.0                |
| **Charts**             | Recharts 2.15.4                     |

---

## 2. आर्किटेक्चर और प्रौद्योगिकी स्टैक

### 2.1 आर्किटेक्चरल अवलोकन

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
├─────────────────────────────────────────────────────────────┤
│  Features (Modular)    │  Components (Reusable)             │
│  ├─ auth/             │  ├─ layout/ (Sidebar, Topbar)      │
│  ├─ dashboard/        │  ├─ ui/ (Buttons, Cards, etc.)     │
│  ├─ submission/       │  ├─ IndicatorSections/             │
│  ├─ dataSubmission/   │  └─ modals/                        │
│  ├─ userManagement/   │                                     │
│  └─ notifications/    │                                     │
├─────────────────────────────────────────────────────────────┤
│  Services Layer (Business Logic)                            │
│  ├─ apiService.ts (API calls with interceptors)            │
│  ├─ authService.ts (JWT token management)                  │
│  ├─ workflowService.ts (Status transitions)                │
│  ├─ storageService.ts (localStorage abstraction)           │
│  └─ notificationService.ts (Toasts + in-app alerts)        │
├─────────────────────────────────────────────────────────────┤
│  Configuration Layer                                        │
│  ├─ config/endpoints.ts (API endpoints)                    │
│  ├─ config/environment.ts (Environment variables)          │
│  └─ vite.config.ts (Build configuration)                   │
├─────────────────────────────────────────────────────────────┤
│  Utils & Helpers                                            │
│  ├─ utils/statusUtils.ts (Status management)              │
│  ├─ utils/indicatorUtils.ts (Indicator access control)    │
│  ├─ utils/roles.js (Role definitions)                     │
│  └─ utils/tokenManager.ts (Token monitoring)              │
├─────────────────────────────────────────────────────────────┤
│                     Backend API                              │
│  Node.js + PostgreSQL with JWT Authentication               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 File Structure Explained

```
src/
├── api/                          # API data files
│   └── rankingData.js           # Mock ranking data
│
├── app/                          # App-level providers
│   ├── AppProviders.tsx         # QueryClient provider
│   ├── ErrorBoundary.tsx        # Global error boundary
│   └── ThemeProvider.tsx        # Theme management
│
├── components/                   # Reusable UI components
│   ├── layout/                  # Layout components
│   │   ├── DashboardLayout.tsx  # Main dashboard layout
│   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   └── Topbar.jsx           # Header with user info
│   │
│   ├── ui/                      # Base UI components (shadcn/ui)
│   │   ├── button.tsx           # Buttons
│   │   ├── card.tsx             # Cards
│   │   ├── dialog.ts/k          # Modals
│   │   ├── input.tsx            # Form inputs
│   │   └── ... (50+ components)
│   │
│   ├── IndicatorSections/       # NIRI Form Sections (20 indicators)
│   │   ├── Section1_1_CapexToGSDP.tsx
│   │   ├── Store2_2_InfrastructureActPolicy.tsx
│   │   └── ... (18 more sections)
│   │
│   ├── RankingScoring/          # Ranking & Scoring page
│   │   ├── RankingScoringPage.jsx
│   │   ├── StateRankingTable.jsx
│   │   └── BenchmarkingAnalysis.jsx
│   │
│   └── ProtectedRoute.tsx       # Route protection HOC
│
├── config/                      # Configuration
│   ├── endpoints.ts             # API endpoint definitions
│   └── environment.ts           # Environment variables
│
├── features/                    # Feature-based modules
│   ├── auth/                    # Authentication
│   │   ├── AuthProvider.jsx     # Auth context provider
│   │   └── LoginPage.tsx        # Login form
│   │
│   ├── dashboard/               # Dashboards
│   │   ├── RoleBasedDashboard.tsx        # Router to role-specific dashboards
│   │   ├── NodalDashboardPage.tsx        # Nodal officer dashboard
│   │   ├── StateApproverDashboardPage.tsx # State approver dashboard
│   │   ├── ReviewerDashboardPage.tsx     # MoSPI reviewer dashboard
│   │   ├── MospiApproverDashboardPage.tsx # MoSPI approver dashboard
│   │   └── components/          # Dashboard components
│   │       ├── nodal/          # Nodal-specific components
│   │       ├── approver/       # Approver-specific components
│   │       └── reviewer/       # Reviewer-specific components
│   │
│   ├── submission/              # Data submission flow
│   │   ├── pages/               # Step pages
│   │   │   ├── SubmissionLayout.tsx      # Multi-step form layout
│   │   │   ├── InfraFinancingStep.tsx    # Step 1
│   │   │   ├── InfraDevelopmentStep.tsx  # Step 2
│   │   │   ├── PPPDevelopmentStep.tsx    # Step 3
│   │   │   ├── InfraEnablersStep.tsx     # Step 4
│   │   │   ├── ReviewSubmitStep.tsx      # Step 5
│   │   │   └── PreviewPage.tsx           # Preview page
│   │   ├── components/          # Form components
│   │   │   ├── NiriSubmissionForm.tsx    # Main form logic
│   │   │   ├── ProgressHeader.tsx        # Step indicator
│   │   │   ├── FormActions.tsx           # Navigation buttons
│   │   │   └── FileUploadSection.tsx     # File upload
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useFormPersistence.ts     # Save draft locally
│   │   │   ├── useFormValidation.ts      # Form validation
│   │   │   └── useStepNavigation.ts      # Step navigation
│   │   ├── constants/           # Constants
│   │   │   └── steps.ts         # Step definitions
│   │   └── types/               # TypeScript types
│   │
│   ├── dataSubmission/          # Review and edit submissions
│   │   ├── pages/               # Review pages
│   │   │   ├── SubmissionListPage.tsx          # List all submissions
│   │   │   ├── SubmissionDetailPage.tsx        # Review submission (State)
│   │   │   ├── MospiApproverSubmissionDetailPage.tsx # Review (MoSPI)
│   │   │   └── EditSubmissionPage.tsx          # Edit submission
│   │   ├── components/          # Review components
│   │   │   ├── tabs/            # Tab components
│   │   │   │   ├── OverviewTab.tsx            # Overview
│   │   │   │   ├── DataReviewTab.tsx          # Data review
│   │   │   │   ├── HistoryTab.tsx             # Timeline
│   │   │   │   ├── DocumentsTab.tsx           # Attachments
│   │   │   │   ├── ChecklistTab.tsx           # Validation
│   │   │   │   └── MospiApproverDataReviewTab.tsx # MoSPI review
│   │   │   ├── modals/          # Action modals
│   │   │   │   ├── ApproveModal.tsx           # Approve action
│   │   │   │   ├── RejectModal.tsx            # Reject action
│   │   │   │   ├── SendBackModal.tsx          # Return for changes
│   │   │   │   ├── SendToApproverModal.tsx    # Forward to approver
│   │   │   │   └── TimelineModal.tsx          # View timeline
│   │   │   └── dataReview/      # Data review components
│   │   │
│   ├── userManagement/          # User management
│   │   ├── UserManagementPage.tsx
│   │   ├── components/
│   │   │   ├── UserTable.tsx    # Users list
│   │   │   └── UserForm.tsx     # Create/Edit user
│   │   └── services/
│   │       └── userManagement.service.ts
│   │
│   └── notifications/           # Notification system
│       └── NotificationCenter.tsx
│
├── services/                    # Business logic services
│   ├── api.service.ts           # Main API service (2278 lines)
│   ├── auth.service.ts          # Authentication service
│   ├── workflow.service.ts      # Workflow management
│   ├── storage.service.ts       # localStorage wrapper
│   ├── notification.service.ts  # Notification service
│   ├── UserService.ts           # User management
│   ├── states.service.ts        # State data
│   ├── draft.service.ts         # Draft management
│   ├── scoring.service.ts       # Scoring logic
│   └── http-client.ts           # HTTP client wrapper
│
├── types/                       # TypeScript type definitions
│   ├── index.ts                 # Main types
│   ├── submission.ts            # Submission types
│   └── user.ts                  # User types
│
├── utils/                       # Utility functions
│   ├── roles.js                 # Role definitions
│   ├── statusUtils.ts           # Status management
│   ├── indicatorUtils.ts        # Indicator access
│   ├── tokenManager.ts          # Token monitoring
│   ├── draftUtils.ts            # Draft utilities
│   ├── auditUtils.ts            # Audit utilities
│   ├── formDataTransformer.ts   # Data transformation
│   └── userUtils.ts             # User utilities
│
├── routes/                      # Route definitions
│   └── ProtectedRoute.tsx       # Protected route wrapper
│
├── pages/                       # Top-level pages
│   ├── Index.tsx                # Home/redirect
│   ├── NotFound.tsx             # 404 page
│   └── PlaceholderPage.tsx      # Placeholder pages
│
├── hooks/                       # Custom React hooks
│   ├── useIndicatorAccess.ts    # Indicator access control
│   └── use-toast.ts             # Toast notifications
│
├── App.tsx                      # Main app component (routes)
└── main.tsx                     # App entry point
```

---

## 3. प्रोजेक्ट संरचना

### 3.1 स्थानीय निर्भरताएं स्थापित करना

```bash
# Install dependencies
npm install

# या
bun install  # यदि Bun इंस्टॉल है
```

### 3.2 डेवलपमेंट सर्वर चलाना

```bash
# Start Kotlin development server on port 8080
npm run dev

# या
bun dev

# App will be available at http://localhost:8080
```

### 3.3 बिल्ड कमांड्स

```bash
# Build for production
npm run build

# Build for development environment
npm run build:dev

# Preview production build locally
npm run preview
```

### 3.4 अन्य कमांड्स

```bash
# Lint code
npm run lint

# Type checking (add to package.json if needed)
tsc --noEmit
```

---

## 4. प्रमाणीकरण प्रणाली

### 4.1 JWT Token Management

प्रोजेक्ट में **पूर्ण JWT token प्रबंधन** है:

#### 4.1.1 Token Lifecycle

```
Login → Get Tokens → Store in localStorage → Monitor Expiry → Auto Refresh → Logout
```

#### 4.1.2 Token Storage

```typescript
// Location: src/services/auth.service.ts
const tokens = {
  accessToken: "jwt_access_token",
  refreshToken: "jwt_refresh_token",
  tokenType: "Bearer",
  expiresIn: "3600", // seconds
  expiresAt: 1234567890, // Unix timestamp
};
```

#### 4.1.3 Auto Token Refresh

Token expiry से 5 मिनट पहले स्वचाल Retro refresh:

```typescript:src/services/auth.service.ts
// Check if token is expiring soon
isTokenExpiringSoon(): boolean {
  if (!this.tokens || !this.tokens.expiresAt) return false;
  // Refresh if less than 5 minutes remaining
  return (this.tokens.expiresAt - Date.now()) < 5 * 60 * 1000;
}
```

### 4.2 Authentication Flow

#### 4.2.1 Login Process

```typescript
// 1. User enters credentials
// 2. Call API: POST /auth/login
const response = await apiService.login(email, password);

// 3. Process response and store tokens
const { user, tokens } = authService.processLoginResponse(response);

// 4. Start token monitoring
tokenManager.startTokenMonitoring();

// 5. Redirect to dashboard
navigate("/dashboard");
```

#### 4.2.2 Logout Process

```typescript
// 1. Clear tokens and user data
authService.logout();

// 2. Stop token monitoring
tokenManager.stopTokenMonitoring();

// 3. Redirect to login
navigate("/login");
```

### 4.3 Protected Routes

```typescript:src/routes/ProtectedRoute.tsx
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, hasRole } = useAuth();

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role not allowed → redirect to unauthorized
  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

### 4.4 Auth Service Methods

```typescript:src/services/auth.service.ts
class AuthService {
  // Get authentication headers
  getAuthHeaders(): Record<string, string>

  // Check authentication status
  isAuthenticated(): boolean

  // Get current user
  getUser(): User | null

  // Check if token is expiring soon
  isTokenExpiringSoon(): boolean

  // Refresh token
  refreshToken(): Promise<AuthTokens>

  // Logout
  logout(): void
}
```

---

## 5. रोल-आधारित पहुंच नियंत्रण

### 5.1 उपलब्ध रोल्स

```typescript:src/utils/roles.js
export const ROLES = {
  NODAL_OFFICER: "NODAL_OFFICER",      // नोडल अधिकारी
  STATE_APPROVER: "STATE_APPROVER",    // राज्य अनुमोदक
  MOSPI_REVIEWER: "MOSPI_REVIEWER",    // MoSPI समीक्षक
  MOSPI_APPROVER: "MOSPI_APPROVER",    // MoSPI अनुमोदक
  ADMIN: "ADMIN"                        // प्रशासक
};
```

### 5.2 रोल-आधारित अनुमतियाँ

#### 5.2.1 NODAL_OFFICER

- ✅ Create submission
- ✅ Edit own submissions (DRAFT status)
- ✅ View own submissions
- ✅ Submit to state approver
- ✅ View ranking and scores
- ❌ Review others' submissions
- ❌ Approve submissions

#### 5.2.2 STATE_APPROVER

- ✅ Review submissions from nodal officers
- ✅ Approve/Reject submissions
- ✅ Forward to MoSPI
- ✅ Manage users (create nodal officers)
- ✅ View all submissions in state
- ✅ View ranking and scores
- ❌ Create new submissions
- ❌ MoSPI-level actions

#### 5.2.3 MOSPI_REVIEWER

- ✅ Review submissions forwarded from states
- ✅ Add comments
- ✅ Send back for corrections
- ✅ Forward to MoSPI approver
- ✅ View ranking and scores
- ❌ Final approval
- ❌ Create/Edit submissions

#### 5.2.4 MOSPI_APPROVER

- ✅ Final approval authority
- ✅ Approve/Reject submissions
- ✅ View all submissions
- ✅ View ranking and scores
- ✅ Manage users
- ❌ Create/Edit submissions
- ❌ Review-level comments

#### 5.2.5 ADMIN

- ✅ Full system access
- ✅ User management
- ✅ View all data
- ❌ Create submissions
- ❌ Review/Approve workflows

### 5.3 Menu Configuration

```typescript:src/utils/roles.js
export const MENU_CONFIG = [
  { label: "Dashboard", path: "/dashboard",
    roles: [NODAL_OFFICER, STATE_APPROVER, MOSPI_REVIEWER, MOSPI_APPROVER] },
  { label: "User Management", path: "/user-management",
    roles: [STATE_APPROVER, MOSPI_APPROVER, ADMIN] },
  { label: "Create New Submission", path: "/submissions",
    roles: [NODAL_OFFICER] },
  { label: "Review Submission", path: "/data-submission/review",
    roles: [STATE_APPROVER, MOSPI_REVIEWER, MOSPI_APPROVER] },
  { label: "Ranking & Scoring", path: "/ranking",
    roles: [ALL_ROLES] },
];
```

---

## 6. डैशबोर्ड प्रणाली

### 6.1 Role-Based Dashboard Routing

```typescript:src/features/dashboard/RoleBasedDashboard.tsx
const RoleBasedDashboard = () => {
  const { user } = useAuth();

  switch (user?.role) {
    case 'NODAL_OFFICER':
      return <NodalDashboardPage />;
    case 'STATE_APPROVER':
      return <StateApproverDashboardPage />;
    case 'MOSPI_REVIEWER':
      return <ReviewerDashboardPage />;
    case 'MOSPI_APPROVER':
      return <MospiApproverDashboardPage />;
    default:
      return <DashboardPage />;
  }
};
```

### 6.2 Nodal Officer Dashboard

**Location:** `src/features/dashboard/NodalDashboardPage.tsx`

**KPI Cards:**

1. Total Submissions
2. Pending Submissions
3. Under Review
4. Approved Submissions

**Features:**

- Latest Submissions table
- Quick Actions (Create New, View Drafts)
- Quick Tips
- Upcoming Deadlines

### 6.3 State Approver Dashboard

**Location:** `src/features/dashboard/StateApproverDashboardPage.tsx`

**KPI Cards (8):**

1. Total Submissions
2. Overdue Submissions
3. Pending Reviews
4. Approved Submissions
5. Sent Back
6. Returned from MoSPI
7. Average Review Time
8. Success Rate

**Features:**

- Submissions Table (filterable by status)
- Recent Actions
- Quick Actions (Review, Approve, Reject)

### 6.4 MoSPI Reviewer Dashboard

**Location:** `src/features/dashboard/ReviewerDashboardPage.tsx`

**Features:**

- Review Queue
- Submissions forwarded from states
- Add comments
- Forward to approver

### 6.5 MoSPI Approver Dashboard

**Location:** `src/features/dashboard/MospiApproverDashboardPage.tsx`

**Features:**

- All submissions overview
- Final approval queue
- Ranking preview
- Performance metrics

---

## 7. सबमिशन वर्कफ्लो

### 7.1 Workflow States

```typescript:src/services/workflow.service.ts
const WORKFLOW_STATES = {
  DRAFT: "DRAFT",                              // नोडल अधिकारी द्वारा तैयार
  SUBMITTED_TO_STATE: "SUBMITTED_TO_STATE",    // राज्य अनुमोदक के लिए
  SUBMITTED_TO_MOSPI_REVIEWER: "SUBMITTED_TO_MOSPI_REVIEWER", // MoSPI समीक्षक
  SUBMITTED_TO_MOSPI_APPROVER: "SUBMITTED_TO_MOSPI_APPROVER", // MoSPI अनुमोदक
  APPROVED: "APPROVED",                         // अंतिम अनुमोदित
  RETURNED_FROM_MOSPI: "RETURNED_FROM_MOSPI",  // MoSPI से वापस
  REJECTED_FINAL: "REJECTED_FINAL"              // अंतिम रूप से अस्वीकृत
};
```

### 7.2 State Transitions

```
DRAFT
  ↓ (Submit)
SUBMITTED_TO_STATE
  ↓ (Approve) OR ↓ (Reject)
SUBMITTED_TO_MOSPI_REVIEWER → RETURNED_FROM_MOSPI
  ↓ (Forward)
SUBMITTED_TO_MOSPI_APPROVER
  ↓ (Approve) OR ↓ (Reject)
APPROVED → REJECTED_FINAL
```

### 7.3 Submission Creation Flow

#### 7.3.1 Step 1: Infrastructure Financing

**Location:** `src/features/submission/pages/InfraFinancingStep.tsx`  
**Indicators:** 5 indicators (1.1 to 1.5)

1. Section 1.1: Capex to GSDP Ratio
2. Section 1.2: Capex Utilization Rate
3. Section 1.3: Credit Rated ULBs
4. Section 1.4: ULBs Issuing Bonds
5. Section 1.5: Functional Financial Intermediary

#### 7.3.2 Step 2: Infrastructure Development

**Location:** `src/features/submission/pages/InfraDevelopmentStep.tsx`  
**Indicators:** 5 indicators (2.1 to 2.5)

1. Section 2.1: Infrastructure Act/Policy
2. Section 2.2: Specialized Entity
3. Section 2.3: Sector Infrastructure Plan
4. Section 2.4: Investment Ready Pipeline
5. Section 2.5: Asset Monetization Pipeline

#### 7.3.3 Step 3: PPP Development

**Location:** `src/features/submission/pages/PPPDevelopmentStep.tsx`  
**Indicators:** 4 indicators (3.1 to 3.4)

1. Section 3.1: PPP Act/Policy
2. Section 3.2: Functional PPP Cell
3. Section 3.3: VGF/IIPDF Proposals
4. Section 3.4: PPP Bankable Projects

#### 7.3.4 Step 4: Infrastructure Enablers

**Location:** `src/features/submission/pages/InfraEnablersStep.tsx`  
**Indicators:** 6 indicators (4.1 to 4.6)

1. Section 4.1: PMG Portal Eligible Projects
2. Section 4.2: State PMG Portal
3. Section 4.3: PM Gati Shakti Adoption
4. Section 4.4: ADR Adoption
5. Section 4.5: Innovative Practices
6. Section 4.6: Capacity Building

#### 7.3.5 Step 5: Review & Submit

**Location:** `src/features/submission/pages/ReviewSubmitStep.tsx`

- Validation check
- Summary of all sections
- File upload section
- Submit button

#### 7.3.6 Preview Page

**Location:** `src/features/submission/pages/PreviewPage.tsx`

- Complete form preview
- All sections in read-only mode
- Download PDF option

### 7.4 Form Data Structure

```typescript
interface FormData {
  // Section 1: Infrastructure Financing
  capexToGsdpRatio: number;
  capexUtilization: number;
  creditRatedULBs: number;
  ulbsIssuingBonds: number;
  functionalFinancialIntermediary: number;

  // Section 2: Infrastructure Development
  infrastructureActPolicy: number;
  specializedEntity: number;
  sectorInfraPlan: number;
  investmentReadyPipeline: number;
  assetMonetizationPipeline: number;

  // Section 3: PPP Development
  pppActPolicy: number;
  functionalPPPCell: number;
  vgfIipdfProposals: number;
  pppBankableProjects: number;

  // Section 4: Infrastructure Enablers
  pmgPortalEligibleProjects: number;
  statePmgPortal: number;
  pmGatiShaktiAdoption: number;
  adrAdoption: number;
  innovativePractices: number;
  capacityBuilding: number;
}
```

### 7.5 Draft Auto-Save

```typescript:src/features/submission/hooks/useFormPersistence.ts
// Auto-save to localStorage every 30 seconds
const autoSave = useCallback(() => {
  if (hasChanges) {
    storageService.set('niri-draft', formData);
    setHasChanges(false);
  }
}, [formData, hasChanges]);

useEffect(() => {
  const interval = setInterval(autoSave, 30000);
  return () => clearInterval(interval);
}, [autoSave]);
```

---

## 8. API और सेवाएं

### 8.1 API Endpoints Configuration

**Location:** `src/config/endpoints.ts`

```typescript
const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    profile: "/auth/profile",
    changePassword: "/auth/change-password",
  },
  submission: {
    root: "/submission",
    byId: (id) => `/submission/${id}`,
    comment: (id) => `/submission/${id}/comment`,
    forwardToMospi: (id) => `/submission/forward-to-mospi/${id}`,
    approve: (id) => `/submission/approve/${id}`,
    // ... more endpoints
  },
  users: {
    root: "/users",
    byState: (state) => `/users/by-state/${state}`,
    byRole: (role) => `/users/by-role/${role}`,
  },
  dashboard: {
    summary: "/dashboard/summary",
    kpis: "/dashboard/kpis",
  },
};
```

### 8.2 API Service

**Location:** `src/services/api.service.ts` (2278 lines)

#### 8.2.1 Main Methods

```typescript
class ApiService {
  // Authentication
  async login(email: string, password: string): Promise<LoginResult>;
  async refreshToken(): Promise<AuthTokens>;

  // Submissions
  async createSubmission(data: any): Promise<NiriSubmission>;
  async getSubmissions(page: number, limit: number): Promise<NiriSubmission[]>;
  async getSubmission(id: string): Promise<NiriSubmission>;
  async updateSubmission(id: string, data: any): Promise<NiriSubmission>;
  async deleteSubmission(id: string): Promise<void>;

  // Workflow Actions
  async submitToState(id: string): Promise<void>;
  async approveSubmission(id: string, comment?: string): Promise<void>;
  async rejectSubmission(id: string, comment: string): Promise<void>;
  async forwardToMospi(id: string): Promise<void>;
  async resubmit(id: string): Promise<void>;

  // Users
  async getAllUsers(): Promise<NiriUser[]>;
  async createUser(userData: any): Promise<NiriUser>;
  async updateUser(id: string, userData: any): Promise<NiriUser>;
  async deactivateUser(id: string): Promise<void>;

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary>;
  async getRoleKPIs(role: string): Promise<KPICard[]>;

  // Files
  async uploadFile(submissionId: string, file: File): Promise<FileUpload>;
  async uploadMultipleFiles(
    submissionId: string,
    files: File[]
  ): Promise<FileUpload[]>;
}
```

#### 8.2.2 Request/Response Interceptors

```typescript:src/services/api.service.ts
// Request interceptor - Add auth token
this.axios.interceptors.request.use((config) => {
  const authHeaders = authService.getAuthHeaders();
  Object.entries(authHeaders).forEach(([key, value]) => {
    config.headers.set(key, value);
  });
  return config;
});

// Response interceptor - Handle errors and token refresh
this.axios.interceptors.response.use(
  (response) => {
    // Success - return data
    return response.data?.data || response.data;
  },
  async (error) => {
    // 401 - Try token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      await authService.refreshToken();
      return this.axios(originalRequest);
    }
    // Other errors
    return Promise.reject(error);
  }
);
```

### 8.3 Workflow Service

**Location:** `src/services/workflow.service.ts`

```typescript
const STATE_TRANSITIONS = {
  DRAFT: [SUBMITTED_TO_STATE],
  SUBMITTED_TO_STATE: [SUBMITTED_TO_MOSPI_REVIEWER, RETURNED_FROM_MOSPI],
  SUBMITTED_TO_MOSPI_REVIEWER: [
    SUBMITTED_TO_MOSPI_APPROVER,
    RETURNED_FROM_MOSPI,
  ],
  SUBMITTED_TO_MOSPI_APPROVER: [APPROVED, RETURNED_FROM_MOSPI],
  // ...
};

const ROLE_PERMISSIONS = {
  NODAL_OFFICER: ["create", "edit", "submit_to_state"],
  STATE_APPROVER: ["approve", "reject", "forward_to_mospi"],
  MOSPI_REVIEWER: ["forward_to_approver", "state_reject"],
  MOSPI_APPROVER: ["approve", "final_reject"],
};
```

---

## 9. सुविधा विवरण

### 9.1 Data Submission (Create New)

**Route:** `/submissions/*`

**Flow:**

1. User clicks "Create New Submission"
2. Redirected to `/submissions/infra-financing`
3. Multi-step form with 4 sections
4. Auto-save drafts
5. Validation before submission
6. Submit to state approver

**Components:**

- `SubmissionLayout.tsx` - Layout wrapper
- `NiriSubmissionForm.tsx` - Form logic
- `ProgressHeader.tsx` - Step indicator
- `FormActions.tsx` - Navigation buttons

### 9.2 Review Submissions

**Route:** `/data-submission/review`

**Roles:** STATE_APPROVER, MOSPI_REVIEWER, MOSPI_APPROVER

**Features:**

- List all submissions (filterable, searchable)
- View submission details in tabs:
  - Overview
  - Data Review
  - History/Timeline
  - Documents
  - Checklist
- Actions: Approve, Reject, Send Back, Forward
- Add comments

**Components:**

- `SubmissionListPage.tsx` - List page
- `SubmissionDetailPage.tsx` - Detail page (State)
- `MospiApproverSubmissionDetailPage.tsx` - Detail page (MoSPI)
- Tab components in `components/tabs/`
- Modal components in `components/modals/`

### 9.3 User Management

**Route:** `/user-management`

**Roles:** STATE_APPROVER, MOSPI_APPROVER, ADMIN

**Features:**

- Create new users
- Edit existing users
- Delete users
- Filter by role, state
- Role-based restrictions

**Components:**

- `UserManagementPage.tsx` - Main page
- `UserTable.tsx` - Users list
- `UserForm.tsx` - Create/Edit form

### 9.4 Ranking & Scoring

**Route:** `/ranking`

**Features:**

- State-wise ranking
- Scoring breakdown
- Benchmarking analysis
- Export to Excel/PDF

**Components:**

- `RankingScoringPage.jsx` - Main page
- `StateRankingTable.jsx` - Ranking table
- `BenchmarkingAnalysis.jsx` - Charts

### 9.5 Notifications

**Location:** `src/features/notifications/NotificationCenter.tsx`

**Features:**

- Toast notifications
- In-app notification center
- Unread badge
- Actionable notifications

### 9.6 Status Management

**Location:** `src/utils/statusUtils.ts`

**Features:**

- Centralized status definitions
- Status-specific colors and icons
- Role-aware status messages
- Status pills for UI

```typescript
const STATUS_MAP = {
  DRAFT: { label: "Draft", className: "bg-gray-100" },
  SUBMITTED_TO_STATE: { label: "Under Review", className: "bg-blue-100" },
  APPROVED: { label: "Approved", className: "bg-green-100" },
  // ... more statuses
};
```

---

## 10. स्थापना और विकास

### 10.1 Prerequisites

- Node.js 18+
- npm or bun
- Modern browser (Chrome, Firefox, Safari, Edge)

### 10.2 Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd Niri-web-v1.0

# Install dependencies
npm install

# Copy environment file (if exists)
cp .env.example .env

# Start development server
npm run dev
```

### 10.3 Environment Variables

Create `.env.local` file:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000

# Mock Mode (for development)
VITE_USE_MOCK=false

# App Configuration
VITE_APP_NAME=NIRI
VITE_APP_VERSION=1.0.0
```

### 10.4 Development Tips

1. **Hot Reload:** विकास सर्वर स्वचालित रूप से परिवर्तन डिटेक्ट करता है
2. **TypeScript:** Type errors से बचने के लिए `tsc --noEmit` चलाएं
3. **Linting:** `npm run lint` से code quality जांचें
4. **Browser DevTools:** Console, Network tab देखें

---

## 11. परिनियोजन

### 11.1 Production Build

```bash
# Build for production
npm run build

# Output will be in dist/ folder
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── ...
```

### 11.2 Docker Deployment

**Dockerfile exists:** `Dockerfile`

```bash
# Build Docker image
docker build -t niri-web .

# Run container
docker run -p 8080:80 niri-web
```

### 11.3 Nginx Configuration

**File:** `nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 11.4 Environment-Specific Builds

```bash
# Development build
npm run build:dev

# Production build
npm run build
```

---

## 12. समस्या निवारण

### 12.1 Common Issues

#### Issue 1: "Cannot read properties of undefined"

**Solution:** Optional chaining का उपयोग करें

```typescript
// Bad
data.submissions.map(...)

// Good
data?.submissions?.map(...) ?? []
```

#### Issue 2: "401 Unauthorized"

**Solution:**

- Token expiry check करें
- `authService.refreshToken()` call करें
- Login page पर redirect करें

#### Issue 3: "API 500 Error"

**Solution:**

- Backend API status check करें
- Network tab में request देखें
- Mock mode enable करें (development में)

### 12.2 Debugging Steps

1. **Browser Console:** F12 → Console
2. **Network Tab:** API requests देखें
3. **Application Tab:** localStorage data check करें
4. **Components Tab:** React DevTools use करें

### 12.3 Key Files for Debugging

- `src/services/api.service.ts` - API calls
- `src/services/auth.service.ts` - Authentication
- `src/utils/statusUtils.ts` - Status management
- `src/routes/ProtectedRoute.tsx` - Route protection

---

## 13. अतिरिक्त संसाधन

### 13.1 Documentation Files

- `NIRI_Documentation.md` - Main documentation
- `NIRI_FORM_REVIEW_REPORT.md` - Form review report
- `src/docs/JWT_TOKEN_MANAGEMENT.md` - Token management
- `src/docs/STATUS_MANAGEMENT.md` - Status management
- `src/docs/INDICATOR_ACCESS_CONTROL.md` - Access control

### 13.2 Important Code Locations

| Feature        | File Path                            |
| -------------- | ------------------------------------ |
| Main App       | `src/App.tsx`                        |
| Routes         | `src/App.tsx` (lines 47-120)         |
| Auth Provider  | `src/features/auth/AuthProvider.jsx` |
| API Service    | `src/services/api.service.ts`        |
| Workflow Logic | `src/services/workflow.service.ts`   |
| Status Utils   | `src/utils/statusUtils.ts`           |
| Role Config    | `src/utils/roles.js`                 |

### 13.3 Testing

**Test Files Location:**

- `src/services/__tests__/` - Service tests
- `docs/TESTING.md` - Testing documentation

---

## 14. Handover Checklist

### 14.1 Code Access

- [ ] Git repository access
- [ ] Node.js/npm installed
- [ ] IDE setup (VS Code recommended)
- [ ] Browser extension (React DevTools)

### 14.2 Backend Access

- [ ] API base URL
- [ ] API credentials (if needed)
- [ ] Backend documentation
- [ ] Database schema (if available)

### 14.3 Environment Setup

- [ ] Development environment variables
- [ ] Production environment variables
- [ ] Mock data files location

### 14.4 Features Understanding

- [ ] Authentication flow
- [ ] Role-based access
- [ ] Submission workflow
- [ ] Review process
- [ ] User management

### 14.5 Important URLs

- Development: `http://localhost:8080`
- Production: `[Production URL]`
- API: `[API URL]`

---

## 15. फ़ीचरों का संक्षिप्त विवरण

### 15.1 Key Metrics

- **Total Files:** 200+
- **Lines of Code:** ~15,000+
- **Components:** 100+
- **Pages:** 15+
- **Services:** 12+
- **Routes:** 10+

### 15.2 Architecture Highlights

- ✅ Feature-based folder structure
- ✅ TypeScript for type safety
- ✅ Centralized state management
- ✅ Reusable UI components
- ✅ Role-based access control
- ✅ Auto token refresh
- ✅ Draft auto-save
- ✅ Responsive design

---

## 16. निष्कर्ष

यह KT document NIRI Web Application का संपूर्ण overview प्रदान करता है। नए developer को:

1. ✅ प्रोजेक्ट की संपूर्ण समझ
2. ✅ आर्किटेक्चर की जानकारी
3. ✅ Features और workflows की details
4. ✅ Development और deployment guidelines
5. ✅ Troubleshooting tips

**सफल Handover के लिए:**

- सभी features test करें
- Backend API से connection verify करें
- सभी roles के साथ login test करें
- Critical workflows verify करें

**समर्थन:**
किसी भी question के लिए, existing code और documentation files देखें।

---

**Document Version:** 1.0  
**Last Updated:** अक्टूबर 2025  
**Prepared For:** Project Handover  
**Status:** Complete ✅  
**Developed By:** AI Hackathon Team (Vishwjeet Kumar, Sarabjeet Singh, Sanchita Bhardwaj & Others)
