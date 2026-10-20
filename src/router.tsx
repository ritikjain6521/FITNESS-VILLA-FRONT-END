import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace/>;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace/>;
  if (user.role === 'member') return <Navigate to="/" replace/>;
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage/>}/>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/dashboard" element={
        <AdminRoute>
          <DashboardLayout><DashboardPage/></DashboardLayout>
        </AdminRoute>
      }/>
      <Route path="/dashboard/members" element={
        <AdminRoute><DashboardLayout><MembersPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/members/new" element={
        <AdminRoute><DashboardLayout><AddMemberPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/members/:id" element={
        <AdminRoute><DashboardLayout><MemberProfilePage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/members/:id/edit" element={
        <AdminRoute><DashboardLayout><EditMemberPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/memberships" element={
        <AdminRoute><DashboardLayout><MembershipsPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/memberships/new" element={
        <AdminRoute><DashboardLayout><AddMembershipPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/attendance" element={
        <AdminRoute><DashboardLayout><AttendancePage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/payments" element={
        <AdminRoute><DashboardLayout><PaymentsPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/expenses" element={
        <AdminRoute><DashboardLayout><ExpensesPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/inventory" element={
        <AdminRoute><DashboardLayout><InventoryPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/reports" element={
        <AdminRoute><DashboardLayout><ReportsPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/enquiries" element={
        <AdminRoute><DashboardLayout><EnquiriesPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="/dashboard/settings" element={
        <AdminRoute><DashboardLayout><SettingsPage/></DashboardLayout></AdminRoute>
      }/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}
