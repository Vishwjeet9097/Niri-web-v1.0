# NIRI Dashboard - Production-Ready React Application

A fully responsive, enterprise-grade React dashboard application for the National Infrastructure Readiness Index (NIRI). Built with modern best practices, modular architecture, and seamless mock-to-real API switching.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  Features          │  Components  │  Pages                  │
│  ├─ auth/          │  ├─ layout/  │  ├─ Index              │
│  ├─ dashboard/     │  ├─ ui/      │  └─ NotFound           │
│  └─ notifications/ │  └─ ...      │                         │
├─────────────────────────────────────────────────────────────┤
│  Services Layer (Business Logic & API)                      │
│  ├─ httpClient (switchable: mock ↔ real)                   │
│  ├─ authService (token management + refresh)                │
│  ├─ notificationService (toast + in-app alerts)            │
│  └─ storageService (localStorage abstraction w/ TTL)        │
├─────────────────────────────────────────────────────────────┤
│  Mock Data (JSON)          │  Real API (Axios)             │
│  ├─ dashboard.json         │  ├─ Request interceptors      │
│  ├─ submissions.json       │  ├─ Response interceptors     │
│  └─ notifications.json     │  └─ Auto token refresh        │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── layout/          # Layout components (DashboardLayout)
│   ├── ui/              # shadcn/ui components
│   └── ProtectedRoute.tsx
├── features/            # Feature-based modules
│   ├── auth/           # Authentication (LoginPage)
│   ├── dashboard/      # Dashboard (KPIs, tables, charts)
│   └── notifications/  # NotificationCenter
├── services/           # Business logic & API layer
│   ├── api.service.ts      # Real API with Axios
│   ├── mock.service.ts     # Mock adapter
│   ├── http-client.ts      # Unified client (switchable)
│   ├── auth.service.ts     # Auth + token management
│   ├── notification.service.ts  # Toast + alerts
│   └── storage.service.ts  # localStorage abstraction
├── mock/               # JSON mock data
│   ├── dashboard.json
│   ├── submissions.json
│   └── notifications.json
├── config/             # Configuration
│   └── environment.ts
├── types/              # TypeScript types
│   └── index.ts
├── hooks/              # Custom React hooks
├── pages/              # Top-level pages
└── App.tsx             # Main app component
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern web browser

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd <project-name>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

## 🔧 Environment Configuration

### Switching Between Mock and Real API

The application uses a centralized environment configuration to toggle between mock data and real API endpoints.

**Mock Mode (Default)**
```bash
# .env or .env.local
VITE_USE_MOCK=true
```

**Real API Mode**
```bash
# .env or .env.local
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://api.your-backend.com
```

The `httpClient` in `src/services/http-client.ts` automatically switches between:
- `mockAdapter` - Uses JSON files from `/src/mock/`
- `apiService` - Makes real HTTP requests via Axios

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_USE_MOCK` | Enable mock data mode | `true` |
| `VITE_API_BASE_URL` | Backend API base URL | `https://api.example.com` |

## 🏛️ Core Services

### 1. HTTP Client (`httpClient`)
- **Location**: `src/services/http-client.ts`
- **Purpose**: Unified interface for API calls
- **Features**: Automatic switching between mock/real based on environment

```typescript
import { httpClient } from '@/services/http-client';

// Works with both mock and real API
const data = await httpClient.get('/api/dashboard');
```

### 2. Auth Service (`authService`)
- **Location**: `src/services/auth.service.ts`
- **Features**:
  - Token storage and management
  - Automatic token refresh
  - Authentication state
  - Auth header generation

```typescript
import { authService } from '@/services/auth.service';

// Login
await authService.login(email, password);

// Check authentication
const isAuth = authService.isAuthenticated();

// Get current user
const user = authService.getUser();

// Logout
authService.logout();
```

### 3. Storage Service (`storageService`)
- **Location**: `src/services/storage.service.ts`
- **Features**:
  - Namespaced localStorage keys
  - TTL (time-to-live) support
  - JSON serialization
  - In-memory cache for performance

```typescript
import { storageService } from '@/services/storage.service';

// Set with TTL (30 minutes)
storageService.set('user-prefs', data, 1800);

// Get
const prefs = storageService.get('user-prefs');

// Remove
storageService.remove('user-prefs');
```

