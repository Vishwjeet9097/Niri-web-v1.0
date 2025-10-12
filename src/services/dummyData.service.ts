// Centralized Dummy Data Service for NIRI Dashboard
// This service provides fallback data when backend APIs are not available
// Easily removable by setting USE_DUMMY_DATA to false

export const USE_DUMMY_DATA = true; // Set to false to disable dummy data

export interface DummyKPIData {
  mySubmissions: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  averageReviewTime: number;
}

export interface DummySubmission {
  id: string;
  submissionId: string;
  status: string;
  userId: string;
  stateUt: string;
  createdAt: string;
  updatedAt: string;
  score?: number;
  progress?: number;
  dueDate?: string;
  reviewerNote?: string;
  nextStep?: string;
  category?: string;
  documents?: any[];
  pendingDays?: number;
  completionPercent?: number;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface DummyActivity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  type: "success" | "warning" | "info";
}

export interface DummyDeadline {
  id: string;
  title: string;
  daysLeft: number;
}

class DummyDataService {
  private static instance: DummyDataService;

  private constructor() {}

  public static getInstance(): DummyDataService {
    if (!DummyDataService.instance) {
      DummyDataService.instance = new DummyDataService();
    }
    return DummyDataService.instance;
  }

  // KPI Data for different roles
  getKPIData(role: string): DummyKPIData {
    const baseData = {
      mySubmissions: 2,
      pendingReview: 2,
      approved: 0,
      rejected: 0,
      averageReviewTime: 0,
    };

    switch (role) {
      case "NODAL_OFFICER":
        return baseData;
      case "STATE_APPROVER":
        return {
          ...baseData,
          mySubmissions: 8,
          pendingReview: 3,
          approved: 2,
        };
      case "MOSPI_REVIEWER":
        return {
          ...baseData,
          mySubmissions: 15,
          pendingReview: 5,
          approved: 8,
        };
      case "MOSPI_APPROVER":
        return {
          ...baseData,
          mySubmissions: 20,
          approved: 12,
          rejected: 2,
        };
      default:
        return baseData;
    }
  }

