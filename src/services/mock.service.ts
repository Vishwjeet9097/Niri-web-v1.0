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

    // Mock scoring rankings data
    if (url.includes('/scoring/rankings')) {
      const mockRankingsData = [
        {
          rank: 1,
          stateUt: "Gujarat",
          totalScore: 742,
          percentage: 74.2,
          approvedAt: "2024-01-01T00:00:00.000Z",
          submissionId: "uuid-1",
          categoryScores: {
            financing: 195,
            development: 230,
            ppp: 195,
            enablers: 195
          }
        },
        {
          rank: 2,
          stateUt: "Tamil Nadu",
          totalScore: 698,
          percentage: 69.8,
          approvedAt: "2024-01-01T00:00:00.000Z",
          submissionId: "uuid-2",
          categoryScores: {
            financing: 175,
            development: 210,
            ppp: 165,
            enablers: 148
          }
        },
        {
          rank: 3,
          stateUt: "Karnataka",
          totalScore: 685,
          percentage: 68.5,
          approvedAt: "2024-01-01T00:00:00.000Z",
          submissionId: "uuid-3",
          categoryScores: {
            financing: 168,
            development: 205,
            ppp: 172,
            enablers: 140
          }
        },
        {
          rank: 4,
          stateUt: "Maharashtra",
          totalScore: 548,
          percentage: 54.8,
          approvedAt: "2024-01-01T00:00:00.000Z",
          submissionId: "uuid-4",
          categoryScores: {
            financing: 140,
            development: 160,
            ppp: 120,
            enablers: 128
          }
        }
      ];
      return this.mockDelay(mockRankingsData) as Promise<T>;
    }

    return this.mockDelay(this.createResponse(null)) as Promise<T>;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    // Handle login endpoint specifically
    if (url.includes('/auth/login') || url.includes('/login')) {
      const mockLoginResponse = {
        status: true,
        data: {
          user: {
            _id: "mock_user_1",
            firstName: "Test",
            lastName: "User",
            email: data?.email || "test@example.com",
            role: "NODAL_OFFICER",
            state: "Maharashtra",
            stateUt: "Maharashtra",
            stateName: "Maharashtra",
            contactNumber: "+91-9876543210",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          accessToken: "mock_jwt_token_" + Date.now()
        },
        message: "Login successful"
      };
      return this.mockDelay(mockLoginResponse) as Promise<T>;
    }

    // Simulate successful POST for other endpoints
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
