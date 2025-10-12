export type NotificationType = "info" | "success" | "warning" | "error";
export interface AppNotification {
  id?: string;
  title: string;
  message?: string;
  type?: NotificationType;
  ctaText?: string;
  onCtaClick?: () => void;
}

type Subscriber = (n: AppNotification) => void;

class NotificationBus {
  private subs = new Set<Subscriber>();
  subscribe(fn: Subscriber) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
  publish(n: AppNotification) {
    this.subs.forEach((s) => s(n));
  }
}

export const notificationBus = new NotificationBus();

// Facade helpers
export const NotificationService = {
  notify(n: AppNotification) {
    notificationBus.publish({ type: "info", ...n });
  },
  success(message: string, title = "Success") {
    notificationBus.publish({ title, message, type: "success" });
  },
  error(message: string, title = "Error") {
    notificationBus.publish({ title, message, type: "error" });
  },
  warning(message: string, title = "Warning") {
    notificationBus.publish({ title, message, type: "warning" });
  },
  info(message: string, title = "Info") {
    notificationBus.publish({ title, message, type: "info" });
  },
};

// Alias for backward compatibility
export const notificationService = NotificationService;
