import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

/**
 * ProtectedRoute
 * Restricts access to children based on authentication and allowed roles.
 * Redirects to login if not authenticated, or to /unauthorized if role not allowed.
 *
 * @param {ReactNode} children - The component(s) to render if access is allowed
 * @param {Array|string} allowedRoles - Role(s) allowed to access this route
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  // Not logged in: redirect to login, preserve intended location
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role not allowed: redirect to unauthorized page
  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Allowed: render children
  return <>{children}</>;
};

export default ProtectedRoute;
