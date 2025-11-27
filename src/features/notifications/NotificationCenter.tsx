import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/AuthProvider';
import { apiService } from '@/services/api.service';
// Add a helper to apiService for notifications if not present
import type { Notification } from '@/types';

export function NotificationCenter() {

    // Handler to mark notification as read/handled
    const handleRemoveNotification = useCallback(async (id: string) => {
      try {
        await apiService.markNotificationStatus(id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount((prev) => prev - 1);
      } catch (err) {
        // Optionally show error toast
        console.error('Failed to update notification status', err);
      }
    }, []);
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    apiService.getNotifications(user.id)
      .then((data: Notification[]) => {
        setNotifications(Array.isArray(data) ? data : []);
        setUnreadCount((Array.isArray(data) ? data : []).filter((n: Notification) => !n.read).length);
      })
      .catch(console.error);
  }, [user?.id]);

  const getNotificationIcon = (type: Notification['type']) => {
    const colors = {
      success: 'text-success',
      error: 'text-destructive',
      warning: 'text-warning',
      info: 'text-primary',
    };
    return colors[type];
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b hover:bg-muted/50 transition-colors ${
                  !notification.read ? 'bg-muted/30' : ''
                } flex items-start justify-between`}
              >
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      // Prefer timestamp, fallback to createdAt
                      const tsRaw = notification.createdAt;
                      if (!tsRaw) return '';
                      let ts = tsRaw;
                      let dateObj;
                      if (typeof ts === 'string') {
                        ts = ts.replace(/\.[0-9]+(Z|[+-][0-9:]+)?$/, '');
                        if (!ts.includes('T')) {
                          ts = ts.replace(' ', 'T');
                        }
                        dateObj = new Date(ts);
                      } else if (typeof ts === 'number') {
                        dateObj = new Date(ts);
                      }
                      if (!dateObj || isNaN(dateObj.getTime())) return '';
                      // Format: 25th Nov 2025 09:34:30
                      const day = dateObj.getDate();
                      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      const month = monthNames[dateObj.getMonth()];
                      const year = dateObj.getFullYear();
                      const hours = String(dateObj.getHours()).padStart(2, '0');
                      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                      // Day suffix
                      const getDaySuffix = (d) => {
                        if (d > 3 && d < 21) return 'th';
                        switch (d % 10) {
                          case 1: return 'st';
                          case 2: return 'nd';
                          case 3: return 'rd';
                          default: return 'th';
                        }
                      };
                      return `${day}${getDaySuffix(day)} ${month} ${year} ${hours}:${minutes}:${seconds}`;
                    })()}
                  </p>
                </div>
                <button
                  className="ml-4 mt-1 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveNotification(notification.id)}
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
