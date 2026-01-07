// niri - web / src / features / dashboard / RoleBasedDashboard.tsx;
import React from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Navigate } from "react-router-dom";
import ReviewerDashboardPage from "./ReviewerDashboardPage";
import ApproverDashboardPage from "./ApproverDashboardPage";
import { NodalDashboardPage } from "./NodalDashboardPage";
import { MinistryNodalDashboardPage } from "./MinistryNodalDashboardPage";
import { StateApproverDashboardPage } from "./StateApproverDashboardPage";
import { MospiApproverDashboardPage } from "./MospiApproverDashboardPage";
import { MinistryDashboardPage } from "../ministry/Dashboard/MinistryDashboardPage";
import { DashboardPage } from "./DashboardPage"; // Fallback dashboard
import AdminDashboardPage from "./AdminDashboardPage";

export default function RoleBasedDashboard() {
  const { user } = useAuth();

  if (!user) return null;
  
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
      // If user has a ministryId (not blank), show MinistryNodalDashboardPage, otherwise show NodalDashboardPage
      if (userMinistryId && String(userMinistryId).trim() !== "") {
        return <MinistryNodalDashboardPage />;
      }
      return <NodalDashboardPage />;
    
    case "STATE_APPROVER":
      return <StateApproverDashboardPage />;
    
    case "MINISTRY_APPROVER":
      // Redirect ministry approvers to their dedicated dashboard route
      return <Navigate to="/ministry-dashboard" replace />;
    
     case "ADMIN": {
      // Always redirect Admin to /dashboard for consistent sidebar/menu
      const location = window.location.pathname;
      if (location !== "/dashboard") {
        return <Navigate to="/dashboard" replace />;
      }
      return <AdminDashboardPage />;
    }
    
    default:
      // Fallback for unknown roles
      return <DashboardPage />;
  }
}