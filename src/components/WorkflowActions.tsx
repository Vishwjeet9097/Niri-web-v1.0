import React, { useState } from 'react';
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Forward, 
  MessageSquare,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { workflowService, type WorkflowAction, type UserRole, WORKFLOW_STATES } from '@/services/workflow.service';
import { apiService, type NiriSubmission } from '@/services/api.service';
import { notificationService } from '@/services/notification.service';

interface WorkflowActionsProps {
  submission: NiriSubmission;
  userRole: UserRole;
  userId: string;
  onActionCompleted?: (updatedSubmission: NiriSubmission) => void;
}

interface ActionFormData {
  comment: string;
  formData?: Record<string, any>;
}

export const WorkflowActions: React.FC<WorkflowActionsProps> = ({
  submission,
  userRole,
  userId,
  onActionCompleted
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionForms, setActionForms] = useState<Record<string, ActionFormData>>({});
  const [showActionDialog, setShowActionDialog] = useState<string | null>(null);

  const availableActions = workflowService.getAvailableActions(userRole, submission);
  const statusInfo = workflowService.getStatusInfo(submission.status);
  const progressPercentage = workflowService.getProgressPercentage(submission.status);

  const handleActionClick = (action: WorkflowAction) => {
    // Actions that require confirmation or additional data
    const actionsWithDialog = [
      'forward_to_mospi',
      'state_reject',
      'final_reject',
      'resubmit'
    ];

    if (actionsWithDialog.includes(action)) {
      setShowActionDialog(action);
      setActionForms(prev => ({
        ...prev,
        [action]: { comment: '' }
      }));
    } else {
      executeAction(action);
    }
  };

  const executeAction = async (action: WorkflowAction, formData?: ActionFormData) => {
    setActionLoading(action);

    try {
      const result = await workflowService.executeAction(action, {
        submission,
        userRole,
        userId
      }, formData);

      if (result.success && result.submission) {
        onActionCompleted?.(result.submission);
        setShowActionDialog(null);
        setActionForms(prev => ({
          ...prev,
          [action]: { comment: '' }
        }));
      }

    } catch (error: any) {
      notificationService.error(
        error.message || 'Failed to execute action',
        'Action Failed'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleFormSubmit = (action: WorkflowAction) => {
    const formData = actionForms[action];
    if (!formData?.comment.trim()) {
      notificationService.warning('Please enter a comment', 'Comment Required');
      return;
    }
    executeAction(action, formData);
  };

  const getActionButton = (action: WorkflowAction) => {
    const isLoading = actionLoading === action;
    const actionConfig = getActionConfig(action);

    return (
      <Button
        key={action}
        variant={actionConfig.variant}
        size="sm"
        onClick={() => handleActionClick(action)}
        disabled={isLoading}
        className={actionConfig.className}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          actionConfig.icon
        )}
        {actionConfig.label}
      </Button>
    );
  };

  const getActionConfig = (action: WorkflowAction) => {
    switch (action) {
      case 'submit_to_state':
        return {
          label: 'Submit to State',
          icon: <Send className="w-4 h-4 mr-2" />,
          variant: 'default' as const,
          className: ''
        };
      case 'forward_to_mospi':
        return {
          label: 'Forward to MoSPI',
          icon: <Forward className="w-4 h-4 mr-2" />,
          variant: 'default' as const,
          className: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'state_reject':
        return {
          label: 'Reject',
          icon: <XCircle className="w-4 h-4 mr-2" />,
          variant: 'destructive' as const,
          className: ''
        };
      case 'final_reject':
        return {
          label: 'Final Reject',
          icon: <XCircle className="w-4 h-4 mr-2" />,
          variant: 'destructive' as const,
          className: ''
        };
      case 'resubmit':
        return {
          label: 'Resubmit',
          icon: <RotateCcw className="w-4 h-4 mr-2" />,
          variant: 'outline' as const,
          className: ''
        };
      case 'approve':
        return {
          label: 'Approve',
          icon: <CheckCircle className="w-4 h-4 mr-2" />,
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700'
        };
      case 'add_comment':
        return {
          label: 'Add Comment',
          icon: <MessageSquare className="w-4 h-4 mr-2" />,
          variant: 'outline' as const,
          className: ''
        };
      default:
        return {
          label: action.replace('_', ' ').toUpperCase(),
          icon: <MessageSquare className="w-4 h-4 mr-2" />,
          variant: 'outline' as const,
          className: ''
        };
    }
  };

  const getActionDialogTitle = (action: WorkflowAction) => {
    switch (action) {
      case 'forward_to_mospi':
        return 'Forward to MoSPI';
      case 'state_reject':
        return 'Reject Submission';
      case 'final_reject':
        return 'Final Rejection';
      case 'resubmit':
        return 'Resubmit Submission';
      default:
        return 'Action Confirmation';
    }
  };

  const getActionDialogDescription = (action: WorkflowAction) => {
    switch (action) {
      case 'forward_to_mospi':
        return 'Forward this submission to MoSPI for final review and approval.';
      case 'state_reject':
        return 'Reject this submission and send it back to the Nodal Officer for corrections.';
      case 'final_reject':
        return submission.rejectionCount >= 1 
          ? 'Finally reject this submission. This action cannot be undone.'
          : 'Reject this submission. The Nodal Officer can resubmit with corrections.';
      case 'resubmit':
        return 'Resubmit this submission with corrections to the State Approver.';
      default:
        return 'Please provide additional information for this action.';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Workflow Actions</span>
          <div className="flex items-center gap-2">
            <Badge className={`${statusInfo.color} text-white`}>
              {statusInfo.label}
            </Badge>
            <div className="text-sm text-muted-foreground">
              {progressPercentage}% Complete
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Description */}
        <p className="text-sm text-muted-foreground">
          {statusInfo.description}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`${statusInfo.color} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Available Actions */}
        {availableActions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableActions.map(getActionButton)}
          </div>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No actions available for this submission in the current state.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Dialogs */}
        {showActionDialog && (
          <Dialog open={!!showActionDialog} onOpenChange={() => setShowActionDialog(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{getActionDialogTitle(showActionDialog as WorkflowAction)}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {getActionDialogDescription(showActionDialog as WorkflowAction)}
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Comment {showActionDialog === 'final_reject' && submission.rejectionCount >= 1 && '(Required)'}
                  </label>
                  <Textarea
                    placeholder={`Enter your comment for ${showActionDialog.replace('_', ' ')}...`}
                    value={actionForms[showActionDialog]?.comment || ''}
                    onChange={(e) => setActionForms(prev => ({
                      ...prev,
                      [showActionDialog]: {
                        ...prev[showActionDialog],
                        comment: e.target.value
                      }
                    }))}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Warning for final rejection */}
                {showActionDialog === 'final_reject' && submission.rejectionCount >= 1 && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      This is a final rejection. The submission cannot be resubmitted after this action.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowActionDialog(null)}
                    disabled={actionLoading === showActionDialog}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={showActionDialog.includes('reject') ? 'destructive' : 'default'}
                    onClick={() => handleFormSubmit(showActionDialog as WorkflowAction)}
                    disabled={actionLoading === showActionDialog || !actionForms[showActionDialog]?.comment.trim()}
                  >
                    {actionLoading === showActionDialog ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Submission Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p><strong>Submission ID:</strong> {submission.submissionId}</p>
          <p><strong>Created:</strong> {new Date(submission.createdAt).toLocaleDateString()}</p>
          <p><strong>Last Updated:</strong> {new Date(submission.updatedAt).toLocaleDateString()}</p>
          {submission.rejectionCount > 0 && (
            <p><strong>Rejection Count:</strong> {submission.rejectionCount}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowActions;
