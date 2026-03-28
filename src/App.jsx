import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/public/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import Layout from "./layout/Layout";
import Dashboard from "./pages/Dashboard";
import InDevelopment from "./pages/InDevelopment";
import ReporterHome from "./pages/reporter/ReporterHome";
import SubmitHazard from "./pages/reporter/SubmitHazard";
import MyReports from "./pages/reporter/MyReports";
import HazardEvidenceViewer from "./pages/reporter/HazardEvidenceViewer";
import ReportDetail from "./pages/reporter/ReportDetail";
import AdminHome from "./pages/administrator/AdminHome";
import AdminInbox from "./pages/administrator/AdminInbox";
import AdminReportDetail from "./pages/administrator/AdminReportDetail";
import AdminEditReport from "./pages/administrator/AdminEditReport";
import ManageUsers from "./pages/system_manager/ManageUsers";
import ManageCategories from "./pages/system_manager/ManageCategories";
import ManageLocations from "./pages/system_manager/ManageLocations";
import PersonnelNotifications from "./pages/personnel/PersonnelNotifications";
import Register from "./pages/public/Register";
import ForgotPassword from "./pages/public/ForgotPassword";
import ResetPassword from "./pages/public/ResetPassword";
import { useAuth } from "./contexts/AuthContext";
import { getHomePathForUser } from "./utils/authRouting";
import AuthLoadingScreen from "./components/AuthLoadingScreen";
import Profile from "./pages/Profile";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingScreen text="Checking your session…" />;
  return <Navigate to={user ? getHomePathForUser(user) : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={<Dashboard />}
        />
        <Route path="track" element={<InDevelopment title="Document Tracking" description="Tracking view is not yet implemented in SCC HazTrack." />} />
        <Route path="documents" element={<InDevelopment title="Registered Documents" description="Documents registry is not yet implemented in SCC HazTrack." />} />
        <Route path="documents/register" element={<InDevelopment title="Register Document" description="Document registration is not yet implemented in SCC HazTrack." />} />
        <Route path="profile" element={<Profile />} />
        <Route path="reports" element={<InDevelopment title="Management Reports" description="Reports page is not yet implemented in SCC HazTrack." />} />
        <Route path="admin/users" element={<InDevelopment title="User Accounts" description="User management is not yet implemented in SCC HazTrack." />} />
        <Route path="admin/document-types" element={<InDevelopment title="Document Type Registry" description="Document types are not yet implemented in SCC HazTrack." />} />
        <Route path="admin/settings" element={<InDevelopment title="System Configuration" description="System configuration is not yet implemented in SCC HazTrack." />} />

        <Route
          path="admin"
          element={
            <RoleRoute allow={["admin"]}>
              <AdminHome />
            </RoleRoute>
          }
        />
        <Route
          path="admin/inbox"
          element={
            <RoleRoute allow={["admin"]}>
              <AdminInbox />
            </RoleRoute>
          }
        />
        <Route
          path="admin/reports/:id"
          element={
            <RoleRoute allow={["admin"]}>
              <AdminReportDetail />
            </RoleRoute>
          }
        />
        <Route
          path="admin/reports/:id/edit"
          element={
            <RoleRoute allow={["admin"]}>
              <AdminEditReport />
            </RoleRoute>
          }
        />

        {/* Admin (system manager) pages must stay inside Layout shell */}
        <Route
          path="manager/users"
          element={
            <RoleRoute allow={["admin"]}>
              <ManageUsers />
            </RoleRoute>
          }
        />
        <Route
          path="manager/categories"
          element={
            <RoleRoute allow={["admin"]}>
              <ManageCategories />
            </RoleRoute>
          }
        />
        <Route
          path="manager/locations"
          element={
            <RoleRoute allow={["admin"]}>
              <ManageLocations />
            </RoleRoute>
          }
        />

        <Route path="reporter" element={<ReporterHome />} />
        <Route path="reporter/submit" element={<SubmitHazard />} />
        <Route path="reporter/my-reports" element={<MyReports />} />
        <Route path="reporter/hazard-evidence" element={<HazardEvidenceViewer />} />
        <Route path="reporter/reports/:id" element={<ReportDetail />} />
        <Route
          path="personnel/notifications"
          element={
            <RoleRoute allow={["reporter", "personnel"]}>
              <PersonnelNotifications />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="/reporter" element={<Navigate to="/dashboard" replace />} />

      <Route path="/manager" element={<Navigate to="/manager/users" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
