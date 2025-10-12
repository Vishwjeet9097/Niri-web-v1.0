import React, { useEffect } from 'react';
import { notificationBus, AppNotification } from '@/services/NotificationBus';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

const ToastHost: React.FC = () => {
  useEffect(() => {
    const unsub = notificationBus.subscribe((n: AppNotification) => {
      // Bridge to existing notificationService.toast via custom event
      const evt = new CustomEvent('app:notification', { detail: n });
      window.dispatchEvent(evt);
    });
    return () => unsub();
  }, []);
  return (
    <>
      <Toaster />
      <Sonner />
    </>
  );
};

export const AppProviders: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <>
      <ToastHost />
      {children}
    </>
  );
};


