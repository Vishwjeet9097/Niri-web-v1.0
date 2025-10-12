import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import TestDataIndicator from "@/components/TestDataIndicator";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { LoginPage } from "./features/auth/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import RankingScoringPage from "./components/RankingScoring/RankingScoringPage";
import NotFound from "./pages/NotFound";
import { SubmissionLayout } from "./features/submission/pages/SubmissionLayout";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import RoleBasedDashboard from "./features/dashboard/RoleBasedDashboard";
import { InfraFinancingStep } from "./features/submission/pages/InfraFinancingStep";
import { ReviewSubmitStep } from "./features/submission/pages/ReviewSubmitStep";
import { PreviewPage } from "./features/submission/pages/PreviewPage";
import { PPPDevelopmentStep } from "./features/submission/pages/PPPDevelopmentStep";
import { InfraDevelopmentStep } from "./features/submission/pages/InfraDevelopmentStep";
import { InfraEnablersStep } from "./features/submission/pages/InfraEnablersStep";
import { AuthProvider } from "./features/auth/AuthProvider";
import ProtectedRoute from "./routes/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Navigate } from "react-router-dom";
import { SubmissionListPage } from "./features/dataSubmission/pages/SubmissionListPage";
import { SubmissionDetailPage } from "./features/dataSubmission/pages/SubmissionDetailPage";
import { EditSubmissionPage } from "./features/dataSubmission/pages/EditSubmissionPage";
import { UserManagementPage } from "./features/userManagement/UserManagementPage";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <TestDataIndicator />
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<RoleBasedDashboard />} />
              <Route
                path="/reviewer-dashboard"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route path="/submissions/*" element={<SubmissionLayout />}>
                <Route index element={<InfraFinancingStep />} />
                <Route
                  path="infra-financing"
                  element={<InfraFinancingStep />}
                />
                <Route
                  path="infra-development"
                  element={<InfraDevelopmentStep />}
                />
                <Route
                  path="ppp-development"
                  element={<PPPDevelopmentStep />}
                />
                <Route path="infra-enablers" element={<InfraEnablersStep />} />
                <Route path="review-submit" element={<ReviewSubmitStep />} />
                <Route path="preview" element={<PreviewPage />} />
              </Route>
              <Route path="/data-submission/review" element={<SubmissionListPage />} />
              <Route path="/data-submission/review/:id" element={<SubmissionDetailPage />} />
              <Route path="/data-submission/edit/:id" element={<EditSubmissionPage />} />
              <Route 
                path="/user-management" 
                element={
                  <ProtectedRoute allowedRoles={["STATE_APPROVER", "ADMIN"]}>
                    <UserManagementPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/ranking" element={<RankingScoringPage />} />
              <Route
                path="/support"
                element={
                  <PlaceholderPage
                    title="Support & Help"
                    description="Get help and support resources"
                  />
                }
              />
              <Route
                path="/settings"
                element={
                  <PlaceholderPage
                    title="Settings"
                    description="Manage your account settings"
                  />
                }
              />
              <Route
                path="/unauthorized"
                element={
                  <PlaceholderPage
                    title="Unauthorized"
                    description="You do not have access to this page."
                  />
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
