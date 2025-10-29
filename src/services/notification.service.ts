import { toast } from "@/hooks/use-toast";
import { storageService } from "./storage.service";
import type { Notification } from "@/types";

const NOTIFICATIONS_KEY = "notifications";
const UNREAD_COUNT_KEY = "unread_count";

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();

  constructor() {
    this.loadNotifications();
  }

  private loadNotifications(): void {
    const stored = storageService.get<Notification[]>(NOTIFICATIONS_KEY);
    this.notifications = stored || [];
  }

  private saveNotifications(): void {
    storageService.set(NOTIFICATIONS_KEY, this.notifications);
    this.updateUnreadCount();
    this.notifyListeners();
  }

  private updateUnreadCount(): void {
    const count = this.notifications.filter((n) => !n.read).length;
    storageService.set(UNREAD_COUNT_KEY, count);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }

  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => this.listeners.delete(listener);
  }

  create(
    notification: Omit<Notification, "id" | "timestamp" | "read">
  ): Notification {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    this.saveNotifications();

    return newNotification;
  }

  toast(notification: Pick<Notification, "title" | "message" | "type">): void {
    let variant: "default" | "destructive" | "success" | "warning" | "info" =
      "default";

    // Map notification types to toast variants
    switch (notification.type) {
      case "error":
        variant = "destructive";
        break;
      case "success":
        variant = "success";
        break;
      case "warning":
        variant = "warning";
        break;
      case "info":
        variant = "info";
        break;
      default:
        variant = "default";
        break;
    }

    toast({
      title: notification.title,
      description: notification.message,
      variant,
    });
  }

  createAndToast(
    notification: Omit<Notification, "id" | "timestamp" | "read">
  ): Notification {
    const created = this.create(notification);
    this.toast(created);
    return created;
  }

  markAsRead(id: string): void {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach((n) => (n.read = true));
    this.saveNotifications();
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.saveNotifications();
  }

  clearAll(): void {
    this.notifications = [];
    this.saveNotifications();
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }

  getUnread(): Notification[] {
    return this.notifications.filter((n) => !n.read);
  }

  getUnreadCount(): number {
    return storageService.get<number>(UNREAD_COUNT_KEY) || 0;
  }

  // Toast notification methods
  success(message: string, title?: string, details?: any): void {
    console.log(`✅ ${title || "Success"}: ${message}`, details);
    this.toast({
      title: title || "Success",
      message: message,
      type: "success",
    });
  }

  error(message: string, title?: string, details?: any): void {
    console.error(`❌ ${title || "Error"}: ${message}`, details);
    this.toast({
      title: title || "Error",
      message: message,
      type: "error",
    });
  }

  warning(message: string, title?: string, details?: any): void {
    console.warn(`⚠️ ${title || "Warning"}: ${message}`, details);
    this.toast({
      title: title || "Warning",
      message: message,
      type: "warning",
    });
  }

  info(message: string, title?: string, details?: any): void {
    console.info(`ℹ️ ${title || "Info"}: ${message}`, details);
    this.toast({
      title: title || "Info",
      message: message,
      type: "info",
    });
  }
}

export const notificationService = new NotificationService();
