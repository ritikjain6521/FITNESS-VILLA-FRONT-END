import { useEffect, useState } from 'react';
import { api, money, fmt, daysLeft } from '../api';
import { useAuth } from '../hooks/useAuth';
import {
  CreditCard, CalendarCheck, DollarSign, Activity, Clock,
  AlertTriangle, CheckCircle, XCircle, TrendingUp
} from 'lucide-react';

type PlanInfo = { name: string; pricePaise: number; durationDays: number; features?: string[]; description?: string };
type ActiveMembership = { _id: string; plan: PlanInfo; startDate: string; endDate: string; status: string };
type MembershipRecord = { _id: string; plan: { name: string; pricePaise: number; durationDays: number }; startDate: string; endDate: string; status: string };
type AttendanceRecord = { _id: string; checkInAt: string; checkOutAt?: string };
type PaymentRecord = { _id: string; amountPaise: number; method: string; status: string; paidAt?: string; membership?: { plan?: { name: string } } };

type Summary = {
  activeMembership: ActiveMembership | null;
  allMemberships: MembershipRecord[];
  totalAttendance: number;
  monthAttendance: number;
  recentAttendance: AttendanceRecord[];
  payments: PaymentRecord[];
  totalPaidPaise: number;
};

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Summary>('/dashboard/member-summary')
      .then(r => setData(r))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner"/><span>Loading your dashboard…</span></div>;
  if (error) return <div className="page-error"><AlertTriangle size={24}/><span>{error}</span></div>;
  if (!data) return null;

  const active = data.activeMembership;
  const remaining = active ? Math.max(0, daysLeft(active.endDate)) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.name?.split(' ')[0] || 'Member'}</h1>
          <p className="muted">Your fitness journey at a glance — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* Active Membership Banner */}
      {active ? (
        <div className="status-banner status-green" style={{ marginBottom: 20 }}>
          <CreditCard size={18}/>
          <span>
            Active Plan: <strong>{active.plan.name}</strong> · Expires {fmt(active.endDate)} ({remaining} days left)
          </span>
        </div>
      ) : (
        <div className="status-banner status-red" style={{ marginBottom: 20 }}>
          <XCircle size={18}/>
          <span>No active membership. Contact the gym reception to renew.</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className={`kpi-card ${active ? 'kpi-accent' : ''}`}>
          <div className="kpi-icon"><CreditCard size={22}/></div>
          <div className="kpi-value">{active ? remaining : 0}</div>
          <div className="kpi-label">Days Remaining</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><CalendarCheck size={22}/></div>
          <div className="kpi-value">{data.totalAttendance}</div>
          <div className="kpi-label">Total Visits</div>
        </div>
        <div className="kpi-card kpi-accent">
          <div className="kpi-icon"><Activity size={22}/></div>
          <div className="kpi-value">{data.monthAttendance}</div>
          <div className="kpi-label">This Month Visits</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><DollarSign size={22}/></div>
          <div className="kpi-value">{money(data.totalPaidPaise)}</div>
          <div className="kpi-label">Total Paid</div>
        </div>
      </div>

      {/* Active Plan Details */}
      {active && active.plan.features && active.plan.features.length > 0 && (
        <div className="dash-card" style={{ marginTop: 20 }}>
          <h3><CreditCard size={17} style={{ marginRight: 8 }}/>Your Plan Benefits — {active.plan.name}</h3>
          {active.plan.description && <p className="muted" style={{ margin: '8px 0 12px' }}>{active.plan.description}</p>}
          <ul className="member-features-list">
            {active.plan.features.map(f => (
              <li key={f}><CheckCircle size={14} className="accent"/> {f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="dash-grid-2" style={{ marginTop: 20 }}>
        {/* Recent Attendance */}
        <div className="dash-card">
          <h3><Clock size={17} style={{ marginRight: 8 }}/>Recent Attendance</h3>
          {data.recentAttendance.length === 0 ? (
            <p className="muted" style={{ padding: '16px 0' }}>No attendance records yet.</p>
          ) : (
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table>
                <thead><tr><th>Check-in</th><th>Check-out</th><th>Duration</th></tr></thead>
                <tbody>
                  {data.recentAttendance.map(a => {
                    const inTime = new Date(a.checkInAt);
                    const outTime = a.checkOutAt ? new Date(a.checkOutAt) : null;
                    const duration = outTime ? Math.round((outTime.getTime() - inTime.getTime()) / 60000) : null;
                    return (
                      <tr key={a._id}>
                        <td>{fmt(a.checkInAt)}<br/><small className="muted">{inTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small></td>
                        <td>{outTime ? (
                          <>{outTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>
                        ) : <span className="badge badge-yellow">In Gym</span>}</td>
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
          <h3><DollarSign size={17} style={{ marginRight: 8 }}/>Payment History</h3>
          {data.payments.length === 0 ? (
            <p className="muted" style={{ padding: '16px 0' }}>No payment records yet.</p>
          ) : (
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Plan</th></tr></thead>
                <tbody>
                  {data.payments.map(p => (
                    <tr key={p._id}>
                      <td>{p.paidAt ? fmt(p.paidAt) : '—'}</td>
                      <td><strong>{money(p.amountPaise)}</strong></td>
                      <td><span className="pill">{p.method}</span></td>
                      <td>{p.membership?.plan?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Membership History */}
      {data.allMemberships.length > 1 && (
        <div className="dash-card" style={{ marginTop: 20 }}>
          <h3><TrendingUp size={17} style={{ marginRight: 8 }}/>Membership History</h3>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead><tr><th>Plan</th><th>Start</th><th>End</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>
                {data.allMemberships.map(m => (
                  <tr key={m._id}>
                    <td><strong>{m.plan.name}</strong></td>
                    <td>{fmt(m.startDate)}</td>
                    <td>{fmt(m.endDate)}</td>
                    <td>{money(m.plan.pricePaise)}</td>
                    <td><span className={`badge badge-${m.status === 'active' ? 'green' : m.status === 'expired' ? 'red' : 'yellow'}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
