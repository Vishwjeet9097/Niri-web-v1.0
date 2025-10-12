# 📚 NIRI Web Application - Complete Documentation

## 🎯 Project Overview

- **Name:** NIRI (National Infrastructure Readiness Index) Web Application
- **Tech Stack:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js API with JWT Authentication
- **Database:** PostgreSQL with JSONB support

---

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── layout/          # Layout components (Sidebar, Topbar)
│   └── ui/              # Base UI components (Button, Input, etc.)
├── features/            # Feature-based modules
│   ├── auth/            # Authentication
│   ├── dashboard/       # Dashboard pages
│   ├── userManagement/  # User management
│   ├── submission/      # Data submission
│   └── notifications/   # Notification system
├── services/            # API services
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
└── config/              # Configuration files
```

---

## 🔐 Authentication System

### Roles & Permissions:

- **NODAL_OFFICER:** Data submission, view own data
- **STATE_APPROVER:** Review submissions, user management
- **MOSPI_REVIEWER:** Review state submissions
- **MOSPI_APPROVER:** Final approval authority
- **ADMIN:** Full system access

### JWT Token Management:

```typescript
// Token storage and refresh
const tokens = {
  accessToken: "jwt_token_here",
  refreshToken: "",
  tokenType: "Bearer",
  expiresIn: "3600",
  expiresAt: Date.now() + 3600000,
};
```

---

## 📊 Dashboard System

### Role-Based Dashboards:

#### 1. Nodal Officer Dashboard:

- KPI Cards: Total Submissions, Pending, Under Review, Approved
- Latest Submissions table
- Quick Actions and Tips
- Upcoming Deadlines

#### 2. State Approver Dashboard:

- 8 KPI Cards: Total, Overdue, Pending, Approved, Sent Back, Returned from MoSPI, Average Review Time, Success Rate
- Submissions review table
- Recent Actions
- Quick Actions

#### 3. MoSPI Reviewer Dashboard:

- Review submissions from states
- Provide feedback
- Track review progress

#### 4. MoSPI Approver Dashboard:

- Final approval authority
- View all submissions
- Generate reports

---

## 🛠️ API Integration

### Base API Service:

```typescript
class ApiService {
  // Authentication
  async login(email: string, password: string);
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string,
    stateUt: string
  );
  async getProfile();
  async changePassword(currentPassword: string, newPassword: string);

  // User Management
  async getAllUsers();
  async getUsersByState(state: string);
  async getUsersByRole(role: string, stateUt?: string);
  async getUserById(id: string);
  async updateUser(id: string, userData: Partial<NiriUser>);
  async deactivateUser(id: string);

  // Submissions
  async createSubmission(submissionData: any);
  async getSubmissions(page?: number, limit?: number);
  async getSubmission(id: string);
  async updateSubmission(id: string, data: any);
  async deleteSubmission(id: string);

  // Dashboard
  async getDashboardSummary();
  async getRoleKPIs(role?: string);

  // File Management
  async uploadFile(submissionId: string, file: File);
  async uploadMultipleFiles(submissionId: string, files: File[]);
  async getFileUrl(filePath: string);
  async deleteFile(filePath: string);
}
```

---

## 📝 Data Submission System

### Submission Workflow:

1. **DRAFT** - Initial creation
2. **SUBMITTED_TO_STATE** - Sent for state review
3. **APPROVED** - State approved
4. **REJECTED** - State rejected
5. **SUBMITTED_TO_MOSPI** - Sent to MoSPI
6. **MOSPI_APPROVED** - MoSPI approved
7. **MOSPI_REJECTED** - MoSPI rejected
8. **RETURNED_FROM_MOSPI** - Returned from MoSPI
9. **RETURNED_FROM_STATE** - Returned from State

### NIRI Submission Data Structure:

```typescript
interface NiriSubmission {
  state_ut_id: string;
  submission_status: string;
  submission_date: string;
  submitted_by_user_id: string;
  submission_data: {
    Infrastructure_Financing: IndicatorData[];
    Infrastructure_Development: IndicatorData[];
    PPP_Development: IndicatorData[];
    Infrastructure_Enablers: IndicatorData[];
  };
}

interface IndicatorData {
  indicator_id: string;
  indicator_name: string;
  user_fill_value_a1: number | string;
  user_fill_value_a2: number | string | null;
  details?: {
    planned_sectors?: Array<{ sector: string; plan_year: number }>;
    projects_submitted?: Array<{ project_name: string; fund_type: string }>;
    projects_planned_via_pmgs?: Array<{ project_name: string }>;
    practices_list?: Array<{ name: string }>;
  };
}
```

### Sample NIRI Submission JSON:

```json
{
  "state_ut_id": "Maharashtra",
  "submission_status": "SUBMITTED_TO_REVIEWER",
  "submission_date": "2025-10-11T14:05:00Z",
  "submitted_by_user_id": "nodal_officer_maharashtra",
  "submission_data": {
    "Infrastructure_Financing": [
      {
        "indicator_id": "1.1",
        "indicator_name": "% of Capex (Budgetary Capital Allocation) to GSDP",
        "user_fill_value_a1": 25000,
        "user_fill_value_a2": 800000
      }
    ],
    "Infrastructure_Development": [...],
    "PPP_Development": [...],
    "Infrastructure_Enablers": [...]
  }
}
```

---

## 👥 User Management System

### User Creation Form:

```typescript
interface UserFormData {
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  password: string; // Required for new users
  role: string;
}
```

### Role-Based Access:

- **STATE_APPROVER:** Can create NODAL_OFFICER (MoSPI roles disabled)
- **ADMIN:** Can create all roles
- **Others:** Can only create NODAL_OFFICER

### API Payload:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "NODAL_OFFICER",
  "stateUt": "Maharashtra"
}
```

