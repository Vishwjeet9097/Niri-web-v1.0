import {
  apiService,
  type NiriSubmission,
  type ReviewComment,
} from "./api.service";
import { notificationService } from "./notification.service";

// Workflow States

export const WORKFLOW_STATES = {
  DRAFT: "DRAFT",
  SUBMITTED_TO_STATE: "SUBMITTED_TO_STATE",
  SUBMITTED_TO_MOSPI_REVIEWER: "SUBMITTED_TO_MOSPI_REVIEWER",
  SUBMITTED_TO_MOSPI_APPROVER: "SUBMITTED_TO_MOSPI_APPROVER",
  APPROVED: "APPROVED",
  RETURNED_FROM_MOSPI: "RETURNED_FROM_MOSPI",
  REJECTED_FINAL: "REJECTED_FINAL",
} as const;

export type WorkflowState =
  (typeof WORKFLOW_STATES)[keyof typeof WORKFLOW_STATES];

// User Roles
export const USER_ROLES = {
  NODAL_OFFICER: "NODAL_OFFICER",
  STATE_APPROVER: "STATE_APPROVER",
  MOSPI_REVIEWER: "MOSPI_REVIEWER",
  MOSPI_APPROVER: "MOSPI_APPROVER",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Workflow Actions
export const WORKFLOW_ACTIONS = {
  CREATE: "create",
  EDIT: "edit",
  SUBMIT_TO_STATE: "submit_to_state",
  FORWARD_TO_MOSPI: "forward_to_mospi",
  STATE_REJECT: "state_reject",
  FINAL_REJECT: "final_reject",
  RESUBMIT: "resubmit",
  APPROVE: "approve",
  ADD_COMMENT: "add_comment",
} as const;

export type WorkflowAction =
  (typeof WORKFLOW_ACTIONS)[keyof typeof WORKFLOW_ACTIONS];

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, WorkflowAction[]> = {
  [USER_ROLES.NODAL_OFFICER]: [
    WORKFLOW_ACTIONS.CREATE,
    WORKFLOW_ACTIONS.EDIT,
    WORKFLOW_ACTIONS.SUBMIT_TO_STATE,
    WORKFLOW_ACTIONS.RESUBMIT,
    WORKFLOW_ACTIONS.ADD_COMMENT,
  ],
  [USER_ROLES.STATE_APPROVER]: [
    WORKFLOW_ACTIONS.FORWARD_TO_MOSPI,
    WORKFLOW_ACTIONS.STATE_REJECT,
    WORKFLOW_ACTIONS.ADD_COMMENT,
  ],
  [USER_ROLES.MOSPI_REVIEWER]: [
    WORKFLOW_ACTIONS.ADD_COMMENT,
    WORKFLOW_ACTIONS.FORWARD_TO_MOSPI,
    WORKFLOW_ACTIONS.STATE_REJECT,
  ],
  [USER_ROLES.MOSPI_APPROVER]: [
    WORKFLOW_ACTIONS.APPROVE,
    WORKFLOW_ACTIONS.FINAL_REJECT,
    WORKFLOW_ACTIONS.STATE_REJECT,
    WORKFLOW_ACTIONS.ADD_COMMENT,
  ],
};

// State transitions
export const STATE_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  [WORKFLOW_STATES.DRAFT]: [WORKFLOW_STATES.SUBMITTED_TO_STATE],
  [WORKFLOW_STATES.SUBMITTED_TO_STATE]: [
    WORKFLOW_STATES.SUBMITTED_TO_MOSPI_REVIEWER,
    WORKFLOW_STATES.RETURNED_FROM_MOSPI,
  ],
  [WORKFLOW_STATES.SUBMITTED_TO_MOSPI_REVIEWER]: [
    WORKFLOW_STATES.SUBMITTED_TO_MOSPI_APPROVER,
    WORKFLOW_STATES.RETURNED_FROM_MOSPI,
    WORKFLOW_STATES.REJECTED_FINAL,
  ],
  [WORKFLOW_STATES.SUBMITTED_TO_MOSPI_APPROVER]: [
    WORKFLOW_STATES.APPROVED,
    WORKFLOW_STATES.RETURNED_FROM_MOSPI,
    WORKFLOW_STATES.REJECTED_FINAL,
  ],
  [WORKFLOW_STATES.RETURNED_FROM_MOSPI]: [WORKFLOW_STATES.SUBMITTED_TO_STATE],
  [WORKFLOW_STATES.APPROVED]: [],
  [WORKFLOW_STATES.REJECTED_FINAL]: [],
};

