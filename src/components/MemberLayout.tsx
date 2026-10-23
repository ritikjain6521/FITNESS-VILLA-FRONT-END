import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity, Home, CreditCard, CalendarCheck, DollarSign,
  User, Bell, LogOut, Menu, X, ChevronRight, RefreshCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type NavItem = { to: string; label: string; icon: any; end?: boolean };

const memberNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, end: true },
  { to: '/member/membership', label: 'Membership', icon: CreditCard },
  { to: '/member/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/member/payments', label: 'Payments', icon: DollarSign },
  { to: '/member/announcements', label: 'Offers & Updates', icon: Bell },
  { to: '/member/profile', label: 'My Profile', icon: User },
  { to: '/member/renewal', label: 'Renew / Upgrade', icon: RefreshCw },
];

export default function MemberLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() { logout(); navigate('/'); }

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'M';

  return (
    <div className="dash-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark"><Activity size={20} /></span>
          <span>FITNESS <span className="accent">VILLA</span></span>
          <button className="sidebar-close" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        {/* Member identity badge in sidebar */}
        <div style={{ padding: '12px 20px', marginBottom: 4, background: 'rgba(181,242,61,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #b5f23d, #6ee100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#060807', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#b5f23d' }}>MEMBER PORTAL</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {memberNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon size={17} /><span>{label}</span><ChevronRight size={13} className="link-arrow" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div>
            <strong>{user?.name}</strong>
            <small className="pill">member</small>
          </div>
          <button className="icon-btn" onClick={handleLogout} title="Sign out"><LogOut size={17} /></button>
        </div>
        <div className="sidebar-credit">
          Made with <span className="heart">❤️</span> <span>Mahaveer Web Solution</span>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="dash-topbar">
        <button className="icon-btn mobile-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
        <NavLink className="brand dash-brand" to="/dashboard">
          <span className="brand-mark"><Activity size={18} /></span>
          <span>FITNESS <span className="accent">VILLA</span></span>
        </NavLink>
        <div className="dash-topbar-actions">
          <span className="pill" style={{ fontSize: 10, padding: '2px 8px' }}>Member</span>
          <div className="user-avatar-sm" title={user?.name}>{initials}</div>
          <button className="icon-btn" onClick={handleLogout} title="Sign out"><LogOut size={18} /></button>
        </div>
      </header>

      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      <main className="dash-content">{children}</main>
    </div>
  );
}
