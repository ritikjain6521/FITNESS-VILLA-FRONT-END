import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, money, fmt, daysLeft } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import {
  CreditCard, CalendarCheck, DollarSign, Activity, Clock,
  AlertTriangle, CheckCircle, XCircle, TrendingUp, Bell, ArrowRight,
  RefreshCw, Tag, Zap, Camera, ShieldCheck, LogOut, MapPin
} from 'lucide-react';
import LivePhotoAttendanceModal from '../../components/LivePhotoAttendanceModal';

type AttendanceStatusMe = {
  isCheckedIn: boolean;
  activeSession?: { _id: string; checkInAt: string; photoUrl?: string; location?: string } | null;
  canCheckIn: boolean;
};

type PlanInfo = { name: string; pricePaise: number; durationDays: number; features?: string[]; description?: string };
type ActiveMembership = { _id: string; plan: PlanInfo; startDate: string; endDate: string; status: string };
type MembershipRecord = { _id: string; plan: { name: string; pricePaise: number; durationDays: number }; startDate: string; endDate: string; status: string };
type AttendanceRecord = { _id: string; checkInAt: string; checkOutAt?: string };
type PaymentRecord = { _id: string; amountPaise: number; method: string; status: string; paidAt?: string; receiptNumber?: string; membership?: { plan?: { name: string } } };
type Announcement = { _id: string; title: string; content: string; type: string; priority: string; badge?: string; discountPercent?: number; validUntil?: string };
type RenewalRequest = { _id: string; requestType: string; status: string; requestedPlan: { name: string; pricePaise: number }; createdAt: string };
type GymInfo = { gymName: string; tagline: string; phone: string; email: string; address: string };

type Summary = {
  activeMembership: ActiveMembership | null;
  allMemberships: MembershipRecord[];
  totalAttendance: number;
  monthAttendance: number;
  recentAttendance: AttendanceRecord[];
  payments: PaymentRecord[];
  pendingPayments: PaymentRecord[];
  totalPaidPaise: number;
  outstandingDuePaise: number;
  announcements: Announcement[];
  renewalRequests: RenewalRequest[];
  gymInfo: GymInfo;
};