export interface WorkflowContext {
  submission: NiriSubmission;
  userRole: UserRole;
  userId: string;
}

export interface WorkflowActionResult {
  success: boolean;
  message: string;
  submission?: NiriSubmission;
  error?: string;
}

class WorkflowService {
  // Check if user can perform action on submission
  canPerformAction(
    action: WorkflowAction,
    userRole: UserRole,
    submission: NiriSubmission
  ): boolean {
    // Check if user has permission for this action
    if (!ROLE_PERMISSIONS[userRole].includes(action)) {
      return false;
    }

    // Check state-specific permissions
    switch (action) {
      case WORKFLOW_ACTIONS.EDIT:
      case WORKFLOW_ACTIONS.SUBMIT_TO_STATE:
        return (
          submission.status === WORKFLOW_STATES.DRAFT &&
          userRole === USER_ROLES.NODAL_OFFICER
        );

      case WORKFLOW_ACTIONS.FORWARD_TO_MOSPI:
        // STATE_APPROVER can forward from SUBMITTED_TO_STATE
        if (
          submission.status === WORKFLOW_STATES.SUBMITTED_TO_STATE &&
          userRole === USER_ROLES.STATE_APPROVER
        ) {
          return true;
        }
        // MOSPI_REVIEWER can forward from SUBMITTED_TO_MOSPI_REVIEWER
        if (
          submission.status === WORKFLOW_STATES.SUBMITTED_TO_MOSPI_REVIEWER &&
          userRole === USER_ROLES.MOSPI_REVIEWER
        ) {
          return true;
        }
        return false;

      case WORKFLOW_ACTIONS.STATE_REJECT:
        // STATE_APPROVER can reject from SUBMITTED_TO_STATE
        if (
          submission.status === WORKFLOW_STATES.SUBMITTED_TO_STATE &&
          userRole === USER_ROLES.STATE_APPROVER
        ) {
          return true;
        }
        // MOSPI_REVIEWER and MOSPI_APPROVER can send back from their respective states
        if (
          submission.status === WORKFLOW_STATES.SUBMITTED_TO_MOSPI_REVIEWER &&
          userRole === USER_ROLES.MOSPI_REVIEWER
        ) {
          return true;
        }
        if (
          submission.status === WORKFLOW_STATES.SUBMITTED_TO_MOSPI_APPROVER &&
          userRole === USER_ROLES.MOSPI_APPROVER
        ) {
          return true;
        }
        return false;

      case WORKFLOW_ACTIONS.APPROVE:
        return (
          submission.status === WORKFLOW_STATES.SUBMITTED_TO_MOSPI_APPROVER &&
          userRole === USER_ROLES.MOSPI_APPROVER
        );
      case WORKFLOW_ACTIONS.FINAL_REJECT:
        return (
          submission.status === WORKFLOW_STATES.SUBMITTED_TO_MOSPI_APPROVER &&
          userRole === USER_ROLES.MOSPI_APPROVER
        );

      case WORKFLOW_ACTIONS.RESUBMIT:
        return (
          submission.status === WORKFLOW_STATES.RETURNED_FROM_MOSPI &&
          userRole === USER_ROLES.NODAL_OFFICER
        );

      case WORKFLOW_ACTIONS.ADD_COMMENT:
        return submission.status !== WORKFLOW_STATES.DRAFT;

      default:
        return false;
    }
  }

  // Get available actions for user and submission
  getAvailableActions(
    userRole: UserRole,
    submission: NiriSubmission
  ): WorkflowAction[] {
    return ROLE_PERMISSIONS[userRole].filter((action) =>
      this.canPerformAction(action, userRole, submission)
    );
  }

