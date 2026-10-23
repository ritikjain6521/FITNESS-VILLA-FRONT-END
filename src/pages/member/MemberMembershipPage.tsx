import { useEffect, useState } from 'react';
import { api, money, fmt, daysLeft } from '../../api';
import { CreditCard, CalendarCheck, Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw, Star } from 'lucide-react';

type Plan = { _id: string; name: string; pricePaise: number; durationDays: number; features: string[]; description: string; active: boolean };
type Membership = { _id: string; plan: { _id: string; name: string; pricePaise: number; durationDays: number; features: string[]; description: string }; startDate: string; endDate: string; status: string };
type RenewalRequest = { _id: string; requestType: string; requestedPlan: { name: string; pricePaise: number; durationDays: number }; status: string; notes: string; createdAt: string; adminNotes?: string };

export default function MemberMembershipPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [requests, setRequests] = useState<RenewalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Renewal request form
  const [selectedPlan, setSelectedPlan] = useState('');
  const [requestType, setRequestType] = useState<'renewal' | 'upgrade'>('renewal');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    Promise.all([
      api<{ items: Membership[] }>('/memberships'),
      api<{ items: Plan[] }>('/plans'),
      api<{ items: RenewalRequest[] }>('/renewal-requests'),
    ]).then(([ms, ps, rs]) => {
      setMemberships(ms.items);
      setPlans(ps.items.filter(p => p.active));
      setRequests(rs.items);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const activeMembership = memberships.find(m => m.status === 'active');

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan) { setSubmitError('Please select a plan.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      await api('/renewal-requests', {
        method: 'POST',
        body: JSON.stringify({ requestedPlan: selectedPlan, requestType, notes }),
      });
      setSubmitSuccess('Your request has been submitted! The gym team will review and get back to you.');
      setSelectedPlan('');
      setNotes('');
      // Refresh requests
      const r = await api<{ items: RenewalRequest[] }>('/renewal-requests');
      setRequests(r.items);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (error) return <div className="page-error"><AlertTriangle size={24} />{error}</div>;

  const remaining = activeMembership ? Math.max(0, daysLeft(activeMembership.endDate)) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Membership</h1>
          <p className="muted">Manage your membership plan and renewal requests</p>
        </div>
      </div>

      {/* Active Membership Card */}
      <div className="dash-card" style={{ marginBottom: 24, background: activeMembership ? 'linear-gradient(135deg, #0e1a10 0%, #0c100d 100%)' : undefined }}>
        <h3><CreditCard size={17} style={{ marginRight: 8 }} />Active Membership</h3>
        {activeMembership ? (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div className="member-stat-chip">
                <Star size={13} />
                <span><strong>{activeMembership.plan.name}</strong></span>
              </div>
              <div className="member-stat-chip">
                <CalendarCheck size={13} />
                <span>Start: <strong>{fmt(activeMembership.startDate)}</strong></span>
              </div>
              <div className="member-stat-chip">
                <Clock size={13} />
                <span>Expires: <strong>{fmt(activeMembership.endDate)}</strong></span>
              </div>
              <div className={`member-stat-chip ${remaining <= 7 ? 'chip-warning' : ''}`}>
                <RefreshCw size={13} />
                <span>Days Left: <strong>{remaining}</strong></span>
              </div>
            </div>
            {activeMembership.plan.description && (
              <p className="muted" style={{ marginBottom: 14 }}>{activeMembership.plan.description}</p>
            )}
            {activeMembership.plan.features?.length > 0 && (
              <ul className="member-features-list">
                {activeMembership.plan.features.map(f => (
                  <li key={f}><CheckCircle size={13} className="accent" /> {f}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0' }}>
            <XCircle size={24} style={{ color: '#ff6b6b' }} />
            <div>
              <p style={{ margin: 0, color: '#ff6b6b', fontWeight: 600 }}>No active membership</p>
              <p className="muted" style={{ margin: '4px 0 0' }}>Submit a renewal request below or visit the gym reception.</p>
            </div>
          </div>
        )}
      </div>

      {/* Renewal / Upgrade Request Form */}
      <div className="dash-card" style={{ marginBottom: 24 }}>
        <h3><RefreshCw size={17} style={{ marginRight: 8 }} />Request Renewal or Upgrade</h3>
        {submitSuccess && (
          <div className="status-banner status-green" style={{ marginBottom: 16 }}>
            <CheckCircle size={16} />
            <span>{submitSuccess}</span>
          </div>
        )}
        {submitError && (
          <div className="status-banner status-red" style={{ marginBottom: 16 }}>
            <AlertTriangle size={16} />
            <span>{submitError}</span>
          </div>
        )}
        <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
          <label>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9b9f9a', marginBottom: 6 }}>Request Type</span>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['renewal', 'upgrade'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  className={`btn ${requestType === type ? 'btn-green' : 'btn-outline'}`}
                  style={{ flex: 1, textTransform: 'capitalize' }}
                  onClick={() => setRequestType(type)}
                >
                  {type === 'renewal' ? '🔄 Renewal' : '⬆️ Upgrade'}
                </button>
              ))}
            </div>
          </label>
          <label>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9b9f9a', marginBottom: 6 }}>Select Plan</span>
            <select className="select-input full-width" value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)} required>
              <option value="">— Choose a plan —</option>
              {plans.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} — {money(p.pricePaise)} / {p.durationDays} days
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9b9f9a', marginBottom: 6 }}>Notes (optional)</span>
            <textarea
              className="textarea-input"
              rows={3}
              placeholder="Any specific requirements or preferred start date…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={500}
            />
          </label>
          <button type="submit" className="btn btn-green" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
            <RefreshCw size={15} /> {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      </div>

      {/* All Membership History */}
      <div className="table-card" style={{ marginBottom: 24 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={16} className="accent" />
          <strong style={{ fontSize: 14 }}>Membership History</strong>
          <span className="badge badge-green" style={{ marginLeft: 'auto' }}>{memberships.length} records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Plan</th><th>Price</th><th>Start Date</th><th>Expiry Date</th><th>Duration</th><th>Status</th></tr>
            </thead>
            <tbody>
              {memberships.length === 0 ? (
                <tr><td colSpan={6} className="empty-td">No membership records yet.</td></tr>
              ) : memberships.map(m => (
                <tr key={m._id}>
                  <td><strong>{m.plan.name}</strong></td>
                  <td>{money(m.plan.pricePaise)}</td>
                  <td>{fmt(m.startDate)}</td>
                  <td>{fmt(m.endDate)}</td>
                  <td>{m.plan.durationDays} days</td>
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

      {/* Renewal Requests */}
      {requests.length > 0 && (
        <div className="table-card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} className="accent" />
            <strong style={{ fontSize: 14 }}>My Renewal Requests</strong>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>Plan</th><th>Price</th><th>Submitted</th><th>Status</th><th>Admin Notes</th></tr>
              </thead>
              <tbody>
                {requests.map(r => (
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
                    <td>{r.adminNotes || <span className="muted">—</span>}</td>
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
