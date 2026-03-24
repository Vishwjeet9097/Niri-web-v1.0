// niri - web / src / features / dashboard / RoleBasedDashboard.tsx;
import React from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Navigate, useLocation } from "react-router-dom";
import ReviewerDashboardPage from "./ReviewerDashboardPage";
import ApproverDashboardPage from "./ApproverDashboardPage";
import { NodalDashboardPage } from "./NodalDashboardPage";
import { StateApproverDashboardPage } from "./StateApproverDashboardPage";
import { MospiApproverDashboardPage } from "./MospiApproverDashboardPage";
import { MinistryDashboardPage } from "../ministry/Dashboard/MinistryDashboardPage";
import { DashboardPage } from "./DashboardPage"; // Fallback dashboard
import AdminDashboardPage from "./AdminDashboardPage";

export default function RoleBasedDashboard() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Show loading while user is being resolved (avoids flash of blank)
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Use backend role format
  const role = user.role;
  const userMinistryId = user?.ministryId; 

  // Render dashboard based on backend role
  switch (role) {
    case "MOSPI_REVIEWER":
      return <ReviewerDashboardPage />;
    
    case "MOSPI_APPROVER":
      return <MospiApproverDashboardPage />;
    
    case "NODAL_OFFICER":
      // If user has a ministryId (not blank), redirect to ministry/nodal route, otherwise show NodalDashboardPage
      if (userMinistryId && String(userMinistryId).trim() !== "") {
        return <Navigate to="/ministry/nodal" replace />;
      }
      return <NodalDashboardPage />;
    
    case "STATE_APPROVER":
      return <StateApproverDashboardPage />;
    
    case "MINISTRY_APPROVER":
      // Redirect ministry approvers to their dedicated dashboard route
      return <Navigate to="/ministry/dashboard" replace />;
    
     case "ADMIN": {
      // Always redirect Admin to /dashboard for consistent sidebar/menu
      // use pathname (basename-relative) not window.location.pathname - with base path /state or /ministry, pathname is "/dashboard"
      if (pathname !== "/dashboard") {
        return <Navigate to="/dashboard" replace />;
      }
      return <AdminDashboardPage />;
    }
    
    default:
      // Fallback for unknown roles
      return <DashboardPage />;
  }
}