  // Get next possible states
  getNextStates(currentState: WorkflowState): WorkflowState[] {
    return STATE_TRANSITIONS[currentState] || [];
  }

  // Execute workflow action
  async executeAction(
    action: WorkflowAction,
    context: WorkflowContext,
    data?: Record<string, unknown>
  ): Promise<WorkflowActionResult> {
    const { submission, userRole, userId } = context;

    // Validate action
    if (!this.canPerformAction(action, userRole, submission)) {
      return {
        success: false,
        message: "You do not have permission to perform this action.",
        error: "INSUFFICIENT_PERMISSIONS",
      };
    }

    try {
      let result: NiriSubmission;
      let message: string;

      switch (action) {
        case WORKFLOW_ACTIONS.SUBMIT_TO_STATE:
          result = await apiService.updateSubmission(submission.id, {
            status: WORKFLOW_STATES.SUBMITTED_TO_STATE,
            message: "Submission sent to State Approver for review.",
          });
          message = "Submission sent to State Approver for review.";
          break;

        case WORKFLOW_ACTIONS.FORWARD_TO_MOSPI:
          if (submission.status === WORKFLOW_STATES.SUBMITTED_TO_STATE) {
            // STATE_APPROVER forwards to MOSPI_REVIEWER
            result = await apiService.updateSubmission(submission.id, {
              status: WORKFLOW_STATES.SUBMITTED_TO_MOSPI_REVIEWER,
              message:
                data.comment || "Forwarded to MoSPI Reviewer for review.",
            });
            message = "Submission forwarded to MoSPI Reviewer successfully.";
          } else if (
            submission.status === WORKFLOW_STATES.SUBMITTED_TO_MOSPI_REVIEWER
          ) {
            // MOSPI_REVIEWER forwards to MOSPI_APPROVER
            result = await apiService.updateSubmission(submission.id, {
              status: WORKFLOW_STATES.SUBMITTED_TO_MOSPI_APPROVER,
              message:
                data.comment ||
                "Forwarded to MoSPI Approver for final decision.",
            });
            message = "Submission forwarded to MoSPI Approver successfully.";
          } else {
            throw new Error("Invalid state for FORWARD_TO_MOSPI action");
          }
          break;

        case WORKFLOW_ACTIONS.STATE_REJECT:
          result = await apiService.updateSubmission(submission.id, {
            status: WORKFLOW_STATES.RETURNED_FROM_MOSPI,
            message: data.comment || "Rejected by State Approver.",
          });
          message = "Submission rejected to Nodal Officer.";
          break;

        case WORKFLOW_ACTIONS.FINAL_REJECT:
          result = await apiService.updateSubmission(submission.id, {
            status: WORKFLOW_STATES.REJECTED_FINAL,
            message: data.comment || "Rejected by MoSPI Approver.",
          });
          message = "Submission finally rejected by MoSPI.";
          break;

        case WORKFLOW_ACTIONS.RESUBMIT:
          result = await apiService.updateSubmission(submission.id, {
            status: WORKFLOW_STATES.SUBMITTED_TO_STATE,
            message: data.comment || "Resubmitted with corrections.",
          });
          message = "Submission resubmitted successfully.";
          break;

        case WORKFLOW_ACTIONS.APPROVE:
          result = await apiService.updateSubmission(submission.id, {
            status: WORKFLOW_STATES.APPROVED,
            message: data.comment || "Submission approved by MoSPI.",
          });
          message = "Submission approved by MoSPI.";
          break;

        case WORKFLOW_ACTIONS.ADD_COMMENT: {
          const comment = await apiService.addComment(
            submission.id,
            data?.text as string,
            data?.type as "comment" | "rejection" | "approval"
          );
          message = "Comment added successfully.";
          return {
            success: true,
            message,
            submission: {
              ...submission,
              reviewComments: [...submission.reviewComments, comment],
            },
          };
        }

        default:
          return {
            success: false,
            message: "Unknown action.",
            error: "UNKNOWN_ACTION",
          };
      }

      // Show success notification
      notificationService.success(message, "Action Completed");

      return {
        success: true,
        message,
        submission: result,
      };
    } catch (error) {
      const err = error as { message?: string; code?: string };
      const errorMessage = err.message || "Failed to execute action.";

      // Show error notification
      notificationService.error(errorMessage, "Action Failed");

      return {
        success: false,
        message: errorMessage,
        error: err.code || "EXECUTION_ERROR",
      };
    }
  }

