import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Clock, AlertCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiService, type ReviewComment } from '@/services/api.service';
import { workflowService, type UserRole } from '@/services/workflow.service';
import { notificationService } from '@/services/notification.service';
import { formatDistanceToNow } from 'date-fns';
import { 
  validateGeneralComment, 
  validateRejectionComment, 
  validateApprovalComment,
  getCharacterCountInfo,
  formatValidationErrors,
  getValidationStatusClass,
  type CommentValidationResult 
} from '@/utils/commentValidation';

interface ReviewCommentsProps {
  submissionId: string;
  comments: ReviewComment[];
  userRole: UserRole;
  userId: string;
  onCommentAdded?: (comment: ReviewComment) => void;
  readonly?: boolean;
}

interface CommentFormData {
  text: string;
  type: 'comment' | 'rejection' | 'approval';
}

export const ReviewComments: React.FC<ReviewCommentsProps> = ({
  submissionId,
  comments,
  userRole,
  userId,
  onCommentAdded,
  readonly = false
}) => {
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'rejection' | 'approval'>('comment');
  const [submitting, setSubmitting] = useState(false);
  const [visibleComments, setVisibleComments] = useState<ReviewComment[]>([]);
  const [validationResult, setValidationResult] = useState<CommentValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Filter comments based on user role visibility
  useEffect(() => {
    const filtered = comments.filter(comment => 
      workflowService.getCommentVisibility(comment, userRole)
    );
    setVisibleComments(filtered);
  }, [comments, userRole]);

  // Real-time validation
  useEffect(() => {
    if (newComment.trim()) {
      let result: CommentValidationResult;
      
      switch (commentType) {
        case 'rejection':
          result = validateRejectionComment(newComment);
          break;
        case 'approval':
          result = validateApprovalComment(newComment);
          break;
        default:
          result = validateGeneralComment(newComment);
      }
      
      setValidationResult(result);
      setShowValidation(true);
    } else {
      setValidationResult(null);
      setShowValidation(false);
    }
  }, [newComment, commentType]);

  // Handle comment type change
  const handleCommentTypeChange = (type: 'comment' | 'rejection' | 'approval') => {
    setCommentType(type);
    setNewComment(''); // Clear comment when changing type
    setValidationResult(null);
    setShowValidation(false);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate comment before submission
    if (!newComment.trim()) {
      notificationService.warning('Please enter a comment', 'Empty Comment');
      return;
    }

    // Check validation result
    if (validationResult && !validationResult.isValid) {
      const errorMessage = formatValidationErrors(validationResult);
      notificationService.error(errorMessage, 'Validation Error');
      return;
    }

    setSubmitting(true);

    try {
      const comment = await apiService.addComment(submissionId, newComment.trim(), commentType);
      
      setNewComment('');
      setCommentType('comment');
      setValidationResult(null);
      setShowValidation(false);
      
      onCommentAdded?.(comment);
      
      notificationService.success('Comment added successfully', 'Comment Added');

    } catch (error: any) {
      notificationService.error(
        error.message || 'Failed to add comment. Please try again.',
        'Comment Failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getCommentIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'rejection':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'approval':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getCommentBadgeColor = (type: string) => {
    switch (type) {
      case 'comment':
        return 'bg-blue-100 text-blue-800';
      case 'rejection':
        return 'bg-red-100 text-red-800';
      case 'approval':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'NODAL_OFFICER':
        return 'bg-purple-100 text-purple-800';
      case 'STATE_APPROVER':
        return 'bg-orange-100 text-orange-800';
      case 'MOSPI_REVIEWER':
        return 'bg-blue-100 text-blue-800';
      case 'MOSPI_APPROVER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Review Comments
          <Badge variant="secondary" className="ml-auto">
            {visibleComments.length} comments
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        {!readonly && (
          <form onSubmit={handleSubmitComment} className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={commentType === 'comment' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCommentTypeChange('comment')}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Comment
              </Button>
              <Button
                type="button"
                variant={commentType === 'rejection' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleCommentTypeChange('rejection')}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejection
              </Button>
              <Button
                type="button"
                variant={commentType === 'approval' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCommentTypeChange('approval')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approval
              </Button>
            </div>
            
            <Textarea
              placeholder={`Add a ${commentType}...`}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
            
            {/* Character count and validation feedback */}
            <div className="space-y-2">
              {/* Character count */}
              {newComment && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {commentType === 'rejection' ? 'Rejection reason' : 
                     commentType === 'approval' ? 'Approval comment' : 
                     'Comment'} ({newComment.length} characters)
                  </span>
                  {(() => {
                    const maxLength = commentType === 'rejection' ? 500 : 
                                    commentType === 'approval' ? 300 : 400;
                    const countInfo = getCharacterCountInfo(newComment, maxLength);
                    return (
                      <span className={countInfo.isOverLimit ? 'text-red-500' : 'text-muted-foreground'}>
                        {countInfo.remaining < 0 ? `${Math.abs(countInfo.remaining)} over` : `${countInfo.remaining} remaining`}
                      </span>
                    );
                  })()}
                </div>
              )}
              
              {/* Validation feedback */}
              {showValidation && validationResult && (
                <Alert className={`${validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <AlertTriangle className={`h-4 w-4 ${getValidationStatusClass(validationResult)}`} />
                  <AlertDescription className={getValidationStatusClass(validationResult)}>
                    {validationResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <strong>Errors:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {validationResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validationResult.warnings.length > 0 && (
                      <div className="space-y-1">
                        <strong>Warnings:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {validationResult.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validationResult.isValid && validationResult.warnings.length === 0 && (
                      <span>Comment looks good!</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting || !newComment.trim() || (validationResult && !validationResult.isValid)}
                size="sm"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Add {commentType === 'rejection' ? 'Rejection' : commentType === 'approval' ? 'Approval' : 'Comment'}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        <Separator />

        {/* Comments List */}
        <div className="space-y-4">
          {visibleComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to add a comment</p>
            </div>
          ) : (
            visibleComments
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .map((comment) => (
                <div key={comment.id} className="flex gap-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getRoleBadgeColor(comment.userRole)}>
                        {comment.userRole.replace('_', ' ')}
                      </Badge>
                      <Badge className={getCommentBadgeColor(comment.type)}>
                        {getCommentIcon(comment.type)}
                        <span className="ml-1 capitalize">{comment.type}</span>
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Comment Visibility Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Comment Visibility</span>
          </div>
          <div className="space-y-1">
            <p>• <strong>MoSPI Users:</strong> Can see all comments</p>
            <p>• <strong>State Approver:</strong> Can see state-level and nodal comments</p>
            <p>• <strong>Nodal Officer:</strong> Can see only their own comments</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewComments;
