import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, MessageSquare, CheckCircle, XCircle, Send, ArrowRight } from "lucide-react";
import { getRoleDisplayName, getPillColorClass } from "@/utils/auditUtils";

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorRole: string;
  comment?: string;
  status?: string;
  details?: string;
}

interface AuditLogProps {
  entries: AuditEntry[];
  className?: string;
}

export const AuditLog: React.FC<AuditLogProps> = ({ entries, className = "" }) => {
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
      case "submitted":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected":
      case "sent back":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "forwarded":
      case "sent to":
        return <ArrowRight className="w-4 h-4 text-blue-600" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "commented":
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string, status?: string) => {
    return getPillColorClass(action, status);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  if (entries.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No audit entries available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Audit Log</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete history of submission actions and comments
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry, index) => {
            const { date, time } = formatTimestamp(entry.timestamp);
            const isLast = index === entries.length - 1;

            return (
              <div key={entry.id} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200" />
                )}

                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                    {getActionIcon(entry.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className={getActionColor(entry.action, entry.status)}
                        >
                          {entry.action}
                        </Badge>
                        {entry.status && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPillColorClass(entry.action, entry.status)}`}
                          >
                            {entry.status}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {date} at {time}
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{entry.actor}</span>
                        <span className="text-muted-foreground">
                          ({getRoleDisplayName(entry.actorRole)})
                        </span>
                      </div>

                      {entry.comment && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-start space-x-2">
                            <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-700">
                                {entry.comment}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {entry.details && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {entry.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditLog;
