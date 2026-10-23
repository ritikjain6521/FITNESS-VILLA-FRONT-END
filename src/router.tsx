import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import MemberLayout from './components/MemberLayout';
import DashboardPage from './pages/DashboardPage';
import MemberDashboardPage from './pages/MemberDashboardPage';
import MembersPage from './pages/MembersPage';
import AddMemberPage from './pages/AddMemberPage';
import MemberProfilePage from './pages/MemberProfilePage';
import MembershipsPage from './pages/MembershipsPage';
import AttendancePage from './pages/AttendancePage';
import PaymentsPage from './pages/PaymentsPage';
import ExpensesPage from './pages/ExpensesPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import EnquiriesPage from './pages/EnquiriesPage';
import SettingsPage from './pages/SettingsPage';
import AddMembershipPage from './pages/AddMembershipPage';
import EditMemberPage from './pages/EditMemberPage';

// Member portal pages
import NewMemberDashboardPage from './pages/member/MemberDashboardPage';
import MemberAttendancePage from './pages/member/MemberAttendancePage';
import MemberPaymentsPage from './pages/member/MemberPaymentsPage';
import MemberMembershipPage from './pages/member/MemberMembershipPage';
import MemberProfileSelfPage from './pages/member/MemberProfileSelfPage';
import MemberAnnouncementsPage from './pages/member/MemberAnnouncementsPage';

// Admin management pages
import PlansManagementPage from './pages/admin/PlansManagementPage';
import RenewalRequestsPage from './pages/admin/RenewalRequestsPage';
import AnnouncementsAdminPage from './pages/admin/AnnouncementsAdminPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'member') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function MemberRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'member') return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

/** Main /dashboard: redirects admin/staff to admin dashboard, members to member dashboard */
function SmartDashboard() {
  const { user } = useAuth();
  if (user?.role === 'member') return <MemberLayout><NewMemberDashboardPage /></MemberLayout>;
  return <DashboardLayout><DashboardPage /></DashboardLayout>;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Smart dashboard — redirects based on role */}
      <Route path="/dashboard" element={
        <ProtectedRoute><SmartDashboard /></ProtectedRoute>
      } />

      {/* ─── MEMBER PORTAL ROUTES ─── */}
      <Route path="/member/attendance" element={
        <MemberRoute><MemberLayout><MemberAttendancePage /></MemberLayout></MemberRoute>
      } />
      <Route path="/member/payments" element={
        <MemberRoute><MemberLayout><MemberPaymentsPage /></MemberLayout></MemberRoute>
      } />
      <Route path="/member/membership" element={
        <MemberRoute><MemberLayout><MemberMembershipPage /></MemberLayout></MemberRoute>
      } />
      <Route path="/member/renewal" element={
        <MemberRoute><MemberLayout><MemberMembershipPage /></MemberLayout></MemberRoute>
      } />
      <Route path="/member/profile" element={
        <MemberRoute><MemberLayout><MemberProfileSelfPage /></MemberLayout></MemberRoute>
      } />
      <Route path="/member/announcements" element={
        <MemberRoute><MemberLayout><MemberAnnouncementsPage /></MemberLayout></MemberRoute>
      } />

      {/* ─── ADMIN / STAFF / TRAINER ROUTES ─── */}
      <Route path="/admin/dashboard" element={
        <AdminRoute><DashboardLayout><DashboardPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/members" element={
        <AdminRoute><DashboardLayout><MembersPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/members/new" element={
        <AdminRoute><DashboardLayout><AddMemberPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/members/:id" element={
        <AdminRoute><DashboardLayout><MemberProfilePage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/members/:id/edit" element={
        <AdminRoute><DashboardLayout><EditMemberPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/plans" element={
        <AdminRoute><DashboardLayout><PlansManagementPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/memberships" element={
        <AdminRoute><DashboardLayout><MembershipsPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/memberships/new" element={
        <AdminRoute><DashboardLayout><AddMembershipPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/renewal-requests" element={
        <AdminRoute><DashboardLayout><RenewalRequestsPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/attendance" element={
        <AdminRoute><DashboardLayout><AttendancePage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/payments" element={
        <AdminRoute><DashboardLayout><PaymentsPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/announcements" element={
        <AdminRoute><DashboardLayout><AnnouncementsAdminPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/expenses" element={
        <AdminRoute><DashboardLayout><ExpensesPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/inventory" element={
        <AdminRoute><DashboardLayout><InventoryPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/reports" element={
        <AdminRoute><DashboardLayout><ReportsPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/enquiries" element={
        <AdminRoute><DashboardLayout><EnquiriesPage /></DashboardLayout></AdminRoute>
      } />
      <Route path="/dashboard/settings" element={
        <AdminRoute><DashboardLayout><SettingsPage /></DashboardLayout></AdminRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