  // Submissions data
  getSubmissions(role: string): DummySubmission[] {
    const baseSubmissions: DummySubmission[] = [
      {
        id: "1",
        submissionId: "SUB-MH-2024-001",
        status: "DRAFT",
        userId: "user1",
        stateUt: "Maharashtra",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        score: 85,
        progress: 75,
        dueDate: "2024-02-15",
        nextStep: "Complete submission",
        category: "Infrastructure",
        documents: [],
        pendingDays: 5,
        completionPercent: 75,
        user: {
          id: "user1",
          firstName: "Rajesh",
          lastName: "Kumar",
          email: "nodal.officer@maharashtra.gov.in",
        },
      },
      {
        id: "2",
        submissionId: "SUB-MH-2024-002",
        status: "SUBMITTED_TO_STATE",
        userId: "user2",
        stateUt: "Maharashtra",
        createdAt: "2024-01-10T09:00:00Z",
        updatedAt: "2024-01-12T14:30:00Z",
        score: 92,
        progress: 100,
        dueDate: "2024-02-10",
        reviewerNote: "Good submission, minor corrections needed",
        nextStep: "State review",
        category: "Infrastructure",
        documents: [{ name: "report.pdf" }],
        pendingDays: 2,
        completionPercent: 100,
        user: {
          id: "user2",
          firstName: "Priya",
          lastName: "Sharma",
          email: "nodal.officer2@maharashtra.gov.in",
        },
      },
      {
        id: "3",
        submissionId: "SUB-MH-2024-003",
        status: "SUBMITTED_TO_MOSPI",
        userId: "user3",
        stateUt: "Maharashtra",
        createdAt: "2024-01-05T08:00:00Z",
        updatedAt: "2024-01-20T16:00:00Z",
        score: 95,
        progress: 100,
        dueDate: "2024-02-05",
        reviewerNote: "Excellent submission",
        nextStep: "MoSPI Review",
        category: "Infrastructure",
        documents: [{ name: "report.pdf" }, { name: "data.xlsx" }],
        pendingDays: 0,
        completionPercent: 100,
        user: {
          id: "user3",
          firstName: "Amit",
          lastName: "Patel",
          email: "nodal.officer3@maharashtra.gov.in",
        },
      },
      {
        id: "4",
        submissionId: "SUB-MH-2024-004",
        status: "APPROVED",
        userId: "user4",
        stateUt: "Maharashtra",
        createdAt: "2024-01-01T08:00:00Z",
        updatedAt: "2024-01-25T16:00:00Z",
        score: 98,
        progress: 100,
        dueDate: "2024-02-01",
        reviewerNote: "Perfect submission",
        nextStep: "Completed",
        category: "Infrastructure",
        documents: [
          { name: "report.pdf" },
          { name: "data.xlsx" },
          { name: "analysis.pdf" },
        ],
        pendingDays: 0,
        completionPercent: 100,
        user: {
          id: "user4",
          firstName: "Sunita",
          lastName: "Singh",
          email: "nodal.officer4@maharashtra.gov.in",
        },
      },
    ];

    // Filter submissions based on role
    switch (role) {
      case "NODAL_OFFICER":
        return baseSubmissions.filter((sub) =>
          ["DRAFT", "SUBMITTED_TO_STATE", "RETURNED_FROM_MOSPI"].includes(
            sub.status
          )
        );
      case "STATE_APPROVER":
        return baseSubmissions.filter((sub) =>
          ["SUBMITTED_TO_STATE", "SUBMITTED_TO_MOSPI"].includes(sub.status)
        );
      case "MOSPI_REVIEWER":
        return baseSubmissions.filter((sub) =>
          ["SUBMITTED_TO_MOSPI"].includes(sub.status)
        );
      case "MOSPI_APPROVER":
        return baseSubmissions.filter((sub) =>
          ["SUBMITTED_TO_MOSPI", "APPROVED", "REJECTED_FINAL"].includes(
            sub.status
          )
        );
      default:
        return baseSubmissions;
    }
  }

  // Recent activities
  getActivities(): DummyActivity[] {
    return [
      {
        id: "1",
        action: "Submission Created",
        description: "New infrastructure submission created",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        type: "success",
      },
      {
        id: "2",
        action: "Review Completed",
        description: "State review completed for submission SUB-MH-2024-002",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        type: "info",
      },
      {
        id: "3",
        action: "Deadline Approaching",
        description: "Submission deadline approaching in 3 days",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        type: "warning",
      },
    ];
  }

  // Upcoming deadlines
  getDeadlines(): DummyDeadline[] {
    return [
      {
        id: "1",
        title: "Q4 Infrastructure Report",
        daysLeft: 5,
      },
      {
        id: "2",
        title: "Annual Compliance Review",
        daysLeft: 12,
      },
      {
        id: "3",
        title: "Budget Allocation Submission",
        daysLeft: 18,
      },
    ];
  }

  // Dashboard summary
  getDashboardSummary() {
    return {
      totalSubmissions: 2,
      pendingSubmissions: 2,
      approvedSubmissions: 0,
      rejectedSubmissions: 0,
      roleBasedStats: {
        NODAL_OFFICER: {
          submissions: 2,
          pending: 2,
          completed: 0,
        },
        STATE_APPROVER: {
          submissions: 2,
          pending: 2,
          completed: 0,
        },
        MOSPI_REVIEWER: {
          submissions: 2,
          pending: 2,
          completed: 0,
        },
        MOSPI_APPROVER: {
          submissions: 2,
          pending: 2,
          completed: 0,
        },
      },
    };
  }

  // Check if dummy data is enabled
  isDummyDataEnabled(): boolean {
    console.log("🔍 Dummy Data Service - USE_DUMMY_DATA:", USE_DUMMY_DATA);
    return USE_DUMMY_DATA;
  }
}

// Export singleton instance
export const dummyDataService = DummyDataService.getInstance();

// Export types for use in components
export type { DummyKPIData, DummySubmission, DummyActivity, DummyDeadline };
