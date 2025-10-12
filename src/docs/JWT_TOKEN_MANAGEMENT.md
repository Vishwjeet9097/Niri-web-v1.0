# 🔐 JWT Token Management Architecture

## Overview

Professional JWT token management system with automatic refresh, expiration monitoring, and secure storage.

## 🏗️ Architecture Components

### 1. **Types & Interfaces** (`src/types/index.ts`)

```typescript
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  state: string;
  stateName: string;
  // ... other fields
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  expiresAt: number; // Calculated from JWT
}

interface LoginApiResponse {
  success: boolean;
  user: User;
  tokens: AuthTokens;
  message?: string;
}
```

### 2. **AuthService** (`src/services/auth.service.ts`)

**Core Features:**

- JWT token parsing and expiration calculation
- Token storage and retrieval
- Authentication state management
- Token refresh handling

**Key Methods:**

```typescript
// Process login response and normalize data
processLoginResponse(response: LoginApiResponse): { user: User; tokens: AuthTokens }

// Get authentication headers for API calls
getAuthHeaders(): Record<string, string>

// Check if user is authenticated
isAuthenticated(): boolean

// Check if token is expiring soon
isTokenExpiringSoon(): boolean

// Refresh token
refreshToken(): Promise<AuthTokens>
```

### 3. **UserService** (`src/services/UserService.ts`)

**Core Features:**

- Login/logout operations
- User data management
- Token status monitoring
- Enhanced user information access

**Key Methods:**

```typescript
// Login with email/password
login(email: string, password: string): Promise<LoginResult>

// Get user's full name
getFullName(): string | null

// Get user's state information
getStateInfo(): { stateId: string; stateName: string } | null

// Check if user is MoSPI user
isMospiUser(): boolean

// Get comprehensive token status
getTokenInfo(): TokenStatusInfo
```

### 4. **TokenManager** (`src/utils/tokenManager.ts`)

**Core Features:**

- Automatic token refresh before expiration
- Token expiration monitoring
- Background token management
- Manual refresh capabilities

**Key Methods:**

```typescript
// Start monitoring token expiration
startTokenMonitoring(): void

// Stop monitoring
stopTokenMonitoring(): void

// Get current token status
getTokenStatus(): TokenStatus

// Force manual refresh
forceRefresh(): Promise<boolean>
```

### 5. **ApiService** (`src/services/ApiService.ts`)

**Core Features:**

- Automatic token attachment to requests
- 401 handling with token refresh
- Request retry after token refresh
- Global error handling

**Key Features:**

- Automatic `Authorization: Bearer <token>` header
- 401 → Token refresh → Retry request
- Prevents infinite refresh loops
- User-friendly error notifications

### 6. **AuthProvider** (`src/features/auth/AuthProvider.jsx`)

**Core Features:**

- React context for authentication state
- Token monitoring integration
- Automatic state synchronization
- Enhanced auth methods

**Key Features:**

- Real-time auth state updates
- Token status access
- Manual refresh capability
- Automatic cleanup on logout

## 🔄 Token Lifecycle

### 1. **Login Process**

```
User Login → API Call → Response Processing → Token Storage → Monitoring Start
```

### 2. **Token Refresh Process**

```
Token Expiring Soon → Auto Refresh → New Token Storage → Monitoring Restart
```

### 3. **Token Expiration Process**

```
Token Expired → Logout User → Clear Storage → Stop Monitoring → Redirect to Login
```

## 🛡️ Security Features

### 1. **Token Storage**

- Tokens stored in localStorage with namespace
- Automatic cleanup on logout
- Secure token validation

### 2. **Token Validation**

- JWT expiration parsing
- Real-time expiration checking
- Automatic refresh before expiration

### 3. **API Security**

- Automatic Authorization header
- Token refresh on 401
- Request retry after refresh
- Secure error handling

## 📊 Token Status Monitoring

### Real-time Status

```typescript
const tokenStatus = authProvider.getTokenStatus();
// Returns:
{
  hasTokens: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  timeUntilExpiration: number | null;
  timeUntilRefresh: number | null;
}
```

### Console Logging

- 🔐 Auth operations
- 🔄 Token refresh attempts
- ⏰ Expiration warnings
- ❌ Error handling

## 🚀 Usage Examples

### 1. **Login**

```typescript
const { login } = useAuth();
const result = await login(email, password);
if (result.success) {
  // User logged in, tokens managed automatically
}
```

### 2. **API Calls**

```typescript
// Tokens automatically attached
const response = await apiV2.get("/protected-endpoint");
```

### 3. **Token Status Check**

```typescript
const { getTokenStatus } = useAuth();
const status = getTokenStatus();
if (status.isExpiringSoon) {
  // Show warning to user
}
```

### 4. **Manual Refresh**

```typescript
const { refreshToken } = useAuth();
const success = await refreshToken();
```

## 🔧 Configuration

### Environment Variables

```env
VITE_API_BASE_URL=http://18.61.243.96:5000/api
VITE_LOGIN_PATH=/users/login
```

### Token Refresh Timing

- **Refresh Trigger**: 5 minutes before expiration
- **Check Interval**: 1 second
- **Expiration Buffer**: 5 minutes

## 🐛 Debugging

### Console Logs

- `🔐 Auth set successfully` - Login success
- `🔄 Attempting token refresh` - Auto refresh
- `✅ Token refreshed successfully` - Refresh success
- `⏰ Token expired` - Expiration handling
- `❌ Token refresh failed` - Refresh error

### Token Information

```typescript
// Get detailed token info
const tokenInfo = UserService.getTokenInfo();
console.log("Token Info:", tokenInfo);
```

## 🔄 Migration from Old System

### Changes Made

1. **User Interface**: Updated to match new API response
2. **Token Structure**: Added `tokenType` and `expiresIn`
3. **Storage**: Enhanced with better error handling
4. **Monitoring**: Added automatic token management
5. **Error Handling**: Improved user notifications

### Backward Compatibility

- Legacy fields maintained (`id`, `name`)
- Existing API calls work unchanged
- Gradual migration possible

## 📈 Performance Optimizations

### 1. **Efficient Monitoring**

- Single timer per token lifecycle
- Automatic cleanup
- Minimal CPU usage

### 2. **Smart Refresh**

- Prevents duplicate refresh calls
- 5-minute buffer before expiration
- Automatic retry on failure

### 3. **Memory Management**

- Automatic cleanup on logout
- Timer cleanup on unmount
- Efficient state updates

## 🎯 Best Practices

### 1. **Token Security**

- Never log tokens in production
- Use secure storage methods
- Implement proper cleanup

### 2. **Error Handling**

- Graceful degradation
- User-friendly messages
- Proper fallback behavior

### 3. **Performance**

- Minimal re-renders
- Efficient state management
- Smart refresh timing

## 🔍 Troubleshooting

### Common Issues

1. **Token not refreshing**: Check refresh token validity
2. **Infinite refresh loops**: Verify API endpoint configuration
3. **Storage issues**: Check localStorage availability
4. **State sync issues**: Verify AuthProvider setup

### Debug Steps

1. Check console logs for token operations
2. Verify API response format
3. Check localStorage for stored tokens
4. Test manual refresh functionality

---

**Built with ❤️ for NIRI Dashboard**
