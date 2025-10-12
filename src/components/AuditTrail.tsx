import React, { useState, useEffect } from 'react';
import { Activity, Clock, User, FileText, Eye, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiService } from '@/services/api.service';
import { notificationService } from '@/services/notification.service';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
  id: string;
  userId: string;
  userRole: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditTrailProps {
  entityType?: string;
  entityId?: string;
  userId?: string;
  readonly?: boolean;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({
  entityType,
  entityId,
  userId,
  readonly = false
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    userRole: '',
    dateRange: ''
  });

  useEffect(() => {
    loadAuditLogs();
  }, [page, entityType, entityId, userId, filters]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      let logs: AuditLog[] = [];

      if (entityType && entityId) {
        // Get entity-specific audit trail
        logs = await apiService.getEntityAuditTrail(entityType, entityId);
      } else if (userId) {
        // Get user-specific audit logs
        logs = await apiService.getUserAuditLogs(userId);
      } else {
        // Get all audit logs with pagination
        const response = await apiService.getAuditLogs(page, limit);
        logs = response.logs || [];
        setTotal(response.total || 0);
      }

      // Apply filters
      let filteredLogs = logs;
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => 
          log.action.toLowerCase().includes(filters.action.toLowerCase())
        );
      }
      if (filters.userRole) {
        filteredLogs = filteredLogs.filter(log => log.userRole === filters.userRole);
      }
      if (filters.dateRange) {
        const days = parseInt(filters.dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= cutoffDate
        );
      }

      setAuditLogs(filteredLogs);
    } catch (error: any) {
      notificationService.error(
        error.message || 'Failed to load audit logs',
        'Load Failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'created':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'update':
      case 'updated':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'delete':
      case 'deleted':
        return <FileText className="w-4 h-4 text-red-600" />;
      case 'login':
        return <User className="w-4 h-4 text-green-600" />;
      case 'logout':
        return <User className="w-4 h-4 text-gray-600" />;
      case 'approve':
      case 'approved':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'reject':
      case 'rejected':
        return <FileText className="w-4 h-4 text-red-600" />;
      case 'forward':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'resubmit':
        return <FileText className="w-4 h-4 text-orange-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'created':
      case 'approve':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'update':
      case 'updated':
      case 'forward':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
      case 'deleted':
      case 'reject':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'resubmit':
        return 'bg-orange-100 text-orange-800';
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
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

  const exportAuditLogs = async () => {
    try {
      const response = await apiService.exportReport('csv');
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      notificationService.success('Audit logs exported successfully', 'Export Complete');
    } catch (error: any) {
      notificationService.error(
        error.message || 'Failed to export audit logs',
        'Export Failed'
      );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Audit Trail
            <Badge variant="secondary">
              {auditLogs.length} entries
            </Badge>
          </CardTitle>
          
          {!readonly && (
            <Button variant="outline" size="sm" onClick={exportAuditLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {!readonly && (
          <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Input
              placeholder="Search by action..."
              value={filters.action}
              onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
              className="w-48"
            />
            
            <Select
              value={filters.userRole}
              onValueChange={(value) => setFilters(prev => ({ ...prev, userRole: value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value="NODAL_OFFICER">Nodal Officer</SelectItem>
                <SelectItem value="STATE_APPROVER">State Approver</SelectItem>
                <SelectItem value="MOSPI_REVIEWER">MoSPI Reviewer</SelectItem>
                <SelectItem value="MOSPI_APPROVER">MoSPI Approver</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Time</SelectItem>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Audit Logs Table */}
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Loading audit logs...</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No audit logs found</p>
            <p className="text-sm">Activity will appear here as users interact with the system</p>
          </div>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(log.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getActionBadgeColor(log.action)}>
                      {log.action}
                    </Badge>
                    <Badge className={getRoleBadgeColor(log.userRole)}>
                      {log.userRole.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm">
                      <strong>{log.userName}</strong> {log.action.toLowerCase()}d{' '}
                      <strong>{log.entityType}</strong>
                      {log.entityName && ` "${log.entityName}"`}
                    </p>
                    
                    {Object.keys(log.details).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!entityType && !userId && total > limit && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => prev + 1)}
                disabled={page * limit >= total}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditTrail;
