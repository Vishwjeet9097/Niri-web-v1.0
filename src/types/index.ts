// Submission status enum for workflow and API
export enum SubmissionStatus {
  DRAFT = "DRAFT", // नोडल अधिकारी के लिए draft
  SUBMITTED_TO_STATE = "SUBMITTED_TO_STATE", // राज्य अनुमोदक के लिए
  SUBMITTED_TO_MOSPI_REVIEWER = "SUBMITTED_TO_MOSPI_REVIEWER", // MoSPI समीक्षक के लिए
  SUBMITTED_TO_MOSPI_APPROVER = "SUBMITTED_TO_MOSPI_APPROVER", // MoSPI अनुमोदक के लिए
  RETURNED_FROM_MOSPI = "RETURNED_FROM_MOSPI", // राज्य को वापस भेजा गया
  REJECTED_FINAL = "REJECTED_FINAL", // अंतिम रूप से अस्वीकृत
  APPROVED = "APPROVED", // अंतिम रूप से अनुमोदित
}
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  roleId: string;
  state: string;
  stateName: string;
  ministry: string | null;
  ministryName: string | null;
  type: string;
  isMospiUser: boolean;
  mospiUserType: string | null;
  // Legacy fields for backward compatibility
  id?: string;
  name?: string;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  expiresAt: number; // Calculated from expiresIn
}

export interface LoginApiResponse {
  success?: boolean;
  user: User;
  tokens: AuthTokens;
  message?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

export interface KPICard {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon: string;
}

export interface Submission {
  id: string;
  referenceNumber: string;
  category: string;
  status: "draft" | "pending" | "under_review" | "approved" | "rejected";
  progress: number;
  updatedAt: string;
  dueDate?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  roleId: string;
  state: string;
  stateName: string;
  ministry: string | null;
  ministryName: string | null;
  type: string;
  isMospiUser: boolean;
  mospiUserType: string | null;
  // Legacy fields for backward compatibility
  id?: string;
  name?: string;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  expiresAt: number; // Calculated from expiresIn
}

export interface LoginApiResponse {
  success?: boolean;
  user: User;
  tokens: AuthTokens;
  message?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

export interface KPICard {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon: string;
}

export interface Submission {
  id: string;
  referenceNumber: string;
  category: string;
  status: "draft" | "pending" | "under_review" | "approved" | "rejected";
  progress: number;
  updatedAt: string;
  dueDate?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
  status?: number;
}

// Enhanced File Upload Interface
export interface FileUpload {
  id: string;
  file: File | null;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  filePath?: string;
  fileUrl?: string;
  mimeType?: string;
}

// Workflow Types
export type WorkflowState =
  | "DRAFT"
  | "SUBMITTED_TO_STATE"
  | "SUBMITTED_TO_MOSPI_REVIEWER"
  | "SUBMITTED_TO_MOSPI_APPROVER"
  | "APPROVED"
  | "RETURNED_FROM_MOSPI"
  | "REJECTED_FINAL";
export type UserRole =
  | "NODAL_OFFICER"
  | "STATE_APPROVER"
  | "MOSPI_REVIEWER"
  | "MOSPI_APPROVER";
export type WorkflowAction =
  | "create"
  | "edit"
  | "submit_to_state"
  | "forward_to_mospi"
  | "state_reject"
  | "final_reject"
  | "resubmit"
  | "approve"
  | "add_comment";

// Enhanced Submission Interface
export interface NiriSubmission {
  id: string;
  submissionId: string;
  userId: string;
  stateUt: string;
  status: WorkflowState;
  formData: Record<string, any>;
  reviewComments: ReviewComment[];
  rejectionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewComment {
  id?: string;
  userId: string;
  role: string; // Changed from userRole to role to match API data
  text: string; // Changed from text to match API data
  type: "comment" | "rejection" | "approval";
  timestamp: string;
  // Additional fields that might be present in API data
  comment?: string; // Fallback field
  message?: string; // Fallback field
}

// Dashboard Types
export interface DashboardSummary {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  roleBasedStats: Record<
    string,
    {
      submissions: number;
      pending: number;
      completed: number;
    }
  >;
}

// Error Handling Types
export interface ErrorContext {
  component: string;
  action: string;
  timestamp: number;
  userId?: string;
  submissionId?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}
