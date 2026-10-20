import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity, Users, CreditCard, CalendarCheck, BarChart2,
  ShoppingBag, DollarSign, Settings, LogOut, Menu, X,
  Home, Bell, FileText, ChevronRight, Package
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/dashboard/members', label: 'Members', icon: Users },
  { to: '/dashboard/memberships', label: 'Memberships', icon: CreditCard },
  { to: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/dashboard/payments', label: 'Payments', icon: DollarSign },
  { to: '/dashboard/expenses', label: 'Expenses', icon: FileText },
  { to: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { to: '/dashboard/reports', label: 'Reports', icon: BarChart2 },
  { to: '/dashboard/enquiries', label: 'Enquiries', icon: Bell },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() { logout(); navigate('/'); }

  return (
    <div className="dash-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark"><Activity size={20} /></span>
          <span>FITNESS <span className="accent">VILLA</span></span>
          <button className="sidebar-close" onClick={() => setOpen(false)}><X size={18}/></button>
        </div>
        <nav className="sidebar-nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/dashboard'} onClick={() => setOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon size={17} /><span>{label}</span><ChevronRight size={13} className="link-arrow"/>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user?.name[0]?.toUpperCase()}</div>
          <div>
            <strong>{user?.name}</strong>
            <small className="pill">{user?.role}</small>
          </div>
          <button className="icon-btn" onClick={handleLogout} title="Sign out"><LogOut size={17}/></button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="dash-topbar">
        <button className="icon-btn mobile-menu-btn" onClick={() => setOpen(true)} aria-label="Open navigation menu">
          <Menu size={22}/>
        </button>
        <NavLink className="brand dash-brand" to="/dashboard">
          <span className="brand-mark"><Activity size={18}/></span>
          <span>FITNESS <span className="accent">VILLA</span></span>
        </NavLink>
        <div className="dash-topbar-actions">
          <div className="user-avatar-sm" title={user?.name}>{user?.name ? user.name[0]?.toUpperCase() : 'U'}</div>
          <button className="icon-btn" onClick={handleLogout} title="Sign out" aria-label="Sign out">
            <LogOut size={18}/>
          </button>
        </div>
      </header>

      {open && <div className="overlay" onClick={() => setOpen(false)}/>}

      <main className="dash-content">
        {children}
      </main>
    </div>
  );
}