  // Get workflow status display info
  getStatusInfo(status: WorkflowState): {
    label: string;
    color: string;
    description: string;
  } {
    switch (status) {
      case WORKFLOW_STATES.DRAFT:
        return {
          label: "Draft",
          color: "bg-gray-500",
          description: "Submission is being prepared",
        };

      case WORKFLOW_STATES.SUBMITTED_TO_STATE:
        return {
          label: "Under State Review",
          color: "bg-yellow-500",
          description: "Awaiting State Approver review",
        };

      case WORKFLOW_STATES.SUBMITTED_TO_MOSPI_REVIEWER:
        return {
          label: "Under MoSPI Reviewer",
          color: "bg-blue-400",
          description: "Awaiting MoSPI Reviewer action",
        };
      case WORKFLOW_STATES.SUBMITTED_TO_MOSPI_APPROVER:
        return {
          label: "Under MoSPI Approver",
          color: "bg-blue-600",
          description: "Awaiting MoSPI Approver final decision",
        };

      case WORKFLOW_STATES.APPROVED:
        return {
          label: "Approved",
          color: "bg-green-500",
          description: "Submission approved by MoSPI",
        };

      case WORKFLOW_STATES.RETURNED_FROM_MOSPI:
        return {
          label: "Rejected by State",
          color: "bg-red-500",
          description: "Rejected by State Approver - can be resubmitted",
        };

      case WORKFLOW_STATES.REJECTED_FINAL:
        return {
          label: "Finally Rejected",
          color: "bg-red-700",
          description: "Finally rejected by MoSPI",
        };

      default:
        return {
          label: "Unknown",
          color: "bg-gray-500",
          description: "Unknown status",
        };
    }
  }

  // Get workflow progress percentage
  getProgressPercentage(status: WorkflowState): number {
    switch (status) {
      case WORKFLOW_STATES.DRAFT:
        return 25;
      case WORKFLOW_STATES.SUBMITTED_TO_STATE:
        return 50;
      case WORKFLOW_STATES.SUBMITTED_TO_MOSPI_REVIEWER:
        return 75;
      case WORKFLOW_STATES.SUBMITTED_TO_MOSPI_APPROVER:
        return 90;
      case WORKFLOW_STATES.APPROVED:
        return 100;
      case WORKFLOW_STATES.RETURNED_FROM_MOSPI:
        return 25; // Back to draft level
      case WORKFLOW_STATES.REJECTED_FINAL:
        return 0;
      default:
        return 0;
    }
  }

  // Check if submission can be edited
  canEdit(submission: NiriSubmission, userRole: UserRole): boolean {
    return (
      submission.status === WORKFLOW_STATES.DRAFT &&
      userRole === USER_ROLES.NODAL_OFFICER
    );
  }

  // Check if submission is in final state
  isFinalState(status: WorkflowState): boolean {
    return (
      status === WORKFLOW_STATES.APPROVED ||
      status === WORKFLOW_STATES.REJECTED_FINAL
    );
  }

  // Get comment visibility based on user role
  getCommentVisibility(comment: ReviewComment, userRole: UserRole): boolean {
    // MoSPI users can see all comments
    if (
      userRole === USER_ROLES.MOSPI_REVIEWER ||
      userRole === USER_ROLES.MOSPI_APPROVER
    ) {
      return true;
    }

    // State Approver can see state-level and nodal comments
    if (userRole === USER_ROLES.STATE_APPROVER) {
      return (
        comment.userRole === USER_ROLES.STATE_APPROVER ||
        comment.userRole === USER_ROLES.NODAL_OFFICER
      );
    }

    // Nodal Officer can only see their own comments
    if (userRole === USER_ROLES.NODAL_OFFICER) {
      return comment.userRole === USER_ROLES.NODAL_OFFICER;
    }

    return false;
  }
}

export const workflowService = new WorkflowService();