const typeColors: Record<string, string> = {
  offer: 'badge-yellow',
  announcement: 'badge-green',
  event: 'badge-orange',
  alert: 'badge-red',
};

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMe, setStatusMe] = useState<AttendanceStatusMe | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  function loadStatus() {
    api<AttendanceStatusMe>('/attendance/status/me')
      .then(r => setStatusMe(r))
      .catch(() => {});
  }

  function loadSummary() {
    api<Summary>('/dashboard/member-summary')
      .then(r => setData(r))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSummary();
    loadStatus();
  }, []);

  async function handleCheckOut() {
    setCheckingOut(true);
    try {
      await api('/attendance/self-checkout', { method: 'POST' });
      loadStatus();
      loadSummary();
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /><span>Loading your dashboard…</span></div>;
  if (error) return <div className="page-error"><AlertTriangle size={24} /><span>{error}</span></div>;
  if (!data) return null;

  const active = data.activeMembership;
  const remaining = active ? Math.max(0, daysLeft(active.endDate)) : 0;
  const isExpiringSoon = remaining > 0 && remaining <= 7;
  const isExpired = !active || remaining === 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, <span className="accent">{user?.name?.split(' ')[0] || 'Member'}</span></h1>
          <p className="muted">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {data.gymInfo?.gymName ? ` · ${data.gymInfo.gymName}` : ''}
          </p>
        </div>
        <div className="page-actions">
          {!statusMe?.isCheckedIn && statusMe?.canCheckIn && (
            <button
              className="btn btn-green"
              onClick={() => setCameraModalOpen(true)}
              style={{ boxShadow: '0 0 15px rgba(181, 242, 61, 0.3)' }}
            >
              <Camera size={15} /> Check In (Live Photo)
            </button>
          )}
          <button className="btn btn-outline" onClick={() => navigate('/member/attendance')}>
            Attendance Log
          </button>
          <button className="btn btn-green" onClick={() => navigate('/member/renewal')}>
            <RefreshCw size={15} /> Renew / Upgrade
          </button>
        </div>
      </div>

      {/* Live Training Session Banner (if checked in) */}
      {statusMe?.isCheckedIn && statusMe.activeSession && (
        <div className="active-session-banner">
          <div className="session-info-left">
            {statusMe.activeSession.photoUrl ? (
              <div className="session-avatar-wrap">
                <img src={statusMe.activeSession.photoUrl} alt="Check-in snapshot" />
                <span className="session-live-pill">LIVE</span>
              </div>
            ) : (
              <div className="session-avatar-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={26} className="accent" />
                <span className="session-live-pill">IN GYM</span>
              </div>
            )}
            <div>
              <h4 className="session-meta-h4">
                {(statusMe.activeSession as any).status === 'pending'
                  ? 'Check-In Awaiting Front Desk Approval'
                  : 'Currently Training at Fitness Villa'}
                {(statusMe.activeSession as any).status === 'pending' ? (
                  <span className="badge badge-yellow" style={{ fontSize: 11, padding: '2px 7px' }}>
                    <Clock size={11} /> Pending Approval
                  </span>
                ) : (
                  <span className="badge badge-green" style={{ fontSize: 11, padding: '2px 7px' }}>
                    <ShieldCheck size={11} /> Photo Verified
                  </span>
                )}
              </h4>
              <p className="session-meta-sub">
                <span>
                  <Clock size={13} className="accent" />
                  Check-in: {new Date(statusMe.activeSession.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>
                  <MapPin size={13} />
                  {statusMe.activeSession.location || 'Main Gym Floor'}
                </span>
              </p>
            </div>
          </div>
          <div>
            <button
              className="btn btn-outline"
              onClick={handleCheckOut}
              disabled={checkingOut}
              style={{ borderColor: 'rgba(255, 87, 87, 0.4)', color: '#ff6b6b' }}
            >
              <LogOut size={15} /> {checkingOut ? 'Checking Out…' : 'Check Out Now'}
            </button>
          </div>
        </div>
      )}

      {/* Membership Status Banner */}
      {active && !isExpiringSoon && (
        <div className="status-banner status-green" style={{ marginBottom: 20 }}>
          <CheckCircle size={18} />
          <span>
            Active Plan: <strong>{active.plan.name}</strong>
            &nbsp;· Expires {fmt(active.endDate)} &nbsp;
            <span className="badge badge-green">{remaining} days left</span>
          </span>
        </div>
      )}
      {isExpiringSoon && (
        <div className="status-banner status-yellow" style={{ marginBottom: 20 }}>
          <AlertTriangle size={18} />
          <span>
            <strong>Expiring soon!</strong> Your <strong>{active!.plan.name}</strong> plan expires in{' '}
            <strong>{remaining} day{remaining !== 1 ? 's' : ''}</strong> on {fmt(active!.endDate)}.
            &nbsp;
            <button className="link-btn" onClick={() => navigate('/member/renewal')}>Renew now →</button>
          </span>
        </div>
      )}
      {isExpired && (
        <div className="status-banner status-red" style={{ marginBottom: 20 }}>
          <XCircle size={18} />
          <span>
            No active membership.&nbsp;
            <button className="link-btn" onClick={() => navigate('/member/renewal')}>Request renewal →</button>
            &nbsp;or contact reception.
          </span>
        </div>
      )}
      {data.outstandingDuePaise > 0 && (
        <div className="status-banner status-orange" style={{ marginBottom: 20 }}>
          <DollarSign size={18} />
          <span>
            Outstanding balance: <strong>{money(data.outstandingDuePaise)}</strong>.
            &nbsp;
            <button className="link-btn" onClick={() => navigate('/member/payments')}>View &amp; Pay →</button>
          </span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className={`kpi-card ${active && !isExpired ? 'kpi-accent' : ''}`}>
          <div className="kpi-icon"><CreditCard size={22} /></div>
          <div className="kpi-value">{active ? remaining : '—'}</div>
          <div className="kpi-label">Days Remaining</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><CalendarCheck size={22} /></div>
          <div className="kpi-value">{data.totalAttendance}</div>
          <div className="kpi-label">Total Visits</div>
        </div>
        <div className="kpi-card kpi-accent">
          <div className="kpi-icon"><Activity size={22} /></div>
          <div className="kpi-value">{data.monthAttendance}</div>
          <div className="kpi-label">This Month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><DollarSign size={22} /></div>
          <div className="kpi-value">{money(data.totalPaidPaise)}</div>
          <div className="kpi-label">Total Paid</div>
        </div>
      </div>

      {/* Announcements & Offers */}
      {data.announcements.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Bell size={17} className="accent" />
            <h3 style={{ margin: 0, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, textTransform: 'uppercase' }}>
              Announcements &amp; Offers
            </h3>
          </div>
          <div className="member-announcements-grid">
            {data.announcements.map(ann => (
              <div key={ann._id} className={`announcement-card ann-${ann.type} ${ann.priority === 'high' || ann.priority === 'urgent' ? 'ann-priority' : ''}`}>
                <div className="ann-top">
                  {ann.badge && <span className={`badge ${typeColors[ann.type] || 'badge-green'}`}>{ann.badge}</span>}
                  <span className={`badge ${typeColors[ann.type] || 'badge-green'}`}>{ann.type}</span>
                </div>
                <h4>{ann.title}</h4>
                <p>{ann.content}</p>
                {ann.validUntil && (
                  <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Valid until {fmt(ann.validUntil)}
                  </p>
                )}
                {ann.discountPercent ? (
                  <div className="ann-discount">
                    <Tag size={14} /> <strong>{ann.discountPercent}% OFF</strong>
                    <button className="btn btn-green" style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 12 }} onClick={() => navigate('/member/renewal')}>
                      Avail Now
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Plan Details */}
      {active && active.plan.features && active.plan.features.length > 0 && (
        <div className="dash-card" style={{ marginBottom: 24 }}>
          <h3><CreditCard size={17} style={{ marginRight: 8 }} />Your Plan — {active.plan.name}</h3>
          {active.plan.description && <p className="muted" style={{ margin: '0 0 14px' }}>{active.plan.description}</p>}
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div className="member-stat-chip">
              <CalendarCheck size={13} />
              <span>Start: <strong>{fmt(active.startDate)}</strong></span>
            </div>
            <div className="member-stat-chip">
              <Clock size={13} />
              <span>Expires: <strong>{fmt(active.endDate)}</strong></span>
            </div>
            <div className="member-stat-chip">
              <Zap size={13} />
              <span>Price: <strong>{money(active.plan.pricePaise)}</strong></span>
            </div>
          </div>
          <ul className="member-features-list">
            {active.plan.features.map(f => (
              <li key={f}><CheckCircle size={14} className="accent" /> {f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="dash-grid-2">
        {/* Recent Attendance */}
        <div className="dash-card">
          <h3>
            <span><Clock size={17} style={{ marginRight: 8 }} />Recent Attendance</span>
            <button className="link-btn" style={{ fontSize: 12 }} onClick={() => navigate('/member/attendance')}>
              View all <ArrowRight size={13} />
            </button>
          </h3>
          {data.recentAttendance.length === 0 ? (
            <p className="muted" style={{ padding: '16px 0' }}>No attendance records yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th><th>Duration</th></tr></thead>
                <tbody>
                  {data.recentAttendance.slice(0, 7).map(a => {
                    const inTime = new Date(a.checkInAt);
                    const outTime = a.checkOutAt ? new Date(a.checkOutAt) : null;
                    const duration = outTime ? Math.round((outTime.getTime() - inTime.getTime()) / 60000) : null;
                    return (
                      <tr key={a._id}>
                        <td>{fmt(a.checkInAt)}</td>
                        <td>{inTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{outTime ? outTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : <span className="badge badge-green">In Gym</span>}</td>
                        <td>{duration !== null ? `${duration} min` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="dash-card">
          <h3>
            <span><DollarSign size={17} style={{ marginRight: 8 }} />Payments</span>
            <button className="link-btn" style={{ fontSize: 12 }} onClick={() => navigate('/member/payments')}>
              View all <ArrowRight size={13} />
            </button>
          </h3>
          {data.payments.length === 0 && data.pendingPayments.length === 0 ? (
            <p className="muted" style={{ padding: '16px 0' }}>No payment records yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                <tbody>
                  {[...data.pendingPayments.map(p => ({ ...p, status: 'pending' })), ...data.payments].slice(0, 7).map(p => (
                    <tr key={p._id}>
                      <td>{p.paidAt ? fmt(p.paidAt) : '—'}</td>
                      <td><strong>{money(p.amountPaise)}</strong></td>
                      <td><span className="pill">{p.method}</span></td>
                      <td>
                        <span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pending Renewal Requests */}
      {data.renewalRequests.length > 0 && (
        <div className="dash-card" style={{ marginTop: 4, marginBottom: 24 }}>
          <h3><RefreshCw size={17} style={{ marginRight: 8 }} />Renewal Requests</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Plan</th><th>Price</th><th>Submitted</th><th>Status</th></tr></thead>
              <tbody>
                {data.renewalRequests.map(r => (
                  <tr key={r._id}>
                    <td><span className="pill">{r.requestType}</span></td>
                    <td><strong>{r.requestedPlan?.name || '—'}</strong></td>
                    <td>{r.requestedPlan ? money(r.requestedPlan.pricePaise) : '—'}</td>
                    <td>{fmt(r.createdAt)}</td>
                    <td>
                      <span className={`badge ${r.status === 'approved' || r.status === 'completed' ? 'badge-green' : r.status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Membership History */}
      {data.allMemberships.length > 1 && (
        <div className="dash-card" style={{ marginBottom: 24 }}>
          <h3><TrendingUp size={17} style={{ marginRight: 8 }} />Membership History</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Plan</th><th>Start</th><th>Expires</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>
                {data.allMemberships.map(m => (
                  <tr key={m._id}>
                    <td><strong>{m.plan.name}</strong></td>
                    <td>{fmt(m.startDate)}</td>
                    <td>{fmt(m.endDate)}</td>
                    <td>{money(m.plan.pricePaise)}</td>
                    <td>
                      <span className={`badge badge-${m.status === 'active' ? 'green' : m.status === 'expired' ? 'red' : 'yellow'}`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Photo Check-In Modal */}
      <LivePhotoAttendanceModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onSuccess={() => {
          loadStatus();
          loadSummary();
        }}
      />
    </div>
  );
}