---

## 🎨 UI Components

### KPI Cards:

```typescript
interface KPICard {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType;
  variant: "blue" | "green" | "red" | "orange" | "yellow" | "purple";
}
```

### Submission Cards:

```typescript
interface SubmissionCard {
  id: string;
  title: string;
  status: string;
  referenceId: string;
  updatedDate: string;
  dueDate: string;
  progress: number;
  nextStep: string;
  reviewerNote?: string;
}
```

---

## 🔧 Configuration

### Environment Variables:

```typescript
// src/config/environment.ts
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  APP_NAME: "NIRI",
  VERSION: "1.0.0",
};
```

### Role Configuration:

```typescript
// src/utils/roles.js
export const ROLES = {
  NODAL_OFFICER: "NODAL_OFFICER",
  MOSPI_REVIEWER: "MOSPI_REVIEWER",
  MOSPI_APPROVER: "MOSPI_APPROVER",
  STATE_APPROVER: "STATE_APPROVER",
  ADMIN: "ADMIN",
};
```

---

## 🚀 Key Features

### 1. Real-time Data Updates:

- Backend API integration
- Automatic data refresh
- Error handling with fallbacks

### 2. Responsive Design:

- Mobile-first approach
- Tablet and desktop optimized
- Flexible grid layouts

### 3. Error Handling:

- HTTP status code handling
- User-friendly error messages
- Fallback to dummy data

### 4. Security:

- JWT token authentication
- Role-based access control
- Protected routes

### 5. User Experience:

- Toast notifications
- Loading states
- Form validation
- Progress indicators

---

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  .grid-cols-2 {
    /* 2 cards per row */
  }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1024px) {
  .md:grid-cols-3 {
    /* 3 cards per row */
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .lg:grid-cols-4 {
    /* 4 cards per row */
  }
  .lg:grid-cols-6 {
    /* 6 cards per row */
  }
}
```

---

## 🐛 Troubleshooting

### Common Issues:

1. **"Cannot read properties of undefined (reading 'map')"**

   - Solution: Add optional chaining (`?.`) and default empty arrays

2. **"Unauthorized access"**

   - Solution: Check role permissions in `roles.js` and route protection

3. **"API 500 error"**

   - Solution: Check backend API status and fallback to dummy data

4. **"Form validation errors"**
   - Solution: Ensure all required fields are filled and properly validated

---

## 📋 Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## 🔄 Data Flow

1. **User Login** → JWT Token → Role-based Dashboard
2. **Data Submission** → Form Validation → Backend API → Status Update
3. **Review Process** → State Review → MoSPI Review → Final Approval
4. **User Management** → Create/Update/Delete → Backend API → UI Update

---

## 📊 API Endpoints Reference

### Authentication:

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get user profile
- `PUT /auth/change-password` - Change password

### User Management:

- `GET /users` - Get all users
- `GET /users/by-state/:state` - Get users by state
- `GET /users/by-role/:role` - Get users by role
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Deactivate user

### Submissions:

- `POST /submission` - Create submission
- `GET /submission` - Get all submissions
- `GET /submission/:id` - Get submission by ID
- `PATCH /submission/:id` - Update submission
- `DELETE /submission/:id` - Delete submission

### Dashboard:

- `GET /dashboard/summary` - Get dashboard summary
- `GET /dashboard/kpis` - Get KPI data

### File Management:

- `POST /file/upload/:submissionId` - Upload single file
- `POST /file/upload-multiple/:submissionId` - Upload multiple files
- `GET /file/url/:filePath` - Get file URL
- `DELETE /file/:filePath` - Delete file

---

## 🎯 Implementation Checklist

### ✅ Completed Features:

- [x] Authentication system with JWT
- [x] Role-based access control
- [x] Dashboard for all roles
- [x] User management CRUD
- [x] Data submission workflow
- [x] File upload system
- [x] Responsive design
- [x] Error handling
- [x] Dummy data fallbacks
- [x] Status code handling
- [x] HTTP 304 caching
- [x] Form validation
- [x] Toast notifications

### 🔄 In Progress:

- [ ] Advanced reporting features
- [ ] Audit trail implementation
- [ ] Email notifications
- [ ] Data export functionality

---

## 📞 Support

For technical support or questions:

- Check the troubleshooting section above
- Review the API endpoints reference
- Check browser console for error logs
- Verify backend API status

---

**Documentation Version:** 1.0.0  
**Last Updated:** January 2025  
**Project:** NIRI Web Application