### 4. Notification Service (`notificationService`)
- **Location**: `src/services/notification.service.ts`
- **Features**:
  - Toast notifications
  - In-app notification queue
  - Persistent unread counts
  - Subscribe to notification updates

```typescript
import { notificationService } from '@/services/notification.service';

// Show toast only
notificationService.toast({
  title: 'Success',
  message: 'Data saved',
  type: 'success'
});

// Create notification and show toast
notificationService.createAndToast({
  title: 'New submission',
  message: 'Infrastructure data approved',
  type: 'success'
});

// Subscribe to notifications
const unsubscribe = notificationService.subscribe((notifications) => {
  console.log('New notifications:', notifications);
});
```

## 🎨 Design System

The application uses a professional design system inspired by government portals:

**Color Palette**
- Primary: Government Blue (#1B3A8B / hsl(220 65% 32%))
- Success: Green (#45A049)
- Warning: Amber
- Destructive: Red

**Typography**
- System font stack optimized for readability
- Consistent sizing and spacing

**Components**
- Built with shadcn/ui
- Fully customizable with Tailwind CSS
- Accessible by default

## 🧪 Testing

### Example Test Pattern

The project includes an example test demonstrating dependency injection:

**Location**: `src/services/__tests__/example.test.ts`

```typescript
import type { HttpClient } from '@/services/api.service';

// Mock the httpClient
const mockHttpClient: HttpClient = {
  get: async () => ({ data: mockData, success: true }),
  // ... other methods
};

// Use in test
const result = await getDashboardData(mockHttpClient);
```

### Running Tests (Optional)

To set up testing:

```bash
# Install testing dependencies
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom

# Run tests
npm run test
```

## 📦 Key Features

✅ **Production-Ready Architecture**
- Feature-based folder structure
- Separation of concerns
- Dependency injection patterns

✅ **Seamless Mock/Real API Switching**
- Environment variable toggle
- Shared HTTP client interface
- No code changes required

✅ **Enterprise Auth System**
- Token storage and refresh
- Request/response interceptors
- Auto-logout on expiry

✅ **Notification System**
- Toast notifications
- In-app notification center
- Persistent storage
- Unread badge

✅ **Storage Abstraction**
- TTL support
- Namespacing
- In-memory cache
- Type-safe

✅ **Responsive Dashboard**
- KPI cards with trends
- Recent activity feed
- Data table with status badges
- Mobile-friendly sidebar

## 🔐 Authentication Flow

1. User enters credentials on `/auth`
2. `authService.login()` stores tokens and user data
3. All API requests include `Authorization` header via interceptor
4. Token auto-refreshes when expiring soon
5. Expired tokens trigger auto-logout and redirect

## 📊 Dashboard Features

- **KPI Cards**: Total submissions, pending reviews, approvals, completion rate
- **Recent Activity**: Real-time updates on submissions
- **Submissions Table**: Sortable, filterable data with status badges
- **Upcoming Deadlines**: Deadline tracking
- **Notifications**: Bell icon with unread badge

## 🛠️ Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 Adding New Features

### 1. Create a new feature module

```bash
src/features/my-feature/
├── MyFeaturePage.tsx
├── components/
│   └── MyComponent.tsx
└── hooks/
    └── useMyFeature.ts
```

### 2. Add route in `App.tsx`

```typescript
<Route path="/my-feature" element={<MyFeaturePage />} />
```

### 3. Add navigation item in `DashboardLayout.tsx`

```typescript
{ name: 'My Feature', href: '/my-feature', icon: MyIcon }
```

## 🔄 Migrating to Real Backend

1. **Update environment**:
   ```bash
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=https://your-api.com
   ```

2. **Ensure API matches mock structure**:
   - Same endpoint paths
   - Same response format
   - Authentication headers

3. **No code changes needed** - The `httpClient` automatically switches!

## 🤝 Contributing

1. Follow the feature-based structure
2. Use TypeScript for type safety
3. Maintain separation of concerns
4. Write tests for critical logic
5. Follow existing naming conventions

## 📄 License

[Your License Here]

## 👥 Team

Built with ❤️ for enterprise-grade applications

---

**Note**: This is a frontend-only application. For full functionality, connect to a backend API that implements the expected endpoints and authentication flow.
