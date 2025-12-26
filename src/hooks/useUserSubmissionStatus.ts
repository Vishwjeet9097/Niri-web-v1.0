import { useEffect, useState, useCallback } from "react";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/features/auth/AuthProvider";

export function useUserSubmissionStatus() {
  const { user } = useAuth();
  const [hasSubmission, setHasSubmission] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSubmission = useCallback(async () => {
    try {
      if (!user?.id) return;
      const res = await apiService.get(`/submission/user/${user.id}`);
      const submission = res?.data?.data || res?.data;
      setHasSubmission(!!submission?.id);
    } catch (err) {
      console.warn("⚠️ Error checking submission:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkSubmission();
  }, [checkSubmission]);

  // Listen for submission creation events to refresh status
  useEffect(() => {
    const handleSubmissionCreated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventDetail = customEvent.detail || {};
      
      // Refresh if this is for the current user
      if (eventDetail.userId === user?.id || eventDetail.role === user?.role) {
        console.log("[useUserSubmissionStatus] Refreshing submission status after submission created");
        checkSubmission();
      }
    };

    window.addEventListener('indicatorsUpdated', handleSubmissionCreated);
    return () => {
      window.removeEventListener('indicatorsUpdated', handleSubmissionCreated);
    };
  }, [user?.id, user?.role, checkSubmission]);

  return { hasSubmission, loading };
}
