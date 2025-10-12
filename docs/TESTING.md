# Testing Guide

## Example Test Pattern with Dependency Injection

The application uses dependency injection to make testing easier. Here's an example of how to test services that use the HTTP client:

```typescript
import type { HttpClient } from '@/services/api.service';

// Create a mock HTTP client
const mockHttpClient: HttpClient = {
  get: async (url: string) => {
    // Return mock data based on URL
    if (url.includes('/dashboard')) {
      return {
        data: {
          kpis: [
            { id: '1', title: 'Total Submissions', value: 14, icon: 'FileText' }
          ],
          recentActivity: [],
        },
        success: true,
      };
    }
    return { data: null, success: true };
  },
  post: async () => ({ data: {}, success: true }),
  put: async () => ({ data: {}, success: true }),
  patch: async () => ({ data: {}, success: true }),
  delete: async () => ({ data: {}, success: true }),
};

// Function to test (accepts httpClient as dependency)
const getDashboardData = async (client: HttpClient) => {
  const response = await client.get('/api/dashboard');
  return response.data;
};

// Test
const testDashboard = async () => {
  const result = await getDashboardData(mockHttpClient);
  console.assert(result.kpis.length === 1, 'Should have 1 KPI');
  console.assert(result.kpis[0].title === 'Total Submissions', 'KPI title matches');
  console.log('✅ Dashboard test passed');
};

testDashboard();
```

## Setting Up Testing (Optional)

To set up a full testing environment with Vitest:

```bash
# Install testing dependencies
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Why Dependency Injection?

By passing the `httpClient` as a parameter instead of importing it directly, you can:

1. **Easily mock** HTTP calls in tests
2. **Switch implementations** (mock vs real API)
3. **Test in isolation** without network calls
4. **Control test data** precisely

This is a production-ready pattern used in enterprise applications.
