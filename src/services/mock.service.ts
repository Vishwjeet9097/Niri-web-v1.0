import type { HttpClient } from './api.service';
import type { ApiResponse } from '@/types';
import dashboardData from '@/mock/dashboard.json';
import submissionsData from '@/mock/submissions.json';
import notificationsData from '@/mock/notifications.json';

/**
 * MockAdapter - mirrors HttpClient interface, uses JSON files as data source
 * Toggle via VITE_USE_MOCK environment variable
 */
class MockAdapter implements HttpClient {
  private delay = 500; // Simulate network delay

  private mockDelay<T>(data: T): Promise<T> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(data), this.delay);
    });
  }

  private createResponse<T>(data: T): ApiResponse<T> {
    return {
      data,
      success: true,
      message: 'Success',
    };
  }

  async get<T = any>(url: string): Promise<T> {
    // Route mock data based on URL
    if (url.includes('/dashboard')) {
      return this.mockDelay(this.createResponse(dashboardData)) as Promise<T>;
    }
    
    if (url.includes('/submissions')) {
      return this.mockDelay(this.createResponse(submissionsData)) as Promise<T>;
    }
    
    if (url.includes('/notifications')) {
      return this.mockDelay(this.createResponse(notificationsData)) as Promise<T>;
    }

    return this.mockDelay(this.createResponse(null)) as Promise<T>;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    // Simulate successful POST
    return this.mockDelay(
      this.createResponse({ id: `mock_${Date.now()}`, ...data })
    ) as Promise<T>;
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    return this.mockDelay(this.createResponse(data)) as Promise<T>;
  }

  async patch<T = any>(url: string, data?: any): Promise<T> {
    return this.mockDelay(this.createResponse(data)) as Promise<T>;
  }

  async delete<T = any>(): Promise<T> {
    return this.mockDelay(this.createResponse({ deleted: true })) as Promise<T>;
  }
}

export const mockAdapter = new MockAdapter();
