import { useEffect, useState } from "react";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/features/auth/AuthProvider";

export function useUserSubmissionStatus() {
  const { user } = useAuth();
  const [hasSubmission, setHasSubmission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubmission = async () => {
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
    };
    checkSubmission();
  }, [user?.id]);

  // Listen for submission success events - Scenario 2: When state approver submits form
  useEffect(() => {
    if (user?.role !== "STATE_APPROVER") return;

    const handleSubmissionSuccess = () => {
      console.log("🔒 [useUserSubmissionStatus] Submission successful - disabling button immediately");
      // Immediately set to true to disable button
      setHasSubmission(true);
      // Also refresh from API after a short delay to confirm
      setTimeout(async () => {
        try {
          if (!user?.id) return;
          const res = await apiService.get(`/submission/user/${user.id}`);
          const submission = res?.data?.data || res?.data;
          setHasSubmission(!!submission?.id);
        } catch (err) {
          console.warn("⚠️ Error refreshing submission status:", err);
        }
      }, 2000);
    };

    window.addEventListener('submission-success', handleSubmissionSuccess);
    
    return () => {
      window.removeEventListener('submission-success', handleSubmissionSuccess);
    };
  }, [user?.role, user?.id]);

  return { hasSubmission, loading };
}
