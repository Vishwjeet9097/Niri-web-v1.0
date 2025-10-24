import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, User, MessageSquare } from "lucide-react";

interface Comment {
  role: string;
  text: string;
  type: string;
  userId: string;
  sectionId: string;
  timestamp: string;
  userName?: string;
}

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  comments: Comment[];
}

export const TimelineModal = ({
  isOpen,
  onClose,
  sectionId,
  sectionTitle,
  comments,
}: TimelineModalProps) => {
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);

  useEffect(() => {
    // Debug logging removed for performance

    // Debug logging removed for performance

    // Debug logging removed for performance

    // Filter comments for the specific section
    const sectionComments = comments.filter(comment => comment.sectionId === sectionId);
    // Debug logging removed for performance

    // Debug logging removed for performance

    // Sort by timestamp (newest first)
    const sortedComments = sectionComments.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    // Debug logging removed for performance

    // Debug logging removed for performance

    setFilteredComments(sortedComments);
  }, [comments, sectionId]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "STATE_APPROVER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "MOSPI_REVIEWER":
        return "bg-green-100 text-green-800 border-green-200";
      case "MOSPI_APPROVER":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "NODAL_OFFICER":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "STATE_APPROVER":
        return "State Approver";
      case "MOSPI_REVIEWER":
        return "MoSPI Reviewer";
      case "MOSPI_APPROVER":
        return "MoSPI Approver";
      case "NODAL_OFFICER":
        return "Nodal Officer";
      default:
        return role.replace('_', ' ');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comment Timeline
          </DialogTitle>
          <DialogDescription>
            Comments for: {sectionTitle}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {filteredComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No comments available for this section</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComments.map((comment, index) => {
                const { date, time } = formatTimestamp(comment.timestamp);
                return (
                  <div key={index} className="relative">
                    {/* Timeline line */}
                    {index < filteredComments.length - 1 && (
                      <div className="absolute left-4 top-8 w-0.5 h-16 bg-gray-200" />
                    )}
                    
                    <div className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      
                      {/* Comment content */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={getRoleColor(comment.role)}
                            >
                              {getRoleDisplayName(comment.role)}
                            </Badge>
                            {comment.userName && (
                              <span className="text-sm font-medium text-gray-700">
                                {comment.userName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{date} at {time}</span>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3 border">
                          <p className="text-sm text-gray-800">{comment.text}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
