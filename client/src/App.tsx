import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { AuthLayout } from "./layouts/AuthLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";

// Auth Pages
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";

// Admin Pages
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { PatientsPage } from "./pages/admin/PatientsPage";
import { PatientDetailsPage } from "./pages/admin/PatientDetailsPage";
import { TherapistsPage } from "./pages/admin/TherapistsPage";
import { RoomsPage } from "./pages/admin/RoomsPage";
import { CoursesPage } from "./pages/admin/CoursesPage";
import { CreateCoursePage } from "./pages/admin/CreateCoursePage";
import { CourseDetailsPage } from "./pages/admin/CourseDetailsPage";
import { CalendarPage } from "./pages/admin/CalendarPage";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { NotificationsPage } from "./pages/admin/NotificationsPage";

// Therapist Pages
import { TherapistDashboard } from "./pages/therapist/TherapistDashboard";
import { MyDayPage } from "./pages/therapist/MyDayPage";
import { TherapistPatientsPage } from "./pages/therapist/TherapistPatientsPage";
import { TherapistHistoryPage } from "./pages/therapist/TherapistHistoryPage";

// Patient Pages
import { PatientDashboard } from "./pages/patient/PatientDashboard";
import { CareJourneyPage } from "./pages/patient/CareJourneyPage";
import { PatientSessionsPage } from "./pages/patient/PatientSessionsPage";
import { PatientHistoryPage } from "./pages/patient/PatientHistoryPage";
import { PatientNotificationsPage } from "./pages/patient/PatientNotificationsPage";
import { PatientAIAssistantPage } from "./pages/patient/PatientAIAssistantPage";

// 404
import { NotFoundPage } from "./pages/NotFoundPage";

// Protected Route Guard
const RoleGuard: React.FC<{
  allowedRoles: Array<"ADMIN" | "THERAPIST" | "PATIENT">;
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    const fallback =
      user.role === "ADMIN" ? "/admin" : user.role === "THERAPIST" ? "/therapist" : "/patient";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={
          user ? (
            user.role === "ADMIN" ? (
              <Navigate to="/admin" replace />
            ) : user.role === "THERAPIST" ? (
              <Navigate to="/therapist" replace />
            ) : (
              <Navigate to="/patient" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <RoleGuard allowedRoles={["ADMIN"]}>
            <DashboardLayout />
          </RoleGuard>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/:id" element={<PatientDetailsPage />} />
        <Route path="therapists" element={<TherapistsPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/create" element={<CreateCoursePage />} />
        <Route path="courses/:id" element={<CourseDetailsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Therapist Routes */}
      <Route
        path="/therapist"
        element={
          <RoleGuard allowedRoles={["THERAPIST"]}>
            <DashboardLayout />
          </RoleGuard>
        }
      >
        <Route index element={<TherapistDashboard />} />
        <Route path="my-day" element={<MyDayPage />} />
        <Route path="patients" element={<TherapistPatientsPage />} />
        <Route path="history" element={<TherapistHistoryPage />} />
      </Route>

      {/* Patient Routes */}
      <Route
        path="/patient"
        element={
          <RoleGuard allowedRoles={["PATIENT"]}>
            <DashboardLayout />
          </RoleGuard>
        }
      >
        <Route index element={<PatientDashboard />} />
        <Route path="journey" element={<CareJourneyPage />} />
        <Route path="sessions" element={<PatientSessionsPage />} />
        <Route path="history" element={<PatientHistoryPage />} />
        <Route path="notifications" element={<PatientNotificationsPage />} />
        <Route path="ai" element={<PatientAIAssistantPage />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
