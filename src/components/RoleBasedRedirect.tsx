import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";

/**
 * RoleBasedRedirect
 * Redirects users to role-specific dashboards based on their role
 */
export function RoleBasedRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  const getDefaultPath = (role: string) => {
    if (role === "ADMIN") return "/user-management";
    if (role === "MINISTRY_APPROVER") return "/ministry/dashboard";
    return "/dashboard";
  };

  const defaultPath = getDefaultPath(user.role);
  return <Navigate to={defaultPath} replace />;
}

