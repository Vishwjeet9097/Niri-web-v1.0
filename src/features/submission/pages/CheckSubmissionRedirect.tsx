import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiService } from "@/services/api.service";
import { RefreshCw } from "lucide-react";

export function CheckSubmissionRedirect() {
  console.log("🚦 CheckSubmissionRedirect mounted==============================");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkExistingSubmission = async () => {
      try {
        console.log("🔍 Checking existing submission for user:", user?.id);
        const res = await apiService.get(`/submission/user/${user?.id}`);
               

      
        const submission = res?.data?.data || res?.data;
         console.log("res=========2222222====", res, "kkk",submission)


        if (submission && submission.id) {
          console.log("✅ Found existing submission:", submission.id);
          // Redirect to the read-only review page
          navigate(`/data-submission/review/${submission.id}`, { replace: true });
        } else {
          console.log("🆕 No previous submission, staying on submission form");
        }
      } catch (err) {
        console.warn("⚠️ Error checking submission:", err);
      } finally {
        setChecking(false);
      }
    };

    if (user?.id) checkExistingSubmission();
  }, [user?.id, navigate]);

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
        <p>Checking your submission status...</p>
      </div>
    );
  }

  // If no submission found, render the submission layout (normal flow)
  return <Outlet />;
}
