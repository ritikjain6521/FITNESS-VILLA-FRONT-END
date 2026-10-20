import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, money, fmt, daysLeft } from '../api';
import { ArrowLeft, Edit, CreditCard, CalendarCheck, DollarSign } from 'lucide-react';

type Member = { _id: string; name: string; email: string; phone?: string; role: string; active: boolean; createdAt: string };
type Membership = { _id: string; plan: { name: string; pricePaise: number; durationDays: number }; startDate: string; endDate: string; status: string };
type Payment = { _id: string; amountPaise: number; method: string; status: string; paidAt?: string; notes?: string };
type Attendance = { _id: string; checkInAt: string; checkOutAt?: string };

type Tab = 'info' | 'memberships' | 'attendance' | 'payments';

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [tab, setTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api<{ item: Member }>(`/members/${id}`),
      api<{ items: Membership[] }>(`/memberships?member=${id}`),
      api<{ items: Payment[] }>(`/payments?member=${id}`),
      api<{ items: Attendance[] }>(`/attendance?member=${id}`),
    ]).then(([m, ms, ps, at]) => {
      setMember(m.item); setMemberships(ms.items); setPayments(ps.items); setAttendance(at.items);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading"><div className="spinner"/></div>;
  if (error) return <div className="page-error">{error}</div>;
  if (!member) return null;

  const activeMem = memberships.find(m => m.status === 'active');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/dashboard/members')}><ArrowLeft size={16}/>Members</button>
          <h1>{member.name}</h1>
          <p className="muted">{member.email}{member.phone ? ` · ${member.phone}` : ''}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => navigate(`/dashboard/members/${id}/edit`)}><Edit size={15}/>Edit</button>
          <button className="btn btn-green" onClick={() => navigate(`/dashboard/memberships/new?member=${id}`)}>
            <CreditCard size={15}/> New Membership
          </button>
        </div>
      </div>

      {/* Status banner */}
      {activeMem ? (
        <div className="status-banner status-green">
          <span>Active membership: <strong>{activeMem.plan.name}</strong> · Expires {fmt(activeMem.endDate)} ({Math.max(0, daysLeft(activeMem.endDate))} days left)</span>
        </div>
      ) : (
        <div className="status-banner status-red">
          <span>No active membership. <button className="link-btn" onClick={() => navigate(`/dashboard/memberships/new?member=${id}`)}>Create one →</button></span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {(['info','memberships','attendance','payments'] as Tab[]).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="info-grid">
          <div className="info-item"><span className="info-label">Role</span><span className="pill">{member.role}</span></div>
          <div className="info-item"><span className="info-label">Status</span><span className={`badge ${member.active ? 'badge-green' : 'badge-red'}`}>{member.active ? 'Active' : 'Inactive'}</span></div>
          <div className="info-item"><span className="info-label">Registered</span>{fmt(member.createdAt)}</div>
          <div className="info-item"><span className="info-label">Total Memberships</span>{memberships.length}</div>
          <div className="info-item"><span className="info-label">Total Payments</span>{payments.length}</div>
          <div className="info-item"><span className="info-label">Attendance Records</span>{attendance.length}</div>
        </div>
      )}

      {tab === 'memberships' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Plan</th><th>Start</th><th>Expires</th><th>Status</th></tr></thead>
              <tbody>
                {memberships.length === 0 ? <tr><td colSpan={4} className="empty-td">No memberships.</td></tr> : memberships.map(m => (
                  <tr key={m._id}>
                    <td><strong>{m.plan.name}</strong><br/><small className="muted">{money(m.plan.pricePaise)} / {m.plan.durationDays}d</small></td>
                    <td>{fmt(m.startDate)}</td>
                    <td>{fmt(m.endDate)}</td>
                    <td><span className={`badge badge-${m.status === 'active' ? 'green' : m.status === 'expired' ? 'red' : 'yellow'}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Notes</th></tr></thead>
              <tbody>
                {payments.length === 0 ? <tr><td colSpan={5} className="empty-td">No payments.</td></tr> : payments.map(p => (
                  <tr key={p._id}>
                    <td>{money(p.amountPaise)}</td>
                    <td><span className="pill">{p.method}</span></td>
                    <td><span className={`badge badge-${p.status === 'paid' ? 'green' : p.status === 'failed' ? 'red' : 'yellow'}`}>{p.status}</span></td>
                    <td>{p.paidAt ? fmt(p.paidAt) : '—'}</td>
                    <td className="muted">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Check-In</th><th>Check-Out</th><th>Duration</th></tr></thead>
              <tbody>
                {attendance.length === 0 ? <tr><td colSpan={3} className="empty-td">No attendance records.</td></tr> : attendance.map(a => {
                  const dur = a.checkOutAt
                    ? `${Math.round((new Date(a.checkOutAt).getTime() - new Date(a.checkInAt).getTime()) / 60000)} min`
                    : 'Still in';
                  return (
                    <tr key={a._id}>
                      <td>{new Date(a.checkInAt).toLocaleString('en-IN')}</td>
                      <td>{a.checkOutAt ? new Date(a.checkOutAt).toLocaleString('en-IN') : <span className="badge badge-green">Active</span>}</td>
                      <td className="muted">{dur}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
