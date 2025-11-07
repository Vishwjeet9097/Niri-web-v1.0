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

  return { hasSubmission, loading };
}
